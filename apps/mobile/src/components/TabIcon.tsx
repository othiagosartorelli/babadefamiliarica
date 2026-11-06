import { Calendar, Chat, Heart, Mail, Search, Star, User } from './icons';

export const tabIcons = {
  buscar: Search,
  favoritas: Heart,
  mensagens: Chat,
  ana: Star,
  conta: User,
  propostas: Mail,
  agenda: Calendar,
  perfil: User
};

export function TabIcon({ name, color }: { name: keyof typeof tabIcons; color: string }) {
  const Icon = tabIcons[name];
  return name === 'ana' ? <Star size={22} color={color} fill="none" /> : <Icon size={22} color={color} />;
}
