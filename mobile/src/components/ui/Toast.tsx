import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { Pressable, StyleSheet, View } from 'react-native'
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/theme'
import { Text } from './Text'

type ToastKind = 'info' | 'success' | 'error'
type ToastItem = { id: number; message: string; kind: ToastKind; action?: { label: string; onPress: () => void } }
type Ctx = { show: (message: string, kind?: ToastKind, opts?: { action?: ToastItem['action']; duration?: number }) => void }

const ToastContext = createContext<Ctx>({ show: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const [items, setItems] = useState<ToastItem[]>([])
  const nextId = useRef(0)

  const show = useCallback<Ctx['show']>((message, kind = 'info', opts) => {
    const id = ++nextId.current
    setItems(t => [...t.slice(-1), { id, message, kind, action: opts?.action }])
    setTimeout(() => setItems(t => t.filter(x => x.id !== id)), opts?.duration ?? 3200)
  }, [])
  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { paddingTop: insets.top + 8 }]}>
        {items.map(t => (
          <Animated.View key={t.id} entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)}
            accessibilityLiveRegion="polite"
            style={{
              marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12,
              backgroundColor: t.kind === 'error' ? colors.destructive : colors.foreground,
            }}>
            <Text color="white" size={14} weight={600} style={{ flex: 1 }}>{t.message}</Text>
            {t.action && (
              <Pressable accessibilityRole="button" hitSlop={12} onPress={() => { t.action!.onPress(); setItems(x => x.filter(i => i.id !== t.id)) }}>
                <Text color="white" size={14} weight={800}>{t.action.label}</Text>
              </Pressable>
            )}
          </Animated.View>
        ))}
      </View>
    </ToastContext.Provider>
  )
}
