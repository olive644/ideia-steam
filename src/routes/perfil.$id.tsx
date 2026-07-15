import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/nav-bar";
import { GameCard, type GameCardData } from "@/components/game-card";
import { StarRating } from "@/components/star-rating";
import { UserPlus, UserCheck, Gamepad2, Star, Users } from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { toast } from "sonner";

const db = supabase as unknown as any;

export const Route = createFileRoute("/perfil/$id")({
  head: () => ({ meta: [{ title: "Perfil | Meu Ludi" }] }),
  component: PublicPerfil,
});

function PublicPerfil() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [meuId, setMeuId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMeuId(data.user?.id ?? null));
  }, []);

  const { data: profile } = useQuery({
    queryKey: ["profile", id],
    queryFn: async () => {
      const { data } = await db
        .from("profiles")
        .select("id, nome, foto, bio")
        .eq("id", id)
        .maybeSingle();
      return data as { id: string; nome: string; foto: string | null; bio: string | null } | null;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["profile-stats", id],
    queryFn: async () => {
      const [{ count: played }, { count: reviews }, { count: followers }, { count: following }] =
        await Promise.all([
          db
            .from("biblioteca")
            .select("*", { count: "exact", head: true })
            .eq("usuario_id", id)
            .eq("status", "completed"),
          db.from("avaliacoes").select("*", { count: "exact", head: true }).eq("usuario_id", id),
          db.from("follows").select("*", { count: "exact", head: true }).eq("following_id", id),
          db.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", id),
        ]);
      return {
        played: played ?? 0,
        reviews: reviews ?? 0,
        followers: followers ?? 0,
        following: following ?? 0,
      };
    },
  });

  const { data: isFollowing } = useQuery({
    queryKey: ["is-following", meuId, id],
    enabled: !!meuId && meuId !== id,
    queryFn: async () => {
      const { data } = await db
        .from("follows")
        .select("follower_id")
        .eq("follower_id", meuId)
        .eq("following_id", id)
        .maybeSingle();
      return !!data;
    },
  });

  const toggleFollow = useMutation({
    mutationFn: async () => {
      if (!meuId) throw new Error("Faça login");
      if (isFollowing) {
        await db.from("follows").delete().eq("follower_id", meuId).eq("following_id", id);
      } else {
        await db.from("follows").insert({ follower_id: meuId, following_id: id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["is-following"] });
      qc.invalidateQueries({ queryKey: ["profile-stats", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const { data: jogos } = useQuery({
    queryKey: ["profile-jogos", id],
    queryFn: async () => {
      const { data } = await db
        .from("biblioteca")
        .select("status, jogos(id, titulo, capa, data_lancamento)")
        .eq("usuario_id", id)
        .order("updated_at", { ascending: false })
        .limit(60);
      return ((data ?? []) as any[])
        .filter((r) => r.jogos)
        .map((r) => ({ ...r.jogos, _status: r.status })) as (GameCardData & { _status: string })[];
    },
  });

  const { data: avaliacoes } = useQuery({
    queryKey: ["profile-avaliacoes", id],
    queryFn: async () => {
      const { data } = await db
        .from("avaliacoes")
        .select("id, nota, texto, created_at, jogos(id, titulo, capa)")
        .eq("usuario_id", id)
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as any[];
    },
  });

  if (!profile) {
    return (
      <div className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">
          Perfil não encontrado.
        </main>
      </div>
    );
  }

  const isSelf = meuId === id;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex flex-col items-center gap-6 rounded-xl border border-border bg-card p-6 text-center md:flex-row md:text-left">
          {profile.foto ? (
            <img
              src={profile.foto}
              alt={profile.nome}
              className="h-28 w-28 rounded-full border-2 border-border object-cover"
            />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-full border-2 border-border bg-muted text-3xl font-bold">
              {(profile.nome || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.nome}</h1>
            {profile.bio && <p className="mt-2 text-sm text-foreground/80">{profile.bio}</p>}
            <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
              {isSelf ? (
                <Link
                  to="/configuracoes"
                  className="rounded-md border border-border px-4 py-1.5 text-sm hover:bg-accent"
                >
                  Editar perfil
                </Link>
              ) : meuId ? (
                <button
                  onClick={() => toggleFollow.mutate()}
                  className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium ${
                    isFollowing ? "border border-border" : "bg-brand"
                  }`}
                >
                  {isFollowing ? (
                    <>
                      <UserCheck className="h-4 w-4" /> Seguindo
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Seguir
                    </>
                  )}
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard icon={Gamepad2} label="Jogados" value={stats?.played ?? 0} />
          <StatCard icon={Star} label="Avaliações" value={stats?.reviews ?? 0} />
          <StatCard icon={Users} label="Seguidores" value={stats?.followers ?? 0} />
          <StatCard icon={Users} label="Seguindo" value={stats?.following ?? 0} />
        </div>

        <Tabs.Root defaultValue="jogos" className="mt-8">
          <Tabs.List className="flex gap-1 border-b border-border">
            {[
              { v: "jogos", l: "Jogos" },
              { v: "avaliacoes", l: "Avaliações" },
            ].map((t) => (
              <Tabs.Trigger
                key={t.v}
                value={t.v}
                className="border-b-2 border-transparent px-4 py-2 text-sm text-muted-foreground data-[state=active]:border-brand data-[state=active]:text-foreground"
              >
                {t.l}
              </Tabs.Trigger>
            ))}
          </Tabs.List>

          <Tabs.Content value="jogos" className="mt-6">
            {!jogos?.length ? (
              <p className="text-center text-sm text-muted-foreground">
                Ainda não adicionou nenhum jogo.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {jogos.map((j) => (
                  <GameCard key={j.id + j._status} jogo={j} />
                ))}
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="avaliacoes" className="mt-6">
            {!avaliacoes?.length ? (
              <p className="text-center text-sm text-muted-foreground">Sem avaliações ainda.</p>
            ) : (
              <ul className="space-y-3">
                {avaliacoes.map((r) => (
                  <li key={r.id} className="flex gap-3 rounded-lg border border-border bg-card p-4">
                    {r.jogos?.capa && (
                      <Link to="/jogos/$id" params={{ id: r.jogos.id }}>
                        <img src={r.jogos.capa} alt="" className="h-20 w-14 rounded object-cover" />
                      </Link>
                    )}
                    <div className="flex-1">
                      <Link
                        to="/jogos/$id"
                        params={{ id: r.jogos?.id }}
                        className="font-semibold hover:text-brand"
                      >
                        {r.jogos?.titulo}
                      </Link>
                      <div className="mt-1">
                        <StarRating value={Number(r.nota)} size={14} readOnly />
                      </div>
                      {r.texto && <p className="mt-2 text-sm text-foreground/90">{r.texto}</p>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Tabs.Content>
        </Tabs.Root>
      </main>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gamepad2;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}
