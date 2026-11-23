/*
 * Mellomtjeneste for retteskjema-generatoren.
 *
 * Nettsiden kan ikke snakke direkte med Anthropic uten at API-nøkkelen ligger
 * synlig i siden. Denne lille tjenesten holder nøkkelen skjult, krever passord,
 * og sender forespørslene videre.
 *
 * Oppsett: se OPPSETT.md. Du trenger to hemmeligheter i Cloudflare:
 *   ANTHROPIC_API_KEY  – nøkkelen din fra console.anthropic.com
 *   PASSORD            – et felles passord du gir til lærerne
 * Valgfritt:
 *   TILLATT_OPPRINNELSE – f.eks. https://bjarneelb.github.io (ellers tillates alle)
 */

// Bytt modell her hvis du vil, uten å røre nettsiden.
const MODELLER = {
  default: "claude-sonnet-5-5",   // innlesing av oppgavesett
  complex: "claude-opus-5",       // fasit og løsningsforslag
};
const MAKS_TOKENS = 8000;
const MAKS_STORRELSE = 24 * 1024 * 1024;   // 24 MB, nok til noen sidebilder

export default {
  async fetch(request, env) {
    const opprinnelse = env.TILLATT_OPPRINNELSE || request.headers.get("Origin") || "*";
    const cors = {
      "Access-Control-Allow-Origin": opprinnelse,
      "Access-Control-Allow-Headers": "content-type,x-passord",
      "Access-Control-Allow-Methods": "POST,OPTIONS",
      "Access-Control-Max-Age": "86400",
      "Vary": "Origin",
    };
    const svar = (data, status) => new Response(JSON.stringify(data), { status, headers: { ...cors, "content-type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method === "GET") return svar({ tjeneste: "retteskjema", klar: !!(env.ANTHROPIC_API_KEY && env.PASSORD) }, 200);
    if (request.method !== "POST") return svar({ feil: "Bruk POST." }, 405);

    if (!env.ANTHROPIC_API_KEY || !env.PASSORD) return svar({ feil: "Tjenesten er ikke satt opp med nøkkel og passord." }, 500);
    if (request.headers.get("x-passord") !== env.PASSORD) return svar({ feil: "Feil passord." }, 401);
    if (Number(request.headers.get("content-length") || 0) > MAKS_STORRELSE) return svar({ feil: "Forespørselen er for stor." }, 413);

    let kropp;
    try { kropp = await request.json(); } catch (e) { return svar({ feil: "Ugyldig forespørsel." }, 400); }
    if (!Array.isArray(kropp.messages) || !kropp.messages.length) return svar({ feil: "Ugyldig forespørsel." }, 400);

    const api = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELLER[kropp.tier === "complex" ? "complex" : "default"],
        max_tokens: Math.min(Number(kropp.max_tokens) || 4000, MAKS_TOKENS),
        messages: kropp.messages,
        stream: true,                     // holder forbindelsen i live på lange svar
      }),
    });

    if (!api.ok || !api.body) {
      const tekst = await api.text().catch(() => "");
      return svar({ feil: "Anthropic svarte med feil.", status: api.status, detaljer: tekst.slice(0, 600) }, api.status === 429 ? 429 : 502);
    }
    return new Response(api.body, { status: 200, headers: { ...cors, "content-type": "text/event-stream", "cache-control": "no-store" } });
  },
};
