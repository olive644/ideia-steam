import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const db = supabase as unknown as any;
import { NavBar } from "@/components/nav-bar";
import { StarRating } from "@/components/star-rating";
import { Heart, Play, Check, Users, Star, Calendar, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/jogos/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Jogo | Meu Ludi` },
      { name: "description", content: `Detalhes, avaliações e status do jogo #${params.id}.` },
    ],
  }),
  component: JogoPage,
});

type Jogo = {
  id: string;
  titulo: string;
  descricao: string | null;
  capa: string | null;
  data_lancamento: string | null;
  desenvolvedora: string | null;
  generos: string[];
  plataformas: string[];
};

type Avaliacao = {
  id: string;
  usuario_id: string;
  nota: number;
  texto: string | null;
  created_at: string;
  profiles?: { nome: string; foto: string | null } | null;
};

const STATUS = [
  { key: "wishlist", label: "Quero jogar", icon: Heart },
  { key: "playing", label: "Jogando", icon: Play },
  { key: "completed", label: "Joguei", icon: Check },
] as const;
type StatusKey = (typeof STATUS)[number]["key"];

function JogoPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [minhaNota, setMinhaNota] = useState<number>(0);
  const [meuTexto, setMeuTexto] = useState("");
  const [capaFalhou, setCapaFalhou] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data: jogo, isLoading: loadingJogo } = useQuery({
    queryKey: ["jogo", id],
    queryFn: async () => {
      const { data, error } = await db.from("jogos").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data as unknown as Jogo | null;
    },
  });

  const { data: reviews } = useQuery({
    queryKey: ["avaliacoes", id],
    queryFn: async () => {
      const { data, error } = await db
        .from("avaliacoes")
        .select("id, usuario_id, nota, texto, created_at, profiles(nome, foto)")
        .eq("jogo_id", id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as Avaliacao[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["jogo-stats", id],
    queryFn: async () => {
      const [{ data: agg }, { count: players }] = await Promise.all([
        db.from("avaliacoes").select("nota").eq("jogo_id", id),
        db
          .from("biblioteca")
          .select("*", { count: "exact", head: true })
          .eq("jogo_id", id)
          .in("status", ["playing", "completed"]),
      ]);
      const notas = ((agg ?? []) as unknown as { nota: number }[]).map((r) => Number(r.nota));
      const media = notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
      return { media, totalNotas: notas.length, players: players ?? 0 };
    },
  });

  const { data: minhaBiblioteca } = useQuery({
    queryKey: ["biblioteca-item", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await db
        .from("biblioteca")
        .select("status")
        .eq("jogo_id", id)
        .eq("usuario_id", userId!)
        .maybeSingle();
      return (data as unknown as { status: StatusKey } | null) ?? null;
    },
  });

  const { data: minhaAvaliacao } = useQuery({
    queryKey: ["minha-avaliacao", id, userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await db
        .from("avaliacoes")
        .select("nota, texto")
        .eq("jogo_id", id)
        .eq("usuario_id", userId!)
        .maybeSingle();
      const row = data as unknown as { nota: number; texto: string | null } | null;
      if (row) {
        setMinhaNota(Number(row.nota));
        setMeuTexto(row.texto ?? "");
      }
      return row;
    },
  });

  const setStatus = useMutation({
    mutationFn: async (status: StatusKey | null) => {
      if (!userId) throw new Error("Faça login para salvar");
      if (status === null) {
        await db.from("biblioteca").delete().eq("jogo_id", id).eq("usuario_id", userId);
      } else {
        await db
          .from("biblioteca")
          .upsert(
            { usuario_id: userId, jogo_id: id, status },
            { onConflict: "usuario_id,jogo_id" },
          );
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["biblioteca-item", id] });
      qc.invalidateQueries({ queryKey: ["jogo-stats", id] });
      toast.success("Biblioteca atualizada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveReview = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Faça login para avaliar");
      if (minhaNota < 0.5) throw new Error("Escolha uma nota");
      await db
        .from("avaliacoes")
        .upsert(
          { usuario_id: userId, jogo_id: id, nota: minhaNota, texto: meuTexto || null },
          { onConflict: "usuario_id,jogo_id" },
        );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["avaliacoes", id] });
      qc.invalidateQueries({ queryKey: ["jogo-stats", id] });
      qc.invalidateQueries({ queryKey: ["minha-avaliacao", id] });
      toast.success("Avaliação salva!");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (loadingJogo) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-5xl px-4 py-10">
          <div className="grid gap-8 md:grid-cols-[240px_1fr]">
            <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-muted" />
            <div className="space-y-3">
              <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
              <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
              <div className="h-24 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!jogo) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center">
          <p className="text-muted-foreground">Jogo não encontrado.</p>
          <Link to="/jogos" className="mt-4 inline-block text-brand">
            Voltar para explorar
          </Link>
        </main>
      </div>
    );
  }

  const ano = jogo.data_lancamento ? new Date(jogo.data_lancamento).getFullYear() : null;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        {/* Header do jogo */}
        <div className="grid gap-6 md:grid-cols-[240px_1fr] md:gap-8">
          <div className="mx-auto aspect-[3/4] w-40 overflow-hidden rounded-lg border border-border bg-muted md:mx-0 md:w-full">
            {jogo.capa && !capaFalhou ? (
              <img
                src={jogo.capa}
                alt={jogo.titulo}
                onError={() => setCapaFalhou(true)}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
                sem capa
              </div>
            )}
          </div>

          <div>
            <h1 className="text-3xl font-bold md:text-4xl">{jogo.titulo}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {jogo.desenvolvedora && (
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {jogo.desenvolvedora}
                </span>
              )}
              {ano && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" /> {ano}
                </span>
              )}
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> {stats?.players ?? 0} jogadores
              </span>
            </div>

            <div className="mt-4 flex flex-wrap gap-1.5">
              {jogo.generos.map((g) => (
                <span
                  key={g}
                  className="rounded-full border border-border bg-card px-2 py-0.5 text-xs"
                >
                  {g}
                </span>
              ))}
              {jogo.plataformas.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                >
                  {p}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">
                  {stats?.media ? stats.media.toFixed(1) : "—"}
                </span>
                <Star className="h-5 w-5 fill-brand text-brand" />
              </div>
              <span className="text-xs text-muted-foreground">
                {stats?.totalNotas ?? 0} {stats?.totalNotas === 1 ? "avaliação" : "avaliações"}
              </span>
            </div>

            {jogo.descricao && (
              <p className="mt-4 text-sm leading-relaxed text-foreground/90">{jogo.descricao}</p>
            )}
          </div>
        </div>

        {/* Ações */}
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Minha estante
          </h2>
          {!userId ? (
            <p className="mt-3 text-sm text-muted-foreground">
              <Link to="/auth" className="text-brand underline underline-offset-4">
                Entre
              </Link>{" "}
              para salvar, avaliar e escrever uma resenha.
            </p>
          ) : (
            <>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {STATUS.map(({ key, label, icon: Icon }) => {
                  const active = minhaBiblioteca?.status === key;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatus.mutate(active ? null : key)}
                      className={`flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition ${
                        active
                          ? "border-brand bg-brand"
                          : "border-border bg-background hover:border-foreground/40"
                      }`}
                    >
                      <Icon className="h-4 w-4" /> {label}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6">
                <label className="mb-2 block text-sm font-medium">Sua nota</label>
                <StarRating value={minhaNota} onChange={setMinhaNota} size={28} />
              </div>

              <div className="mt-4">
                <label className="mb-2 block text-sm font-medium">Sua resenha</label>
                <textarea
                  value={meuTexto}
                  onChange={(e) => setMeuTexto(e.target.value)}
                  rows={4}
                  placeholder="O que você achou desse jogo?"
                  className="w-full rounded-md border border-border bg-input p-3 text-sm outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  onClick={() => saveReview.mutate()}
                  disabled={saveReview.isPending}
                  className="rounded-md bg-brand px-4 py-2 text-sm font-semibold hover:opacity-90 disabled:opacity-50"
                >
                  {minhaAvaliacao ? "Atualizar avaliação" : "Publicar avaliação"}
                </button>
              </div>
            </>
          )}
        </section>

        {/* Avaliações da comunidade */}
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Avaliações da comunidade</h2>
          {!reviews?.length ? (
            <div className="mt-4 rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
              Nenhuma avaliação ainda. Seja o primeiro!
            </div>
          ) : (
            <ul className="mt-4 space-y-3">
              {reviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-center gap-3">
                    {r.profiles?.foto ? (
                      <img
                        src={r.profiles.foto}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm">
                        {(r.profiles?.nome ?? "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <Link
                        to="/perfil/$id"
                        params={{ id: r.usuario_id }}
                        className="text-sm font-semibold hover:text-brand"
                      >
                        {r.profiles?.nome ?? "Usuário"}
                      </Link>
                      <div className="mt-0.5">
                        <StarRating value={Number(r.nota)} size={14} readOnly />
                      </div>
                    </div>
                    <time className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </time>
                  </div>
                  {r.texto && (
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed">{r.texto}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
