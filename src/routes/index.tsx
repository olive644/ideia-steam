import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { NavBar } from "@/components/nav-bar";
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card";
import { supabase } from "@/integrations/supabase/client";
import { StarRating } from "@/components/star-rating";
import { Flame, MessageSquare, Trophy } from "lucide-react";

const db = supabase as unknown as any;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Meu Ludi | sua estante social de jogos" },
      {
        name: "description",
        content: "Registre, avalie e descubra jogos com uma comunidade apaixonada por games.",
      },
      { property: "og:title", content: "Meu Ludi" },
      { property: "og:description", content: "Sua estante social de jogos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

function Home() {
  const { data: trending, isLoading: loadingT } = useQuery({
    queryKey: ["home-trending"],
    queryFn: async () => {
      const { data } = await db
        .from("jogos")
        .select("id, titulo, capa, data_lancamento")
        .order("created_at", { ascending: false })
        .limit(12);
      return (data ?? []) as GameCardData[];
    },
  });

  const { data: recentReviews } = useQuery({
    queryKey: ["home-reviews"],
    queryFn: async () => {
      const { data } = await db
        .from("avaliacoes")
        .select(
          "id, nota, texto, created_at, usuario_id, jogos(id, titulo, capa), profiles(nome, foto)",
        )
        .order("created_at", { ascending: false })
        .limit(6);
      return (data ?? []) as any[];
    },
  });

  const { data: ranking } = useQuery({
    queryKey: ["home-ranking"],
    queryFn: async () => {
      // ranking simples: buscar avaliações e agregar no client
      const { data } = await db
        .from("avaliacoes")
        .select("nota, jogos(id, titulo, capa, data_lancamento)")
        .limit(500);
      const map = new Map<string, { jogo: GameCardData; total: number; count: number }>();
      for (const r of (data ?? []) as any[]) {
        if (!r.jogos) continue;
        const key = r.jogos.id;
        const cur = map.get(key) ?? { jogo: r.jogos, total: 0, count: 0 };
        cur.total += Number(r.nota);
        cur.count += 1;
        map.set(key, cur);
      }
      return [...map.values()]
        .filter((r) => r.count >= 1)
        .map((r) => ({ ...r.jogo, media: r.total / r.count }))
        .sort((a, b) => (b.media ?? 0) - (a.media ?? 0))
        .slice(0, 6) as GameCardData[];
    },
  });

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        {/* Hero */}
        <section className="rounded-2xl border border-border bg-card p-8 md:p-12">
          <span className="inline-block rounded-full border border-border bg-background px-3 py-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Diário social de jogos
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight md:text-5xl">
            Acompanhe jogos que você ama.
            <span className="block text-muted-foreground">Compartilhe com o mundo.</span>
          </h1>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/jogos"
              className="rounded-md bg-brand px-5 py-2.5 font-semibold hover:opacity-90"
            >
              Explorar jogos
            </Link>
            <Link
              to="/auth"
              className="rounded-md border border-border px-5 py-2.5 font-medium hover:bg-accent"
            >
              Criar conta
            </Link>
          </div>
        </section>

        {/* Em alta */}
        <Section title="Em alta" icon={Flame} link={{ to: "/jogos", label: "Ver tudo" }}>
          {loadingT ? (
            <Grid>
              {Array.from({ length: 6 }).map((_, i) => (
                <GameCardSkeleton key={i} />
              ))}
            </Grid>
          ) : (
            <Grid>
              {trending?.map((j) => (
                <GameCard key={j.id} jogo={j} />
              ))}
            </Grid>
          )}
        </Section>

        {/* Ranking */}
        <Section title="Mais bem avaliados" icon={Trophy}>
          {!ranking?.length ? (
            <EmptyBox>Sem avaliações suficientes ainda.</EmptyBox>
          ) : (
            <Grid>
              {ranking.map((j) => (
                <GameCard key={j.id} jogo={j} />
              ))}
            </Grid>
          )}
        </Section>

        {/* Feed */}
        <Section title="Avaliações recentes" icon={MessageSquare}>
          {!recentReviews?.length ? (
            <EmptyBox>Nenhuma avaliação ainda — seja o primeiro a resenhar um jogo.</EmptyBox>
          ) : (
            <ul className="space-y-3">
              {recentReviews.map((r) => (
                <li key={r.id} className="rounded-lg border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    {r.jogos?.capa && (
                      <Link to="/jogos/$id" params={{ id: r.jogos.id }}>
                        <img src={r.jogos.capa} alt="" className="h-20 w-14 rounded object-cover" />
                      </Link>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Link
                          to="/perfil/$id"
                          params={{ id: r.usuario_id }}
                          className="font-semibold hover:text-brand"
                        >
                          {r.profiles?.nome ?? "Usuário"}
                        </Link>
                        <span className="text-muted-foreground">avaliou</span>
                        <Link
                          to="/jogos/$id"
                          params={{ id: r.jogos?.id }}
                          className="font-semibold hover:text-brand"
                        >
                          {r.jogos?.titulo}
                        </Link>
                      </div>
                      <div className="mt-1">
                        <StarRating value={Number(r.nota)} size={14} readOnly />
                      </div>
                      {r.texto && (
                        <p className="mt-2 line-clamp-3 text-sm text-foreground/90">{r.texto}</p>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <footer className="mt-16 border-t border-border py-6 text-center text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link to="/termos" className="hover:text-foreground">
              Termos
            </Link>
            <Link to="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
          </div>
          <p className="mt-3">© {new Date().getFullYear()} Meu Ludi</p>
        </footer>
      </main>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  link,
  children,
}: {
  title: string;
  icon: typeof Flame;
  link?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Icon className="h-5 w-5 text-brand" /> {title}
        </h2>
        {link && (
          <Link
            to={link.to as never}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {link.label} →
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {children}
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}
