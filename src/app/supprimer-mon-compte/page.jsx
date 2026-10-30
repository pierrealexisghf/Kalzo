import { LegalPage, H2, P, UL, Note, A } from '@/components/legal/LegalPage'

export const metadata = { title: 'Supprimer mon compte', alternates: { canonical: '/supprimer-mon-compte' } }

export default function SupprimerMonCompte() {
  return (
    <LegalPage title="Supprimer mon compte" updated="30 octobre 2026">
      <P>Tu peux supprimer ton compte Kalzo à tout moment, directement dans l’application.</P>
      <H2>Dans l’application</H2>
      <UL items={[
        'Ouvre l’onglet « Profil ».',
        'Descends jusqu’à « Mes données », puis touche « Supprimer mon compte ».',
        'Confirme. La suppression est immédiate et définitive.',
      ]} />
      <P>
        Sont effacés : ton profil, tes repas et leurs étoiles, tes photos, ton sport, ton eau, ton poids, tes
        amitiés, tes réactions et commentaires, ton jeton de notification et ton compte de connexion.
        Avant de supprimer, tu peux télécharger tes données (« Profil › Exporter mes données »).
      </P>
      <Note>
        <strong>Abonnement :</strong> supprimer ton compte ne résilie pas un abonnement pris via l’App Store.
        Résilie-le aussi dans Réglages iPhone › ton nom › Abonnements › Kalzo, pour ne plus être prélevé.
      </Note>
      <H2>Tu n’as plus accès à l’application ?</H2>
      <P>
        Écris-nous à <A href="mailto:contactkalzo.fr@gmail.com">contactkalzo.fr@gmail.com</A> depuis l’adresse de ton
        compte : nous supprimons ton compte et tes données sous un mois. Voir aussi la{' '}
        <A href="/confidentialite">politique de confidentialité</A>.
      </P>
    </LegalPage>
  )
}
