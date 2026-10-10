import { LegalPage, H2, P, UL, A } from '@/components/legal/LegalPage'

export const metadata = { title: 'Conditions générales de vente', alternates: { canonical: '/cgv' } }

export default function CGV() {
  return (
    <LegalPage title="Conditions générales de vente" updated="11 octobre 2026">
      <H2>1. Objet</H2>
      <P>
        Les présentes conditions s'appliquent aux abonnements payants à Kalzo, édité par GUIHENEUF
        Pierre-Alexis, entrepreneur individuel (SIRET 106 588 148 00010), vendus à des consommateurs.
        Le suivi (repas, sport, eau, poids, recettes, recherche d'aliments) est gratuit ; les
        abonnements donnent accès à davantage de fonctions d'intelligence artificielle.
      </P>

      <H2>2. Offres et tarifs</H2>
      <UL items={[
        'Offre gratuite : 10 crédits IA offerts à l’inscription, une seule fois, sans carte bancaire.',
        'Standard : 6,99 € par mois, 120 crédits IA par mois.',
        'VIP : 9,99 € par mois, utilisation des fonctions IA sans décompte de crédits, dans la limite d’un usage raisonnable de 100 demandes par jour.',
      ]} />
      <P>
        Un crédit correspond à une action IA (analyse d'un repas, recette, analyse de carte, plan sur
        7 jours, batch cooking, estimation d'une séance). Les crédits d'un abonnement sont renouvelés
        à chaque échéance et <strong>ne se cumulent pas</strong> d'un mois sur l'autre. Les prix sont
        en euros, TVA non applicable (article 293 B du code général des impôts).
      </P>

      <H2>3. Essai gratuit de 7 jours</H2>
      <P>
        Chaque abonnement débute par un essai gratuit de 7 jours. Une carte bancaire est demandée à
        la souscription, mais <strong>aucun prélèvement n'a lieu pendant l'essai</strong>. Sans
        résiliation avant son terme, l'abonnement se poursuit et le premier paiement est prélevé à
        la fin de l'essai. L'essai n'est proposé qu'une fois par compte.
      </P>

      <H2>4. Paiement</H2>
      <P>
        Les paiements sont traités par Stripe. Aucune donnée bancaire ne transite ni n'est stockée
        par Kalzo. L'abonnement est mensuel, à tacite reconduction, et prélevé à chaque échéance.
        Un reçu est adressé par e-mail pour chaque paiement. En cas d'échec de paiement, l'accès aux
        crédits peut être suspendu jusqu'à régularisation.
      </P>

      <H2>5. Durée et résiliation</H2>
      <P>
        L'abonnement est sans engagement. Vous pouvez le résilier à tout moment, en un clic, depuis
        « Moi » → « Abonnement » → « Résilier mon abonnement ». La résiliation prend effet à la fin
        de la période déjà payée : vous conservez vos crédits jusque-là, puis le compte repasse en
        offre gratuite (vos données de suivi sont conservées). Aucun remboursement au prorata n'est
        effectué pour une période entamée, sauf application du droit de rétractation.
      </P>

      <H2>6. Droit de rétractation</H2>
      <P>
        Conformément à l'article L221-18 du code de la consommation, vous disposez de{' '}
        <strong>14 jours</strong> à compter de la souscription pour vous rétracter, sans avoir à
        motiver votre décision. Si vous avez demandé que le service commence pendant ce délai
        (utilisation de l'essai ou des crédits), vous devrez payer un montant proportionnel à ce qui
        a été fourni jusqu'à la rétractation (article L221-25).
      </P>
      <P>
        Pour vous rétracter, écrivez à contactkalzo.fr@gmail.com en indiquant clairement votre
        volonté de vous rétracter, l'adresse e-mail de votre compte et la date de souscription. Le
        remboursement intervient sous 14 jours, par le même moyen de paiement.
      </P>

      <H2>7. Responsabilité</H2>
      <P>
        L'éditeur met en œuvre les moyens nécessaires à la continuité et à la sécurité du service,
        sans garantie de résultat. Les estimations nutritionnelles sont indicatives et ne constituent
        pas un avis médical (voir les <A href="/cgu">conditions d'utilisation</A>). La responsabilité
        de l'éditeur ne saurait être engagée en cas de force majeure ou de fait imputable à un tiers.
        Les dispositions du présent article ne limitent pas les droits que vous tenez de la loi en
        tant que consommateur.
      </P>

      <H2>8. Évolution du service et des tarifs</H2>
      <P>
        L'éditeur peut faire évoluer les fonctionnalités. Toute modification tarifaire est annoncée
        au moins un mois à l'avance et ne s'applique qu'à compter de la période suivante ; vous
        restez libre de résilier.
      </P>

      <H2>9. Droit applicable et médiation</H2>
      <P>
        Droit français. Voir aussi les <A href="/cgu">CGU</A> et la <A href="/confidentialite">politique de confidentialité</A>.
        Service client : contactkalzo.fr@gmail.com.
      </P>
      <P>
        Si vous êtes un consommateur, vous pouvez, après avoir contacté l'éditeur par écrit, recourir
        gratuitement au médiateur de la consommation : <strong>CM2C – Centre de la Médiation de la
        Consommation de Conciliateurs de Justice</strong>, 49 rue de Ponthieu, 75008 Paris,{' '}
        <A href="https://www.cm2c.net">www.cm2c.net</A>. Le litige peut être déclaré en ligne sur{' '}
        <A href="https://www.cm2c.net/declarer-un-litige.php">www.cm2c.net/declarer-un-litige.php</A> ou par
        courrier à cette adresse.
      </P>
    </LegalPage>
  )
}
