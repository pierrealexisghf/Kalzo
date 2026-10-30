import { Pressable, View } from 'react-native'
import { useRouter } from 'expo-router'
import { MealPhoto } from './MealPhoto'
import { Stars } from './ui/Stars'
import { EmptyState } from './ui/kit'
import type { SharedMeal } from '@/lib/social'

// Grille de repas partagés (profil). `mine` ouvre le détail ; pour un ami, la grille est en lecture seule.
export function PostGrid({ meals, mine }: { meals: SharedMeal[]; mine?: boolean }) {
  const router = useRouter()
  if (!meals.length) return <EmptyState emoji="📷" title="Aucun repas partagé" text={mine ? 'Tes repas publiés apparaîtront ici.' : 'Ses repas partagés apparaîtront ici.'} />
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
      {meals.map(m => (
        <Pressable key={m.id} disabled={!mine} accessibilityRole={mine ? 'button' : 'image'} accessibilityLabel={`${m.name}${m.stars ? `, ${m.stars} étoiles` : ''}`}
          onPress={() => router.push({ pathname: '/meal/[id]', params: { id: m.id, day: m.consumed_at.slice(0, 10) } })} style={{ width: '32.6%' }}>
          <MealPhoto path={m.thumb_path} emoji={m.emoji} radius={10} />
          {m.stars ? <View style={{ position: 'absolute', bottom: 4, left: 4, backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 }}><Stars value={m.stars} size={9} gap={1} /></View> : null}
        </Pressable>
      ))}
    </View>
  )
}
