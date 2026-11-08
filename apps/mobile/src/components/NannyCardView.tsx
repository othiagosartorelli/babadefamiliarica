import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { formatBRL } from '@bfr/shared';
import type { NannyCard } from '@/data/sample';
import { colors, fonts, shadow } from '@/theme';
import { GoldSeal, Portrait } from './Gold';
import { Heart, Star } from './icons';
import { Body, VerifiedBadge } from './ui';

export function NannyCardView({ n, favorite, onFavorite, onSealInfo }: {
  n: NannyCard; favorite: boolean; onFavorite: () => void; onSealInfo: () => void;
}) {
  const open = () => router.push({ pathname: '/baba/[id]', params: { id: n.id } });
  return (
    <View style={[{ backgroundColor: colors.white, borderRadius: 24, padding: 14, flexDirection: 'row', gap: 14 }, shadow]}>
      <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={`Ver perfil de ${n.name}`}>
        <Portrait source={n.photo} uri={n.photoUri ?? undefined} width={98} height={130} radius={20} gilded={n.hasSeal} label={`Foto de ${n.name}`} />
      </Pressable>
      <View style={{ flex: 1, gap: 6 }}>
        <Pressable onPress={open} style={{ gap: 4, paddingRight: 36 }} accessibilityRole="button">
          <Text style={{ fontFamily: fonts.semibold, fontSize: 17, color: colors.ink }}>{n.name}, {n.age}</Text>
          <Body muted size={13}>{n.place}</Body>
          {n.rating !== null && n.reviews >= 3 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Star size={14} />
              <Text style={{ fontFamily: fonts.semibold, fontSize: 14, color: colors.ink }}>{n.rating.toFixed(1).replace('.', ',')}</Text>
              <Body muted size={14}>· {n.reviews} avaliações</Body>
            </View>
          ) : (
            <Body muted size={13}>Nova · Verificada</Body>
          )}
        </Pressable>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 4 }}>
          {n.hasSeal && <GoldSeal onInfo={onSealInfo} />}
          {n.verified && <VerifiedBadge />}
        </View>
        <Pressable onPress={open} style={{ gap: 4 }}>
          <Body muted size={13}>{n.line}</Body>
          <Text style={{ fontFamily: fonts.semibold, fontSize: 15, color: colors.ink }}>
            {formatBRL(n.hourlyRateCents).replace(',00', '')}<Text style={{ fontFamily: fonts.body, color: colors.muted }}> /hora</Text>
          </Text>
        </Pressable>
      </View>
      <Pressable
        onPress={onFavorite}
        accessibilityRole="button"
        accessibilityLabel={favorite ? `Remover ${n.name} das favoritas` : `Favoritar ${n.name}`}
        style={{ position: 'absolute', top: 10, right: 10, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
      >
        <Heart fill={favorite ? colors.plum : 'none'} />
      </Pressable>
    </View>
  );
}
