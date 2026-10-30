# Kalzo — app iOS (Expo) « BeReal du repas » : livraison

Branche `feature/expo-social` — **rien n'a été poussé, appliqué en production, ni déployé.**

## 1. À relire avant toute mise en ligne
- **SQL** : `supabase/03-social.sql` (additif, relançable ; testé sur Postgres local : `supabase/tests/`). Il n'a PAS été lancé.
  Écarts volontaires : colonnes `app_trial_started_at` / `app_trial_ends_at` (et non `trial_ends_at`, déjà utilisée par l'essai Stripe du web) ; le script s'arrête avec un message si `consumed_meals.id`/`profiles.id` ne sont pas des `uuid`.
- **Edge Functions** (non déployées) : `supabase/functions/{ai,revenuecat-webhook,notify,purge-photos,delete-account,export-data}` (+ `_shared`, `config.toml`).
- **Landing + pages légales** : `/` est maintenant la vitrine statique. Fusionner la branche met l'ancienne app web hors ligne : à caler avec la sortie sur l'App Store.

## 2. Fichiers
**Créés** : `mobile/` (app Expo SDK 58 / Expo Router / TypeScript), `supabase/03-social.sql`, `supabase/functions/*`, `supabase/config.toml`, `supabase/tests/*`, `src/components/site/Landing.jsx`, `src/app/{support,supprimer-mon-compte,sitemap.js,robots.js}`, `public/.well-known/apple-app-site-association`.
**Modifiés** : `src/app/page.jsx` (landing), `src/app/layout.jsx` (méta + `itunes` si `NEXT_PUBLIC_APPSTORE_ID`), `src/app/{cgv,cgu,confidentialite}/page.jsx` (achats Apple, photos 30 jours, social, modération), `LegalPage.jsx`, `next.config.js` (en-tête AASA).
**Supprimés** : aucun pour l'instant (voir §3).

## 3. À SUPPRIMER — j'attends ton accord (commit séparé)
- PWA : `public/manifest.json`, `public/icons/*`, `manifest` + `appleWebApp` + `themeScript` de `src/app/layout.jsx`.
- Code applicatif web : `src/components/{layout,screens}/**`, `src/components/ui/{Toast,primitives}.jsx`, `src/lib/{AppContext.jsx,ai.js,demo.js,nav.jsx,nutrition.js,supabase.js}`, `src/data/recipes.js`.
- Routes API : `claude`, `create-checkout`, `account/export`, `account/delete`.
- **Gardés pour la transition** : `api/stripe-webhook`, `api/cancel-subscription`, `lib/server/supabase-admin.js`, `lib/constants.js` ; à retirer après la fin de la dernière période Stripe payée.
- Ne pas oublier : retirer `supabase/02` n'est pas nécessaire ; l'ancienne table `credits` reste.

## 4. Secrets et variables
- **Edge Functions** : `ANTHROPIC_API_KEY`, `WEBHOOK_SECRET` (≥16 car., même valeur dans `private_settings`), `REVENUECAT_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY` (résiliation héritée), `REVENUECAT_SECRET_KEY` (optionnel, effacement RevenueCat), `EXPO_ACCESS_TOKEN` (optionnel). `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournis par Supabase.
- **App (`mobile/.env`, EAS)** : `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_REVENUECAT_IOS_KEY`.
- **Vercel** : `NEXT_PUBLIC_APP_STORE_URL` (active le bouton), `NEXT_PUBLIC_APPSTORE_ID` (bannière Safari). Team ID Apple (UU53L7L6ZR) déjà renseigné dans l’AASA.

## 5. Étapes manuelles
1. SQL Editor NutriFlow : coller `03-social.sql` ; activer `pg_net` et `pg_cron` (Database › Extensions) puis relancer ; insérer `functions_url` + `webhook_secret` dans `private_settings` (commentaire en bas du script) ; Security Advisor + Performance Advisor.
2. `supabase link` puis `supabase functions deploy` ; définir les secrets ; webhook RevenueCat → `…/functions/v1/revenuecat-webhook` avec en-tête `Authorization: Bearer <secret>`.
3. Auth Supabase : URL de redirection `kalzo://auth-callback` ; gabarits d'e-mails (confirmation, réinitialisation).
4. App Store Connect : app `fr.kalzo.app`, **un groupe d'abonnements** avec 9 produits `fr.kalzo.{essentiel|plus|illimite}.{monthly|quarterly|annual}` (4,99/12,99/39,99 – 7,99/20,99/64,99 – 10,99/28,99/89,99 €), Small Business Program, fiche, mots-clés, « App Privacy » (e-mail, photos, santé et forme, contenu utilisateur, identifiants), URLs confidentialité/support de la landing.
5. RevenueCat : entitlements `essentiel`, `plus`, `illimite`, offering par défaut avec les 9 packages, clé SDK iOS.
6. `cd mobile && eas init` (renseigne `extra.eas.projectId`, requis pour les push) ; `eas build --profile development` puis TestFlight (`production`).
7. Nouveau compte de test : adresse pro `pierrealexisghfpro@`, jamais d'adresse bidon.

## 6. Non vérifié (pas de simulateur iOS, pas d'accès Supabase/Vercel de Kalzo)
- Aucun écran n'a été lancé : seulement `tsc`, lint, `expo-doctor` (20/20) et un bundle iOS Metro réussi. Caméra, formSheet, achats, push, glisser-retour : à tester sur appareil.
- Le SQL a été testé sur PGlite avec des schémas Supabase simulés (62 vérifications), pas sur NutriFlow : les vrais noms de colonnes de `profiles`/`consumed_meals` sont supposés d'après le code web.
- Edge Functions : vérifiées au typage (`deno check`), pas exécutées.
- Pages légales : relecture juridique à faire ; seul l'ordre de grandeur des prix de départ est dans la landing.
- Captures d'écran de la landing : emplacements prévus (`Phone` dans `Landing.jsx`).

## 7. Message aux anciens utilisateurs du site (bandeau ou page d'info)
« Kalzo devient une app iPhone : poste ton déjeuner et ton dîner à tes amis, avec une note en étoiles. Ton compte et tes données sont conservés : télécharge l'app et connecte-toi avec le même e-mail. Ton abonnement actuel reste actif jusqu'à la fin de la période payée (Standard → Plus, VIP → Illimité). Tu as 7 jours d'essai gratuit pour tout essayer. »
