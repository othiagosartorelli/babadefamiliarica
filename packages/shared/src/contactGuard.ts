// Detecta e oculta tentativas de trocar contato fora do app.
// Roda no servidor (função que envia mensagens) e no app (aviso imediato).
// Casos ambíguos devem ir para a IA de moderação; aqui ficam as regras objetivas.

export type GuardResult = {
  flagged: boolean;
  reasons: string[];
  masked: string;
};

const MASK = '••• oculto •••';

const NUMBER_WORDS = /\b(zero|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|meia|dez|onze|doze|treze|quatorze|catorze|quinze|dezesseis|dezessete|dezoito|dezenove|vinte|trinta|quarenta|cinquenta|sessenta|setenta|oitenta|noventa)\b/g;

const KEYWORDS = [
  'insta', 'instagram', 'zap', 'zapzap', 'whats', 'whatsapp', 'wpp', 'watts', 'telegram', 'tiktok',
  'facebook', 'face', 'me chama', 'me acha', 'me procura', 'procura meu', 'meu perfil', 'meu numero',
  'meu telefone', 'meu cel', 'arroba', 'ponto com', 'gmail', 'hotmail', 'outlook', 'chave pix', 'meu pix'
];

const LEET: Record<string, string> = { o: '0', l: '1', i: '1', z: '2', e: '3', a: '4', s: '5', b: '8' };

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[\u{1F51F}]/gu, '10')
    .replace(/([0-9])️?⃣/g, '$1');
}

function digitsAfterLeet(norm: string): number {
  // Conta dígitos considerando letras trocadas por números só quando já existem dígitos por perto.
  const tokens = norm.split(/\s+/);
  let count = 0;
  for (const t of tokens) {
    const realDigits = (t.match(/\d/g) || []).length;
    if (realDigits >= 2) {
      count += t.split('').filter((c) => /\d/.test(c) || LEET[c] !== undefined).length;
    } else {
      count += realDigits;
    }
  }
  return count;
}

export function checkMessage(text: string, recent: string[] = []): GuardResult {
  const reasons: string[] = [];
  const norm = normalize(text);
  // Junta as últimas mensagens para pegar números quebrados em várias partes.
  const windowNorm = normalize([...recent.slice(-4), text].join(' '));

  if (digitsAfterLeet(norm) >= 8) reasons.push('telefone');
  else if ((windowNorm.match(/\d/g) || []).length >= 8 && (norm.match(/\d/g) || []).length >= 2) reasons.push('telefone em partes');

  const words = norm.match(NUMBER_WORDS) || [];
  if (words.length >= 6) reasons.push('numero por extenso');

  if (/[a-z0-9._%+-]+\s*(@|\(at\)|\[at\])\s*[a-z0-9.-]+\.[a-z]{2,}/.test(norm)) reasons.push('email');
  else if (/(^|\s)@[a-z0-9._]{3,}/.test(norm)) reasons.push('perfil de rede social');

  if (/(https?:\/\/|www\.)\S+/.test(norm) || /\b[a-z0-9-]+\.(com|com\.br|net|me|io|app|link|bio)\b/.test(norm)) reasons.push('link');

  for (const k of KEYWORDS) {
    const re = new RegExp('(^|[^a-z])' + k.replace(/ /g, '\\s+') + '([^a-z]|$)');
    if (re.test(norm)) {
      reasons.push('palavra-chave: ' + k);
      break;
    }
  }

  const flagged = reasons.length > 0;
  return { flagged, reasons, masked: flagged ? mask(text) : text };
}

export function mask(text: string): string {
  const out = text
    .replace(/\+?\d[\d\s().\-]{6,}\d/g, MASK)
    .replace(/[^\s@]+\s*@\s*[^\s@]+\.[^\s@]+/g, MASK)
    .replace(/(^|\s)@[\w.]{2,}/g, '$1' + MASK)
    .replace(/(https?:\/\/|www\.)\S+/gi, MASK)
    .replace(/\b[\w-]+\.(com\.br|com|net|me|io|app|link|bio)\b\S*/gi, MASK);
  // Se nada específico foi encontrado (ex.: número por extenso), oculta a mensagem inteira.
  return out === text ? MASK : out;
}
