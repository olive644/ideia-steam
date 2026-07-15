import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";
import { useState } from "react";

export type GameCardData = {
  id: string;
  titulo: string;
  capa: string | null;
  data_lancamento?: string | null;
  media?: number | null;
};

export function GameCard({ jogo }: { jogo: GameCardData }) {
  const ano = jogo.data_lancamento ? new Date(jogo.data_lancamento).getFullYear() : null;
  const [imgFailed, setImgFailed] = useState(false);
  const semCapa = !jogo.capa || imgFailed;

  return (
    <Link to="/jogos/$id" params={{ id: jogo.id }} className="group block">
      <div className="relative aspect-3/4 w-full overflow-hidden rounded-lg border border-border bg-muted">
        {!semCapa ? (
          <img
            src={jogo.capa!}
            alt={jogo.titulo}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center px-2 text-center text-xs text-muted-foreground">
            {jogo.titulo}
          </div>
        )}
        {typeof jogo.media === "number" && jogo.media > 0 && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-background/85 px-2 py-0.5 text-xs font-medium backdrop-blur">
            <Star className="h-3 w-3 fill-brand text-brand" strokeWidth={1.5} />
            {jogo.media.toFixed(1)}
          </div>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-brand">
          {jogo.titulo}
        </h3>
        {ano && <p className="mt-0.5 text-xs text-muted-foreground">{ano}</p>}
      </div>
    </Link>
  );
}

export function GameCardSkeleton() {
  return (
    <div>
      <div className="aspect-[3/4] w-full animate-pulse rounded-lg bg-muted" />
      <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-muted" />
      <div className="mt-1 h-3 w-1/3 animate-pulse rounded bg-muted" />
    </div>
  );
}
