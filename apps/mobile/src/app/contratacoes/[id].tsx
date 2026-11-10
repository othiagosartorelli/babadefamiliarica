// Detalhe da contratação, com as ações de cada lado em cada etapa.
import { useCallback, useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { formatBRL } from '@bfr/shared';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { openConversation } from '@/lib/data';
import {
  errorText, familyReputation, FAMILY_TAGS, fmtDateRange, getAddress, getBooking, getContact, myReviewDone, STATUS_LABEL, type Booking
} from '@/lib/bookings';
import { Back, Star } from '@/components/icons';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

function confirmAsync(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' ? window.confirm(`${title}\n\n${message}`) : true);
  return new Promise((resolve) => Alert.alert(title, message, [
    { text: 'Voltar', style: 'cancel', onPress: () => resolve(false) },
    { text: 'Confirmar', style: 'destructive', onPress: () => resolve(true) }
  ]));
}

export default function Contratacao() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session, profile } = useAuth();
  const [b, setB] = useState<Booking | null>(null);
  const [address, setAddress] = useState<{ full_address: string; notes: string | null } | null>(null);
  const [contact, setContact] = useState<{ phone: string | null; whatsapp: string | null } | null>(null);
  const [rep, setRep] = useState<{ avg: number; count: number; tags: string[] } | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const asNanny = profile?.role === 'baba';

  const load = useCallback(async () => {
    if (!id) return;
    const bk = await getBooking(id);
    setB(bk);
    if (!bk) return;
    setAddress(await getAddress(id));
    setContact(await getContact(asNanny ? bk.mother_id : bk.nanny_id));
    if (asNanny) setRep(await familyReputation(bk.mother_id));
    if (bk.status === 'concluida') setReviewed(await myReviewDone(id, asNanny ? 'family_reviews' : 'nanny_reviews'));
  }, [id, asNanny]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const call = async (fn: string, args: Record<string, unknown>, ok: string) => {
    setBusy(true);
    setMsg(null);
    const { error } = await supabase.rpc(fn, args);
    setBusy(false);
    setMsg(error ? errorText(error) : ok);
    load();
  };

  if (!b) return <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }} />;

  const familyTotal = b.service_cents + b.family_fee_cents + b.urgent_fee_cents;
  const nannyNet = b.service_cents - b.nanny_fee_cents;
  const contactOpen = !!b.contact_unlock_at && new Date(b.contact_unlock_at) <= new Date();
  const otherName = asNanny ? b.mother?.first_name ?? 'Família' : b.nanny?.full_name ?? 'Babá';
  const phone = contact?.whatsapp || contact?.phone;

  const openChat = async () => {
    if (!session) return;
    const conv = await openConversation(b.mother_id, b.nanny_id);
    if (conv) router.push({ pathname: '/chat/[id]', params: { id: conv } });
  };

  const checkIn = async () => {
    let lat: number | null = null;
    let lng: number | null = null;
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.granted) {
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = Math.round(pos.coords.latitude * 1e5) / 1e5;
        lng = Math.round(pos.coords.longitude * 1e5) / 1e5;
      }
    } catch { /* sem localização, registra só o horário */ }
    call('check_in', { p_booking: b.id, p_lat: lat, p_lng: lng }, 'Entrada registrada. Bom atendimento!');
  };

  const cancel = async () => {
    const hours = (new Date(b.starts_at).getTime() - Date.now()) / 3600000;
    const policy = asNanny
      ? 'A família recebe o valor de volta. Cancelamentos pela babá pesam no ranking.'
      : b.status !== 'paga' ? 'Nada foi cobrado ainda.'
      : hours >= 48 ? 'Você recebe o valor de volta (a taxa de serviço pode ficar retida).'
      : hours >= 24 ? '50% do valor do serviço vai para a babá.' : 'Faltam menos de 24h: o valor do serviço vai todo para a babá.';
    if (!(await confirmAsync('Cancelar contratação?', policy))) return;
    call('cancel_booking', { p_booking: b.id }, 'Contratação cancelada.');
  };

  const line = (k: string, v: string, bold = false) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      {bold ? <Strong size={16}>{k}</Strong> : <Body muted size={14}>{k}</Body>}
      {bold ? <Strong size={16}>{v}</Strong> : <Body size={14} style={{ flexShrink: 1, textAlign: 'right' }}>{v}</Body>}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ paddingHorizontal: 8 }}>
        <Pressable onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 16 }}>
        <View style={{ gap: 6 }}>
          <Title size={28}>{otherName}</Title>
          <View style={{ alignSelf: 'flex-start', backgroundColor: colors.rose, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 }}>
            <Body size={13} style={{ color: colors.plum }}>{STATUS_LABEL[b.status]}</Body>
          </View>
        </View>

        <View style={[{ backgroundColor: colors.white, borderRadius: 22, padding: 18, gap: 10 }, shadow]}>
          {line('Quando', fmtDateRange(b.starts_at, b.ends_at))}
          {line('Onde', b.area_label)}
          {line('Crianças', `${b.children_count}${b.children_ages?.length ? ` (${b.children_ages.join(' e ')} anos)` : ''}`)}
          {address && line('Endereço', address.full_address)}
          {address?.notes && line('Recado', address.notes)}
          <View style={{ height: 1, backgroundColor: colors.line }} />
          {asNanny ? (
            <>
              {line('Valor do serviço', formatBRL(b.service_cents))}
              {line(`Taxa da plataforma (${b.is_rehire ? '8' : '12'}%)`, '− ' + formatBRL(b.nanny_fee_cents))}
              {line('Você recebe', formatBRL(nannyNet), true)}
            </>
          ) : (
            <>
              {line('Serviço', formatBRL(b.service_cents))}
              {line('Taxa de serviço e garantia', formatBRL(b.family_fee_cents))}
              {b.urgent_fee_cents > 0 && line('Pedido com menos de 24h', formatBRL(b.urgent_fee_cents))}
              {line('Total', formatBRL(familyTotal), true)}
            </>
          )}
          {b.status === 'cancelada' && (asNanny
            ? line('Você recebe pelo cancelamento', formatBRL(b.nanny_cancel_share_cents))
            : b.family_refund_cents > 0 && line('Valor devolvido', formatBRL(b.family_refund_cents)))}
        </View>

        {asNanny && rep && (
          <View style={{ backgroundColor: colors.rose, borderRadius: 18, padding: 14, gap: 6 }}>
            <Body muted size={13}>O que outras babás dizem desta família</Body>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><Star /><Strong>{rep.avg.toFixed(1).replace('.', ',')} · {rep.count} {rep.count === 1 ? 'babá' : 'babás'}</Strong></View>
            {rep.tags.length > 0 && <Body size={13}>{rep.tags.map((t) => FAMILY_TAGS[t] ?? t).join(' · ')}</Body>}
          </View>
        )}

        {/* Contato direto */}
        {['paga', 'em_andamento', 'concluida'].includes(b.status) && (
          <View style={{ backgroundColor: contactOpen ? colors.greenBg : colors.white, borderRadius: 18, padding: 14, gap: 8, borderWidth: contactOpen ? 0 : 1, borderColor: colors.border }}>
            {contactOpen ? (
              phone ? (
                <>
                  <Body size={14} style={{ color: colors.green }}>Contato liberado.</Body>
                  <Button label="Abrir WhatsApp" variant="secondary" onPress={() => Linking.openURL(`https://wa.me/55${phone.replace(/\D/g, '').replace(/^55/, '')}`)} />
                </>
              ) : <Body size={14}>Contato liberado, mas {otherName.split(' ')[0]} ainda não cadastrou telefone. Use o chat do app.</Body>
            ) : (
              <Body size={14}>WhatsApp liberado em {new Date(b.contact_unlock_at!).toLocaleString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}. Até lá, conversem pelo chat do app.</Body>
            )}
          </View>
        )}

        {msg && <Strong size={14} style={{ color: colors.plum }}>{msg}</Strong>}

        {/* Ações da mãe */}
        {!asNanny && b.status === 'proposta' && <Body muted size={14}>A babá responde até {new Date(b.accept_deadline).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}.</Body>}
        {!asNanny && b.status === 'aceita' && (
          <>
            <View style={{ backgroundColor: '#FFF8E8', borderWidth: 1, borderColor: '#E8D29E', borderRadius: 16, padding: 12 }}>
              <Body size={13}>Fase de testes: o pagamento é simulado e nada é cobrado.</Body>
            </View>
            <Button label={busy ? 'Aguarde…' : `Pagar ${formatBRL(familyTotal)}`} onPress={() => call('pay_booking_test', { p_booking: b.id }, 'Pagamento confirmado. Contratação garantida!')} disabled={busy} />
          </>
        )}
        {!asNanny && b.status === 'concluida' && !reviewed && <Button label="Avaliar a babá" onPress={() => router.push({ pathname: '/avaliar/[id]', params: { id: b.id } })} />}

        {/* Ações da babá */}
        {asNanny && b.status === 'proposta' && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Recusar" variant="secondary" onPress={() => call('respond_proposal', { p_booking: b.id, p_accept: false }, 'Proposta recusada. Isso não afeta sua nota.')} disabled={busy} style={{ flex: 1 }} />
            <Button label="Aceitar proposta" onPress={() => call('respond_proposal', { p_booking: b.id, p_accept: true }, 'Proposta aceita. Avisaremos quando a família pagar.')} disabled={busy} style={{ flex: 2 }} />
          </View>
        )}
        {asNanny && b.status === 'paga' && <Button label="Registrar entrada" onPress={checkIn} disabled={busy} />}
        {asNanny && b.status === 'em_andamento' && <Button label="Registrar saída" onPress={() => call('check_out', { p_booking: b.id }, 'Atendimento concluído. O repasse sai em até 2 dias úteis.')} disabled={busy} />}
        {asNanny && b.status === 'concluida' && !reviewed && <Button label="Avaliar a família" onPress={() => router.push({ pathname: '/avaliar-familia/[id]', params: { id: b.id } })} />}

        {['proposta', 'aceita', 'paga', 'em_andamento', 'concluida'].includes(b.status) && <Button label="Abrir o chat" variant="secondary" onPress={openChat} />}
        {['proposta', 'aceita', 'paga'].includes(b.status) && (
          <Pressable onPress={cancel} accessibilityRole="button" style={{ alignSelf: 'center', padding: 12 }}>
            <Body style={{ color: colors.plum }}>Cancelar contratação</Body>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
