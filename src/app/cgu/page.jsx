import { LegalPage, H2, P, UL, Note, A } from '@/components/legal/LegalPage'

export const metadata = { title: "Conditions générales d'utilisation", alternates: { canonical: '/cgu' } }

export default function CGU() {
  return (
    <LegalPage title="Conditions générales d'utilisation" updated="11 octobre 2026">
      <H2>1. Objet</H2>
      <P>
        Les présentes conditions régissent l'accès et l'utilisation de Kalzo, application de suivi
        de l'alimentation, de l'activité physique et de l'hydratation, avec fonctions d'intelligence
        artificielle, éditée par GUIHENEUF Pierre-Alexis (SIRET 106 588 148 00010). Créer un compte
        ou utiliser le service vaut acceptation.
      </P>

      <H2>2. Compte et âge</H2>
      <P>
        L'accès nécessite un compte personnel. Le service est réservé aux personnes de{' '}
        <strong>15 ans et plus</strong>. Chacun est responsable de la confidentialité de ses
        identifiants et des actions effectuées depuis son compte. Les informations fournies (âge,
        taille, poids…) doivent être exactes : elles déterminent vos objectifs.
      </P>

      <H2>3. Le service</H2>
      <UL items={[
        'Gratuit : journal des repas, suivi du sport, de l’hydratation et du poids, recherche d’aliments, recettes, objectifs.',
        'Avec crédits IA : analyse de repas par photo ou texte, recettes « Frigo Vide », analyse de carte de restaurant, plan sur 7 jours, batch cooking, estimation d’une séance de sport.',
      ]} />
      <P>
        Un compte reçoit 10 crédits IA offerts à l'inscription, sans carte bancaire. Des crédits
        supplémentaires sont disponibles par abonnement, dans les conditions des{' '}
        <A href="/cgv">conditions générales de vente</A>.
      </P>

      <H2>4. Avertissement santé</H2>
      <Note>
        Kalzo fournit des <strong>estimations indicatives</strong> (besoins caloriques, macronutriments,
        dépenses sportives, valeurs nutritionnelles). Elles ne constituent ni un avis médical, ni un
        diagnostic, ni un régime thérapeutique, et ne remplacent pas un médecin ou un diététicien.
      </Note>
      <UL items={[
        'Les valeurs produites par l’IA ou issues de bases collaboratives peuvent être inexactes : vérifiez-les en cas de doute.',
        'Consultez un professionnel de santé avant de modifier votre alimentation ou votre activité, notamment en cas de maladie, de grossesse, d’allaitement ou de trouble du comportement alimentaire.',
        'N’utilisez pas l’application pour vous imposer des restrictions excessives. Si votre rapport à l’alimentation ou à votre poids vous inquiète, parlez-en à votre médecin ou à un professionnel de santé.',
        'Les objectifs de perte de poids ne sont pas proposés aux mineurs.',
      ]} />

      <H2>5. Usage attendu</H2>
      <P>L'utilisateur s'engage à ne pas :</P>
      <UL items={[
        'utiliser le service pour un autre usage que personnel et licite',
        'tenter d’accéder aux données d’un autre utilisateur ou de contourner les mesures de sécurité',
        'automatiser des appels à l’application, ni revendre ou détourner les fonctions d’IA',
        'envoyer à l’IA des contenus illicites ou portant atteinte aux droits de tiers',
      ]} />
      <P>
        L'éditeur peut limiter ou suspendre un accès en cas d'usage abusif (par exemple un volume
        anormal de demandes d'IA), après information de l'intéressé sauf urgence.
      </P>

      <H2>6. Disponibilité</H2>
      <P>
        L'éditeur s'efforce d'assurer un service continu, sans garantie absolue. Des interruptions
        peuvent survenir pour maintenance ou du fait d'un prestataire (hébergeur, base de données,
        fournisseur d'IA, paiement).
      </P>

      <H2>7. Données personnelles</H2>
      <P>
        Kalzo traite des données relatives à votre alimentation, votre poids et votre activité, qui
        peuvent révéler des informations de santé. Elles ne sont traitées qu'avec votre consentement
        explicite, recueilli à l'inscription, et uniquement pour faire fonctionner le service. Le détail,
        vos droits, et la possibilité de télécharger ou supprimer vos données à tout moment depuis
        « Moi » figurent dans la <A href="/confidentialite">politique de confidentialité</A>.
      </P>

      <H2>8. Suppression du compte</H2>
      <P>
        Vous pouvez supprimer votre compte à tout moment depuis « Moi » → « Supprimer mon compte ».
        Vos données et votre abonnement éventuel sont alors effacés, sans retour possible.
      </P>

      <H2>9. Propriété intellectuelle</H2>
      <P>
        L'application, son code, son design et sa marque restent la propriété de l'éditeur. Les
        données que vous saisissez vous appartiennent ; vous accordez à l'éditeur le droit de les
        traiter pour fournir le service.
      </P>

      <H2>10. Modification</H2>
      <P>
        Ces conditions peuvent évoluer. Toute modification substantielle est signalée dans
        l'application, et la date de mise à jour figure en haut de cette page.
      </P>

      <H2>11. Droit applicable</H2>
      <P>
        Droit français. Contact : contactkalzo.fr@gmail.com. Voir aussi les{' '}
        <A href="/mentions-legales">mentions légales</A>, la <A href="/confidentialite">politique de confidentialité</A> et
        les <A href="/cgv">conditions de vente</A>.
      </P>
    </LegalPage>
  )
}
