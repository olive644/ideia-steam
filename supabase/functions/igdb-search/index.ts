// Edge Function: igdb-search
//
// Faz duas coisas, via query param "action":
//   ?action=search&q=zelda        -> busca jogos na IGDB (não grava nada)
//   ?action=import  (POST body)   -> importa um jogo específico da IGDB
//                                    para a tabela public.jogos
//
// Precisa de dois secrets configurados no projeto Supabase:
//   IGDB_CLIENT_ID      -> Client ID do app criado em dev.twitch.tv/console
//   IGDB_CLIENT_SECRET  -> Client Secret do mesmo app
//
// A IGDB usa autenticação via Twitch (é dona da IGDB). O fluxo é:
//   1) trocar client_id + client_secret por um app access token (Twitch)
//   2) usar esse token nas chamadas pra api.igdb.com
//
// Configurar os secrets:
//   supabase secrets set IGDB_CLIENT_ID=xxxx IGDB_CLIENT_SECRET=yyyy

import { createClient } from "jsr:@supabase/supabase-js@2";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_API_URL = "https://api.igdb.com/v4";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getIgdbToken(clientId: string, clientSecret: string): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }
  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "client_credentials",
  });
  const res = await fetch(`${TWITCH_TOKEN_URL}?${params}`, { method: "POST" });
  if (!res.ok) {
    throw new Error(`Falha ao autenticar na Twitch/IGDB: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  cachedToken = {
    token: data.access_token,
    // renova um pouco antes de expirar de verdade
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  };
  return cachedToken.token;
}

async function igdbFetch(path: string, body: string, clientId: string, token: string) {
  const res = await fetch(`${IGDB_API_URL}/${path}`, {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      "Content-Type": "text/plain",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`Erro na IGDB (${path}): ${res.status} ${await res.text()}`);
  }
  return res.json();
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  const clientId = Deno.env.get("IGDB_CLIENT_ID");
  const clientSecret = Deno.env.get("IGDB_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    return new Response(
      JSON.stringify({
        error:
          "IGDB não configurado. Defina os secrets IGDB_CLIENT_ID e IGDB_CLIENT_SECRET no projeto Supabase.",
      }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "search";
    const token = await getIgdbToken(clientId, clientSecret);

    if (action === "search") {
      const q = url.searchParams.get("q")?.trim();
      if (!q) {
        return new Response(JSON.stringify({ results: [] }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
      const query = `
        search "${q.replace(/"/g, '\\"')}";
        fields name, cover.url, first_release_date, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, summary;
        limit 12;
      `;
      const results = await igdbFetch("games", query, clientId, token);
      const mapped = results.map((g: any) => ({
        igdb_id: g.id,
        titulo: g.name,
        capa: g.cover?.url ? `https:${g.cover.url.replace("t_thumb", "t_cover_big")}` : null,
        data_lancamento: g.first_release_date
          ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10)
          : null,
        desenvolvedora:
          g.involved_companies?.find((c: any) => c.developer)?.company?.name ??
          g.involved_companies?.[0]?.company?.name ??
          null,
        generos: (g.genres ?? []).map((x: any) => x.name),
        plataformas: (g.platforms ?? []).map((x: any) => x.name),
        descricao: g.summary ?? null,
      }));
      return new Response(JSON.stringify({ results: mapped }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    if (action === "import" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Faça login para importar jogos." }), {
          status: 401,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const body = await req.json();
      const igdbId = Number(body.igdb_id);
      if (!igdbId) {
        return new Response(JSON.stringify({ error: "igdb_id é obrigatório." }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      // Já existe? Não duplica.
      const { data: existente } = await supabase
        .from("jogos")
        .select("id")
        .eq("igdb_id", igdbId)
        .maybeSingle();
      if (existente) {
        return new Response(JSON.stringify({ id: existente.id, jaExistia: true }), {
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const query = `
        fields name, cover.url, first_release_date, genres.name, platforms.name, involved_companies.company.name, involved_companies.developer, summary;
        where id = ${igdbId};
      `;
      const [game] = await igdbFetch("games", query, clientId, token);
      if (!game) {
        return new Response(JSON.stringify({ error: "Jogo não encontrado na IGDB." }), {
          status: 404,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const { data: inserted, error } = await supabase
        .from("jogos")
        .insert({
          igdb_id: game.id,
          titulo: game.name,
          capa: game.cover?.url
            ? `https:${game.cover.url.replace("t_thumb", "t_cover_big")}`
            : null,
          data_lancamento: game.first_release_date
            ? new Date(game.first_release_date * 1000).toISOString().slice(0, 10)
            : null,
          desenvolvedora:
            game.involved_companies?.find((c: any) => c.developer)?.company?.name ??
            game.involved_companies?.[0]?.company?.name ??
            null,
          generos: (game.genres ?? []).map((x: any) => x.name),
          plataformas: (game.platforms ?? []).map((x: any) => x.name),
          descricao: game.summary ?? null,
        })
        .select("id")
        .single();

      if (error) throw error;

      return new Response(JSON.stringify({ id: inserted.id, jaExistia: false }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida." }), {
      status: 400,
      headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      },
    );
  }
});
