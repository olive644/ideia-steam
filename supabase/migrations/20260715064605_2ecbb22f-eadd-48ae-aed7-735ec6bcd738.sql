
-- Enum de status da biblioteca
CREATE TYPE public.library_status AS ENUM ('wishlist', 'playing', 'completed');

-- Enum de modo de tema
CREATE TYPE public.theme_mode AS ENUM ('light', 'dark', 'system');

-- Adicionar preferências de tema no profile
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme_mode public.theme_mode NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS accent_color TEXT NOT NULL DEFAULT 'neutral';

-- ============ JOGOS ============
CREATE TABLE public.jogos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  igdb_id BIGINT UNIQUE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  capa TEXT,
  data_lancamento DATE,
  desenvolvedora TEXT,
  generos TEXT[] NOT NULL DEFAULT '{}',
  plataformas TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.jogos TO anon;
GRANT SELECT, INSERT, UPDATE ON public.jogos TO authenticated;
GRANT ALL ON public.jogos TO service_role;

ALTER TABLE public.jogos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jogos são visíveis a todos"
  ON public.jogos FOR SELECT USING (true);

CREATE POLICY "Usuários autenticados podem inserir jogos"
  ON public.jogos FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Usuários autenticados podem atualizar jogos"
  ON public.jogos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_jogos_titulo ON public.jogos USING gin (to_tsvector('portuguese', titulo));
CREATE INDEX idx_jogos_generos ON public.jogos USING gin (generos);
CREATE INDEX idx_jogos_plataformas ON public.jogos USING gin (plataformas);
CREATE INDEX idx_jogos_data_lancamento ON public.jogos (data_lancamento DESC);

-- ============ AVALIACOES ============
CREATE TABLE public.avaliacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jogo_id UUID NOT NULL REFERENCES public.jogos(id) ON DELETE CASCADE,
  nota NUMERIC(2,1) NOT NULL CHECK (nota >= 0.5 AND nota <= 5 AND (nota * 2) = FLOOR(nota * 2)),
  texto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, jogo_id)
);

GRANT SELECT ON public.avaliacoes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;

ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Avaliações são visíveis a todos"
  ON public.avaliacoes FOR SELECT USING (true);

CREATE POLICY "Usuário cria própria avaliação"
  ON public.avaliacoes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuário edita própria avaliação"
  ON public.avaliacoes FOR UPDATE TO authenticated
  USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuário apaga própria avaliação"
  ON public.avaliacoes FOR DELETE TO authenticated
  USING (auth.uid() = usuario_id);

CREATE INDEX idx_avaliacoes_jogo ON public.avaliacoes (jogo_id, created_at DESC);
CREATE INDEX idx_avaliacoes_usuario ON public.avaliacoes (usuario_id, created_at DESC);

-- ============ BIBLIOTECA ============
CREATE TABLE public.biblioteca (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  jogo_id UUID NOT NULL REFERENCES public.jogos(id) ON DELETE CASCADE,
  status public.library_status NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (usuario_id, jogo_id)
);

GRANT SELECT ON public.biblioteca TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biblioteca TO authenticated;
GRANT ALL ON public.biblioteca TO service_role;

ALTER TABLE public.biblioteca ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Biblioteca é visível a todos"
  ON public.biblioteca FOR SELECT USING (true);

CREATE POLICY "Usuário adiciona à própria biblioteca"
  ON public.biblioteca FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuário edita própria biblioteca"
  ON public.biblioteca FOR UPDATE TO authenticated
  USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Usuário remove da própria biblioteca"
  ON public.biblioteca FOR DELETE TO authenticated
  USING (auth.uid() = usuario_id);

CREATE INDEX idx_biblioteca_usuario_status ON public.biblioteca (usuario_id, status);
CREATE INDEX idx_biblioteca_jogo_status ON public.biblioteca (jogo_id, status);

