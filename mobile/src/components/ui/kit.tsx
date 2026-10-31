import { useEffect, type ReactNode } from 'react'
import {
  ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { radius, useTheme, MIN_TOUCH } from '@/theme'
import { Text } from './Text'
import { Glass } from './Glass'
import * as haptics from '@/lib/haptics'

export type Tone = 'nutri' | 'sport' | 'water' | 'weight' | 'coach'
export function useTone(tone: Tone = 'nutri') {
  const { colors } = useTheme()
  return { main: colors[tone], soft: colors[`${tone}Soft` as keyof typeof colors] as string }
}

// ------------------------------------------------------------------ Card
export function Card({ children, style, tone, onPress, ...a11y }: {
  children: ReactNode; style?: StyleProp<ViewStyle>; tone?: Tone; onPress?: () => void; accessibilityLabel?: string
}) {
  const { colors } = useTheme()
  const content = [{
    backgroundColor: tone ? toneSoft(tone, colors) : colors.card, borderRadius: radius.xl, padding: 16,
    borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border,
  }, style]
  if (!onPress) return <View style={content}>{children}</View>
  return (
    <Pressable onPress={() => { haptics.tap(); onPress() }} accessibilityRole="button" {...a11y}
      style={({ pressed }) => [content, pressed && { opacity: 0.85, transform: [{ scale: 0.99 }] }]}>
      {children}
    </Pressable>
  )
}
const toneSoft = (tone: Tone, colors: ReturnType<typeof useTheme>['colors']) => colors[`${tone}Soft` as keyof typeof colors] as string

// ---------------------------------------------------------------- Button
type ButtonProps = {
  label: string; onPress?: () => void; variant?: 'primary' | 'tone' | 'outline' | 'ghost' | 'danger' | 'soft'
  tone?: Tone; loading?: boolean; disabled?: boolean; icon?: ReactNode; size?: 'md' | 'lg' | 'sm'; full?: boolean
  style?: StyleProp<ViewStyle>; accessibilityHint?: string
}
export function Button({ label, onPress, variant = 'primary', tone = 'nutri', loading, disabled, icon, size = 'md', full = true, style, accessibilityHint }: ButtonProps) {
  const { colors } = useTheme()
  const t = useTone(tone)
  const height = size === 'lg' ? 56 : size === 'sm' ? MIN_TOUCH : 50
  const bg = variant === 'primary' ? colors.primary : variant === 'tone' ? t.main : variant === 'danger' ? colors.destructive
    : variant === 'soft' ? t.soft : variant === 'outline' ? colors.card : 'transparent'
  const fg = variant === 'primary' ? colors.primaryFg : variant === 'tone' || variant === 'danger' ? '#fff'
    : variant === 'soft' ? t.main : variant === 'ghost' ? colors.mutedFg : colors.foreground
  const off = disabled || loading
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: !!off, busy: !!loading }} disabled={off}
      onPress={() => { haptics.tap(); onPress?.() }}
      style={({ pressed }) => [{
        height, borderRadius: radius.lg, backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 20,
        alignSelf: full ? 'stretch' : 'auto',
        borderWidth: variant === 'outline' ? 1 : 0, borderColor: colors.border,
        transform: [{ scale: pressed ? 0.98 : 1 }],
      }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon}<Text weight={700} size={size === 'sm' ? 14 : 16} style={{ color: fg }}>{label}</Text></>}
    </Pressable>
  )
}

// ------------------------------------------------------------------ Chip
export function Chip({ label, active, onPress, tone = 'nutri', emoji }: { label: string; active?: boolean; onPress?: () => void; tone?: Tone; emoji?: string }) {
  const { colors } = useTheme()
  const t = useTone(tone)
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!active }} onPress={() => { haptics.select(); onPress?.() }}
      style={{
        minHeight: MIN_TOUCH, paddingHorizontal: 16, borderRadius: radius.pill, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: active ? t.main : colors.muted, borderWidth: 1, borderColor: active ? t.main : 'transparent',
      }}>
      {emoji ? <Text size={15}>{emoji}</Text> : null}
      <Text weight={600} size={14} style={{ color: active ? '#fff' : colors.foreground }}>{label}</Text>
    </Pressable>
  )
}

