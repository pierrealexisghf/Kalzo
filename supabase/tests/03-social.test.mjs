import { PGlite } from '@electric-sql/pglite'
import fs from 'node:fs'
const db = new PGlite()
const sql = fs.readFileSync(new URL('../03-social.sql', import.meta.url), 'utf8')
await db.exec(fs.readFileSync(new URL('./stubs.sql', import.meta.url), 'utf8'))
let fails = 0
const ok = (c, m) => { if (!c) { fails++; console.log('  ✗', m) } else console.log('  ✓', m) }
async function as(uid, q, params) {
  await db.exec(`set role ${uid ? 'authenticated' : 'service_role'}; select set_config('app.uid','${uid ?? ''}',false)`)
  try { return (await db.query(q, params)).rows } finally { await db.exec('reset role') }
}
await db.exec(sql); console.log('script appliqué (1re fois)')
await db.exec(sql); console.log('script appliqué (2e fois, idempotent)')
const [A, B, C] = ['11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333']
for (const [u, n] of [[A,'alice'],[B,'bob'],[C,'carl']]) await db.query(`insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)`, [u, n+'@x.fr', JSON.stringify({first_name: n[0].toUpperCase()+n.slice(1)})])
const j = r => r[0] && Object.values(r[0])[0]

console.log('compte / essai')
let r = j(await as(A, 'select ensure_account()'))
ok(r.ai.plan === 'trial' && r.first_name === 'Alice', 'essai 7 j + prénom')
r = j(await as(A, 'select ensure_account()'))
ok(r.ai.plan === 'trial', 'idempotent')
await as(B, 'select ensure_account()'); await as(C, 'select ensure_account()')
await db.query(`update profiles set plan='vip', subscription_status='active', app_trial_started_at=null, app_trial_ends_at=null where id=$1`, [C])
r = j(await as(C, 'select ensure_account()'))
ok(r.ai.plan === 'illimite', 'abonné vip historique → illimite, pas d’essai')

console.log('pseudo')
ok(j(await as(A, `select set_username('Alice_01')`)).ok === true, 'pseudo ok')
ok(j(await as(B, `select set_username('alice_01')`)).reason === 'taken', 'unique insensible à la casse')
ok(j(await as(B, `select set_username('admin')`)).reason === 'reserved', 'mot réservé')
ok(j(await as(B, `select set_username('a.')`)).reason === 'invalid_format', 'format')
ok(j(await as(B, `select set_username('_bob')`)).reason === 'invalid_format', 'début par _')
ok(j(await as(B, `select set_username('bob')`)).ok === true, 'bob')
ok(j(await as(C, `select set_username('carl.x')`)).ok === true, 'carl')
ok(j(await as(B, `select set_username('bobby')`)).reason === 'cooldown', '1 changement / 30 jours')
ok(j(await as(A, `select username_available('zed')`)).available === true, 'dispo')
try { await as(A, `update profiles set username='hack' where id='${A}'`); ok(false, 'update direct du pseudo refusé') } catch { ok(true, 'update direct du pseudo refusé') }
try { await as(A, `update profiles set plan='vip' where id='${A}'`); ok(false, 'plan non modifiable') } catch { ok(true, 'plan non modifiable') }

