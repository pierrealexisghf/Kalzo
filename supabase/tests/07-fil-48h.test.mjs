// Test du script `07-fil-48h.sql` : 48 h dans le fil, 7 jours sur le profil, photo supprimée à 7 jours, journal intact.
//   cd supabase/tests && node 07-fil-48h.test.mjs
import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
const db = new PGlite()
const lire = (f) => fs.readFileSync(new URL(f, import.meta.url), 'utf8')
let fails = 0
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗', m) } else console.log('  ✓', m) }
async function as(uid, q, params) {
  await db.exec(`set role ${uid ? 'authenticated' : 'service_role'}; select set_config('app.uid','${uid ?? ''}',false)`)
  try { return (await db.query(q, params)).rows } finally { await db.exec('reset role') }
}
await db.exec(lire('./stubs.sql'))
await db.exec(lire('../03-social.sql'))
await db.exec(lire('../07-fil-48h.sql')); console.log('07 appliqué (1re fois)')
await db.exec(lire('../07-fil-48h.sql')); console.log('07 appliqué (2e fois, idempotent)')

const [A, B, C] = ['11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333']
for (const [u, n] of [[A, 'alice'], [B, 'bob'], [C, 'carl']]) await db.query(`insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)`, [u, n + '@x.fr', JSON.stringify({ first_name: n })])
for (const [u, n] of [[A, 'alice_01'], [B, 'bob_01'], [C, 'carl_01']]) { await as(u, 'select ensure_account()'); await as(u, `select set_username('${n}')`) }
await as(A, `select friend_request_send('bob_01')`); await as(B, `select friend_request_respond('alice_01', true)`)

const M = 'aaaaaaaa-0000-0000-0000-000000000001'
const depuis = (interval) => db.query(`update consumed_meals set shared_at = now() - interval '${interval}' where id='${M}'`)
const fil = async (uid) => (await as(uid, `select * from feed_page()`)).filter((r) => r.id === M).length
const profil = async (uid, nom) => (await as(uid, `select * from user_shared_meals('${nom}')`)).filter((r) => r.id === M).length

console.log('publication')
await db.query(`insert into consumed_meals(id,user_id,name,emoji,macros,meal_type,consumed_at,shared,stars,photo_path,thumb_path) values
  ('${M}','${A}','Poulet','🍗','{"prot":40}','dejeuner',now()::timestamp,true,5,'${A}/a.jpg','${A}/a_t.jpg')`)
let r = (await db.query(`select shared_at, photo_expires_at from consumed_meals where id='${M}'`)).rows[0]
ok(r.shared_at && Math.abs(Date.now() - new Date(r.shared_at).getTime()) < 60000, 'shared_at posé à la publication')
const jours = (new Date(r.photo_expires_at) - Date.now()) / 86400000
ok(jours > 6.9 && jours < 7.1, `photo d'un repas posté : expire dans 7 jours (${jours.toFixed(2)} j)`)

console.log('fil : 48 h')
ok(await fil(B) === 1 && await fil(A) === 1, 'visible tout de suite (ami et moi)')
await depuis('47 hours'); ok(await fil(B) === 1, 'encore dans le fil à 47 h')
await depuis('49 hours'); ok(await fil(B) === 0 && await fil(A) === 0, 'plus dans le fil à 49 h (ami et moi)')

console.log('profil : 7 jours')
ok(await profil(B, 'alice_01') === 1, 'encore sur le profil à 49 h (vu par un ami)')
await depuis('6 days'); ok(await profil(B, 'alice_01') === 1 && await profil(A, 'alice_01') === 1, 'encore sur le profil à 6 jours (ami et moi)')
await as(B, `select meal_react('${M}','🔥')`); await as(B, `select meal_comment_add('${M}','Miam')`)
ok((await as(B, `select can_read_meal_photo('${A}/a.jpg') as v`))[0].v, 'photo lisible par un ami à 6 jours')
await depuis('8 days')
ok(await profil(B, 'alice_01') === 0 && await profil(A, 'alice_01') === 0, 'disparu du profil à 8 jours (ami et moi)')
ok(await fil(B) === 0, 'et toujours pas dans le fil')
try { await as(B, `select meal_react('${M}','👍')`); ok(false, 'ami ne peut plus réagir à 8 jours') } catch { ok(true, 'ami ne peut plus réagir à 8 jours') }
ok(!(await as(B, `select can_read_meal_photo('${A}/a.jpg') as v`))[0].v, 'photo illisible par un ami à 8 jours')
ok((await db.query(`select public._can_view_meal('${M}','${A}') v`)).rows[0].v, 'le propriétaire garde son repas dans son journal')

