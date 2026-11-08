# Painel da Ana · Babá de Família Rica

Painel web de administração (Next.js 16, App Router, TypeScript). Usado pela administradora (`profiles.role = 'admin'`) para publicar babás, ligar o selo da mentoria, dar premium de teste a mães, decidir pedidos de revisão e publicar conteúdos.

Tudo roda no navegador com a sessão da Ana e a chave **publicável** do Supabase. Quem protege os dados são as regras do banco (RLS). Nunca coloque a chave secreta (service_role) aqui.

## Rodar no computador

```bash
cd apps/painel
npm install
npm run dev        # http://localhost:3000
```

Outros comandos: `npm run build` (gera a versão de produção), `npm start` (roda a versão gerada), `npm run lint`.

## Variáveis (opcionais)

Sem variáveis, o painel usa o projeto de produção (valores em `src/lib/config.ts`). Para apontar para outro projeto, crie `apps/painel/.env.local` (veja `.env.example`):

```
NEXT_PUBLIC_BFR_SUPABASE_URL=https://<projeto>.supabase.co
NEXT_PUBLIC_BFR_SUPABASE_KEY=<chave publicável>
```

## Entrar

Use o e-mail e a senha de uma conta do Supabase Auth cujo perfil tenha `role = 'admin'`. Outras contas veem “Esta conta não tem acesso ao painel”.

## Publicar na Vercel

1. Na Vercel, **Add New → Project** e importe este repositório.
2. Em **Root Directory**, escolha `apps/painel`. O framework (Next.js) é detectado sozinho.
3. (Opcional) Em **Environment Variables**, cadastre as duas variáveis acima.
4. **Deploy**. Cada push na branch principal publica de novo.

Os vídeos dos conteúdos vão para o bucket `conteudos` do Supabase Storage (caminho `<público>/<id>.<extensão>`). O limite de tamanho de cada arquivo é o configurado no Supabase (Storage → Settings).
