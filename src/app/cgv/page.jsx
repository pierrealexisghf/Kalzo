import { LegalPage, H2, P, UL, Note, A } from '@/components/legal/LegalPage'

export const metadata = { title: 'Conditions générales de vente', alternates: { canonical: '/cgv' } }

export default function CGV() {
  return (
    <LegalPage title="Conditions générales de vente" updated="30 octobre 2026">
      <Note>
        Les abonnements Kalzo sont achetés <strong>dans l'application, par l'intermédiaire d'Apple (App
        Store)</strong> ou de Google (Google Play). Le paiement, la facturation, les remboursements et la
        résiliation sont gérés par la boutique d'applications utilisée pour l'achat.
      </Note>

      <H2>1. Objet</H2>
      <P>
        Les présentes conditions s'appliquent aux abonnements payants à Kalzo, édité par GUIHENEUF
        Pierre-Alexis, entrepreneur individuel (SIRET 106 588 148 00010), vendus à des consommateurs.
        Le journal, le feed, les amis, les étoiles, la saisie manuelle, l'eau, le sport, le poids et
        les rappels sont gratuits et illimités ; les abonnements augmentent le nombre d'estimations par
        intelligence artificielle et donnent accès au coach IA.
      </P>

      <H2>2. Offres</H2>
      <UL items={[
        'Essai gratuit : 7 jours à la création du compte, sans carte bancaire. Scans IA illimités et coach IA inclus.',
        'Gratuit (après l’essai) : 5 scans IA par semaine, sans coach IA.',
        'Essentiel : 30 scans IA par semaine, sans coach IA.',
        'Plus : 30 scans IA par semaine, coach IA inclus (Frigo Vide, Restaurant, Plan 7 jours, Batch cooking).',
        'Illimité : scans IA illimités, coach IA inclus, dans la limite d’un usage raisonnable de 100 demandes par jour.',
      ]} />
      <P>
        Un « scan » est une estimation par IA lancée depuis le bouton « + » : analyse d'un repas (photo
        ou texte) ou estimation d'une séance de sport décrite. Le quota hebdomadaire est remis à zéro
        chaque lundi à 00:00, dans le fuseau horaire de l'utilisateur ; les scans non utilisés ne se
        cumulent pas. Si l'IA échoue, le scan est rendu. La saisie manuelle et le calcul du sport par
        MET restent gratuits et illimités.
      </P>
      <P>
        Chaque offre payante existe en durée mensuelle, trimestrielle ou annuelle, avec une réduction
        progressive. Le prix applicable est celui affiché par la boutique d'applications au moment de
        l'achat, toutes taxes comprises. L'éditeur est en franchise de TVA (article 293 B du code général
        des impôts) ; les taxes éventuelles sont celles appliquées par la boutique.
      </P>

      <H2>3. Achat et paiement</H2>
      <P>
        L'abonnement est souscrit depuis l'écran « Offres » de l'application. Le paiement est débité
        sur le compte Apple (ou Google) de l'utilisateur à la confirmation de l'achat, et traité
        exclusivement par Apple (ou Google), qui est le vendeur de l'abonnement et dont les conditions
        s'appliquent aussi. Kalzo ne reçoit ni ne stocke aucune donnée bancaire.
      </P>

      <H2>4. Renouvellement automatique et résiliation</H2>
      <P>
        L'abonnement se renouvelle <strong>automatiquement</strong> à la fin de chaque période
        (mensuelle, trimestrielle ou annuelle), au même tarif, sauf résiliation au moins 24 heures avant
        la fin de la période en cours. Il est sans engagement et se gère, se change ou se résilie à tout
        moment dans les réglages de votre compte Apple (Réglages › votre nom › Abonnements) ou de Google
        Play. Le bouton « Gérer mon abonnement » de l'application y mène directement.
      </P>
      <P>
        La résiliation prend effet à la fin de la période déjà payée : vous conservez votre offre
        jusque-là, puis le compte repasse en offre gratuite (vos données de suivi sont conservées).
        Supprimer son compte Kalzo <strong>ne résilie pas</strong> un abonnement Apple ou Google : il
        faut aussi le résilier dans les réglages de la boutique.
      </P>
      <P>
        Un changement d'offre est géré par la boutique : une offre supérieure s'applique immédiatement,
        une offre inférieure à l'échéance de la période en cours.
      </P>

      <H2>5. Droit de rétractation et remboursement</H2>
      <P>
        Vous disposez d'un délai de 14 jours à compter de l'achat pour vous rétracter (article L221-18
        du code de la consommation). L'achat étant conclu et encaissé par Apple (ou Google), la demande
        de remboursement s'effectue auprès de la boutique : pour Apple, sur{' '}
        <A href="https://reportaproblem.apple.com">reportaproblem.apple.com</A>. Si vous avez demandé que le
        service commence pendant ce délai, un montant proportionnel à ce qui a été fourni peut rester dû
        (article L221-25). Vous pouvez aussi nous écrire à contactkalzo.fr@gmail.com : nous vous aidons
        dans la démarche.
      </P>

      <H2>6. Abonnements souscrits avant l'application mobile</H2>
      <P>
        Les abonnements souscrits avant le lancement de l'application mobile restent actifs jusqu'à la
        fin de leur période déjà payée, sans nouvelle souscription ni renouvellement. Ils donnent
        l'équivalent de l'offre Plus (ancien « Standard ») ou Illimité (ancien « VIP») pendant cette
        période.
      </P>

      <H2>7. Responsabilité</H2>
      <P>
        L'éditeur met en œuvre les moyens nécessaires à la continuité et à la sécurité du service, sans
        garantie de résultat. Les estimations nutritionnelles sont indicatives et ne constituent pas un
        avis médical (voir les <A href="/cgu">conditions d'utilisation</A>). La responsabilité de l'éditeur
        ne saurait être engagée en cas de force majeure ou de fait imputable à un tiers. Ces dispositions
        ne limitent pas les droits que vous tenez de la loi en tant que consommateur.
      </P>

      <H2>8. Évolution du service et des tarifs</H2>
      <P>
        L'éditeur peut faire évoluer les fonctionnalités et les quotas. Toute modification tarifaire est
        soumise aux règles de la boutique d'applications : elle ne s'applique qu'à compter de la période
        suivante et, lorsque la boutique l'exige, après votre accord ; vous restez libre de résilier.
      </P>

      <H2>9. Droit applicable et médiation</H2>
      <P>
        Droit français. Voir aussi les <A href="/cgu">CGU</A> et la <A href="/confidentialite">politique de
        confidentialité</A>. Service client : contactkalzo.fr@gmail.com.
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
