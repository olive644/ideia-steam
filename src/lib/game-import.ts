import { supabase } from "@/integrations/supabase/client";

export type IgdbResult = {
  igdb_id: number;
  titulo: string;
  capa: string | null;
  data_lancamento: string | null;
  desenvolvedora: string | null;
  generos: string[];
  plataformas: string[];
  descricao: string | null;
};

class IntegrationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = "IntegrationError";
  }
}

export async function searchIgdb(query: string): Promise<IgdbResult[]> {
  try {
    const { data, error } = await supabase.functions.invoke(
      `igdb-search?action=search&q=${encodeURIComponent(query)}`,
      {
        method: "GET",
      },
    );
    if (error) {
      // Tratamento específico para erros comuns
      if (error.message.includes("IGDB não configurado")) {
        throw new IntegrationError(
          "A busca na IGDB não está configurada. Contate o administrador.",
          "IGDB_NOT_CONFIGURED"
        );
      }
      if (error.message.includes("Falha ao autenticar")) {
        throw new IntegrationError(
          "Erro ao conectar com a IGDB. Tente novamente em alguns minutos.",
          "IGDB_AUTH_ERROR"
        );
      }
      throw new IntegrationError(error.message, "IGDB_SEARCH_ERROR");
    }
    return data.results ?? [];
  } catch (e) {
    if (e instanceof IntegrationError) throw e;
    throw new IntegrationError("Erro ao buscar jogos na IGDB.", "IGDB_UNKNOWN_ERROR");
  }
}

export async function importIgdbGame(igdbId: number): Promise<{ id: string; jaExistia: boolean }> {
  try {
    const { data, error } = await supabase.functions.invoke("igdb-search?action=import", {
      method: "POST",
      body: { igdb_id: igdbId },
    });
    if (error) {
      if (error.message.includes("IGDB não configurado")) {
        throw new IntegrationError(
          "A importação da IGDB não está configurada. Contate o administrador.",
          "IGDB_NOT_CONFIGURED"
        );
      }
      if (error.message.includes("Jogo não encontrado")) {
        throw new IntegrationError("Jogo não encontrado na IGDB.", "IGDB_NOT_FOUND");
      }
      if (error.message.includes("Faça login")) {
        throw new IntegrationError("Você precisa estar logado para importar jogos.", "AUTH_REQUIRED");
      }
      throw new IntegrationError(error.message, "IGDB_IMPORT_ERROR");
    }
    return data;
  } catch (e) {
    if (e instanceof IntegrationError) throw e;
    throw new IntegrationError("Erro ao importar jogo da IGDB.", "IGDB_UNKNOWN_ERROR");
  }
}

export async function resolveSteamProfile(
  input: string,
): Promise<{ steamid: string; nome: string; avatar: string }> {
  try {
    const { data, error } = await supabase.functions.invoke(
      `steam-library?action=resolve&input=${encodeURIComponent(input)}`,
      {
        method: "GET",
      },
    );
    if (error) {
      if (error.message.includes("Steam não configurado")) {
        throw new IntegrationError(
          "A integração com Steam não está configurada. Contate o administrador.",
          "STEAM_NOT_CONFIGURED"
        );
      }
      if (error.message.includes("Perfil Steam não encontrado")) {
        throw new IntegrationError("Perfil Steam não encontrado ou inválido.", "STEAM_NOT_FOUND");
      }
      throw new IntegrationError(error.message, "STEAM_RESOLVE_ERROR");
    }
    return data;
  } catch (e) {
    if (e instanceof IntegrationError) throw e;
    throw new IntegrationError("Erro ao buscar perfil Steam.", "STEAM_UNKNOWN_ERROR");
  }
}

export async function importSteamLibrary(
  steamid: string,
): Promise<{ importados: number; total: number }> {
  try {
    const { data, error } = await supabase.functions.invoke("steam-library?action=import", {
      method: "POST",
      body: { steamid },
    });
    if (error) {
      if (error.message.includes("Steam não configurado")) {
        throw new IntegrationError(
          "A integração com Steam não está configurada. Contate o administrador.",
          "STEAM_NOT_CONFIGURED"
        );
      }
      if (error.message.includes("Faça login")) {
        throw new IntegrationError("Você precisa estar logado para importar sua biblioteca.", "AUTH_REQUIRED");
      }
      if (error.message.includes("Não encontramos jogos")) {
        throw new IntegrationError(
          "Não encontramos jogos nessa conta. Verifique se seu perfil e biblioteca estão públicos.",
          "STEAM_NO_GAMES"
        );
      }
      throw new IntegrationError(error.message, "STEAM_IMPORT_ERROR");
    }
    return data;
  } catch (e) {
    if (e instanceof IntegrationError) throw e;
    throw new IntegrationError("Erro ao importar biblioteca Steam.", "STEAM_UNKNOWN_ERROR");
  }
}
