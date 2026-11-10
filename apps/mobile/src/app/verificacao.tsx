// Verificação (mãe e babá). Enquanto o provedor automático não é contratado, os documentos
// vão para um espaço privado e a equipe confere pelo painel; depois da análise eles são apagados.
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Back, Check } from '@/components/icons';
import { Body, Button, Strong, Title } from '@/components/ui';
import { colors, shadow } from '@/theme';

type Kind = 'identidade' | 'antecedentes' | 'endereco';
type Status = 'pendente' | 'aprovado' | 'reprovado' | 'em_revisao' | 'expirado';

const STEPS: Record<Kind, { title: string; hint: string; files: { label: string; camera?: boolean; pdf?: boolean }[] }> = {
  identidade: {
    title: 'Documento e selfie',
    hint: 'Foto do RG ou CNH (frente e verso) e uma selfie segurando o documento.',
    files: [{ label: 'Frente do documento' }, { label: 'Verso do documento' }, { label: 'Selfie com o documento', camera: true }]
  },
  antecedentes: {
    title: 'Antecedentes criminais',
    hint: 'Certidão da Polícia Federal, grátis no gov.br. Envie o PDF.',
    files: [{ label: 'Certidão da Polícia Federal (PDF)', pdf: true }]
  },
  endereco: {
    title: 'Comprovante de residência',
    hint: 'Conta de luz, água ou internet dos últimos 3 meses.',
    files: [{ label: 'Comprovante de residência' }]
  }
};

const STATUS_TEXT: Record<Status, string> = {
  pendente: 'Em análise', em_revisao: 'Em análise', aprovado: 'Aprovado', reprovado: 'Não aprovado: envie de novo', expirado: 'Vencido: envie de novo'
};

export default function Verificacao() {
  const { session, profile } = useAuth();
  const uid = session?.user.id;
  const kinds: Kind[] = profile?.role === 'baba' ? ['identidade', 'antecedentes', 'endereco'] : ['identidade', 'endereco'];
  const [status, setStatus] = useState<Partial<Record<Kind, Status>>>({});
  const [open, setOpen] = useState<Kind | null>(null);
  const [files, setFiles] = useState<Record<string, { uri: string; mime: string; name: string }>>({});
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('verifications').select('kind, status, created_at').order('created_at');
    const s: Partial<Record<Kind, Status>> = {};
    (data ?? []).forEach((v) => { s[v.kind as Kind] = v.status as Status; });
    setStatus(s);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pick = async (key: string, opts: { camera?: boolean; pdf?: boolean }) => {
    if (opts.pdf) {
      const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true });
      if (!r.canceled) setFiles((f) => ({ ...f, [key]: { uri: r.assets[0].uri, mime: 'application/pdf', name: 'certidao.pdf' } }));
      return;
    }
    if (opts.camera) await ImagePicker.requestCameraPermissionsAsync();
    const r = opts.camera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7, cameraType: ImagePicker.CameraType.front })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (!r.canceled) setFiles((f) => ({ ...f, [key]: { uri: r.assets[0].uri, mime: r.assets[0].mimeType ?? 'image/jpeg', name: 'foto.jpg' } }));
  };

  const send = async (kind: Kind) => {
    if (!uid) return;
    const step = STEPS[kind];
    if (!consent) return setMsg('Para continuar, autorize o uso dos documentos.');
    if (step.files.some((_, i) => !files[`${kind}-${i}`])) return setMsg('Envie todos os arquivos pedidos.');
    setBusy(true);
    setMsg(null);
    const paths: string[] = [];
    for (let i = 0; i < step.files.length; i++) {
      const f = files[`${kind}-${i}`];
      const body = await (await fetch(f.uri)).arrayBuffer();
      const path = `${uid}/${kind}-${Date.now()}-${i}.${f.mime === 'application/pdf' ? 'pdf' : 'jpg'}`;
      const { error } = await supabase.storage.from('documentos').upload(path, body, { contentType: f.mime });
      if (error) { setBusy(false); return setMsg('Não foi possível enviar um dos arquivos. Tente de novo.'); }
      paths.push(path);
    }
    const { error } = await supabase.from('verifications').insert({
      user_id: uid, kind, status: 'pendente', provider: 'envio-manual', consent_at: new Date().toISOString(), document_paths: paths
    });
    setBusy(false);
    if (error) return setMsg('Não foi possível registrar o envio. Tente de novo.');
    setOpen(null);
    setMsg('Recebido! Avisaremos quando a análise terminar.');
    load();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.ivory }}>
      <View style={{ paddingHorizontal: 8 }}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Voltar" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}><Back /></Pressable>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 0, gap: 14 }}>
        <Title size={30}>{profile?.role === 'baba' ? 'Verificação completa' : 'Verificação'}</Title>
        <Body muted size={14}>{profile?.role === 'baba' ? 'As famílias veem só o selo "Verificada", nunca os seus documentos.' : 'Pedimos para dar segurança às babás. Seus documentos não aparecem para ninguém.'}</Body>

        {kinds.map((k) => {
          const st = status[k];
          const done = st === 'aprovado';
          const waiting = st === 'pendente' || st === 'em_revisao';
          return (
            <View key={k} style={[{ backgroundColor: colors.white, borderRadius: 20, padding: 16, gap: 10 }, shadow]}>
              <Pressable onPress={() => !done && !waiting && setOpen(open === k ? null : k)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: done ? colors.green : colors.line }}>
                  {done && <Check size={14} color={colors.white} strokeWidth={3} />}
                </View>
                <View style={{ flex: 1 }}>
                  <Strong>{STEPS[k].title}</Strong>
                  <Body muted size={13}>{st ? STATUS_TEXT[st] : STEPS[k].hint}</Body>
                </View>
                {!done && !waiting && <Strong size={13} style={{ color: colors.plum }}>{open === k ? 'Fechar' : 'Enviar'}</Strong>}
              </Pressable>
              {open === k && (
                <View style={{ gap: 10 }}>
                  {STEPS[k].files.map((f, i) => {
                    const key = `${k}-${i}`;
                    return <Button key={key} label={files[key] ? `✓ ${f.label}` : f.label} variant="secondary" onPress={() => pick(key, f)} />;
                  })}
                  <Pressable onPress={() => setConsent((c) => !c)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.plum, backgroundColor: consent ? colors.plum : colors.white, alignItems: 'center', justifyContent: 'center' }}>
                      {consent && <Check size={12} color={colors.white} strokeWidth={3} />}
                    </View>
                    <Body size={12} style={{ flex: 1 }}>Autorizo o uso destes documentos e da minha imagem só para esta verificação. Eles são apagados depois da análise (LGPD).</Body>
                  </Pressable>
                  <Button label={busy ? 'Enviando…' : 'Enviar para análise'} onPress={() => send(k)} disabled={busy} />
                </View>
              )}
            </View>
          );
        })}
        {msg && <Strong size={14} style={{ color: colors.plum }}>{msg}</Strong>}
        <Body muted size={12}>Se discordar de um resultado, você pode pedir revisão uma vez em Ajuda.</Body>
      </ScrollView>
    </SafeAreaView>
  );
}
