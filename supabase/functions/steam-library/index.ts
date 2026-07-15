// Edge Function: steam-library
//
// A Steam não tem OAuth "de verdade" pra apps de terceiros pegarem a
// biblioteca do usuário (o fluxo oficial é OpenID 2.0 + Web API separada).
// Pra manter isso simples e confiável, pedimos o link do perfil Steam do
// usuário (ou o SteamID64 direto) em vez de implementar o login OpenID
// completo, e usamos a Web API pública da Steam pra buscar a biblioteca.
//
// ?action=resolve&input=<url ou steamid>  -> resolve pra um SteamID64 + nome
// ?action=import (POST { steamid })       -> importa jogos possuídos pro
//                                             catálogo e pra biblioteca do
//                                             usuário logado
//
// Precisa do secret STEAM_API_KEY (pegue em steamcommunity.com/dev/apikey)
//   supabase secrets set STEAM_API_KEY=xxxx

import { createClient } from "jsr:@supabase/supabase-js@2";

const STEAM_API = "https://api.steampowered.com";

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function extractSteamIdOrVanity(input: string): { steamid?: string; vanity?: string } {
  const trimmed = input.trim();
  // já é um SteamID64 (17 dígitos)
  if (/^\d{17}$/.test(trimmed)) return { steamid: trimmed };
  // URL tipo steamcommunity.com/id/nomeDoUsuario
  const vanityMatch = trimmed.match(/steamcommunity\.com\/id\/([^/]+)/i);
  if (vanityMatch) return { vanity: vanityMatch[1] };
  // URL tipo steamcommunity.com/profiles/7656119...
  const idMatch = trimmed.match(/steamcommunity\.com\/profiles\/(\d{17})/i);
  if (idMatch) return { steamid: idMatch[1] };
  // qualquer outra coisa, trata como vanity name direto
  return { vanity: trimmed };
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  const apiKey = Deno.env.get("STEAM_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: "Steam não configurado. Defina o secret STEAM_API_KEY no projeto Supabase.",
      }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "resolve";

    if (action === "resolve") {
      const input = url.searchParams.get("input")?.trim();
      if (!input) {
        return new Response(JSON.stringify({ error: "Informe o link do perfil ou o SteamID." }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
      const { steamid, vanity } = extractSteamIdOrVanity(input);
      let resolvedId = steamid;
      if (!resolvedId && vanity) {
        const res = await fetch(
          `${STEAM_API}/ISteamUser/ResolveVanityURL/v1/?key=${apiKey}&vanityurl=${encodeURIComponent(vanity)}`,
        );
        const data = await res.json();
        if (data.response?.success !== 1) {
          return new Response(JSON.stringify({ error: "Perfil Steam não encontrado." }), {
            status: 404,
            headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
          });
        }
        resolvedId = data.response.steamid;
      }

      const summaryRes = await fetch(
        `${STEAM_API}/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${resolvedId}`,
      );
      const summaryData = await summaryRes.json();
      const player = summaryData.response?.players?.[0];
      if (!player) {
        return new Response(JSON.stringify({ error: "Perfil Steam não encontrado ou privado." }), {
          status: 404,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          steamid: resolvedId,
          nome: player.personaname,
          avatar: player.avatarfull,
        }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    if (action === "import" && req.method === "POST") {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return new Response(JSON.stringify({ error: "Faça login para importar sua biblioteca." }), {
          status: 401,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const supabaseAuth = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_PUBLISHABLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: claims, error: authError } = await supabaseAuth.auth.getClaims(
        authHeader.replace("Bearer ", ""),
      );
      if (authError || !claims?.claims?.sub) {
        return new Response(JSON.stringify({ error: "Sessão inválida." }), {
          status: 401,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }
      const userId = claims.claims.sub;

      const { steamid } = await req.json();
      if (!steamid) {
        return new Response(JSON.stringify({ error: "steamid é obrigatório." }), {
          status: 400,
          headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
        });
      }

      const gamesRes = await fetch(
        `${STEAM_API}/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamid}&include_appinfo=1&include_played_free_games=1`,
      );
      const gamesData = await gamesRes.json();
      const owned = gamesData.response?.games ?? [];
      if (!owned.length) {
        return new Response(
          JSON.stringify({
            error:
              "Não encontramos jogos nessa conta. O perfil e a biblioteca da Steam precisam estar públicos.",
          }),
          { status: 404, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
        );
      }

      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      let importados = 0;
      for (const game of owned) {
        const capa = `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`;

        const { data: existente } = await supabaseAdmin
          .from("jogos")
          .select("id")
          .eq("steam_appid", game.appid)
          .maybeSingle();

        let jogoId = existente?.id as string | undefined;
        if (!jogoId) {
          const { data: novo, error } = await supabaseAdmin
            .from("jogos")
            .insert({
              steam_appid: game.appid,
              titulo: game.name,
              capa,
              plataformas: ["PC"],
              generos: [],
            })
            .select("id")
            .single();
          if (error) continue;
          jogoId = novo.id;
        }

        // Heurística: jogo com tempo jogado > 0 vira "joguei", sem tempo
        // jogado vira "quero jogar". É uma aproximação razoável a partir
        // dos dados que a Steam expõe (ela não distingui "estou jogando"
        // de "já joguei" na API pública).
        const status = game.playtime_forever > 0 ? "completed" : "wishlist";

        await supabaseAdmin
          .from("biblioteca")
          .upsert(
            { usuario_id: userId, jogo_id: jogoId, status },
            { onConflict: "usuario_id,jogo_id", ignoreDuplicates: true },
          );

        importados++;
      }

      return new Response(JSON.stringify({ importados, total: owned.length }), {
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
