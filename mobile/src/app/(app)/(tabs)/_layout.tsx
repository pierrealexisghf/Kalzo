import { Tabs } from 'expo-router'
import { FloatingTabBar } from '@/components/FloatingTabBar'

export default function TabsLayout() {
  return (
    <Tabs tabBar={props => <FloatingTabBar {...props} />} screenOptions={{ headerShown: false, lazy: true }}>
      <Tabs.Screen name="feed" options={{ title: 'Feed' }} />
      <Tabs.Screen name="journal" options={{ title: 'Journal' }} />
      <Tabs.Screen name="plus" options={{ title: 'Ajouter' }} listeners={{ tabPress: e => e.preventDefault() }} />
      <Tabs.Screen name="coach" options={{ title: 'Coach IA' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  )
}
