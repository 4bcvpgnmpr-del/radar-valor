// Worker de Cloudflare: intermediario gratuito para football-data.org
const PERMITIDO = "https://4bcvpgnmpr-del.github.io";
export default {
  async fetch(req, env) {
    const origin = req.headers.get("Origin") || "";
    const cors = {
      "Access-Control-Allow-Origin": PERMITIDO,
      "Access-Control-Allow-Headers": "X-Auth-Token, X-BSD-Key, Content-Type",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Vary": "Origin",
    };
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    if (origin && origin !== PERMITIDO) return new Response("Origen no permitido", { status: 403 });
    const url = new URL(req.url);
    if (req.method === "GET" && url.pathname.startsWith("/espn/")) {
      const r = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/" + url.pathname.slice(6) + url.search);
      const h = new Headers(r.headers);
      for (const [k, v] of Object.entries(cors)) h.set(k, v);
      return new Response(r.body, { status: r.status, headers: h });
    }
    if (req.method === "GET" && url.pathname.startsWith("/bsd/")) {
      const key = env.BSD_KEY || req.headers.get("X-BSD-Key") || "";
      const r = await fetch("https://sports.bzzoiro.com/api/v2/" + url.pathname.slice(5) + url.search, { headers: { Authorization: "Token " + key } });
      const h = new Headers(r.headers);
      for (const [k, v] of Object.entries(cors)) h.set(k, v);
      return new Response(r.body, { status: r.status, headers: h });
    }
    if (req.method === "GET" && url.pathname === "/photo") {
      const n = url.searchParams.get("n") || "", id = url.searchParams.get("id") || "";
      let out = "";
      try { if (id) { const a = await (await fetch("https://sports.core.api.espn.com/v2/sports/soccer/athletes/" + encodeURIComponent(id))).json(); out = (a.headshot && a.headshot.href) || ""; } } catch (e) {}
      if (!out && n) { try { const j = await (await fetch("https://www.thesportsdb.com/api/v1/json/3/searchplayers.php?p=" + encodeURIComponent(n))).json(); const pl = (j.player || []).find(x => x.strSport === "Soccer") || (j.player || [])[0]; out = (pl && (pl.strCutout || pl.strThumb)) || ""; } catch (e) {} }
      return new Response(JSON.stringify({ url: out }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/alarms/sync" && req.method === "POST") {
      if (!env.ALARMS) return new Response(JSON.stringify({ ok: false, error: "Falta el KV 'ALARMS' en el Worker" }), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
      let b; try { b = await req.json(); } catch (e) { return new Response("JSON inválido", { status: 400, headers: cors }); }
      if (!b || typeof b.token !== "string" || b.token.length < 16 || !Array.isArray(b.alarms)) return new Response("Datos inválidos", { status: 400, headers: cors });
      const db = await dbGet(env), u = db.u[b.token] || { fired: {}, base: {} };
      u.alarms = b.alarms.slice(0, 40); u.wa = b.wa && b.wa.phone && b.wa.key ? { prov: b.wa.prov || "callmebot", phone: String(b.wa.phone).slice(0, 20), key: String(b.wa.key).slice(0, 120) } : null; u.ts = Date.now(); const ai = b.ai && b.ai.key && b.ai.time ? { time: String(b.ai.time).slice(0, 5), key: String(b.ai.key).slice(0, 200), rules: String(b.ai.rules || "").slice(0, 1200), stats: String(b.ai.stats || "").slice(0, 1500), tz: String(b.ai.tz || "Europe/Madrid").slice(0, 60), days: ["all", "wk", "wkcl"].includes(b.ai.days) ? b.ai.days : "all", last: (u.ai && u.ai.last) || "" } : null; u.ai = ai; { const h = b.habit; u.habit = h && (h.start || h.end) ? { start: String(h.start || "").slice(0, 5), end: String(h.end || "").slice(0, 5), tz: String(h.tz || "Europe/Madrid").slice(0, 60), goal: +h.goal || 0, weekly: +h.weekly || 0, maxBets: +h.maxBets || 0, ls: (u.habit && u.habit.ls) || "", le: (u.habit && u.habit.le) || "" } : null; } db.u[b.token] = u;
      const ids = Object.keys(db.u); if (ids.length > 30) delete db.u[ids.sort((x, y) => (db.u[x].ts || 0) - (db.u[y].ts || 0))[0]];
      await env.ALARMS.put("db", JSON.stringify(db));
      return new Response(JSON.stringify({ ok: true, alarms: u.alarms.filter(a => a.active && a.type === "live").length }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/wa/test" && req.method === "POST") {
      let b; try { b = await req.json(); } catch (e) { return new Response("JSON inválido", { status: 400, headers: cors }); }
      const wa = b && b.wa; if (!wa || !wa.phone || !wa.key) return new Response("Datos inválidos", { status: 400, headers: cors });
      const prov = wa.prov === "textmebot" ? "textmebot" : "callmebot", ph = String(wa.phone).replace(/^\+/, "").slice(0, 20), tx = String(b.text || "Prueba").slice(0, 300);
      const u2 = prov === "textmebot" ? `https://api.textmebot.com/send.php?recipient=%2B${encodeURIComponent(ph)}&apikey=${encodeURIComponent(String(wa.key).slice(0, 120))}&text=${encodeURIComponent(tx)}` : `https://api.callmebot.com/whatsapp.php?phone=%2B${encodeURIComponent(ph)}&text=${encodeURIComponent(tx)}&apikey=${encodeURIComponent(String(wa.key).slice(0, 120))}`;
      let out = { prov, ok: false, status: 0, body: "" };
      try { const r = await fetch(u2); const t = (await r.text()).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(); out = { prov, ok: r.ok && !/error|invalid|not valid|incorrect|wrong/i.test(t), status: r.status, body: t.slice(0, 500) }; } catch (e) { out.body = String(e.message || e); }
      return new Response(JSON.stringify(out), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/alarms/presnap" && req.method === "POST") {
      if (!env.ALARMS) return new Response("sin KV", { status: 200, headers: cors });
      let b; try { b = await req.json(); } catch (e) { return new Response("JSON inválido", { status: 400, headers: cors }); }
      if (!b || typeof b.token !== "string" || b.token.length < 16 || !Array.isArray(b.items)) return new Response("Datos inválidos", { status: 400, headers: cors });
      await env.ALARMS.put("pre:" + b.token, JSON.stringify({ t: Date.now(), items: b.items.slice(0, 150) }));
      return new Response(JSON.stringify({ ok: true, n: Math.min(b.items.length, 150) }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/ai/snap" && req.method === "POST") {
      if (!env.ALARMS) return new Response("sin KV", { status: 200, headers: cors });
      let b; try { b = await req.json(); } catch (e) { return new Response("JSON inválido", { status: 400, headers: cors }); }
      if (!b || typeof b.token !== "string" || b.token.length < 16 || !Array.isArray(b.pre)) return new Response("Datos inválidos", { status: 400, headers: cors });
      await env.ALARMS.put("snap:" + b.token, JSON.stringify({ t: Date.now(), pre: b.pre.slice(0, 40) }));
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/ai/put" && req.method === "POST") {
      if (!env.ALARMS) return new Response("sin KV", { status: 200, headers: cors });
      let b; try { b = await req.json(); } catch (e) { return new Response("JSON inválido", { status: 400, headers: cors }); }
      if (!b || typeof b.token !== "string" || b.token.length < 16 || !b.rec || !b.rec.t) return new Response("Datos inválidos", { status: 400, headers: cors });
      await aiHistPut(env, b.token, b.rec);
      return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/ai/hist" && req.method === "GET") {
      const v = env.ALARMS ? await env.ALARMS.get("hist:" + (url.searchParams.get("token") || "")) : null;
      return new Response(v || "[]", { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/ai/last" && req.method === "GET") {
      const v = env.ALARMS ? await env.ALARMS.get("last:" + (url.searchParams.get("token") || "")) : null;
      return new Response(v || "null", { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (url.pathname === "/alarms/status" && req.method === "GET") {
      const out = { ok: true, kv: !!env.ALARMS };
      try { const live = await fetchLive(); out.moviodds = true; out.live = live.length; } catch (e) { out.moviodds = false; out.error = String(e.message || e); }
      if (env.ALARMS) { const db = await dbGet(env), u = db.u[url.searchParams.get("token") || ""]; out.registered = !!u; out.alarms = u ? (u.alarms || []).filter(a => a.active && a.type === "live").length : 0; out.wa = !!(u && u.wa); }
      return new Response(JSON.stringify(out), { headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (req.method !== "GET" || !url.pathname.startsWith("/v4/")) return new Response("No encontrado", { status: 404, headers: cors });
    const token = env.FD_TOKEN || req.headers.get("X-Auth-Token") || "";
    const r = await fetch("https://api.football-data.org" + url.pathname + url.search, { headers: { "X-Auth-Token": token } });
    const h = new Headers(r.headers);
    for (const [k, v] of Object.entries(cors)) h.set(k, v);
    return new Response(r.body, { status: r.status, headers: h });
  },
  async scheduled(event, env, ctx) { ctx.waitUntil((async () => { try { await runAlarms(env); } catch (e) { } try { await runPre(env); } catch (e) { } try { await runHabit(env); } catch (e) { } await runMorning(env); })()); },
};

/* ===== Alarmas en vivo con la app cerrada (cron cada minuto + KV "ALARMS") ===== */
async function dbGet(env) { try { const d = JSON.parse((await env.ALARMS.get("db")) || "null"); if (d && d.u) return d; } catch (e) { } return { u: {} }; }
const nrm = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\b(fc|cf|sc|afc|club|de|the|real|united|city)\b/g, "").replace(/\s+/g, " ").trim();
const near = (a, b) => a && b && (a === b || a.includes(b) || b.includes(a));
const WK = { sot: "shots_on_target", soff: "shots_off_target", shots: "shots", corners: "corners", yellow: "yellow_cards", goals: "goals" };
const WN = { sot: "Tiros a puerta", soff: "Tiros fuera", shots: "Tiros totales", corners: "Córners", yellow: "Tarjetas amarillas", goals: "Goles" };
async function fetchLive() {
  const r = await fetch("https://moviodds.com/odds?sport=soccer&in_play=1&stats=1", { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0 (compatible; RadarValor/1.0)" } });
  if (!r.ok) throw new Error("MoviOdds HTTP " + r.status);
  const j = await r.json(); return (j.matches || []).filter(m => m.in_play && m.home && m.away);
}
function inR(v, mn, mx) { return (mn === "" || mn == null || (v != null && v >= +mn)) && (mx === "" || mx == null || (v != null && v <= +mx)); }
async function sendWa(wa, text) {
  const url = wa.prov === "textmebot" ? `https://api.textmebot.com/send.php?recipient=%2B${encodeURIComponent(wa.phone)}&apikey=${encodeURIComponent(wa.key)}&text=${encodeURIComponent(text)}`
    : `https://api.callmebot.com/whatsapp.php?phone=%2B${encodeURIComponent(String(wa.phone).replace(/^\+/, ""))}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(wa.key)}`;
  try { await fetch(url); } catch (e) { }
}
async function runAlarms(env) {
  if (!env.ALARMS) return;
  const db = await dbGet(env), users = Object.entries(db.u).filter(([, u]) => u.wa && (u.alarms || []).some(a => a.active && a.type === "live" && !(a.w && a.w.mode === "last")));
  if (!users.length) return;
  let live; try { live = await fetchLive(); } catch (e) { return; }
  let dirty = false; const liveIds = new Set(live.map(m => String(m.id)));
  for (const [tok, u] of users) {
    u.fired = u.fired || {}; u.base = u.base || {};
    for (const m of live) {
      const mm = /(\d+)\s*[-:]\s*(\d+)/.exec(m.score || ""), gh = mm ? +mm[1] : 0, ga = mm ? +mm[2] : 0, min = m.clock && m.clock.min != null ? m.clock.min : null, hn = nrm(m.home), an = nrm(m.away), ln = nrm(m.league);
      for (const a of u.alarms) {
        if (!a.active || a.type !== "live" || (a.w && a.w.mode === "last")) continue;
        if (a.leagues && a.leagues.length && !a.leagues.some(l => String(l).startsWith("n:") && ln && near(ln, nrm(l.slice(2))))) continue;
        if (a.home && a.away && !(near(hn, nrm(a.home)) && near(an, nrm(a.away)))) continue;
        if (a.gh !== "" && a.gh != null && +a.gh !== gh) continue; if (a.ga !== "" && a.ga != null && +a.ga !== ga) continue;
        if (!inR(min, a.mMin, a.mMax)) continue;
        let msg, key;
        if (a.w) {
          const k = WK[a.w.kind], st = m.stats; if (!k || !st || !st.home || !st.away || min == null) continue;
          const from = a.w.from || 0, to = a.w.to; if (min < from - 3 || min > to + 2) continue;
          const cur = { h: +st.home[k] || 0, a: +st.away[k] || 0 }, bk = `${a.id}|${m.id}`; let base = u.base[bk];
          if (!base) { base = from <= 0 ? { h: 0, a: 0, m: 0 } : { h: cur.h, a: cur.a, m: min, approx: min > from + 3 }; u.base[bk] = base; dirty = true; }
          const h = cur.h - base.h, w = cur.a - base.a, c = a.w.team === "home" ? h : a.w.team === "away" ? w : a.w.team === "sum" ? h + w : Math.max(h, w);
          if (c < a.w.min) continue; key = `${a.id}|${m.id}|w`;
          msg = `${m.home} ${gh}-${ga} ${m.away}\nMinuto ${min}' · ${WN[a.w.kind] || a.w.kind}: local ${h}, visitante ${w} (del ${base.m}' al ${Math.min(min, to)}')${base.approx ? " · contado desde que empezó la vigilancia" : ""}`;
        } else if (a.kick) { key = `${a.id}|${m.id}|k`; msg = `⚽ Empezó el partido\n${m.home} vs ${m.away}`; } else { key = `${a.id}|${m.id}|${gh}-${ga}`; msg = `${m.home} ${gh}-${ga} ${m.away}\nMinuto ${min ?? "—"}'`; }
        if (u.fired[key]) continue; u.fired[key] = Date.now(); dirty = true;
        await sendWa(u.wa, `⏰ ${a.name || "Alarma"}\n${msg}`);
      }
    }
    for (const bk of Object.keys(u.base)) { const mid = bk.split("|")[1]; if (!liveIds.has(mid)) { delete u.base[bk]; dirty = true; } }
    const fk = Object.keys(u.fired); if (fk.length > 300) { fk.sort((x, y) => u.fired[x] - u.fired[y]).slice(0, fk.length - 300).forEach(k => delete u.fired[k]); dirty = true; }
  }
  if (dirty) await env.ALARMS.put("db", JSON.stringify(db));
}

/* ===== Alarmas de pregame con la app cerrada (usa el último snapshot de cuotas que subió la app) ===== */
const aIn = (v, mn, mx) => (mn === "" || mn == null || (v != null && v >= +mn)) && (mx === "" || mx == null || (v != null && v <= +mx));
async function runPre(env) {
  if (!env.ALARMS) return;
  const db = await dbGet(env); let dirty = false; const now = Date.now();
  for (const [tok, u] of Object.entries(db.u)) {
    const al = (u.alarms || []).filter(a => a.active && a.type === "pre"); if (!u.wa || !al.length) continue;
    let snap = null; try { snap = JSON.parse((await env.ALARMS.get("pre:" + tok)) || "null"); } catch (e) { } if (!snap || !snap.items) continue;
    u.fired = u.fired || {}; const day = new Date(now).toISOString().slice(0, 10), age = Math.round((now - snap.t) / 60000);
    for (const it of snap.items) {
      if (it.t < now - 10 * 60000) continue;
      for (const a of al) {
        if (!(it.al || []).includes(a.id)) continue;
        for (const c of it.cells || []) {
          if (a.sel !== "any" && a.sel !== c.lab) continue;
          if (!aIn(c.price, a.oMin, a.oMax) || !aIn(c.ev, a.eMin, a.eMax) || !aIn(c.real, a.rMin, a.rMax) || !aIn(c.diff, a.dMin, a.dMax)) continue;
          const key = `pre|${a.id}|${it.id}|${c.lab}|${day}`; if (u.fired[key]) continue; u.fired[key] = now; dirty = true;
          await sendWa(u.wa, `⏰ ${a.name || "Alarma"}\n${it.h} vs ${it.a}\nSelección ${c.lab} a ${Number(c.price).toFixed(2)}${c.ev != null ? ` · valor ${c.ev >= 0 ? "+" : ""}${Number(c.ev).toFixed(1)}%` : ""}\n(cuotas de hace ${age < 90 ? age + " min" : Math.round(age / 60) + " h"}; compruébalas antes de apostar)`);
        }
      }
    }
    const fk = Object.keys(u.fired); if (fk.length > 300) { fk.sort((x, y) => u.fired[x] - u.fired[y]).slice(0, fk.length - 300).forEach(k => delete u.fired[k]); dirty = true; }
  }
  if (dirty) await env.ALARMS.put("db", JSON.stringify(db));
}

/* ===== Recordatorios de la rutina (inicio y cierre del día) ===== */
async function runHabit(env) {
  if (!env.ALARMS) return; const db = await dbGet(env); let dirty = false;
  for (const [tok, u] of Object.entries(db.u)) { const h = u.habit; if (!h || !u.wa) continue; const ln = localNow(h.tz);
    const t = s => { const [a, b] = String(s || "").split(":").map(Number); return Number.isFinite(a) && Number.isFinite(b) ? a * 60 + b : null; }, ts = t(h.start), te = t(h.end);
    if (ts != null && ln.date !== h.ls && ln.min >= ts && ln.min < ts + 60) { h.ls = ln.date; dirty = true; await sendWa(u.wa, `🧭 Rutina: empieza el día.\nRevisa el resumen y las combinadas, y recuerda tus reglas.${h.maxBets ? "\nMáximo hoy: " + h.maxBets + " apuestas." : ""}${h.weekly ? "\nLímite semanal: " + h.weekly + " €." : ""}${h.goal ? "\nMeta pequeña del día: " + h.goal + " €. Si la cumples, cierras." : ""}`); }
    if (te != null && ln.date !== h.le && ln.min >= te && ln.min < te + 60) { h.le = ln.date; dirty = true; await sendWa(u.wa, "🧭 Rutina: cierra el día.\nMarca el resultado de cada apuesta y completa las casillas de hoy en la app."); } }
  if (dirty) await env.ALARMS.put("db", JSON.stringify(db));
}

/* ===== Análisis de la mañana con IA (pregame) ===== */
function localNow(tz) {
  try { const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: tz, hour12: false, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).formatToParts(new Date()).map(x => [x.type, x.value])); return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + +p.minute }; }
  catch (e) { const d = new Date(); return { date: d.toISOString().slice(0, 10), min: d.getUTCHours() * 60 + d.getUTCMinutes() }; }
}
async function runMorning(env) {
  if (!env.ALARMS) return;
  const db = await dbGet(env); let due = null;
  for (const [tok, u] of Object.entries(db.u)) { if (!u.ai || !u.wa) continue; const ln = localNow(u.ai.tz), [hh, mm] = u.ai.time.split(":").map(Number); if (ln.date !== u.ai.last && ln.min >= hh * 60 + mm && ln.min < hh * 60 + mm + 180) { const dow = new Date(ln.date + "T12:00:00Z").getUTCDay(), wk = dow === 5 || dow === 6 || dow === 0; if ((u.ai.days || "all") === "all" || wk) { due = [tok, u, ln]; break; } if (u.ai.days === "wkcl") { due = [tok, u, ln, true]; break; } u.ai.last = ln.date; await env.ALARMS.put("db", JSON.stringify(db)); } }
  if (!due) return;
  const [tok, u, ln, needEu] = due; u.ai.last = ln.date; await env.ALARMS.put("db", JSON.stringify(db));
  let snap = null; try { snap = JSON.parse((await env.ALARMS.get("snap:" + tok)) || "null"); } catch (e) { }
  const now = Date.now(), pre = snap ? snap.pre.filter(x => Date.parse(x._iso) > now + 10 * 60000) : [];
  if (needEu && !pre.some(x => /champions|europa|conference/i.test(x.liga || "") && Date.parse(x._iso) < now + 30 * 3600000)) return;
  if (!pre.length) { await sendWa(u.wa, "🤖 Análisis de la mañana: no tengo partidos cargados. Abre la app una vez para que guarde las cuotas y mañana lo haré."); return; }
  const clean = o => JSON.parse(JSON.stringify(o, (k, v) => k.startsWith("_") ? undefined : v));
  const prompt = `Eres un analista de apuestas deportivas prudente. Tienes datos reales de cuotas de Bet365, probabilidad justa (quitando el margen de la casa), valor estimado (% de ventaja) y medias de goles. Elige entre 4 y 8 oportunidades de PREGAME (partidos que aún no han empezado) que de verdad merezcan la pena. Reglas: usa SOLO los datos dados, no inventes cifras. MUY IMPORTANTE: cada oportunidad debe ser UNO de los "mercados_disponibles" de ese partido, copiando el nombre del mercado y la cuota exactamente como vienen; si un mercado NO está en esa lista, no lo propongas; si nada convence, devuelve una lista vacía; prefiere valor claro y respaldado por estadísticas. Responde SOLO con JSON, sin texto alrededor: {"resumen":"1 frase","oportunidades":[{"tipo":"pregame","partido":"exactamente como viene","mercado":"p. ej. Más de 2.5 goles","cuota":number,"motivo":"1 frase resumen","analisis":"explicación detallada de 5 a 8 frases con los números concretos que la respaldan","datos_clave":["entre 3 y 6 datos concretos de los datos dados"],"riesgos":"1 o 2 frases con lo que podría salir mal","confianza":1-5,"momento":"antes del partido"}]}${u.ai.rules ? `\n\nREGLAS DEL USUARIO (obligatorias, tienen prioridad):\n${u.ai.rules}` : ""}${u.ai.stats ? `\n\nHISTORIAL REAL DE TUS IDEAS ANTERIORES (con pocas muestras es ruido):\n${u.ai.stats}` : ""}\n\nPREGAME:\n${JSON.stringify(clean(pre))}`;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": u.ai.key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 4500, messages: [{ role: "user", content: prompt }] }) });
    if (!r.ok) throw new Error("Anthropic " + r.status);
    const j = await r.json(), txt = ((j.content || [])[0] || {}).text || "", mm2 = /\{[\s\S]*\}/.exec(txt); if (!mm2) throw new Error("respuesta ilegible");
    const out = JSON.parse(mm2[0]), mn = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim(); let dropped = 0;
    const items = (out.oportunidades || []).map(o => { const f = pre.find(z => mn(z.partido) === mn(o.partido)); const mk = f && (f.mercados_disponibles || []).find(z => mn(z.mercado) === mn(o.mercado)); if (!mk) { dropped++; return null; } return { partido: f.partido, tipo: "pregame", mercado: mk.mercado, cuota: mk.cuota, motivo: o.motivo, analisis: o.analisis, datos_clave: Array.isArray(o.datos_clave) ? o.datos_clave.slice(0, 8) : [], riesgos: o.riesgos, confianza: o.confianza, momento: o.momento || "antes del partido", h: f._h, a: f._a, iso: f._iso, facts: { liga: f.liga, hora: f.hora, mediaL: f.media_goles_local_casa, mediaV: f.media_goles_visitante_fuera, mercados: (f.mercados_disponibles || []).slice(0, 20) } }; }).filter(Boolean);
    const rec = { t: Date.now(), resumen: (out.resumen || "") + (dropped ? ` (se descartaron ${dropped})` : ""), items, morning: true };
    await env.ALARMS.put("last:" + tok, JSON.stringify(rec)); await aiHistPut(env, tok, rec);
    const age = Math.round((now - snap.t) / 3600000);
    await sendWa(u.wa, items.length ? `🤖 Ideas de la mañana (pregame)\n${rec.resumen}\n` + items.map(o => `• ${o.partido}\n  ${o.mercado} @${Number(o.cuota).toFixed(2)} (confianza ${o.confianza}/5)\n  ${o.motivo || ""}`).join("\n") + `\n\nCuotas guardadas hace ${age} h: confírmalas antes de apostar.` : "🤖 Análisis de la mañana: hoy la IA no ve nada que merezca la pena.");
  } catch (e) { await sendWa(u.wa, "🤖 No pude hacer el análisis de la mañana: " + (e.message || e)); }
  try { await runCombos(env, tok, u, pre, clean, now); } catch (e) { await sendWa(u.wa, "🎯 No pude armar las combinadas: " + (e.message || e)); }
}
const COMB_META = { segura: ["🟢", "Segura"], media: ["🟡", "Media"], super: ["🔴", "Super combinada"] };
const COMB_PROMPT = `Eres un analista prudente de apuestas. Con los partidos de PREGAME de abajo (datos reales de Bet365) arma EXACTAMENTE 3 combinadas:
- "segura": 2 o 3 selecciones de probabilidad alta y cuota baja (cuota total aproximada entre 1.8 y 3.2). Prioriza acertar.
- "media": 3 o 4 selecciones equilibradas (cuota total aproximada entre 4 y 9).
- "super": 5 a 7 selecciones, cuota total muy alta (más de 15), pensada para apostar muy poco dinero.
Reglas: usa SOLO los datos dados. Cada selección debe ser UNO de los "mercados_disponibles" de ese partido, copiando el nombre del partido y del mercado exactamente como vienen. No pongas dos selecciones del mismo partido en la misma combinada. No inventes cifras. Si no hay material para una combinada, déjala fuera. Responde SOLO con JSON, sin texto alrededor: {"resumen":"1 frase","combinadas":[{"tipo":"segura|media|super","motivo":"2 frases: por qué esta combinada","selecciones":[{"partido":"exactamente como viene","mercado":"exactamente como viene","motivo":"1 frase corta"}]}]}`;
async function runCombos(env, tok, u, pre, clean, now) {
  if (pre.length < 2) return;
  const prompt = COMB_PROMPT + (u.ai.rules ? `\n\nREGLAS DEL USUARIO (obligatorias, tienen prioridad):\n${u.ai.rules}` : "") + `\n\nPREGAME:\n${JSON.stringify(clean(pre))}`;
  const r = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": u.ai.key, "anthropic-version": "2023-06-01" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 3500, messages: [{ role: "user", content: prompt }] }) });
  if (!r.ok) throw new Error("Anthropic " + r.status);
  const j = await r.json(), txt = ((j.content || [])[0] || {}).text || "", m = /\{[\s\S]*\}/.exec(txt); if (!m) throw new Error("respuesta ilegible");
  const out = JSON.parse(m[0]), mn = x => String(x || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim(); let dropped = 0; const combos = [];
  for (const c of out.combinadas || []) { const tipo = COMB_META[c.tipo] ? c.tipo : null; if (!tipo || combos.some(z => z.tipo === tipo)) continue; const used = new Set(), legs = [];
    for (const o of c.selecciones || []) { const f = pre.find(z => mn(z.partido) === mn(o.partido)), mk = f && (f.mercados_disponibles || []).find(z => mn(z.mercado) === mn(o.mercado)); if (!mk || used.has(f.partido)) { dropped++; continue; } used.add(f.partido); legs.push({ partido: f.partido, mercado: mk.mercado, cuota: mk.cuota, prob: mk.prob_justa && mk.prob_justa > 1 ? 1 / mk.prob_justa : null, motivo: o.motivo || "", liga: f.liga, hora: f.hora, iso: f._iso }); }
    if (legs.length < 2) continue; const total = legs.reduce((a, l) => a * l.cuota, 1), pr = legs.every(l => l.prob) ? legs.reduce((a, l) => a * l.prob, 1) : null;
    combos.push({ tipo, motivo: c.motivo || "", selecciones: legs, cuota_total: Math.round(total * 100) / 100, prob: pr }); }
  combos.sort((a, b) => ["segura", "media", "super"].indexOf(a.tipo) - ["segura", "media", "super"].indexOf(b.tipo));
  const rec = { t: now + 1, resumen: (out.resumen || "") + (dropped ? ` (se descartaron ${dropped} selecciones)` : ""), items: [], combos, cat: "comb", morning: true };
  await aiHistPut(env, tok, rec);
  await sendWa(u.wa, combos.length ? `🎯 Combinadas del día\n${rec.resumen}\n` + combos.map(c => { const M = COMB_META[c.tipo]; return `\n${M[0]} ${M[1].toUpperCase()} · cuota total @${c.cuota_total.toFixed(2)}${c.prob ? " · prob. aprox. " + (c.prob * 100).toFixed(c.prob * 100 < 10 ? 1 : 0) + "%" : ""}\n` + c.selecciones.map(l => `• ${l.partido}\n  ${l.mercado} @${Number(l.cuota).toFixed(2)}`).join("\n"); }).join("\n") + "\n\nLas cuotas pueden haber cambiado. Apuesta solo lo que puedas perder." : "🎯 Combinadas del día: hoy la IA no ve material para armar combinadas.");
}

async function aiHistPut(env, tok, rec) {
  let h = []; try { h = JSON.parse((await env.ALARMS.get("hist:" + tok)) || "[]"); } catch (e) { }
  if (h.some(x => x.t === rec.t)) return; h.unshift({ t: rec.t, resumen: String(rec.resumen || "").slice(0, 400), items: (rec.items || []).slice(0, 12), morning: !!rec.morning, cat: rec.cat === "comb" || rec.cat === "jug" ? rec.cat : undefined, combos: Array.isArray(rec.combos) ? rec.combos.slice(0, 3) : undefined });
  await env.ALARMS.put("hist:" + tok, JSON.stringify(h.slice(0, 12)));
}