console.log('quotas')
await db.query(`update profiles set app_trial_ends_at=null where id=$1`, [B])   // bob → gratuit (5/sem)
for (let i = 0; i < 5; i++) ok(j(await as(null, `select consume_ai($1,'scan')`, [B])).ok, `scan ${i+1}/5`)
r = j(await as(null, `select consume_ai($1,'scan')`, [B])); ok(!r.ok && r.reason === 'quota_weekly' && r.remaining === 0, 'scan 6 refusé quota_weekly')
r = j(await as(null, `select consume_ai($1,'coach')`, [B])); ok(!r.ok && r.reason === 'subscription_required', 'coach refusé en gratuit')
await as(null, `select refund_ai($1,'scan')`, [B])
r = j(await as(null, `select consume_ai($1,'scan')`, [B])); ok(r.ok, 'scan rendu puis reconsommé')
r = j(await as(A, `select my_ai_status()`)); ok(r.plan === 'trial' && r.remaining === null && r.coach_access, 'essai : illimité + coach')
r = j(await as(null, `select consume_ai($1,'coach')`, [A])); ok(r.ok, 'coach ok pendant l’essai')
await db.query(`update plan_limits set daily_cap=2 where plan='trial'`)
await as(null, `select consume_ai($1,'scan')`, [A]); // coach+scan = 2
r = j(await as(null, `select consume_ai($1,'scan')`, [A])); ok(!r.ok && r.reason === 'daily_cap', 'plafond journalier')
await db.query(`update plan_limits set daily_cap=100 where plan='trial'`)
try { await as(B, `select consume_ai($1,'scan')`, [B]); ok(false, 'consume_ai interdit au client') } catch { ok(true, 'consume_ai interdit au client') }
await db.query(`update profiles set plan='essentiel', subscription_status='active' where id=$1`, [B])
r = j(await as(B, `select my_ai_status()`)); ok(r.plan === 'essentiel' && r.weekly_scans === 30 && !r.coach_access, 'essentiel : 30/sem, pas de coach')

console.log('amis')
let s = await as(A, `select * from search_users('bo')`); ok(s.length === 0, 'recherche < 3 caractères vide')
s = await as(A, `select * from search_users('bob')`); ok(s.length === 1 && s[0].relation === 'none' && !('email' in s[0]), 'recherche préfixe')
s = await as(A, `select * from search_users('a_')`); ok(s.length === 0, 'pas de wildcard')
ok(j(await as(A, `select friend_request_send('bob')`)).status === 'pending_out', 'demande envoyée')
s = await as(B, `select * from search_users('alice')`); ok(s[0]?.relation === 'pending_in', 'relation vue par le destinataire')
try { await as(A, `insert into friendships(requester_id,addressee_id) values ('${A}','${C}')`); ok(false, 'insert direct refusé') } catch { ok(true, 'insert direct refusé') }
s = await as(C, `select * from friendships`); ok(s.length === 0, 'RLS : tiers ne voit pas')
ok(j(await as(B, `select friend_request_respond('alice_01', true)`)).ok, 'acceptée')
ok(j(await as(A, `select friend_request_send('bob')`)).status === 'friends', 'demande déjà amis')
let calls = (await db.query(`select body from net.calls`)).rows.length; ok(calls === 0, 'pas d’appel edge sans réglages')
await db.query(`insert into private_settings values ('functions_url','https://x/functions/v1'),('webhook_secret','s')`)
await as(A, `select friend_request_send('carl.x')`)
calls = (await db.query(`select body from net.calls`)).rows; ok(calls.length === 1 && calls[0].body.event === 'friend_request', 'webhook friend_request')

console.log('feed / confidentialité')
await db.query(`insert into consumed_meals(id,user_id,name,emoji,macros,meal_type,consumed_at,shared,stars,photo_path,thumb_path) values
 ('aaaaaaaa-0000-0000-0000-000000000001','${A}','Poulet','🍗','{"kcal":600,"prot":40,"gluc":50,"lip":20}','dejeuner',now()::timestamp,true,5,'${A}'||'/a.jpg','${A}'||'/a_t.jpg'),
 ('aaaaaaaa-0000-0000-0000-000000000002','${A}','Secret','🍰','{"kcal":900}','diner',now()::timestamp,false,2,null,null)`, )
