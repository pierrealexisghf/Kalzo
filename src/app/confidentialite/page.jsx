import { LegalPage, H2, H3, P, UL, Note, Table, A } from '@/components/legal/LegalPage'

export const metadata = { title: 'Politique de confidentialité', alternates: { canonical: '/confidentialite' } }

export default function Confidentialite() {
  return (
    <LegalPage title="Politique de confidentialité" updated="11 octobre 2026">
      <Note>
        Kalzo traite des données sur votre alimentation, votre poids et votre activité. Elles
        peuvent révéler des informations de santé : nous ne les utilisons <strong>que pour faire
        fonctionner l'application pour vous</strong>, jamais pour de la publicité, jamais revendues.
        Vous pouvez tout télécharger ou tout supprimer en un geste depuis « Moi ».
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
        'Prénom, facultatif',
        'Date et version des conditions acceptées à l’inscription',
      ]} />
      <H3>2.2 Profil et suivi (données pouvant relever de la santé)</H3>
      <UL items={[
        'Âge, sexe, taille, poids, niveau d’activité, objectif, besoins calculés (calories, protéines, glucides, lipides)',
        'Repas enregistrés : nom, calories, macronutriments, type de repas, date',
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
        réponse. <strong>Les photos ne sont pas enregistrées par Kalzo</strong> : elles servent à
        l'analyse puis sont abandonnées. Seul le résultat que vous choisissez d'ajouter au journal est conservé.
      </P>
      <H3>2.4 Abonnement</H3>
      <UL items={[
        'Offre, statut, dates d’essai et de renouvellement, solde de crédits, identifiant de paiement',
        'Les données bancaires sont saisies chez Stripe : elles ne transitent ni ne sont stockées par Kalzo',
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
          ['Gérer l’abonnement, facturer, tenir la comptabilité', 'Exécution du contrat et obligation légale'],
          ['Sécuriser le service, limiter les abus', 'Intérêt légitime de l’éditeur'],
        ]}
      />
      <P>Aucune décision automatisée produisant des effets juridiques à votre égard n'est prise. Aucune publicité, aucun profilage commercial.</P>

      <H2>4. Hébergement et sous-traitants</H2>
      <Table
        head={['Prestataire', 'Rôle', 'Localisation']}
        rows={[
          ['Supabase', 'Base de données et authentification (dont e-mails de confirmation)', 'Europe'],
          ['Vercel', 'Hébergement de l’application', 'Société de droit américain'],
          ['Anthropic', 'Traitement des demandes d’IA. Selon ses conditions commerciales, les données de l’API ne servent pas à entraîner ses modèles', 'États-Unis'],
          ['Stripe', 'Paiement des abonnements', 'Irlande et États-Unis'],
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
        <><strong>Accès et portabilité</strong> : « Moi » → « Télécharger mes données » (fichier JSON complet).</>,
        <><strong>Rectification</strong> : « Moi » → « Mes objectifs », et vos repas dans le Journal.</>,
        <><strong>Effacement</strong> : « Moi » → « Supprimer mon compte » — immédiat et définitif, abonnement résilié.</>,
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
        'Crédits et abonnement modifiables uniquement par le serveur, jamais depuis le navigateur',
        'Aucune clé secrète dans le code de l’application côté navigateur',
      ]} />
      <P>
        En cas de violation de données susceptible d'engendrer un risque pour vos droits, vous en
        serez informé dans les meilleurs délais, ainsi que la CNIL lorsque la loi l'exige.
      </P>

      <H2>9. Cookies et stockage local</H2>
      <P>
        Kalzo n'utilise <strong>aucun cookie publicitaire ni traceur tiers</strong>. Le stockage
        local de votre navigateur sert uniquement à maintenir votre connexion et à mémoriser votre
        préférence d'apparence (clair ou sombre). Ces éléments sont strictement nécessaires ou
        relèvent d'un choix que vous faites, et ne requièrent pas de bandeau de consentement.
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