// ------------------------------------------------------------- Segmented
export function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  const { colors } = useTheme()
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: 'row', backgroundColor: colors.muted, borderRadius: radius.lg, padding: 4 }}>
      {options.map(o => {
        const active = o.id === value
        return (
          <Pressable key={o.id} accessibilityRole="tab" accessibilityState={{ selected: active }} onPress={() => { haptics.select(); onChange(o.id) }}
            style={{ flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: active ? colors.card : 'transparent' }}>
            <Text weight={active ? 700 : 500} size={14} color={active ? 'fg' : 'muted'}>{o.label}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

// ----------------------------------------------------------------- Field
export function Field({ label, hint, error, children }: { label?: string; hint?: string; error?: string | null; children: ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      {label ? <Text size={13} weight={600} color="muted">{label}</Text> : null}
      {children}
      {error ? <Text size={13} color="destructive" accessibilityLiveRegion="polite">{error}</Text> : hint ? <Text size={12} color="muted">{hint}</Text> : null}
    </View>
  )
}

export function Input(props: TextInputProps & { invalid?: boolean }) {
  const { colors } = useTheme()
  return (
    <TextInput placeholderTextColor={colors.mutedFg} maxFontSizeMultiplier={1.4} {...props}
      style={[{
        minHeight: 52, borderRadius: radius.md, paddingHorizontal: 16, fontSize: 16, fontFamily: 'Geist_500Medium',
        color: colors.foreground, backgroundColor: colors.card, borderWidth: 1, borderColor: props.invalid ? colors.destructive : colors.border,
      }, props.multiline && { minHeight: 96, paddingTop: 14, textAlignVertical: 'top' }, props.style]} />
  )
}

// ---------------------------------------------------------------- Screens
export function Screen({ children, scroll = true, padded = true, bottomPad = 0, onRefresh, refreshing, style }: {
  children: ReactNode; scroll?: boolean; padded?: boolean; bottomPad?: number; onRefresh?: () => void; refreshing?: boolean; style?: StyleProp<ViewStyle>
}) {
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const pad = { paddingTop: insets.top + 8, paddingHorizontal: padded ? 16 : 0, paddingBottom: insets.bottom + 24 + bottomPad }
  if (!scroll) return <View style={[{ flex: 1, backgroundColor: colors.background }, pad, style]}>{children}</View>
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={[pad, { gap: 14 }, style]}
      keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControlLazy onRefresh={onRefresh} refreshing={!!refreshing} /> : undefined}>
      {children}
    </ScrollView>
  )
}
function RefreshControlLazy({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  const { colors } = useTheme()
  return <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
}

export function Header({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack?: boolean | (() => void); right?: ReactNode }) {
  const router = useRouter()
  const { colors } = useTheme()
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 }}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" hitSlop={8}
          onPress={() => (typeof onBack === 'function' ? onBack() : router.back())}>
          <Glass interactive style={{ width: MIN_TOUCH, height: MIN_TOUCH, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}
            fallbackStyle={{ backgroundColor: colors.muted }}>
            <Text size={20} weight={700}>‹</Text>
          </Glass>
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text size={28} weight={800} accessibilityRole="header" style={{ letterSpacing: -0.5 }}>{title}</Text>
        {subtitle ? <Text size={14} color="muted">{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  )
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
      <Text size={13} weight={700} color="muted" style={{ textTransform: 'uppercase', letterSpacing: 0.6 }}>{children}</Text>
      {right}
    </View>
  )
}

// -------------------------------------------------------------- Skeleton
export function Skeleton({ height = 20, width, radius: r = 12, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme()
  const o = useSharedValue(0.5)
  useEffect(() => { o.value = withRepeat(withSequence(withTiming(1, { duration: 700 }), withTiming(0.5, { duration: 700 })), -1) }, [o])
  const a = useAnimatedStyle(() => ({ opacity: o.value }))
  return <Animated.View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[{ height, width: width ?? '100%', borderRadius: r, backgroundColor: colors.muted }, a, style]} />
}

// ----------------------------------------------------------- État vide
export function EmptyState({ emoji, title, text, action }: { emoji: string; title: string; text?: string; action?: ReactNode }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 8 }}>
      <Text size={44}>{emoji}</Text>
      <Text size={18} weight={700} center>{title}</Text>
      {text ? <Text size={14} color="muted" center>{text}</Text> : null}
      {action ? <View style={{ marginTop: 12, alignSelf: 'stretch' }}>{action}</View> : null}
    </View>
  )
}

export function MacroBar({ label, value, max, color, unit = 'g' }: { label: string; value: number; max: number; color: string; unit?: string }) {
  const { colors } = useTheme()
  const pct = max > 0 ? Math.min(1, value / max) : 0
  return (
    <View style={{ gap: 6 }} accessible accessibilityLabel={`${label} : ${Math.round(value)} sur ${Math.round(max)} ${unit}`}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text size={13} weight={600}>{label}</Text>
        <Text size={13} color="muted" tabular>{Math.round(value)} / {Math.round(max)} {unit}</Text>
      </View>
      <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.muted, overflow: 'hidden' }}>
        <View style={{ height: 8, borderRadius: 4, width: `${pct * 100}%`, backgroundColor: color }} />
      </View>
    </View>
  )
}

export function MacroPills({ prot, gluc, lip, kcal }: { prot: number; gluc: number; lip: number; kcal?: number }) {
  const { colors } = useTheme()
  const items = [...(kcal != null ? [{ l: 'kcal', v: kcal, c: colors.foreground }] : []),
    { l: 'Prot.', v: prot, c: colors.prot }, { l: 'Gluc.', v: gluc, c: colors.gluc }, { l: 'Lip.', v: lip, c: colors.lip }]
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {items.map(i => (
        <View key={i.l} style={{ flex: 1, backgroundColor: colors.muted, borderRadius: radius.md, paddingVertical: 10, alignItems: 'center' }}>
          <Text size={18} weight={800} tabular style={{ color: i.c }}>{Math.round(i.v)}{i.l === 'kcal' ? '' : ' g'}</Text>
          <Text size={11} color="muted" weight={600}>{i.l}</Text>
        </View>
      ))}
    </View>
  )
}
