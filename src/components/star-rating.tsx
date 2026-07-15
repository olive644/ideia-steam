import { Star } from "lucide-react";
import { useState } from "react";

/**
 * Star rating de 0.5 a 5, com suporte a meia estrela.
 * Ao passar o mouse sobre a metade esquerda da estrela conta como .5, direita conta como .0.
 */
export function StarRating({
  value,
  onChange,
  size = 24,
  readOnly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
  readOnly?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div
      className="inline-flex items-center gap-0.5"
      onMouseLeave={() => setHover(null)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Nota"
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = display >= i;
        const half = !filled && display >= i - 0.5;
        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            <Star
              className="absolute inset-0 text-muted-foreground/40"
              style={{ width: size, height: size }}
              strokeWidth={1.5}
            />
            {(filled || half) && (
              <div
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? size / 2 : size }}
              >
                <Star
                  className="text-brand fill-current"
                  style={{ width: size, height: size }}
                  strokeWidth={1.5}
                />
              </div>
            )}
            {!readOnly && (
              <>
                <button
                  type="button"
                  aria-label={`${i - 0.5} estrelas`}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(i - 0.5)}
                  onClick={() => onChange?.(i - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`${i} estrelas`}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(i)}
                  onClick={() => onChange?.(i)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
