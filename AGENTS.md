# Meu Ludi — notas para quem for mexer no código

- Front-end: TanStack Start + React 19 + TypeScript + Tailwind CSS.
- Banco de dados e autenticação: Supabase.
- Ao editar tabelas, sempre crie uma nova migration em `supabase/migrations`
  em vez de alterar as existentes.
- Variáveis de ambiente ficam em `.env.local` (não versionado). Veja
  `.env.example` para a lista de chaves necessárias.
