import { LegalPage, H2, H3, P, UL, Note, Table, A } from '@/components/legal/LegalPage'

export const metadata = { title: 'Politique de confidentialité', alternates: { canonical: '/confidentialite' } }

export default function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité" updated="30 octobre 2026">
      <Note>
        Kalzo traite des données sur votre alimentation, votre poids et votre activité. Elles
        peuvent révéler des informations de santé : nous ne les utilisons <strong>que pour faire
        fonctionner l'application pour vous</strong>, jamais pour de la publicité, jamais revendues.
        Vous pouvez tout télécharger ou tout supprimer en un geste depuis « Profil ». Les repas que vous partagez ne sont visibles que de vos amis.
      </Note>

      <H2>1. Responsable du traitement</H2>
      <P>
        GUIHENEUF Pierre-Alexis, entrepreneur individuel, 44720 Saint-Joachim, France —
        contactkalzo.fr@gmail.com. Aucun délégué à la protection des données n'a été désigné : la
        structure n'y est pas tenue.
      </P>

      <H2>2. Données traitées</H2>
      <H3>2.1 Compte</H3>
      <UL items={[
        'Adresse e-mail et mot de passe (stocké sous forme d’empreinte, jamais lisible par l’éditeur)',
        'Prénom (nom affiché) et pseudo, visibles de vos amis et des personnes qui vous recherchent par pseudo ; jamais votre adresse e-mail',
        'Date et version des conditions acceptées à l’inscription',
        'Fuseau horaire de l’appareil, pour la remise à zéro hebdomadaire du quota de scans',
      ]} />
      <H3>2.1 bis Partage avec vos amis</H3>
      <UL items={[
        'Demandes d’ami, liste d’amis et utilisateurs bloqués',
        'Repas que vous choisissez de partager : photo, nom, type de repas, étoiles, protéines, glucides, lipides (les calories ne sont jamais montrées à vos amis)',
        'Réactions (emojis), commentaires (200 caractères maximum) et signalements que vous envoyez',
        'Un repas n’est partagé que si vous activez l’interrupteur « Partager avec mes amis », et seulement avec les amis dont vous avez accepté la demande',
      ]} />
      <H3>2.2 Profil et suivi (données pouvant relever de la santé)</H3>
      <UL items={[
        'Âge, sexe, taille, poids, niveau d’activité, objectif, besoins calculés (calories, protéines, glucides, lipides)',
        'Repas enregistrés : nom, calories, macronutriments (dont sucres et fibres quand disponibles), note de 1 à 5 étoiles calculée sur votre appareil, type de repas, date',
        <>Photos de vos repas : réduites sur votre appareil, stockées dans un espace privé, et <strong>supprimées automatiquement après 30 jours</strong> (le repas, ses valeurs et ses étoiles restent dans votre journal)</>,
        'Activités sportives : nom, durée, calories estimées',
        'Hydratation quotidienne et objectif d’eau',
        'Pesées et objectif de poids',
        'Plan alimentaire de la semaine, si vous en générez un',
      ]} />
      <H3>2.3 Fonctions d'intelligence artificielle</H3>
      <P>
        Quand vous utilisez une fonction IA, le texte saisi (description de repas ou de séance,
        ingrédients, préférences), la <strong>photo</strong> éventuelle et quelques éléments de votre
        profil (poids, objectif, besoins caloriques) sont transmis à Anthropic pour produire la
        réponse. Selon les conditions commerciales d'Anthropic, les données envoyées via son API ne servent pas à
        entraîner ses modèles. La photo que vous choisissez d'attacher à un repas est conservée par Kalzo 30 jours (voir ci-dessous).
        Seul le résultat que vous choisissez d'ajouter au journal est gardé.
      </P>
      <H3>2.4 Abonnement</H3>
      <UL items={[
        'Offre, statut, dates d’essai et de renouvellement, quota de scans de la semaine',
        'Les achats sont réalisés via Apple (App Store) ou Google (Google Play) et suivis par RevenueCat, avec votre identifiant de compte Kalzo : vos données bancaires ne transitent ni ne sont stockées par Kalzo',
        'Anciens abonnements souscrits sur le site : identifiants de paiement chez Stripe, jusqu’à la fin de la dernière période payée',
      ]} />
      <H3>2.4 bis Notifications</H3>
      <UL items={[
        'Rappels du déjeuner et du dîner : notifications locales programmées sur votre appareil, sans serveur',
        'Notifications sociales (demande d’ami, ami qui poste) : un jeton d’appareil est enregistré et transmis au service de notifications d’Apple/Google via Expo, uniquement si vous les autorisez ; désactivables dans « Profil › Notifications »',
      ]} />
      <H3>2.5 Fonctionnement et sécurité</H3>
      <UL items={[
        'Compteur d’utilisations de l’IA par jour, pour limiter les abus',
        'Journaux techniques de l’hébergeur (adresse IP, date), conservés brièvement pour la sécurité',
      ]} />

      <H2>3. Finalités et bases légales</H2>
      <Table
        head={['Pourquoi', 'Sur quelle base']}
        rows={[
          ['Créer un compte, vous authentifier, faire fonctionner le suivi', 'Exécution du contrat'],
          ['Traiter vos données de poids, d’alimentation et d’activité pour calculer vos objectifs et vos bilans', 'Consentement explicite (art. 9.2.a du RGPD), recueilli à l’inscription et retirable à tout moment en supprimant le compte'],
          ['Produire les réponses des fonctions IA', 'Exécution du contrat et consentement'],
          ['Partager vos repas avec vos amis, afficher le feed, les réactions et les commentaires', 'Exécution du contrat et consentement (interrupteur de partage)'],
          ['Modérer les contenus (signalements, blocages)', 'Intérêt légitime de l’éditeur et obligation légale'],
          ['Gérer l’abonnement, facturer, tenir la comptabilité', 'Exécution du contrat et obligation légale'],
          ['Sécuriser le service, limiter les abus', 'Intérêt légitime de l’éditeur'],
        ]}
      />
      <P>Aucune décision automatisée produisant des effets juridiques à votre égard n'est prise. Aucune publicité, aucun profilage commercial.</P>

      <H2>4. Hébergement et sous-traitants</H2>
      <Table
        head={['Prestataire', 'Rôle', 'Localisation']}
        rows={[
          ['Supabase', 'Base de données et authentification (dont e-mails de confirmation)', 'Irlande, Union européenne'],
          ['Vercel', 'Hébergement de l’application', 'Société de droit américain'],
          ['Anthropic', 'Traitement des demandes d’IA. Selon ses conditions commerciales, les données de l’API ne servent pas à entraîner ses modèles', 'États-Unis'],
          ['Apple / Google', 'Achat et facturation des abonnements dans l’application ; notifications push', 'Irlande, États-Unis'],
          ['RevenueCat', 'Suivi des abonnements achetés dans l’application', 'États-Unis'],
          ['Expo', 'Acheminement des notifications push', 'États-Unis'],
          ['Stripe', 'Paiement des anciens abonnements souscrits sur le site (jusqu’à leur terme)', 'Irlande et États-Unis'],
          ['Open Food Facts', 'Recherche d’aliments : le mot recherché ou le code-barres est envoyé à ce service, sans identifiant de compte', 'France'],
        ]}
      />
      <P>
        Les transferts vers les États-Unis reposent sur les clauses contractuelles types de la
        Commission européenne et, le cas échéant, sur le cadre de protection des données UE–États-Unis.
      </P>

      <H2>5. Durées de conservation</H2>
      <Table
        head={['Donnée', 'Durée']}
        rows={[
          ['Compte, profil et suivi', 'Tant que le compte existe ; effacés immédiatement à la suppression du compte'],
          ['Photos des repas', '30 jours après la date du repas, puis suppression automatique (ou plus tôt si vous supprimez le repas ou le compte)'],
          ['Amis, réactions, commentaires, signalements', 'Tant que le compte existe ; effacés avec le compte (les signalements peuvent être conservés le temps de leur traitement)'],
          ['Jeton de notification', 'Tant que vous gardez les notifications activées ; effacé à la déconnexion ou avec le compte'],
          ['Données de facturation', '10 ans (obligation comptable), conservées chez Stripe'],
          ['Compteur d’usage de l’IA', 'Effacé avec le compte'],
          ['Journaux techniques de l’hébergeur', 'Quelques semaines au plus'],
        ]}
      />

      <H2>6. Vos droits</H2>
      <P>
        Vous disposez des droits d'accès, de rectification, d'effacement, de limitation, de
        portabilité et d'opposition, et du droit de retirer votre consentement à tout moment.
      </P>
      <UL items={[
        <><strong>Accès et portabilité</strong> : « Profil » → « Exporter mes données » (fichier JSON complet).</>,
        <><strong>Rectification</strong> : « Profil » → « Objectifs et profil nutritionnel », et vos repas dans le Journal.</>,
        <><strong>Effacement</strong> : « Profil » → « Supprimer mon compte » — immédiat et définitif. Un abonnement Apple ou Google doit aussi être résilié dans les réglages de la boutique.</>,
        <><strong>Partage</strong> : vous pouvez à tout moment arrêter de partager un repas, le supprimer, retirer un ami ou bloquer un utilisateur.</>,
        <>Toute autre demande : contactkalzo.fr@gmail.com, réponse sous un mois.</>,
      ]} />
      <P>
        En cas de désaccord, vous pouvez saisir la CNIL — 3 place de Fontenoy, 75007 Paris,{' '}
        <A href="https://www.cnil.fr">www.cnil.fr</A>.
      </P>

      <H2>7. Âge minimum</H2>
      <P>Le service est réservé aux personnes de 15 ans et plus. Aucune offre de perte de poids n'est proposée aux mineurs.</P>

      <H2>8. Sécurité</H2>
      <UL items={[
        'Connexions chiffrées de bout en bout (HTTPS/TLS)',
        'Mots de passe stockés sous forme d’empreintes',
        'Cloisonnement : chaque utilisateur n’accède qu’à ses propres données, appliqué par la base de données elle-même',
        'Photos dans un espace privé : seuls vous et vos amis (pour les repas partagés) peuvent les ouvrir, via des liens temporaires',
        'Offre, abonnement et quotas modifiables uniquement par le serveur, jamais depuis l’application',
        'Aucune clé secrète dans le code de l’application',
      ]} />
      <P>
        En cas de violation de données susceptible d'engendrer un risque pour vos droits, vous en
        serez informé dans les meilleurs délais, ainsi que la CNIL lorsque la loi l'exige.
      </P>

      <H2>9. Traceurs et stockage local</H2>
      <P>
        Kalzo n'utilise <strong>aucun traceur publicitaire ni outil de mesure d'audience tiers</strong>.
        Le stockage local de l'application sert uniquement à maintenir votre connexion et à mémoriser vos
        préférences (apparence, heures des rappels). Le site vitrine n'utilise aucun cookie.
      </P>

      <H2>10. Modifications</H2>
      <P>Cette politique peut évoluer avec le service ; la date de mise à jour figure en haut de cette page et toute modification substantielle est signalée dans l'application.</P>

      <H2>11. Contact</H2>
      <P>
        contactkalzo.fr@gmail.com — voir aussi les <A href="/mentions-legales">mentions légales</A>, les{' '}
        <A href="/cgu">CGU</A> et les <A href="/cgv">CGV</A>.
      </P>
    </LegalPage>
  )
}
