-- O visual padrão do site deixou de ser monocromático (cinza neutro) e
-- passou a usar verde como cor de destaque padrão, no estilo clássico de
-- diário de jogos/filmes. "Preto & Branco" continua disponível como opção
-- em Configurações, só deixa de ser o padrão para contas novas.
ALTER TABLE public.profiles
  ALTER COLUMN accent_color SET DEFAULT 'green';
