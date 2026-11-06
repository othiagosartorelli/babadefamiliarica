import type { ReactNode } from 'react';
import { Modal, Pressable, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import { colors, fonts, radius, touch } from '@/theme';
import { Check, Crown } from './icons';
import { GoldSurface } from './Gold';

export function Title({ children, size = 30, style }: { children: ReactNode; size?: number; style?: TextStyle }) {
  return <Text accessibilityRole="header" style={[{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.1, color: colors.ink }, style]}>{children}</Text>;
}

export function Body({ children, muted, size = 15, style }: { children: ReactNode; muted?: boolean; size?: number; style?: TextStyle }) {
  return <Text style={[{ fontFamily: fonts.body, fontSize: size, lineHeight: size * 1.5, color: muted ? colors.muted : colors.ink }, style]}>{children}</Text>;
}

export function Strong({ children, size = 15, style }: { children: ReactNode; size?: number; style?: TextStyle }) {
  return <Text style={[{ fontFamily: fonts.semibold, fontSize: size, color: colors.ink }, style]}>{children}</Text>;
}

export function Button({ label, onPress, variant = 'primary', disabled, style }: {
  label: string; onPress?: () => void; variant?: 'primary' | 'secondary' | 'ghost'; disabled?: boolean; style?: ViewStyle;
}) {
  const bg = disabled ? colors.disabled : variant === 'primary' ? colors.plum : variant === 'secondary' ? colors.rose : 'transparent';
  const fg = variant === 'primary' ? colors.white : colors.plum;
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [{ minHeight: 52, minWidth: touch, borderRadius: radius.pill, backgroundColor: bg, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.85 : 1 }, style]}
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: 16, color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function VerifiedBadge() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.greenBg, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 9 }} accessible accessibilityLabel="Verificada">
      <Check size={11} />
      <Text style={{ fontFamily: fonts.semibold, fontSize: 11.5, color: colors.green }}>Verificada</Text>
    </View>
  );
}

export function Chip({ label, active, onPress }: { label: string; active?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      style={{ height: 36, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center', backgroundColor: active ? colors.plum : colors.rose }}
    >
      <Text style={{ fontFamily: fonts.medium, fontSize: 14, color: active ? colors.white : colors.ink }}>{label}</Text>
    </Pressable>
  );
}

// Explicação do selo, aberta pelo botão (i).
export function SealInfoSheet({ visible, onClose, extra }: { visible: boolean; onClose: () => void; extra?: string }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(43,31,36,0.45)' }} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={{ backgroundColor: colors.ivory, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, alignItems: 'center', gap: 14 }}>
        <GoldSurface width={72} style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' }}>
          <Crown size={34} />
        </GoldSurface>
        <Title size={28} style={{ textAlign: 'center' }}>Selo Babá de Família Rica</Title>
        <Body style={{ textAlign: 'center', maxWidth: 320 }}>
          Este selo é dado às babás que concluíram a Mentoria Babá de Família Rica com Ana Maldonado: postura, apresentação, comunicação e discrição para trabalhar com famílias de alto padrão.{extra ? ' ' + extra : ''}
        </Body>
        <Button label="Entendi" onPress={onClose} style={{ marginTop: 6 }} />
      </View>
    </Modal>
  );
}