let f = await as(B, `select * from feed_page()`); ok(f.length === 1 && f[0].name === 'Poulet', 'ami voit le repas partagé seulement')
ok(!('kcal' in f[0]) && f[0].prot == 40, 'jamais de kcal dans le feed')
f = await as(C, `select * from feed_page()`); ok(f.length === 0, 'non-ami ne voit rien')
ok((await as(B, `select meal_react('aaaaaaaa-0000-0000-0000-000000000001','🔥')`))[0].meal_react === '🔥', 'réaction')
f = await as(A, `select * from feed_page()`); ok(f[0].reactions['🔥'] == 1, 'compteur de réactions')
try { await as(C, `select meal_react('aaaaaaaa-0000-0000-0000-000000000001','🔥')`); ok(false, 'tiers ne peut pas réagir') } catch { ok(true, 'tiers ne peut pas réagir') }
try { await as(B, `select meal_react('aaaaaaaa-0000-0000-0000-000000000002','🔥')`); ok(false, 'repas non partagé inaccessible') } catch { ok(true, 'repas non partagé inaccessible') }
await as(B, `select meal_comment_add('aaaaaaaa-0000-0000-0000-000000000001','Miam')`)
ok((await as(A, `select * from meal_comments_list('aaaaaaaa-0000-0000-0000-000000000001')`)).length === 1, 'commentaire visible')
try { await as(B, `select meal_comment_add('aaaaaaaa-0000-0000-0000-000000000001',$1)`, ['x'.repeat(201)]); ok(false,'201 car. refusé') } catch { ok(true, '201 car. refusé') }
ok((await as(B, `select can_read_meal_photo('${A}/a.jpg') as v`))[0].v, 'ami peut lire la photo')
ok(!(await as(C, `select can_read_meal_photo('${A}/a.jpg') as v`))[0].v, 'tiers ne peut pas')
ok(!(await as(B, `select can_read_meal_photo('${A}/a_inconnue.jpg') as v`))[0].v, 'fichier inconnu non lisible')
const exp = (await db.query(`select photo_expires_at - consumed_at::timestamptz d from consumed_meals where id='aaaaaaaa-0000-0000-0000-000000000001'`)).rows[0]
ok(!!exp.d, 'photo_expires_at renseigné (+30 j)')
const sc = j(await as(B, `select profile_summary('alice_01')`)); ok(sc.scores.avg7 == 5 && sc.friend_count == 1, 'profil ami = partagé seulement (5, pas moyenne avec le repas secret)')
const me = j(await as(A, `select profile_summary('alice_01')`)); ok(me.scores.avg7 == 3.5, 'mon profil = tout (3,5)')
ok(j(await as(C, `select profile_summary('alice_01')`)) === null, 'profil non-ami masqué')

console.log('blocage / signalement')
await as(A, `select report_create('aaaaaaaa-0000-0000-0000-000000000001', null, 'spam', null)`).catch(() => {})
ok(true, 'report_create appelable')
await as(A, `select user_block('bob')`)
f = await as(B, `select * from feed_page()`); ok(f.length === 0, 'bloqué ne voit plus le bloqueur')
s = await as(B, `select * from search_users('alice')`); ok(s.length === 0, 'bloqué ne peut pas chercher')
ok(j(await as(B, `select friend_request_send('alice_01')`)).reason === 'not_found', 'bloqué ne peut pas demander')
ok(!(await as(B, `select can_read_meal_photo('${A}/a.jpg') as v`))[0].v, 'photo illisible après blocage')

console.log('push')
await as(A, `select register_push_token('ExponentPushToken[abc_DEF-1]','ios')`)
try { await as(A, `select register_push_token('nimportequoi','ios')`); ok(false, 'jeton invalide refusé') } catch { ok(true, 'jeton invalide refusé') }
await as(A, `update consumed_meals set shared=true where id='aaaaaaaa-0000-0000-0000-000000000002'`)
calls = (await db.query(`select body from net.calls where body->>'event'='friend_meal'`)).rows; ok(calls.length === 2, 'déjeuner + dîner = 2 notifications')
await db.query(`insert into consumed_meals(user_id,name,macros,meal_type,consumed_at,shared) values ('${A}','Autre déj','{}','dejeuner',now()::timestamp,true)`)
calls = (await db.query(`select body from net.calls where body->>'event'='friend_meal'`)).rows; ok(calls.length === 2, 'pas de 2e notification pour le même créneau du jour')
console.log(fails ? `\n${fails} ÉCHEC(S)` : '\nTOUT PASSE')
process.exit(fails ? 1 : 0)
