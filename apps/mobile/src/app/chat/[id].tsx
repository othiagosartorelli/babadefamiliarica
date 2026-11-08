// Chat protegido. "exemplo-…" = conversa de demonstração local; senão, id da conversa no banco.
// O filtro avisa na hora no app; no servidor (send-message) ele é obrigatório e aplica penalidades.
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { checkMessage } from '@bfr/shared';
import { SAMPLE_NANNIES } from '@/data/sample';
import { useStore, type ChatMessage } from '@/lib/store';
import { useAuth } from '@/lib/auth';
import { supabase, signedUrl } from '@/lib/supabase';
import { Portrait } from '@/components/Gold';
import { Back, Lock, Send, Shield } from '@/components/icons';
import { Body, Strong } from '@/components/ui';
import { colors, fonts } from '@/theme';

type Header = { name: string; photo?: number; photoUri?: string | null };

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const demo = !!id?.startsWith('exemplo-');
  const sample = SAMPLE_NANNIES.find((x) => x.id === id);
  const { session } = useAuth();
  const store = useStore();
  const [live, setLive] = useState<ChatMessage[]>([]);
  const [header, setHeader] = useState<Header>({ name: sample?.name ?? '', photo: sample?.photo });
  const [draft, setDraft] = useState('');
  const [warn, setWarn] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList>(null);
  const me = session?.user.id;

  const messages = demo ? store.chats[id!] ?? [] : live;

  const loadLive = useCallback(async () => {
    if (demo || !id) return;
    const { data: conv } = await supabase.from('conversation_list').select('*').eq('id', id).maybeSingle();
    if (conv) {
      const iAmMother = conv.mother_id === me;
      setHeader({
        name: iAmMother ? conv.nanny_full_name ?? 'Babá' : conv.mother_first_name ?? 'Família',
        photoUri: iAmMother ? await signedUrl(conv.nanny_photo_path) : null
      });
    }
    const { data } = await supabase.from('messages').select('id, sender_id, body, flagged').eq('conversation_id', id).order('created_at');
    setLive((data ?? []).map((m) => ({ id: m.id, mine: m.sender_id === me, text: m.body, hidden: m.flagged })));
  }, [demo, id, me]);

  useEffect(() => {
    loadLive();
    if (demo || !id) return;
    const channel = supabase
      .channel(`conversa-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const m = payload.new as { id: string; sender_id: string; body: string; flagged: boolean };
        setLive((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { id: m.id, mine: m.sender_id === me, text: m.body, hidden: m.flagged }]));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [demo, id, me, loadLive]);

  const send = async () => {
    const t = draft.trim();
    if (!t || !id || sending) return;
    if (demo) {
      const r = checkMessage(t, messages.filter((m) => m.mine).map((m) => m.text));
      store.addMessage(id, { id: String(Date.now()), mine: true, text: r.masked, hidden: r.flagged });
      if (r.flagged) setWarn('Para sua segurança, ocultamos contatos até o fim do prazo de cancelamento. Combinar fora do app pode levar ao bloqueio da conta.');
      setDraft('');
      return;
    }
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-message', { body: { conversationId: id, body: t } });
    setSending(false);
    if (error) {
      setWarn('Não foi possível enviar. Se sua conta estiver suspensa, veja os detalhes em Perfil.');
      return;
    }
    setDraft('');
    const m = data.message as { id: string; body: string; flagged: boolean };
    setLive((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { id: m.id, mine: true, text: m.body, hidden: m.flagged }]));
    if (data.warning) {
      setWarn(data.action === 'suspensao' || data.action === 'banimento'
        ? 'Sua conta foi bloqueada por repetir tentativas de contato fora do app. Você pode pedir revisão em Perfil.'
        : 'Para sua segurança, ocultamos contatos até o fim do prazo de cancelamento. Combinar fora do app pode levar ao bloqueio da conta.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, paddingVertical: 8, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.line }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
        <Portrait source={header.photo} uri={header.photoUri ?? undefined} width={40} height={40} radius={20} gilded={false} label={`Foto de ${header.name}`} />
        <View style={{ flex: 1 }}>
          <Strong size={16}>{header.name}</Strong>
          {demo && <Body muted size={12}>Conversa de exemplo</Body>}
        </View>
      </View>

      <View style={{ margin: 16, marginBottom: 0, backgroundColor: colors.rose, borderRadius: 18, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Strong size={14}>Conversa protegida</Strong>
          <Body muted size={12}>Telefone e redes sociais ficam ocultos até a contratação ser paga e passar o prazo de cancelamento.</Body>
        </View>
        <Lock />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          ListEmptyComponent={<Body muted style={{ textAlign: 'center', marginTop: 24 }}>Diga olá e conte um pouco da rotina das crianças.</Body>}
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
              <Body size={13} style={{ flex: 1 }}>{warn}</Body>
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
            maxLength={2000}
            style={{ flex: 1, height: 46, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.ivory, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 15, color: colors.ink }}
          />
          <Pressable onPress={send} disabled={sending} accessibilityRole="button" accessibilityLabel="Enviar" style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: sending ? colors.disabled : colors.plum, alignItems: 'center', justifyContent: 'center' }}>
            <Send />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
