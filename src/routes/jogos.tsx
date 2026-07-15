import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { searchIgdb, type IgdbResult } from "@/lib/game-import";
import { NavBar } from "@/components/nav-bar";
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card";
import { Search } from "lucide-react";
import { z } from "zod";

const GENEROS = [
  "RPG",
  "Ação",
  "Aventura",
  "Indie",
  "Plataforma",
  "Metroidvania",
  "Rogue-like",
  "Simulação",
] as const;
const PLATAFORMAS = [
  "PC",
  "PlayStation 5",
  "PlayStation 4",
  "Xbox Series X",
  "Xbox One",
  "Nintendo Switch",
  "Mobile",
] as const;
const ANOS = Array.from({ length: 15 }, (_, i) => String(new Date().getFullYear() - i)) as const;

const filterEnum = <T extends readonly [string, ...string[]]>(values: T) =>
  z.union([z.enum(values), z.literal("")]).optional().catch("").default("");

const searchSchema = z.object({
  q: z.string().trim().max(100).optional().catch("").default(""),
  genero: filterEnum(GENEROS),
  plataforma: filterEnum(PLATAFORMAS),
  ano: filterEnum(ANOS),
  page: z.coerce.number().int().min(1).optional().catch(1).default(1),
});

export const Route = createFileRoute("/jogos")({
  head: () => ({
    meta: [
      { title: "Explorar Jogos | Meu Ludi" },
      { name: "description", content: "Descubra jogos por gênero, plataforma e ano." },
      { property: "og:title", content: "Explorar Jogos | Meu Ludi" },
      { property: "og:description", content: "Descubra jogos por gênero, plataforma e ano." },
    ],
  }),
  validateSearch: searchSchema,
  component: Explorar,
});

const PAGE_SIZE = 24;

function Explorar() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/jogos" });

  const [pendingQuery, setPendingQuery] = useState(search.q ?? "");
  const q = search.q?.trim() ?? "";
  const genero = search.genero ?? "";
  const plataforma = search.plataforma ?? "";
  const ano = search.ano ?? "";
  const page = search.page ?? 1;

  useEffect(() => {
    setPendingQuery(search.q ?? "");
  }, [search.q]);

  const filters = useMemo(
    () => ({ q, genero, plataforma, ano, page }),
    [q, genero, plataforma, ano, page],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = pendingQuery.trim();
      if (trimmed !== q) {
        applyFilters({ q: trimmed });
      }
    }, 450);
    return () => clearTimeout(timer);
  }, [pendingQuery, q]);

  const { data, isLoading } = useQuery({
    queryKey: ["jogos", filters],
    queryFn: async () => {
      let query = supabase
        .from("jogos" as never)
        .select("id, titulo, capa, data_lancamento, generos, plataformas", { count: "exact" });
      if (filters.q) query = query.ilike("titulo", `%${filters.q}%`);
      if (filters.genero) query = query.contains("generos", [filters.genero]);
      if (filters.plataforma) query = query.contains("plataformas", [filters.plataforma]);
      if (filters.ano) {
        const y = parseInt(filters.ano, 10);
        query = query.gte("data_lancamento", `${y}-01-01`).lte("data_lancamento", `${y}-12-31`);
      }
      const from = (filters.page - 1) * PAGE_SIZE;
      query = query
        .order("data_lancamento", { ascending: false, nullsFirst: false })
        .range(from, from + PAGE_SIZE - 1);
      const { data, count, error } = await query;
      if (error) throw error;
      return { rows: (data ?? []) as unknown as GameCardData[], count: count ?? 0 };
    },
  });

  const { data: igdbResults, isFetching: loadingIgdb } = useQuery({
    queryKey: ["igdb-search", q],
    queryFn: async () => {
      const remoteResults = await searchIgdb(q);
      return remoteResults.map((game) => ({
        id: `igdb-${game.igdb_id}`,
        titulo: game.titulo,
        capa: game.capa,
        data_lancamento: game.data_lancamento,
        generos: game.generos,
        plataformas: game.plataformas,
      })) as GameCardData[];
    },
    enabled: Boolean(q && q.length >= 3 && !isLoading && data?.rows.length === 0),
    staleTime: 1000 * 60 * 2,
  });

  function applyFilters(next: Partial<z.infer<typeof searchSchema>>) {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, ...next, page: 1 }) });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;

  return (
    <div className="min-h-screen">
      <NavBar />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Explorar Jogos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Encontre seu próximo favorito.</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters({ q: pendingQuery.trim() });
          }}
          className="mb-4 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={pendingQuery}
              onChange={(e) => setPendingQuery(e.target.value)}
              placeholder="Buscar por nome…"
              className="w-full rounded-md border border-border bg-input py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-brand px-4 text-sm font-medium hover:opacity-90"
          >
            Buscar
          </button>
        </form>

        <div className="mb-8 grid gap-2 sm:grid-cols-3">
          <Select
            value={genero}
            label="Gênero"
            options={["", ...GENEROS]}
            onChange={(v) => applyFilters({ genero: v })}
          />
          <Select
            value={plataforma}
            label="Plataforma"
            options={["", ...PLATAFORMAS]}
            onChange={(v) => applyFilters({ plataforma: v })}
          />
          <Select
            value={ano}
            label="Ano"
            options={["", ...ANOS.map(String)]}
            onChange={(v) => applyFilters({ ano: v })}
          />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <GameCardSkeleton key={i} />
            ))}
          </div>
        ) : !data?.rows.length ? (
          q ? (
            <div className="space-y-6">
              {loadingIgdb ? (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <GameCardSkeleton key={i} />
                  ))}
                </div>
              ) : igdbResults?.length ? (
                <>
                  <div className="rounded-xl border border-border bg-card p-4">
                    <p className="text-sm text-muted-foreground">
                      Nenhum jogo local encontrado. Exibindo resultados automáticos da IGDB.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {igdbResults.map((j) => (
                      <GameCard key={j.id} jogo={j} />
                    ))}
                  </div>
                </>
              ) : (
                <EmptyState />
              )}
            </div>
          ) : (
            <EmptyState />
          )
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {data.rows.map((j) => (
                <GameCard key={j.id} jogo={j} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() =>
                    navigate({ search: (p: Record<string, unknown>) => ({ ...p, page: page - 1 }) })
                  }
                  className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Anterior
                </button>
                <span className="text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() =>
                    navigate({ search: (p: Record<string, unknown>) => ({ ...p, page: page + 1 }) })
                  }
                  className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40"
                >
                  Próxima
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function Select({
  value,
  label,
  options,
  onChange,
}: {
  value: string;
  label: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-input px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o || `Todos`}
          </option>
        ))}
      </select>
    </label>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 py-16 text-center">
      <p className="text-sm text-muted-foreground">Nenhum jogo encontrado com esses filtros.</p>
    </div>
  );
}
