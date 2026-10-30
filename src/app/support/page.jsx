import { LegalPage, H2, P, UL, A } from '@/components/legal/LegalPage'

export const metadata = { title: 'Support', alternates: { canonical: '/support' } }

export default function Support() {
  return (
    <LegalPage title="Support" updated="30 octobre 2026">
      <P>Une question, un bug, un signalement ? Écris-nous : nous répondons en général sous 48 heures ouvrées.</P>
      <P><strong><A href="mailto:contactkalzo.fr@gmail.com">contactkalzo.fr@gmail.com</A></strong></P>

      <H2>Questions fréquentes</H2>
      <UL items={[
        <><strong>Mon quota de scans n’est pas remis à zéro.</strong> Il l’est chaque lundi à 00:00, dans le fuseau horaire de ton téléphone.</>,
        <><strong>Je n’arrive pas à me connecter.</strong> Utilise « Mot de passe oublié » sur l’écran de connexion ; le lien rouvre l’application.</>,
        <><strong>Mon abonnement ne s’est pas activé.</strong> Dans Offres, touche « Restaurer mes achats ». Sinon écris-nous avec l’e-mail de ton compte.</>,
        <><strong>Comment résilier ?</strong> Réglages iPhone › ton nom › Abonnements › Kalzo.</>,
        <><strong>Signaler un contenu ou un utilisateur.</strong> Depuis le repas ou le commentaire (« ⋯ » ou appui long). Tu peux aussi bloquer la personne depuis son profil.</>,
      ]} />

      <H2>Vos données</H2>
      <P>
        Export et suppression se font dans l’application (Profil › Exporter mes données, Profil › Supprimer
        mon compte) — voir <A href="/supprimer-mon-compte">comment supprimer mon compte</A> et la{' '}
        <A href="/confidentialite">politique de confidentialité</A>.
      </P>
    </LegalPage>
  )
}
