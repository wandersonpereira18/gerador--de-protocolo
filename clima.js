/* ---------------------------------------------------------
   CLIMA DE TAGUATINGA-DF EM TEMPO REAL
   Fonte: Open-Meteo (gratuito, sem chave). Atualiza a cada 5 min
   e sempre que a aba volta a ficar visível.

   Para testar outras condições sem esperar o tempo mudar:
     ?clima=sol | parcial | nublado | chuva | tempestade
     ?hora=6   (simula a hora do dia, 0–23)
   --------------------------------------------------------- */
const Clima = (() => {
  const LAT = -15.8335, LON = -48.0559; // Taguatinga-DF
  const API =
    `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,precipitation,rain,showers," +
    "weather_code,cloud_cover,wind_speed_10m&daily=sunrise,sunset&timezone=America%2FSao_Paulo&forecast_days=1";
  const CACHE = "clima_taguatinga_v1";
  const INTERVALO = 5 * 60 * 1000;

  const qs = new URLSearchParams(location.search);
  const forcaCond = qs.get("clima");
  const forcaHora = qs.has("hora") ? Number(qs.get("hora")) : null;

  const ROTULO = {
    sol: "Ensolarado", parcial: "Parcialmente nublado", nublado: "Nublado",
    chuva: "Chuvoso", tempestade: "Tempestade",
  };

  let estado = lerCache() || {
    temp: null, sensacao: null, umidade: null, vento: 8, nuvens: 30,
    codigo: 1, chuvaMm: 0, cond: "parcial", intensidade: 0,
    nascer: null, por: null, atualizado: 0, offline: true,
  };
  if (forcaCond && ROTULO[forcaCond]) aplicarForca();

  const ouvintes = new Set();

  function lerCache() {
    try {
      const c = JSON.parse(localStorage.getItem(CACHE) || "null");
      return c && typeof c === "object" ? c : null;
    } catch { return null; }
  }
  function gravarCache() {
    try { localStorage.setItem(CACHE, JSON.stringify(estado)); } catch {}
  }

  /* Códigos WMO → condição do site */
  function classificar(c) {
    const code = c.weather_code;
    const mm = (c.precipitation || 0) + (c.rain || 0) + (c.showers || 0);
    if (code >= 95) return "tempestade";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || mm > 0.05) return "chuva";
    if (code === 45 || code === 48 || code === 3) return "nublado";
    if (c.cloud_cover >= 80) return "nublado";
    if (code === 2 || c.cloud_cover >= 30) return "parcial";
    return "sol";
  }

  function aplicarForca() {
    estado.cond = forcaCond;
    estado.intensidade = forcaCond === "tempestade" ? 1 : forcaCond === "chuva" ? 0.7 : 0;
    estado.nuvens = { sol: 5, parcial: 45, nublado: 95, chuva: 100, tempestade: 100 }[forcaCond];
    if (estado.temp == null) estado.temp = { sol: 29, parcial: 26, nublado: 23, chuva: 19, tempestade: 18 }[forcaCond];
  }

  async function atualizar() {
    try {
      const r = await fetch(API, { cache: "no-store" });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const c = j.current;
      const mm = (c.precipitation || 0) + (c.rain || 0) + (c.showers || 0);
      estado = {
        temp: Math.round(c.temperature_2m),
        sensacao: Math.round(c.apparent_temperature),
        umidade: Math.round(c.relative_humidity_2m),
        vento: Math.round(c.wind_speed_10m),
        nuvens: c.cloud_cover,
        codigo: c.weather_code,
        chuvaMm: mm,
        cond: classificar(c),
        intensidade: 0,
        nascer: j.daily && j.daily.sunrise ? j.daily.sunrise[0] : null,
        por: j.daily && j.daily.sunset ? j.daily.sunset[0] : null,
        atualizado: Date.now(),
        offline: false,
      };
      if (estado.cond === "chuva") estado.intensidade = Math.min(1, 0.35 + mm / 4);
      if (estado.cond === "tempestade") estado.intensidade = Math.min(1, 0.7 + mm / 10);
      gravarCache();
    } catch (err) {
      console.warn("Clima indisponível, usando o último conhecido:", err);
      estado.offline = true;
    }
    if (forcaCond && ROTULO[forcaCond]) aplicarForca();
    ouvintes.forEach((fn) => { try { fn(estado); } catch (e) { console.error(e); } });
  }

  /* Hora "do site" — real, ou simulada com ?hora= */
  function agora() {
    const d = new Date();
    if (forcaHora !== null && !Number.isNaN(forcaHora)) {
      const frac = forcaHora % 1;
      d.setHours(Math.floor(forcaHora), frac ? Math.round(frac * 60) : d.getMinutes());
    }
    return d;
  }

  function horaDecimal(iso, padrao) {
    if (!iso) return padrao;
    const m = /T(\d{2}):(\d{2})/.exec(iso);
    return m ? Number(m[1]) + Number(m[2]) / 60 : padrao;
  }

  /* Posição do sol: 0 no nascer, 1 no pôr; altura -1..1 (negativa = noite) */
  function sol(d = agora()) {
    const h = d.getHours() + d.getMinutes() / 60 + d.getSeconds() / 3600;
    const nasce = horaDecimal(estado.nascer, 6.0);
    const poe = horaDecimal(estado.por, 18.2);
    const dur = poe - nasce;
    let prog, alt;
    if (h >= nasce && h <= poe) {
      prog = (h - nasce) / dur;
      alt = Math.sin(Math.PI * prog);
    } else {
      const noite = 24 - dur;
      const desde = h > poe ? h - poe : h + 24 - poe;
      prog = desde / noite; // 0..1 ao longo da noite
      alt = -Math.sin(Math.PI * prog);
    }
    // crepúsculo: ~45 min antes/depois do nascer e do pôr
    const perto = Math.min(Math.abs(h - nasce), Math.abs(h - poe));
    const crepusculo = Math.pow(Math.max(0, 1 - perto / 1.4), 1.6);
    return { prog, alt, diurno: h >= nasce && h <= poe, crepusculo, nasce, poe, hora: h };
  }

  /* Fase da lua 0..1 (0 = nova, 0.5 = cheia) */
  function faseLua(d = agora()) {
    const ref = Date.UTC(2000, 0, 6, 18, 14);
    const dias = (d.getTime() - ref) / 86400000;
    const ciclo = 29.530588853;
    return ((dias % ciclo) + ciclo) % ciclo / ciclo;
  }

  function rotulo(e = estado) {
    if (e.cond === "sol" && !sol().diurno) return "Céu limpo";
    return ROTULO[e.cond] || "—";
  }

  /* Ícone animado (SVG) para cada condição */
  function icone(cond, noite) {
    const nuvem = (cls = "") =>
      `<path class="ic-nuvem ${cls}" d="M18 40h26a10 10 0 0 0 0-20 13 13 0 0 0-25-2 9 9 0 0 0-1 22z"/>`;
    const astro = noite
      ? `<g class="ic-lua"><path d="M40 10a14 14 0 1 0 12 20 11 11 0 1 1-12-20z"/></g>`
      : `<g class="ic-sol"><circle cx="40" cy="22" r="9"/>${[0, 45, 90, 135, 180, 225, 270, 315]
          .map((a) => `<line x1="40" y1="7" x2="40" y2="3" transform="rotate(${a} 40 22)"/>`).join("")}</g>`;
    let corpo = "";
    if (cond === "sol") corpo = astro;
    else if (cond === "parcial") corpo = astro + nuvem("ic-nuvem-frente");
    else if (cond === "nublado") corpo = `<g transform="translate(8 -6) scale(.8)" class="ic-nuvem-tras">${nuvem()}</g>` + nuvem("ic-nuvem-frente");
    else {
      corpo = nuvem("ic-nuvem-escura") +
        [20, 30, 40].map((x, i) => `<line class="ic-gota" style="animation-delay:${i * 0.23}s" x1="${x}" y1="44" x2="${x - 3}" y2="52"/>`).join("");
      if (cond === "tempestade") corpo += `<path class="ic-raio" d="M33 40l-5 9h5l-3 8 9-11h-5l3-6z"/>`;
    }
    return `<svg viewBox="0 0 64 60" class="ic-clima ic-${cond}" aria-hidden="true">${corpo}</svg>`;
  }

  /* Widget: “Taguatinga · 24° · Nublado” + relógio */
  function montarWidget(el) {
    if (!el) return;
    el.innerHTML = `
      <div class="wx-icone"></div>
      <div class="wx-info">
        <span class="wx-local">Taguatinga · DF</span>
        <strong class="wx-temp">--°</strong>
        <span class="wx-cond">carregando…</span>
      </div>
      <div class="wx-lado">
        <span class="wx-hora">--:--</span>
        <span class="wx-extra"></span>
      </div>`;
    const q = (s) => el.querySelector(s);
    let ultimaCond = "";
    const pintar = (e) => {
      const noite = !sol().diurno;
      const chave = e.cond + noite;
      if (chave !== ultimaCond) {
        q(".wx-icone").innerHTML = icone(e.cond, noite);
        el.classList.remove("wx-troca"); void el.offsetWidth; el.classList.add("wx-troca");
        ultimaCond = chave;
      }
      const t = q(".wx-temp");
      const novo = e.temp == null ? "--°" : `${e.temp}°`;
      if (t.textContent !== novo) { t.textContent = novo; t.classList.remove("pulso"); void t.offsetWidth; t.classList.add("pulso"); }
      q(".wx-cond").textContent = rotulo(e) + (e.offline ? " · offline" : "");
      q(".wx-extra").textContent = e.umidade != null ? `💧 ${e.umidade}%  ·  🌬 ${e.vento} km/h` : "";
      el.title = e.atualizado
        ? `Atualizado às ${new Date(e.atualizado).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · sensação ${e.sensacao}°`
        : "Aguardando dados do clima";
    };
    const relogio = () => {
      q(".wx-hora").textContent = agora().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    };
    pintar(estado);
    relogio();
    setInterval(relogio, 1000 * 15);
    ouvintes.add(pintar);
    el.addEventListener("click", () => { el.classList.add("wx-girando"); atualizar().finally(() => setTimeout(() => el.classList.remove("wx-girando"), 500)); });
  }

  function aoMudar(fn) { ouvintes.add(fn); fn(estado); return () => ouvintes.delete(fn); }

  let iniciado = false;
  function iniciar() {
    if (iniciado) return;
    iniciado = true;
    atualizar();
    setInterval(atualizar, INTERVALO);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && Date.now() - estado.atualizado > 60 * 1000) atualizar();
    });
  }

  return {
    get estado() { return estado; },
    iniciar, atualizar, aoMudar, montarWidget, sol, faseLua, agora, rotulo, icone,
  };
})();
