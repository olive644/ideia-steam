-- A migration de seed original usou o mesmo hash de imagem do IGDB para
-- "Hollow Knight" e "Cyberpunk 2077" (co1rgi.jpg), então um dos dois estava
-- mostrando a capa errada. Como não dá pra confirmar o hash correto sem uma
-- integração real com a IGDB, removemos a capa incorreta em vez de manter
-- uma imagem errada — a interface já trata capa nula mostrando um estado
-- vazio ("sem capa"), então não quebra a listagem.
UPDATE public.jogos
SET capa = NULL
WHERE titulo = 'Cyberpunk 2077'
  AND capa = 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1rgi.jpg';

-- Evita que esse tipo de duplicidade passe despercebido de novo: impede
-- duas linhas de jogos diferentes apontando pro mesmo arquivo de capa.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jogos_capa_unica
  ON public.jogos (capa)
  WHERE capa IS NOT NULL;
