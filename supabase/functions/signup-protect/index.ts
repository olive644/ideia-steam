// Edge Function: signup-protect
//
// Valida token do Cloudflare Turnstile e implementa rate limiting por IP
// para proteger o cadastro contra bots e ataques de força bruta.
//
// Precisa do secret TURNSTILE_SECRET_KEY configurado no projeto Supabase:
//   supabase secrets set TURNSTILE_SECRET_KEY=xxxx

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

// Rate limiting em memória (para produção, usar Redis ou similar)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();
const MAX_ATTEMPTS_PER_HOUR = 5;
const HOUR_IN_MS = 60 * 60 * 1000;

// Blocklist de domínios de email descartável
const DISPOSABLE_DOMAINS = new Set([
  "tempmail.com",
  "10minutemail.com",
  "guerrillamail.com",
  "mailinator.com",
  "throwawaymail.com",
  "getairmail.com",
  "yopmail.com",
  "maildrop.cc",
  "sharklasers.com",
  "temp-mail.org",
  "fakeinbox.com",
  "trashmail.com",
  "tempmail.net",
  "mytempemail.com",
  "incognitomail.com",
  "mailtemp.net",
  "tempmail.de",
  "tempmail.co",
  "tempmail.org",
  "tempmail.us",
  "tempmail.eu",
  "tempmail.asia",
  "tempmail.info",
  "tempmail.biz",
  "tempmail.name",
  "tempmail.pro",
  "tempmail.xyz",
  "tempmail.online",
  "tempmail.site",
  "tempmail.tech",
  "tempmail.app",
  "tempmail.io",
  "tempmail.me",
  "tempmail.dev",
  "tempmail.ai",
  "tempmail.co.uk",
  "tempmail.com.au",
  "tempmail.ca",
  "tempmail.in",
  "tempmail.jp",
  "tempmail.kr",
  "tempmail.cn",
  "tempmail.ru",
  "tempmail.br",
  "tempmail.mx",
  "tempmail.es",
  "tempmail.fr",
  "tempmail.de",
  "tempmail.it",
  "tempmail.nl",
  "tempmail.pl",
  "tempmail.se",
  "tempmail.no",
  "tempmail.dk",
  "tempmail.fi",
  "tempmail.gr",
  "tempmail.tr",
  "tempmail.il",
  "tempmail.ae",
  "tempmail.sa",
  "tempmail.za",
  "tempmail.ng",
  "tempmail.eg",
  "tempmail.ke",
  "tempmail.za",
  "tempmail.ma",
  "tempmail.tn",
  "tempmail.dz",
  "tempmail.ly",
  "tempmail.gh",
  "tempmail.ci",
  "tempmail.sn",
  "tempmail.ml",
  "tempmail.bf",
  "tempmail.ne",
  "tempmail.td",
  "tempmail.cf",
  "tempmail.cm",
  "tempmail.ga",
  "tempmail.cg",
  "tempmail.cd",
  "tempmail.ao",
  "tempmail.mz",
  "tempmail.zw",
  "tempmail.zm",
  "tempmail.mw",
  "tempmail.tz",
  "tempmail.ug",
  "tempmail.rw",
  "tempmail.bi",
  "tempmail.et",
  "tempmail.so",
  "tempmail.dj",
  "tempmail.er",
  "tempmail.sd",
  "tempmail.ss",
  "tempmail.ug",
  "tempmail.ke",
  "tempmail.tz",
  "tempmail.mz",
  "tempmail.zw",
  "tempmail.zm",
  "tempmail.mw",
  "tempmail.ao",
  "tempmail.cd",
  "tempmail.cg",
  "tempmail.ga",
  "tempmail.cm",
  "tempmail.cf",
  "tempmail.td",
  "tempmail.ne",
  "tempmail.bf",
  "tempmail.ml",
  "tempmail.sn",
  "tempmail.ci",
  "tempmail.gh",
  "tempmail.ng",
  "tempmail.za",
  "tempmail.eg",
  "tempmail.ma",
  "tempmail.tn",
  "tempmail.dz",
  "tempmail.ly",
  "tempmail.ke",
  "tempmail.et",
  "tempmail.er",
  "tempmail.so",
  "tempmail.dj",
  "tempmail.sd",
  "tempmail.ss",
]);

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function getClientIp(req: Request): string {
  // Tenta obter IP real de vários headers comuns
  const headers = req.headers;
  return (
    headers.get("cf-connecting-ip") ||
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    // Primeira tentativa ou reset do período
    rateLimitStore.set(ip, { count: 1, resetAt: now + HOUR_IN_MS });
    return { allowed: true, remaining: MAX_ATTEMPTS_PER_HOUR - 1, resetAt: now + HOUR_IN_MS };
  }

  if (record.count >= MAX_ATTEMPTS_PER_HOUR) {
    return { allowed: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count++;
  return { allowed: true, remaining: MAX_ATTEMPTS_PER_HOUR - record.count, resetAt: record.resetAt };
}

function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase();
  return domain ? DISPOSABLE_DOMAINS.has(domain) : false;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secretKey) {
    return new Response(
      JSON.stringify({ error: "Turnstile não configurado. Defina TURNSTILE_SECRET_KEY." }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }

  try {
    const body = await req.json();
    const { token, email } = body;

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Token do Turnstile é obrigatório." }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    // Validar token do Turnstile
    const formData = new FormData();
    formData.append("secret", secretKey);
    formData.append("response", token);

    const turnstileRes = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      body: formData,
    });

    const turnstileData = await turnstileRes.json();

    if (!turnstileData.success) {
      console.error("Turnstile validation failed:", turnstileData);
      return new Response(
        JSON.stringify({ error: "Verificação de segurança falhou. Tente novamente." }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    // Rate limiting por IP
    const ip = getClientIp(req);
    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
      const resetInMinutes = Math.ceil((rateLimit.resetAt - Date.now()) / 60000);
      return new Response(
        JSON.stringify({
          error: `Muitas tentativas. Tente novamente em ${resetInMinutes} minutos.`,
          retryAfter: resetInMinutes * 60,
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders(origin),
            "Content-Type": "application/json",
            "Retry-After": String(resetInMinutes * 60),
          },
        },
      );
    }

    // Verificar se o email é de domínio descartável
    if (email && isDisposableEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Não é permitido usar emails temporários. Use um email real." }),
        { status: 400, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
      }),
      { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro interno" }),
      { status: 500, headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
    );
  }
});
