# Babá de Família Rica

App que conecta mães de famílias de alto padrão a babás com postura, com o selo dourado para quem fez a Mentoria Babá de Família Rica com Ana Maldonado.

## Estrutura

| Pasta | O que tem |
| --- | --- |
| `apps/mobile` | App iOS e Android (Expo SDK 58, React Native, Expo Router, TypeScript) |
| `packages/shared` | Regras de negócio usadas no app e no servidor: bloqueio de contato no chat, taxas, cancelamento, ranking |
| `supabase/migrations` | Banco de dados (Postgres) com as regras de privacidade (Row Level Security) |
| `supabase/functions` | Funções de servidor: `send-message` (chat com bloqueio) e `greenn-webhook` (selo da mentoria) |
| `supabase/tests` | Testes das regras de privacidade e do fluxo de contratação num Postgres comum |
| `apps/painel` | Painel web da Ana (Next.js): babás, mães, verificações, contratações, selos, revisões, conteúdos, ranking, financeiro |

Supabase do projeto: `https://lhrvwkovsfkeqjicoxuk.supabase.co` (região São Paulo). Nas sessões do Claude, use o ambiente **babadefamiliarica**.

## Rodar o app

```bash
cd apps/mobile
npm install
npx expo start
```

Sem variáveis de ambiente o app roda em **modo demonstração**, com os perfis de exemplo (fotos geradas por IA). Para ligar ao banco, crie `apps/mobile/.env`:

```
EXPO_PUBLIC_SUPABASE_URL=https://<projeto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<chave anon>
EXPO_PUBLIC_GREENN_CHECKOUT_URL=<link do checkout da mentoria na Greenn>
```

O app usa bibliotecas nativas fora do Expo Go (gradiente, desfoque, cofre seguro). Para testar no celular, gere um build de desenvolvimento: `npx eas-cli@latest build --profile development`.

## Testes

```bash
cd packages/shared && npm test          # 12 testes: chat, taxas, cancelamento, ranking
```

Testes do banco (precisa de Postgres local):

```bash
createdb bfr_test
cat supabase/tests/supabase_stub.sql supabase/migrations/*.sql | psql -v ON_ERROR_STOP=1 -d bfr_test
psql -d bfr_test < supabase/tests/rls_test.sql   # 30 testes: privacidade e contratação
```

## Subir o banco no Supabase

```bash
npx supabase link --project-ref <ref>
npx supabase db push
npx supabase functions deploy send-message greenn-webhook
npx supabase secrets set GREENN_WEBHOOK_TOKEN=<token longo> GREENN_MENTORIA_PRODUCT_ID=<id do produto> CPF_SALT=<texto aleatório>
```

Na Greenn, configure o webhook para `https://<projeto>.supabase.co/functions/v1/greenn-webhook?token=<GREENN_WEBHOOK_TOKEN>`.

## Regras importantes já implementadas

- **Mãe sem premium** vê só perfis de exemplo; com premium vê todas as babás (regra no banco).
- **Mãe não aparece em buscas.** Seu perfil só é visível para babás com quem ela conversou ou contratou.
- **Contato direto** (telefone/WhatsApp) só é liberado após pagamento confirmado e fim do prazo de cancelamento grátis (48h antes).
- **Chat**: mensagens só entram pela função `send-message`, que oculta telefone, @, e-mail, links, Pix e números por extenso. Penalidade automática: aviso, suspensão de 7 dias na 3ª tentativa em 30 dias, banimento na 5ª. Cada pessoa pode pedir revisão uma vez.
- **@ da babá** nunca aparece para mães.
- **Avaliações de mão dupla** com revelação simultânea (ou após 14 dias). A mãe nunca vê a avaliação que recebeu; só babás chamadas por ela.
- **Selo dourado**: ligado pelo webhook da Greenn (compra paga), retirado em reembolso ou chargeback; quem compra antes de ter conta ganha o selo ao se cadastrar com o mesmo CPF ou e-mail.
- **Taxas**: 1ª contratação 12% da babá + 10% da família; recontratação 8% + 8%; mãe premium paga 5%.

## Fluxo da contratação (avulsa)

Proposta da mãe → aceite da babá (prazo de até 12h) → pagamento → contato liberado no fim do prazo de cancelamento grátis (48h antes) → endereço visível para a babá 12h antes → entrada (com localização) e saída → 48h para reclamação → repasse → avaliações de mão dupla, publicadas juntas → nota, nível e ranking recalculados sozinhos.

Enquanto o sistema de pagamento não é contratado, o pagamento é **simulado** (`app_settings.pagamento_de_teste`, interruptor no Financeiro do painel). A função `mark_booking_paid` é o ponto onde o webhook do provedor (Asaas/Pagar.me) vai confirmar pagamentos reais.

## Pendências conhecidas

- Formato real do webhook da Greenn: confirmar disparando um evento de teste (os campos são lidos de forma tolerante e o payload bruto fica salvo).
- Integrações a contratar: pagamento com custódia (Asaas ou Pagar.me), verificação automática de identidade e antecedentes (CAF ou unico + Serpro; hoje a equipe confere os documentos no painel), compras nas lojas (RevenueCat), e-mail próprio (Resend) para login por código.
- Publicação: painel na Vercel (raiz `apps/painel`, variáveis `NEXT_PUBLIC_BFR_*`) e app pelo EAS (Expo).
- IA de moderação para casos ambíguos no chat (hoje: regras objetivas).
- Parecer jurídico: termos de uso, LGPD, confidencialidade.
