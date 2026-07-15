import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gamepad2, Loader2 } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta | Meu Ludi" },
      { name: "description", content: "Acesse sua conta ou cadastre-se no Meu Ludi." },
    ],
  }),
  component: AuthPage,
});

const signUpSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(60),
  email: z.string().trim().email("Email inválido").max(255),
  senha: z.string().min(6, "A senha deve ter no mínimo 6 caracteres").max(72),
});
const signInSchema = z.object({
  email: z.string().trim().email("Email inválido"),
  senha: z.string().min(1, "Informe sua senha"),
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [aceito, setAceito] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/perfil", replace: true });
    });
  }, [navigate]);

  function ensureTerms(): boolean {
    if (!aceito) {
      toast.error("Você precisa aceitar os Termos e a Política de Privacidade.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ensureTerms()) return;
    setLoading(true);
    try {
      if (mode === "signup") {
        const parsed = signUpSchema.safeParse({ nome, email, senha });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.senha,
          options: {
            data: { nome: parsed.data.nome, terms_accepted_at: new Date().toISOString() },
          },
        });
        if (error) throw error;

        if (signUpData?.session) {
          navigate({ to: "/perfil", replace: true });
          return;
        }

        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.senha,
        });

        if (!signInError) {
          navigate({ to: "/perfil", replace: true });
          return;
        }

        toast.success("Registro realizado com sucesso! Sua conta foi criada com êxito.");
        setMode("signin");
        setSenha("");
      } else {
        const parsed = signInSchema.safeParse({ email, senha });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0].message);
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.senha,
        });
        if (error) throw error;
        navigate({ to: "/perfil", replace: true });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    if (!ensureTerms()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("Falha ao entrar com Google: " + error.message);
      setLoading(false);
    }
  }

  async function handleDiscord() {
    if (!ensureTerms()) return;
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: window.location.origin },
    });
    if (error) {
      toast.error("Falha ao entrar com Discord: " + error.message);
      setLoading(false);
    }
  }

  async function handleForgot() {
    if (!email) {
      toast.error("Digite seu email primeiro");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error(error.message);
    else toast.success("Enviamos um link para redefinir sua senha.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <Gamepad2 className="h-6 w-6 text-foreground" />
          <span className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Meu <span className="text-foreground">Ludi</span>
          </span>
        </Link>

        <div className="rounded-xl border border-border bg-card p-8">
          <div className="mb-6 flex rounded-lg bg-muted p-1 text-sm">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-2 font-medium transition ${
                mode === "signin" ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 font-medium transition ${
                mode === "signup" ? "bg-background text-foreground" : "text-muted-foreground"
              }`}
            >
              Cadastrar
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <Field label="Nome">
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={60}
                  required
                  className="input"
                  placeholder="Seu nome"
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input"
                placeholder="voce@email.com"
              />
            </Field>
            <Field label="Senha">
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
                minLength={mode === "signup" ? 6 : 1}
                className="input"
                placeholder="••••••••"
              />
            </Field>

            {mode === "signin" && (
              <button
                type="button"
                onClick={handleForgot}
                className="text-sm font-medium text-brand underline underline-offset-4 hover:opacity-80"
              >
                Esqueci minha senha
              </button>
            )}

            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={aceito}
                onChange={(e) => setAceito(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-foreground"
              />
              <span>
                Li e aceito os{" "}
                <Link to="/termos" className="text-foreground underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link to="/privacidade" className="text-foreground underline">
                  Política de Privacidade
                </Link>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !aceito}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            OU
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="space-y-2">
            <button
              onClick={handleGoogle}
              disabled={loading || !aceito}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background py-2.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
            >
              <GoogleIcon /> Continuar com Google
            </button>
            <button
              onClick={handleDiscord}
              disabled={loading || !aceito}
              className="flex w-full items-center justify-center gap-2 rounded-md border border-border bg-[#5865F2] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              <DiscordIcon /> Continuar com Discord
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Ao continuar você concorda com nossos{" "}
          <Link to="/termos" className="underline hover:text-foreground">
            Termos
          </Link>
          .
        </p>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: var(--color-input);
          border: 1px solid var(--color-border);
          border-radius: 0.375rem;
          padding: 0.6rem 0.75rem;
          color: var(--color-foreground);
          outline: none;
          transition: border-color .15s;
        }
        .input:focus { border-color: var(--color-ring); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.73-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.5l2.63-2.53C16.87 3.5 14.66 2.5 12 2.5 6.75 2.5 2.5 6.75 2.5 12s4.25 9.5 9.5 9.5c5.48 0 9.1-3.85 9.1-9.28 0-.62-.07-1.1-.16-1.52H12z"
      />
    </svg>
  );
}
function DiscordIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3l-.196.36a15.32 15.32 0 0 0-4.724 0L11.44 3a19.79 19.79 0 0 0-3.76 1.369C4.02 8.77 3.03 13.06 3.5 17.28a19.9 19.9 0 0 0 5.72 2.9l.463-.65a13.9 13.9 0 0 1-2.02-.97l.5-.36c3.85 1.77 8.02 1.77 11.83 0l.5.36c-.63.37-1.31.7-2.02.97l.46.65a19.9 19.9 0 0 0 5.72-2.9c.55-4.87-.9-9.12-3.16-12.91zM9.68 14.6c-1.05 0-1.9-.96-1.9-2.15s.84-2.15 1.9-2.15c1.05 0 1.91.97 1.9 2.15 0 1.19-.85 2.15-1.9 2.15zm4.64 0c-1.05 0-1.9-.96-1.9-2.15s.84-2.15 1.9-2.15c1.06 0 1.92.97 1.9 2.15 0 1.19-.84 2.15-1.9 2.15z" />
    </svg>
  );
}
