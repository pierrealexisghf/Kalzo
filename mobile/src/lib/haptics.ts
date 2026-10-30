import * as Haptics from 'expo-haptics'

// Haptique sobre : un léger retour au toucher, un retour net en cas de succès ou d'erreur.
const safe = (fn: () => Promise<void>) => { fn().catch(() => {}) }
export const tap = () => safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light))
export const select = () => safe(() => Haptics.selectionAsync())
export const success = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success))
export const warning = () => safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning))
