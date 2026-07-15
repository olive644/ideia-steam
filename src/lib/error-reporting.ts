// Ponto único para reportar erros não tratados da aplicação.
// Hoje registra no console; se um serviço de monitoramento (ex: Sentry) for
// adicionado, basta plugar a chamada dele aqui dentro, sem mexer nos
// chamadores espalhados pelo app.

type ErrorReportOptions = {
  mechanism?: "manual" | "onerror" | "unhandledrejection" | "react_error_boundary";
  handled?: boolean;
  severity?: "error" | "warning" | "info";
};

export function reportError(
  error: unknown,
  context: Record<string, unknown> = {},
  options: ErrorReportOptions = {},
) {
  if (typeof window === "undefined") return;

  console.error("[Meu Ludi] erro capturado:", error, {
    route: window.location.pathname,
    ...context,
    ...options,
  });

  // Exemplo de como plugar um serviço de monitoramento futuramente:
  // Sentry.captureException(error, { extra: context, level: options.severity });
}
