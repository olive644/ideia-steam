-- Add unique constraints to profiles to prevent duplicate email/nome
-- Run this migration with `supabase db push` or using Supabase migrations workflow

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_email_unique UNIQUE (email);

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_nome_unique UNIQUE (nome);
