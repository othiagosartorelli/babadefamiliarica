// Estado do app no modo demonstração (favoritas, premium, conversas).
// Com o Supabase configurado, estes dados passam a vir do banco.
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export type ChatMessage = { id: string; mine: boolean; text: string; hidden?: boolean };

type Store = {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  isPremium: boolean;
  setPremium: (v: boolean) => void;
  chats: Record<string, ChatMessage[]>;
  addMessage: (chatId: string, m: ChatMessage) => void;
};

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [isPremium, setPremium] = useState(false);
  const [chats, setChats] = useState<Record<string, ChatMessage[]>>({
    'exemplo-juliana': [
      { id: '1', mine: false, text: 'Oi, Carolina! Que alegria cuidar dos seus pequenos no sábado.' },
      { id: '2', mine: true, text: 'Oi, Juliana! A Helena dorme às 20h e o Pedro adora histórias.' },
      { id: '3', mine: false, text: 'Perfeito. Levo alguns livros. Algum cuidado com alimentação?' }
    ]
  });
  const value = useMemo<Store>(() => ({
    favorites,
    toggleFavorite: (id) =>
      setFavorites((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      }),
    isPremium,
    setPremium,
    chats,
    addMessage: (chatId, m) => setChats((prev) => ({ ...prev, [chatId]: [...(prev[chatId] ?? []), m] }))
  }), [favorites, isPremium, chats]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore fora do StoreProvider');
  return v;
}