console.log('nettoyage des réactions et commentaires')
await depuis('3 days'); await db.query(`select public.purge_expired_post_data()`)
let n = (await db.query(`select (select count(*) from meal_comments where meal_id='${M}')::int c, (select count(*) from meal_reactions where meal_id='${M}')::int r`)).rows[0]
ok(n.c === 1 && n.r === 1, 'à 3 jours : réactions et commentaires conservés')
await depuis('8 days'); await db.query(`select public.purge_expired_post_data()`)
n = (await db.query(`select (select count(*) from meal_comments where meal_id='${M}')::int c, (select count(*) from meal_reactions where meal_id='${M}')::int r`)).rows[0]
ok(n.c === 0 && n.r === 0, 'à 8 jours : supprimés')
const reste = (await db.query(`select name, shared, stars from consumed_meals where id='${M}'`)).rows[0]
ok(reste && reste.shared === true && reste.stars === 5, 'le repas reste dans le journal (valeurs, étoiles, partage inchangé : les flammes ne bougent pas)')
try { await as(A, `select purge_expired_post_data()`); ok(false, 'purge interdite au client') } catch { ok(true, 'purge interdite au client') }

console.log('photo : 30 jours si non posté, 7 jours si posté')
const P = 'aaaaaaaa-0000-0000-0000-000000000002'
await db.query(`insert into consumed_meals(id,user_id,name,macros,meal_type,consumed_at,shared,photo_path,thumb_path) values ('${P}','${A}','Privé','{}','diner',now()::timestamp,false,'${A}/p.jpg','${A}/p_t.jpg')`)
const exp = async () => (new Date((await db.query(`select photo_expires_at e from consumed_meals where id='${P}'`)).rows[0].e) - Date.now()) / 86400000
let d = await exp(); ok(d > 29.9 && d < 30.1, `repas privé : 30 jours (${d.toFixed(2)} j)`)
await as(A, `update consumed_meals set shared=true where id='${P}'`)
d = await exp(); ok(d > 6.9 && d < 7.1, `une fois posté : 7 jours (${d.toFixed(2)} j)`)
await as(A, `update consumed_meals set shared=false where id='${P}'`)
d = await exp(); ok(d > 29.9 && d < 30.1, `retiré du partage : de nouveau 30 jours (${d.toFixed(2)} j)`)
await db.query(`update consumed_meals set shared_at = now() - interval '10 days' where id='${P}'`)
await as(A, `update consumed_meals set shared=true where id='${P}'`)
const sa = (await db.query(`select shared_at from consumed_meals where id='${P}'`)).rows[0].shared_at
ok(Date.now() - new Date(sa).getTime() < 60000, 'reposter remet le compteur à zéro')
await db.query(`update consumed_meals set consumed_at = (now() - interval '29 days')::timestamp where id='${P}'`)
await db.query(`update consumed_meals set photo_path = photo_path where id='${P}'`)
d = await exp(); ok(d > 0.9 && d < 1.1, `un repas ancien garde la règle des 30 jours si elle est plus courte (${d.toFixed(2)} j)`)

console.log('un client ne peut pas tricher sur la date de publication')
try { await as(A, `update consumed_meals set shared_at = now() + interval '30 days' where id='${P}'`); ok(false, 'shared_at non modifiable par le client') } catch { ok(true, 'shared_at non modifiable par le client') }

console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT PASSE')
process.exit(fails ? 1 : 0)
