# Gestão 3D

Sistema de gestão para um pequeno negócio de impressão 3D: vendas, produtos, estoque, compras, custos e lucro.

Plano de arquitetura e decisões: [docs/PLAN.md](docs/PLAN.md).

## Stack

React 19 + TypeScript + Vite + Tailwind v4 + shadcn/ui no front-end; Supabase (Postgres, Auth, RPC) no back-end.

## Configuração

1. Crie `.env.local` com as chaves do projeto Supabase:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

2. Aplique as migrações do banco (`supabase/migrations`):

   ```
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```

3. No painel do Supabase, em **Authentication → Users → Add user**, crie seu usuário (marque *Auto Confirm User*). O primeiro usuário criado vira o dono do sistema; depois disso, desative novos cadastros em **Authentication → Sign In / Providers → Allow new users to sign up**.

4. Rode o app:

   ```
   yarn
   yarn dev
   ```

## Scripts

| Comando | O que faz |
|---|---|
| `yarn dev` | Servidor de desenvolvimento |
| `yarn build` | Checagem de tipos + build de produção |
| `yarn lint` | ESLint |
| `yarn test` | Testes das regras de negócio (TypeScript) e do banco (migrações rodando num Postgres em memória via PGlite) |

## Estrutura

```
supabase/migrations   esquema, regras e funções do banco (fonte da verdade)
supabase/tests        testes do banco (custo médio, vendas, estoque, permissões)
src/app               rotas, providers, layout
src/components        componentes compartilhados (ui/ = shadcn)
src/features          uma pasta por área: auth, sales, products, inventory…
src/domain            cálculos financeiros puros e testados
src/lib               Supabase, formatação pt-BR, erros
```
