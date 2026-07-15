-- O app deixou de ter cores de destaque (verde, vermelho, azul, etc.) e
-- voltou a ser só preto & branco ("neutral"). Essa migration desfaz a
-- 20260715090100 (que tinha deixado verde como padrão) e também corrige
-- contas que já tinham salvo alguma cor diferente de "neutral".
ALTER TABLE public.profiles
  ALTER COLUMN accent_color SET DEFAULT 'neutral';

UPDATE public.profiles
SET accent_color = 'neutral'
WHERE accent_color <> 'neutral';
