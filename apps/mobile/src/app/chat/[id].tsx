// Chat protegido. No app o filtro avisa na hora; no servidor (send-message) ele é obrigatório.
import { useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkMessage } from '@bfr/shared';
import { SAMPLE_NANNIES } from '@/data/sample';
import { useStore } from '@/lib/store';
import { Portrait } from '@/components/Gold';
import { Back, Lock, Send, Shield } from '@/components/icons';
import { Body, Strong } from '@/components/ui';
import { colors, fonts } from '@/theme';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const n = SAMPLE_NANNIES.find((x) => x.id === id) ?? SAMPLE_NANNIES[0];
  const { chats, addMessage } = useStore();
  const messages = chats[n.id] ?? [];
  const [draft, setDraft] = useState('');
  const [warn, setWarn] = useState(false);
  const listRef = useRef<FlatList>(null);

  const send = () => {
    const t = draft.trim();
    if (!t) return;
    const recent = messages.filter((m) => m.mine).map((m) => m.text);
    const r = checkMessage(t, recent);
    addMessage(n.id, { id: String(Date.now()), mine: true, text: r.masked, hidden: r.flagged });
    if (r.flagged) setWarn(true);
    setDraft('');
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
        <Portrait source={n.photo} width={40} height={40} radius={20} gilded={false} label={`Foto de ${n.name}`} />
        <View style={{ flex: 1 }}>
          <Strong size={16}>{n.name}</Strong>
          <Body muted size={12}>Responde em ~1h</Body>
        </View>
      </View>

      <View style={{ margin: 16, marginBottom: 0, backgroundColor: colors.rose, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Strong size={14}>Sáb, 15 nov · 19h às 23h · pago</Strong>
          <Body muted size={12}>WhatsApp liberado em qui, 13 nov, 19h</Body>
        </View>
        <Lock />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => (
            <View style={{ alignItems: item.mine ? 'flex-end' : 'flex-start' }}>
              <View style={{ maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, backgroundColor: item.mine ? colors.plum : colors.white }}>
                <Body size={15} style={{ color: item.mine ? colors.white : colors.ink }}>{item.text}</Body>
              </View>
            </View>
          )}
          ListFooterComponent={warn ? (
            <View style={{ alignSelf: 'center', maxWidth: 320, marginTop: 10, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 12, flexDirection: 'row', gap: 10 }} accessibilityLiveRegion="polite">
              <Shield color={colors.plum} size={20} />
              <Body size={13} style={{ flex: 1 }}>Para sua segurança, ocultamos contatos até o fim do prazo de cancelamento. Combinar fora do app pode levar ao bloqueio da conta.</Body>
            </View>
          ) : undefined}
        />
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', padding: 12, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line }}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={send}
            placeholder="Escreva uma mensagem"
            placeholderTextColor="#8A7A80"
            accessibilityLabel="Mensagem"
            returnKeyType="send"
            style={{ flex: 1, height: 46, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.ivory, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 15, color: colors.ink }}
          />
          <Pressable onPress={send} accessibilityRole="button" accessibilityLabel="Enviar" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: colors.plum, alignItems: 'center', justifyContent: 'center' }}>
            <Send />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
