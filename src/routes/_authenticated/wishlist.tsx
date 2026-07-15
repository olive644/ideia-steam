import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/nav-bar";
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card";
import { Heart } from "lucide-react";
import { Link } from "@tanstack/react-router";

const db = supabase as unknown as any;

export const Route = createFileRoute("/_authenticated/wishlist")({
  head: () => ({ meta: [{ title: "Lista de desejos | Meu Ludi" }] }),
  component: Wishlist,
});

function Wishlist() {
  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await db
        .from("biblioteca")
        .select("jogos(id, titulo, capa, data_lancamento)")
        .eq("usuario_id", userId!)
        .eq("status", "wishlist")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => r.jogos).filter(Boolean) as GameCardData[];
    },
  });

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Heart className="h-6 w-6 text-brand" />
          <h1 className="text-3xl font-bold">Minha lista de desejos</h1>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        ) : !data?.length ? (
          <div className="mt-8 flex flex-col items-center rounded-lg border border-dashed border-border bg-card/40 py-16 text-center">
            <Heart className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nada por aqui ainda.</p>
            <Link to="/jogos" className="mt-4 rounded-md bg-brand px-4 py-2 text-sm font-semibold">
              Explorar jogos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {data.map((j) => (
              <GameCard key={j.id} jogo={j} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
