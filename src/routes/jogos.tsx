import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavBar } from "@/components/nav-bar";
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card";
import { Search, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { searchIgdb, importIgdbGame, type IgdbResult } from "@/lib/game-import";

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
  const queryClient = useQueryClient();

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

  // Catálogo global (IGDB) — usado quando o jogo procurado ainda não existe
  // na nossa base local. A função de busca já existia em src/lib/game-import.ts
  // mas nunca tinha sido conectada a nenhuma tela; era por isso que buscar
  // vários jogos diferentes "não funcionava": não tinha como chegar até ela.
  const [igdbStatus, setIgdbStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [igdbResults, setIgdbResults] = useState<IgdbResult[]>([]);
  const [igdbError, setIgdbError] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);

  async function handleBuscarCatalogoGlobal() {
    const termo = q.trim();
    if (!termo) return;
    setIgdbStatus("loading");
    setIgdbError(null);
    try {
      const results = await searchIgdb(termo);
      setIgdbResults(results);
      setIgdbStatus("done");
    } catch (err) {
      setIgdbError(
        err instanceof Error ? err.message : "Não foi possível buscar no catálogo global.",
      );
      setIgdbStatus("error");
    }
  }

  async function handleImportarJogo(igdbId: number) {
    setImportingId(igdbId);
    try {
      await importIgdbGame(igdbId);
      toast.success("Jogo adicionado! Já aparece na busca.");
      setIgdbResults((prev) => prev.filter((r) => r.igdb_id !== igdbId));
      await queryClient.invalidateQueries({ queryKey: ["jogos"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar esse jogo.");
    } finally {
      setImportingId(null);
    }
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
            setIgdbStatus("idle");
            setIgdbResults([]);
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
          <EmptyState
            q={q}
            status={igdbStatus}
            error={igdbError}
            results={igdbResults}
            importingId={importingId}
            onBuscarCatalogo={handleBuscarCatalogoGlobal}
            onImportar={handleImportarJogo}
          />
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

            {q && (
              <CatalogoGlobalSection
                q={q}
                status={igdbStatus}
                error={igdbError}
                results={igdbResults}
                importingId={importingId}
                onBuscarCatalogo={handleBuscarCatalogoGlobal}
                onImportar={handleImportarJogo}
              />
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

type IgdbStatus = "idle" | "loading" | "done" | "error";

function EmptyState({
  q,
  status,
  error,
  results,
  importingId,
  onBuscarCatalogo,
  onImportar,
}: {
  q: string;
  status: IgdbStatus;
  error: string | null;
  results: IgdbResult[];
  importingId: number | null;
  onBuscarCatalogo: () => void;
  onImportar: (igdbId: number) => void;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card/40 py-16 text-center">
      <p className="text-sm text-muted-foreground">Nenhum jogo encontrado com esses filtros.</p>
      {q && (
        <div className="mx-auto mt-6 max-w-md px-4 text-left">
          <CatalogoGlobalSection
            q={q}
            status={status}
            error={error}
            results={results}
            importingId={importingId}
            onBuscarCatalogo={onBuscarCatalogo}
            onImportar={onImportar}
          />
        </div>
      )}
    </div>
  );
}

function CatalogoGlobalSection({
  q,
  status,
  error,
  results,
  importingId,
  onBuscarCatalogo,
  onImportar,
}: {
  q: string;
  status: IgdbStatus;
  error: string | null;
  results: IgdbResult[];
  importingId: number | null;
  onBuscarCatalogo: () => void;
  onImportar: (igdbId: number) => void;
}) {
  return (
    <div className="mt-8 border-t border-border pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Não achou "{q}"?</h2>
          <p className="text-xs text-muted-foreground">
            Busque no catálogo global e adicione o jogo à plataforma.
          </p>
        </div>
        <button
          type="button"
          onClick={onBuscarCatalogo}
          disabled={status === "loading"}
          className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent disabled:opacity-50"
        >
          {status === "loading" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Buscar no catálogo global
        </button>
      </div>

      {status === "error" && (
        <p className="mt-4 text-xs text-destructive">{error}</p>
      )}

      {status === "done" && results.length === 0 && (
        <p className="mt-4 text-xs text-muted-foreground">
          Nenhum resultado encontrado no catálogo global para "{q}".
        </p>
      )}

      {results.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {results.map((r) => (
            <li key={r.igdb_id} className="flex items-center gap-3 py-3">
              <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-muted">
                {r.capa && <img src={r.capa} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{r.titulo}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.desenvolvedora ?? "—"}
                  {r.data_lancamento ? ` · ${r.data_lancamento.slice(0, 4)}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onImportar(r.igdb_id)}
                disabled={importingId === r.igdb_id}
                className="flex shrink-0 items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-semibold hover:opacity-90 disabled:opacity-60"
              >
                {importingId === r.igdb_id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Plus className="h-3.5 w-3.5" />
                )}
                Adicionar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
