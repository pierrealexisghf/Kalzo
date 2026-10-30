import Landing from '@/components/site/Landing'

export const metadata = {
  title: { absolute: 'Kalzo — Le BeReal du repas' },
  description: 'Poste ton déjeuner et ton dîner à tes amis, avec une note en étoiles et les macros, sans afficher les calories. Journal souvenirs et coach IA. 7 jours d’essai gratuit.',
  alternates: { canonical: '/' },
}

// Site vitrine statique : l'application est mobile (iOS).
export default function Home() {
  return <Landing />
}
