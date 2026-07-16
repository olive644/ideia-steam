-- Remove coluna email da tabela profiles para evitar exposição de dados sensíveis
-- O email já está armazenado em auth.users, que é protegido pelo Supabase
-- Esta migration corrige a vulnerabilidade de segurança onde emails podiam ser lidos anonimamente

-- Remover a coluna email da tabela profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;

-- Atualizar o trigger que cria profile para não copiar o email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, foto)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'nome',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
