// Selo dourado "Babá de Família Rica" e anel dourado na foto.
// O brilho passa pelo ouro a cada poucos segundos; fica parado com "reduzir movimento".
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { colors, fonts, gold } from '@/theme';
import { Crown } from './icons';

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduce);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => sub.remove();
  }, []);
  return reduce;
}

export function GoldSurface({ style, children, width = 200 }: { style?: ViewStyle; children?: ReactNode; width?: number }) {
  const reduce = useReduceMotion();
  const x = useRef(new Animated.Value(-1)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(x, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.delay(2400),
        Animated.timing(x, { toValue: -1, duration: 0, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [reduce, x]);
  const translateX = x.interpolate({ inputRange: [-1, 1], outputRange: [-width, width] });
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <LinearGradient colors={[...gold]} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={StyleSheet.absoluteFill} />
      {!reduce && (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateX }, { skewX: '-20deg' }] }]}>
          <LinearGradient
            colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ width: 40, height: '100%', alignSelf: 'center' }}
          />
        </Animated.View>
      )}
      {children}
    </View>
  );
}

export function GoldSeal({ size = 'sm', onInfo }: { size?: 'sm' | 'md'; onInfo?: () => void }) {
  const big = size === 'md';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <GoldSurface
        width={big ? 200 : 160}
        style={{
          borderRadius: 999,
          paddingVertical: big ? 7 : 4,
          paddingLeft: big ? 10 : 8,
          paddingRight: big ? 14 : 10,
          shadowColor: '#A97F36',
          shadowOpacity: 0.35,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 2 },
          elevation: 3
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }} accessible accessibilityLabel="Selo Babá de Família Rica">
          <Crown size={big ? 17 : 13} />
          <Text style={{ fontFamily: fonts.bold, fontSize: big ? 13.5 : 11.5, color: colors.goldText }}>Babá de Família Rica</Text>
        </View>
      </GoldSurface>
      {onInfo && (
        <Pressable
          onPress={onInfo}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="O que é o selo Babá de Família Rica?"
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: big ? 22 : 18, height: big ? 22 : 18, borderRadius: 11, borderWidth: 1.5, borderColor: colors.goldEdge, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: 'Georgia', fontWeight: '800', fontSize: big ? 13 : 11, color: '#7A5A22' }}>i</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

// Foto com anel dourado (estilo stories) para quem tem o selo.
export function Portrait({ uri, source, width, height, radius, gilded, label }: {
  uri?: string; source?: number; width: number; height: number; radius: number; gilded: boolean; label: string;
}) {
  const img = (
    <Image
      source={source ?? { uri }}
      accessibilityLabel={label}
      contentFit="cover"
      style={{ width: gilded ? width - 6 : width, height: gilded ? height - 6 : height, borderRadius: gilded ? radius - 3 : radius, borderWidth: gilded ? 2 : 0, borderColor: colors.white, backgroundColor: colors.rose }}
    />
  );
  if (!gilded) return img;
  return (
    <GoldSurface width={width} style={{ padding: 3, borderRadius: radius + 1 }}>
      {img}
    </GoldSurface>
  );
}
