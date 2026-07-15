import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/nav-bar";
import { toast } from "sonner";
import { Loader2, Check, Gamepad2, Info } from "lucide-react";
import { z } from "zod";
import { useTheme, ACCENT_OPTIONS, type ThemeMode } from "@/lib/theme";
import { resolveSteamProfile, importSteamLibrary } from "@/lib/game-import";

export const Route = createFileRoute("/_authenticated/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações | Meu Ludi" }] }),
  component: Configuracoes,
});

const profileSchema = z.object({
  nome: z.string().trim().min(2, "Nome muito curto").max(60),
  foto: z
    .string()
    .trim()
    .url("URL de foto inválida")
    .max(500)
    .refine((value) => !value || value.startsWith("https://"), {
      message: "A URL da foto precisa usar HTTPS.",
    })
    .or(z.literal("")),
  bio: z.string().trim().max(500, "Bio muito longa").or(z.literal("")),
});

function Configuracoes() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [foto, setFoto] = useState("");
  const [bio, setBio] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingSenha, setLoadingSenha] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setUserId(userData.user.id);
      const { data } = await supabase
        .from("profiles")
        .select("nome, foto, bio")
        .eq("id", userData.user.id)
        .maybeSingle();
      if (data) {
        setNome(data.nome ?? "");
        setFoto(data.foto ?? "");
        setBio(data.bio ?? "");
      }
      setReady(true);
    })();
  }, []);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    const parsed = profileSchema.safeParse({ nome, foto, bio });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoadingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        nome: parsed.data.nome,
        foto: parsed.data.foto || null,
        bio: parsed.data.bio || null,
      })
      .eq("id", userId);
    setLoadingProfile(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Perfil atualizado!");
      navigate({ to: "/perfil" });
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (novaSenha.length < 6) {
      toast.error("Mínimo 6 caracteres");
      return;
    }
    setLoadingSenha(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setLoadingSenha(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Senha atualizada!");
      setNovaSenha("");
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-2xl px-4 py-12">
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="mt-1 text-sm text-muted-foreground">Edite seu perfil e senha.</p>

        {!ready ? (
          <div className="mt-8 animate-pulse text-muted-foreground">Carregando…</div>
        ) : (
          <>
            <ThemeSection />
            <form
              onSubmit={handleSaveProfile}
              className="mt-8 space-y-4 rounded-xl border border-border bg-card p-6"
            >
              <h2 className="text-lg font-semibold">Perfil</h2>

              <div className="flex items-center gap-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted">
                  {foto ? (
                    <img src={foto} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-muted-foreground">
                      {(nome || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Label>URL da foto</Label>
                  <input
                    value={foto}
                    onChange={(e) => setFoto(e.target.value)}
                    placeholder="https://…"
                    className="input mt-1"
                  />
                </div>
              </div>

              <div>
                <Label>Nome</Label>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  maxLength={60}
                  className="input mt-1"
                />
              </div>

              <div>
                <Label>Bio</Label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  maxLength={500}
                  className="input mt-1 resize-none"
                  placeholder="Fale sobre seus jogos favoritos…"
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/500</p>
              </div>

              <button
                disabled={loadingProfile}
                className="flex items-center gap-2 rounded-md bg-primary px-5 py-2 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {loadingProfile && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar perfil
              </button>
            </form>

            <form
              onSubmit={handleChangePassword}
              className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6"
            >
              <h2 className="text-lg font-semibold">Alterar senha</h2>
              <div>
                <Label>Nova senha</Label>
                <input
                  type="password"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                  minLength={6}
                  className="input mt-1"
                  placeholder="••••••••"
                />
              </div>
              <button
                disabled={loadingSenha || !novaSenha}
                className="flex items-center gap-2 rounded-md bg-secondary px-5 py-2 font-semibold text-secondary-foreground hover:opacity-90 disabled:opacity-60"
              >
                {loadingSenha && <Loader2 className="h-4 w-4 animate-spin" />}
                Atualizar senha
              </button>
            </form>

            <BibliotecasSection />
          </>
        )}
      </main>

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="block text-xs font-medium uppercase tracking-wider text-muted-foreground">
      {children}
    </span>
  );
}

function BibliotecasSection() {
  const [steamInput, setSteamInput] = useState("");
  const [steamStep, setSteamStep] = useState<
    "idle" | "resolving" | "confirm" | "importing" | "done"
  >("idle");
  const [steamProfile, setSteamProfile] = useState<{
    steamid: string;
    nome: string;
    avatar: string;
  } | null>(null);
  const [resultado, setResultado] = useState<{ importados: number; total: number } | null>(null);

  async function handleResolveSteam(e: React.FormEvent) {
    e.preventDefault();
    if (!steamInput.trim()) return;
    setSteamStep("resolving");
    try {
      const profile = await resolveSteamProfile(steamInput);
      setSteamProfile(profile);
      setSteamStep("confirm");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Não foi possível encontrar esse perfil Steam",
      );
      setSteamStep("idle");
    }
  }

  async function handleImportSteam() {
    if (!steamProfile) return;
    setSteamStep("importing");
    try {
      const res = await importSteamLibrary(steamProfile.steamid);
      setResultado(res);
      setSteamStep("done");
      toast.success(`${res.importados} jogos importados da sua biblioteca Steam!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar biblioteca");
      setSteamStep("confirm");
    }
  }

  return (
    <section className="mt-6 space-y-5 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Bibliotecas conectadas</h2>
        <p className="text-xs text-muted-foreground">
          Importe os jogos que você já possui em outras plataformas para sua estante.
        </p>
      </div>

      {/* Steam — funcional */}
      <div className="rounded-lg border border-border p-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Steam</h3>
        </div>

        {steamStep === "idle" || steamStep === "resolving" ? (
          <form onSubmit={handleResolveSteam} className="mt-3 flex gap-2">
            <input
              value={steamInput}
              onChange={(e) => setSteamInput(e.target.value)}
              placeholder="Link do seu perfil Steam ou SteamID64"
              className="input flex-1"
            />
            <button
              disabled={steamStep === "resolving"}
              className="flex items-center gap-2 rounded-md border border-border px-4 text-sm font-medium hover:bg-accent disabled:opacity-60"
            >
              {steamStep === "resolving" && <Loader2 className="h-4 w-4 animate-spin" />}
              Buscar
            </button>
          </form>
        ) : null}

        {steamStep === "confirm" && steamProfile && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-md bg-muted/50 p-3">
            <div className="flex items-center gap-3">
              <img src={steamProfile.avatar} alt="" className="h-10 w-10 rounded-full" />
              <div>
                <p className="text-sm font-medium">{steamProfile.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Perfil e biblioteca precisam estar públicos
                </p>
              </div>
            </div>
            <button
              onClick={handleImportSteam}
              className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold hover:opacity-90"
            >
              Importar biblioteca
            </button>
          </div>
        )}

        {steamStep === "importing" && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Importando jogos…
          </div>
        )}

        {steamStep === "done" && resultado && (
          <p className="mt-3 text-sm text-muted-foreground">
            {resultado.importados} de {resultado.total} jogos foram adicionados à sua estante.
          </p>
        )}
      </div>

      {/* Xbox e PSN — sem API pública oficial, então tratamos com honestidade */}
      <div className="rounded-lg border border-dashed border-border p-4 opacity-80">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4" />
          <h3 className="text-sm font-semibold">Xbox / Xbox Live</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Em breve
          </span>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />A Microsoft não disponibiliza uma API
          pública e aberta para ler a biblioteca de jogos de qualquer usuário. Só é possível
          integrar com acesso de parceiro aprovado pela Microsoft, então essa importação automática
          ainda não está disponível.
        </p>
      </div>

      <div className="rounded-lg border border-dashed border-border p-4 opacity-80">
        <div className="flex items-center gap-2">
          <Gamepad2 className="h-4 w-4" />
          <h3 className="text-sm font-semibold">PlayStation Network</h3>
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Em breve
          </span>
        </div>
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />A Sony não oferece nenhuma API pública
          oficial para a PSN. As soluções que existem por aí são bibliotecas não-oficiais que
          dependem de engenharia reversa e podem parar de funcionar a qualquer momento, então
          preferimos não integrar isso até existir um caminho oficial.
        </p>
      </div>
    </section>
  );
}

function ThemeSection() {
  const { mode, accent, setMode, setAccent } = useTheme();
  const modes: { v: ThemeMode; l: string }[] = [
    { v: "light", l: "Claro" },
    { v: "dark", l: "Escuro" },
    { v: "system", l: "Sistema" },
  ];
  return (
    <section className="mt-8 space-y-5 rounded-xl border border-border bg-card p-6">
      <div>
        <h2 className="text-lg font-semibold">Aparência</h2>
        <p className="text-xs text-muted-foreground">Personalize o tema e a cor de destaque.</p>
      </div>

      <div>
        <Label>Modo</Label>
        <div className="mt-2 inline-flex rounded-md border border-border p-0.5">
          {modes.map((m) => (
            <button
              key={m.v}
              type="button"
              onClick={() => setMode(m.v)}
              className={`rounded px-3 py-1.5 text-sm ${mode === m.v ? "bg-brand text-brand-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
            >
              {m.l}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label>Cor de destaque</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {ACCENT_OPTIONS.map((opt) => {
            const selected = accent === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setAccent(opt.value)}
                title={opt.label}
                aria-label={opt.label}
                className={`relative h-9 w-9 rounded-full border-2 transition ${selected ? "border-foreground scale-110" : "border-border hover:scale-105"}`}
                style={{ background: opt.swatch }}
              >
                {selected && (
                  <Check
                    className="absolute inset-0 m-auto h-4 w-4"
                    style={{ color: opt.value === "yellow" ? "#000" : "#fff" }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
