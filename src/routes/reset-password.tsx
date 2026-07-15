import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gamepad2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [{ title: "Redefinir senha | Meu Ludi" }],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 6) {
      toast.error("Mínimo 6 caracteres");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Senha atualizada!");
    navigate({ to: "/perfil", replace: true });
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <Gamepad2 className="h-6 w-6 text-foreground" />
          <span className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Meu <span className="text-foreground">Ludi</span>
          </span>
        </div>
        <div className="rounded-xl border border-border bg-card p-8">
          <h1 className="text-2xl font-semibold">Nova senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Escolha uma senha nova para sua conta.
          </p>
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              minLength={6}
              required
              placeholder="Nova senha"
              className="w-full rounded-md border border-border bg-input px-3 py-2.5 outline-none focus:border-ring"
            />
            <button
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary py-2.5 font-semibold text-primary-foreground hover:opacity-90"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Atualizar senha
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
