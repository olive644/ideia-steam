ALTER TABLE public.jogos
  ADD COLUMN IF NOT EXISTS steam_appid INTEGER UNIQUE;

CREATE INDEX IF NOT EXISTS idx_jogos_steam_appid ON public.jogos (steam_appid);
