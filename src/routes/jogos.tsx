import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/nav-bar";
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card";
import { Search } from "lucide-react";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional().catch(""),
  genero: z.string().optional().catch(""),
  plataforma: z.string().optional().catch(""),
  ano: z.string().optional().catch(""),
  page: z.coerce.number().int().min(1).optional().catch(1),
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

  const [q, setQ] = useState(search.q ?? "");
  const genero = search.genero ?? "";
  const plataforma = search.plataforma ?? "";
  const ano = search.ano ?? "";
  const page = search.page ?? 1;

  const filters = useMemo(
    () => ({ q: search.q ?? "", genero, plataforma, ano, page }),
    [search.q, genero, plataforma, ano, page],
  );

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

  function applyFilters(next: Partial<z.infer<typeof searchSchema>>) {
    navigate({ search: (prev: Record<string, unknown>) => ({ ...prev, ...next, page: 1 }) });
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const GENEROS = [
    "RPG",
    "Ação",
    "Aventura",
    "Indie",
    "Plataforma",
    "Metroidvania",
    "Rogue-like",
    "Simulação",
  ];
  const PLATAFORMAS = [
    "PC",
    "PlayStation 5",
    "PlayStation 4",
    "Xbox Series X",
    "Xbox One",
    "Nintendo Switch",
    "Mobile",
  ];
  const ANOS = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

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
            applyFilters({ q });
          }}
          className="mb-4 flex gap-2"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
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
          <EmptyState />
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
    <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-card/40 py-16 text-center">
      <p className="text-sm text-muted-foreground">Nenhum jogo encontrado com esses filtros.</p>
    </div>
  );
}