-- ============ FOLLOWS ============
CREATE TABLE public.follows (
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

GRANT SELECT ON public.follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;
GRANT ALL ON public.follows TO service_role;

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Follows são visíveis a todos"
  ON public.follows FOR SELECT USING (true);

CREATE POLICY "Usuário segue em nome próprio"
  ON public.follows FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Usuário deixa de seguir em nome próprio"
  ON public.follows FOR DELETE TO authenticated
  USING (auth.uid() = follower_id);

CREATE INDEX idx_follows_following ON public.follows (following_id);

-- ============ TRIGGERS updated_at ============
CREATE TRIGGER trg_jogos_updated_at
  BEFORE UPDATE ON public.jogos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_avaliacoes_updated_at
  BEFORE UPDATE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_biblioteca_updated_at
  BEFORE UPDATE ON public.biblioteca
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ SEED de jogos de exemplo ============
INSERT INTO public.jogos (titulo, descricao, capa, data_lancamento, desenvolvedora, generos, plataformas) VALUES
('The Legend of Zelda: Breath of the Wild', 'Aventura em mundo aberto onde Link desperta após 100 anos para salvar Hyrule.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3p2d.jpg', '2017-03-03', 'Nintendo EPD', ARRAY['Aventura','RPG'], ARRAY['Nintendo Switch','Wii U']),
('Elden Ring', 'RPG de ação em mundo aberto desenvolvido em colaboração com George R. R. Martin.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co4jni.jpg', '2022-02-25', 'FromSoftware', ARRAY['RPG','Ação'], ARRAY['PC','PlayStation 5','Xbox Series X']),
('Hollow Knight', 'Metroidvania 2D em um vasto reino subterrâneo de insetos.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg', '2017-02-24', 'Team Cherry', ARRAY['Metroidvania','Indie'], ARRAY['PC','Nintendo Switch','PlayStation 4','Xbox One']),
('Baldur''s Gate 3', 'RPG épico ambientado no universo de Dungeons & Dragons.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co670h.jpg', '2023-08-03', 'Larian Studios', ARRAY['RPG'], ARRAY['PC','PlayStation 5','Xbox Series X']),
('Stardew Valley', 'Simulador de fazenda com elementos de RPG e vida no interior.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x7c.jpg', '2016-02-26', 'ConcernedApe', ARRAY['Simulação','Indie'], ARRAY['PC','Nintendo Switch','PlayStation 4','Xbox One','Mobile']),
('Red Dead Redemption 2', 'Épico do velho oeste ambientado em 1899.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1q1f.jpg', '2018-10-26', 'Rockstar Games', ARRAY['Ação','Aventura'], ARRAY['PC','PlayStation 4','Xbox One']),
('Hades', 'Rogue-like de ação com narrativa da mitologia grega.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co39vc.jpg', '2020-09-17', 'Supergiant Games', ARRAY['Rogue-like','Indie','Ação'], ARRAY['PC','Nintendo Switch','PlayStation 5','Xbox Series X']),
('Celeste', 'Plataforma sobre escalar uma montanha e lidar com a própria mente.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co3byy.jpg', '2018-01-25', 'Maddy Makes Games', ARRAY['Plataforma','Indie'], ARRAY['PC','Nintendo Switch','PlayStation 4','Xbox One']),
('God of War Ragnarök', 'Kratos e Atreus enfrentam o Ragnarök na mitologia nórdica.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5s5v.jpg', '2022-11-09', 'Santa Monica Studio', ARRAY['Ação','Aventura'], ARRAY['PlayStation 5','PlayStation 4','PC']),
('Cyberpunk 2077', 'RPG de ação em Night City, uma megalópole obcecada por poder.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg', '2020-12-10', 'CD Projekt Red', ARRAY['RPG','Ação'], ARRAY['PC','PlayStation 5','Xbox Series X']),
('Disco Elysium', 'RPG narrativo sobre um detetive resolvendo um assassinato numa cidade decadente.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1x78.jpg', '2019-10-15', 'ZA/UM', ARRAY['RPG','Indie'], ARRAY['PC','PlayStation 4','Xbox One','Nintendo Switch']),
('Super Mario Odyssey', 'Mario explora reinos coloridos com a ajuda de Cappy.', 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1mxf.jpg', '2017-10-27', 'Nintendo EPD', ARRAY['Plataforma','Aventura'], ARRAY['Nintendo Switch']);
