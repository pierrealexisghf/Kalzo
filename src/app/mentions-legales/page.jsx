import { LegalPage, H2, P, UL, A } from '@/components/legal/LegalPage'

export const metadata = { title: 'Mentions légales', alternates: { canonical: '/mentions-legales' } }

export default function MentionsLegales() {
  return (
    <LegalPage title="Mentions légales" updated="11 octobre 2026">
      <H2>1. Éditeur</H2>
      <P>L'application Kalzo est éditée par :</P>
      <UL items={[
        'GUIHENEUF Pierre-Alexis, entrepreneur individuel',
        '44720 Saint-Joachim, France',
        'SIRET : 106 588 148 00010',
        'TVA non applicable, article 293 B du code général des impôts',
        'E-mail : contactkalzo.fr@gmail.com',
        'Téléphone : 06 73 63 73 88',
      ]} />
      <P>Directeur de la publication : GUIHENEUF Pierre-Alexis.</P>

      <H2>2. Hébergement</H2>
      <UL items={[
        <>Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — <A href="https://vercel.com">vercel.com</A>.</>,
        <>Supabase Inc. — base de données et authentification — <A href="https://supabase.com">supabase.com</A>.</>,
      ]} />

      <H2>3. Autres prestataires</H2>
      <UL items={[
        'Stripe Payments Europe Ltd. — encaissement des abonnements',
        'Anthropic PBC — traitement des demandes d’intelligence artificielle (analyse de repas, recettes, plans)',
        'Open Food Facts — base collaborative utilisée pour la recherche d’aliments',
      ]} />
      <P>Leur rôle est détaillé dans la <A href="/confidentialite">politique de confidentialité</A>.</P>

      <H2>4. Propriété intellectuelle</H2>
      <P>
        Le code, le design, les textes, le logo et la marque Kalzo sont la propriété exclusive de
        GUIHENEUF Pierre-Alexis. Toute reproduction ou réutilisation sans autorisation préalable est
        interdite. Les données issues d'Open Food Facts sont publiées sous licence ODbL.
      </P>

      <H2>5. Avertissement santé</H2>
      <P>
        Kalzo fournit des estimations indicatives à titre d'information. L'application ne délivre
        aucun conseil médical et ne remplace ni un médecin, ni un diététicien, ni un professionnel
        de santé. Consultez-en un avant de modifier votre alimentation ou votre activité physique,
        en particulier en cas de pathologie, de grossesse ou de trouble du comportement alimentaire.
      </P>

      <H2>6. Responsabilité</H2>
      <P>
        L'éditeur met tout en œuvre pour assurer l'exactitude des informations et la continuité du
        service, sans pouvoir la garantir de façon absolue. Les estimations nutritionnelles produites
        par l'intelligence artificielle peuvent comporter des erreurs.
      </P>

      <H2>7. Données personnelles</H2>
      <P>
        Le traitement des données personnelles est décrit dans la <A href="/confidentialite">politique de confidentialité</A>.
        Toute demande relative à vos données : contactkalzo.fr@gmail.com.
      </P>

      <H2>8. Médiation et litiges</H2>
      <P>En cas de différend, une solution amiable sera recherchée en priorité en écrivant à contactkalzo.fr@gmail.com.</P>
      <P>
        Si vous êtes un consommateur, vous pouvez, après avoir contacté l'éditeur par écrit, recourir
        gratuitement au médiateur de la consommation : <strong>CM2C – Centre de la Médiation de la
        Consommation de Conciliateurs de Justice</strong>, 49 rue de Ponthieu, 75008 Paris,{' '}
        <A href="https://www.cm2c.net">www.cm2c.net</A>. Le litige peut être déclaré en ligne sur{' '}
        <A href="https://www.cm2c.net/declarer-un-litige.php">www.cm2c.net/declarer-un-litige.php</A> ou
        par courrier à cette adresse. Vous pouvez également utiliser la plateforme européenne de
        règlement en ligne des litiges : <A href="https://ec.europa.eu/consumers/odr">ec.europa.eu/consumers/odr</A>.
      </P>
      <P>À défaut d'accord, les tribunaux français sont compétents.</P>

      <H2>9. Contact</H2>
      <P>contactkalzo.fr@gmail.com — 06 73 63 73 88</P>
    </LegalPage>
  )
}
