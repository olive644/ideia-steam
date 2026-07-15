/*
  SQL de deduplicação para `public.profiles` antes de aplicar a migration
  que torna `email` e `nome` únicos.

  Use com cuidado. Primeiro execute apenas as consultas de listagem para
  revisar os dados. Depois aplique a deduplicação.
*/

-- 1) Verificar emails duplicados
SELECT email, count(*) AS total
FROM public.profiles
GROUP BY email
HAVING count(*) > 1
ORDER BY total DESC;

-- 2) Verificar nomes duplicados
SELECT nome, count(*) AS total
FROM public.profiles
GROUP BY nome
HAVING count(*) > 1
ORDER BY total DESC;

-- 3) Se houver emails duplicados, manter apenas um perfil por email.
--    Aqui mantemos o perfil mais antigo (por created_at) e removemos os outros.
BEGIN;
WITH keep AS (
  SELECT
    min(id) AS keep_id,
    email
  FROM public.profiles
  GROUP BY email
  HAVING count(*) > 1
)
DELETE FROM public.profiles p
USING keep
WHERE p.email = keep.email
  AND p.id <> keep.keep_id;
COMMIT;

-- 4) Se houver nomes duplicados, renomear os duplicados para tornar cada nome único.
--    O primeiro registro com cada nome fica inalterado.
BEGIN;
WITH numbered AS (
  SELECT
    id,
    nome,
    row_number() OVER (PARTITION BY nome ORDER BY created_at, id) AS rn
  FROM public.profiles
)
UPDATE public.profiles p
SET nome = CONCAT(p.nome, '_', numbered.rn - 1)
FROM numbered
WHERE p.id = numbered.id
  AND numbered.rn > 1;
COMMIT;

/*
  Observações:
  - Execute as consultas de listagem primeiro e revise os resultados.
  - Se você quiser preservar um perfil diferente em cada grupo de email,
    ajuste a lógica de `keep` usando outro critério.
  - Após a deduplicação, aplique a migration de constraints únicas.
*/
