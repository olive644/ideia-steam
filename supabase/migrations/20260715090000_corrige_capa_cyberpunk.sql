-- A migration anterior (20260715080000) apenas zerou a capa duplicada do
-- Cyberpunk 2077 (que estava usando por engano o mesmo hash de imagem do
-- Hollow Knight: co1rgi.jpg) como medida paliativo, pois não dava pra
-- confirmar o hash certo da IGDB sem uma chamada autenticada.
--
-- Como o app já suporta capas vindas da Steam (ver a migration
-- 20260715080100_adiciona_steam_appid.sql e a Edge Function
-- steam-library), usamos aqui a mesma fonte confiável: a imagem de
-- cabeçalho pública da Steam para o app 1091500 (Cyberpunk 2077), que não
-- exige autenticação e é estável.
UPDATE public.jogos
SET
  capa = 'https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg',
  steam_appid = 1091500
WHERE titulo = 'Cyberpunk 2077'
  AND capa IS NULL;
