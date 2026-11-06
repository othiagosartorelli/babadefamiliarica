// Perfis de exemplo (fotos geradas por IA) usados enquanto não há cadastros reais
// e como os perfis que a mãe sem premium consegue ver.
export type NannyCard = {
  id: string;
  name: string;
  age: number;
  place: string;
  rating: number | null;
  reviews: number;
  rehired: number;
  hasSeal: boolean;
  sealSince?: string;
  verified: boolean;
  line: string;
  bio: string;
  tags: string[];
  hourlyRateCents: number;
  photo: number;
  checks: { label: string; date: string }[];
  criteria: { label: string; value: number }[];
};

export const SAMPLE_NANNIES: NannyCard[] = [
  {
    id: 'exemplo-juliana',
    name: 'Juliana Prado',
    age: 31,
    place: 'Pinheiros · 3 km',
    rating: 4.9,
    reviews: 37,
    rehired: 12,
    hasSeal: true,
    sealSince: 'março de 2026',
    verified: true,
    line: '8 anos com bebês · inglês fluente',
    bio: 'Cuido de crianças há 8 anos, 5 deles com recém-nascidos. Gosto de rotina leve, brincadeiras ao ar livre e muita leitura. Inglês fluente e disponível para viagens.',
    tags: ['Recém-nascidos', 'Inglês fluente', 'Viagens', 'CNH', 'Primeiros socorros'],
    hourlyRateCents: 6500,
    photo: require('../../assets/exemplos/juliana.png'),
    checks: [
      { label: 'Identidade e prova de vida', date: 'mar 2026' },
      { label: 'Antecedentes criminais', date: 'out 2026' },
      { label: 'Comprovante de residência', date: 'mar 2026' },
      { label: 'Primeiros socorros pediátricos', date: 'jan 2026' }
    ],
    criteria: [
      { label: 'Cuidado com a criança', value: 5 },
      { label: 'Pontualidade', value: 4.9 },
      { label: 'Comunicação', value: 4.9 },
      { label: 'Postura', value: 5 },
      { label: 'Apresentação pessoal', value: 4.8 }
    ]
  },
  {
    id: 'exemplo-beatriz',
    name: 'Beatriz Lemos',
    age: 27,
    place: 'Moema · 6 km',
    rating: 4.8,
    reviews: 21,
    rehired: 6,
    hasSeal: false,
    verified: true,
    line: 'Pedagoga · primeiros socorros',
    bio: 'Pedagoga, apaixonada por brincar e ensinar. Experiência com crianças de 2 a 8 anos e rotina escolar.',
    tags: ['Pedagogia', 'Rotina escolar', 'Primeiros socorros'],
    hourlyRateCents: 5500,
    photo: require('../../assets/exemplos/beatriz.png'),
    checks: [
      { label: 'Identidade e prova de vida', date: 'mai 2026' },
      { label: 'Antecedentes criminais', date: 'set 2026' }
    ],
    criteria: [
      { label: 'Cuidado com a criança', value: 4.9 },
      { label: 'Pontualidade', value: 4.7 },
      { label: 'Comunicação', value: 4.8 },
      { label: 'Postura', value: 4.8 },
      { label: 'Apresentação pessoal', value: 4.7 }
    ]
  }
];

export const TOTAL_IN_REGION_PLACEHOLDER = 48;
