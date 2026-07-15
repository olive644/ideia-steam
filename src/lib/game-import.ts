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

export async function searchIgdb(query: string): Promise<IgdbResult[]> {
  const { data, error } = await supabase.functions.invoke(
    `igdb-search?action=search&q=${encodeURIComponent(query)}`,
    {
      method: "GET",
    },
  );
  if (error) throw error;
  return data.results ?? [];
}

export async function importIgdbGame(igdbId: number): Promise<{ id: string; jaExistia: boolean }> {
  const { data, error } = await supabase.functions.invoke("igdb-search?action=import", {
    method: "POST",
    body: { igdb_id: igdbId },
  });
  if (error) throw error;
  return data;
}

export async function resolveSteamProfile(
  input: string,
): Promise<{ steamid: string; nome: string; avatar: string }> {
  const { data, error } = await supabase.functions.invoke(
    `steam-library?action=resolve&input=${encodeURIComponent(input)}`,
    {
      method: "GET",
    },
  );
  if (error) throw error;
  return data;
}

export async function importSteamLibrary(
  steamid: string,
): Promise<{ importados: number; total: number }> {
  const { data, error } = await supabase.functions.invoke("steam-library?action=import", {
    method: "POST",
    body: { steamid },
  });
  if (error) throw error;
  return data;
}
