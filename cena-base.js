/* ---------------------------------------------------------
   CENA — parte 1: céu, astros, nuvens, relevo, rio, vegetação
   Paisagem de cerrado (Taguatinga-DF): chapadas ao fundo,
   vereda com buritis, ipês floridos, capim que muda de cor
   com a chuva. Iluminação segue a hora real e o clima real.
   --------------------------------------------------------- */
window.CU = (() => {
  const rand = (a, b) => Math.random() * (b - a) + a;
  const randi = (a, b) => Math.floor(rand(a, b + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

  const hexCache = new Map();
  function hex(h) {
    let v = hexCache.get(h);
    if (!v) {
      const s = h.replace("#", "");
      v = [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
      hexCache.set(h, v);
    }
    return v;
  }
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  const css = (c, a = 1) => a >= 1
    ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
    : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a.toFixed(3)})`;

  return { rand, randi, pick, clamp, lerp, smooth, hex, mix, css };
})();

window.C = {
  cv: null, ctx: null, W: 0, H: 0, dpr: 1,
  t: 0, dt: 0.016,
  f: { nuvem: 0.3, chuva: 0, tempestade: 0, vento: 8, noite: 0, luz: 1, crep: 0, molhado: 0, verde: 0.3, nevoa: 0 },
  sol: { x: 0, y: 0, alt: 1, vis: 1 },
  lua: { x: 0, y: 0, vis: 0, fase: 0.5 },
  ceu: [[0, 0, 0], [0, 0, 0], [0, 0, 0]],
  horizonte: 0,
  rio: { passo: 8, topo: [], base: [] },
  arvores: [],
  ponteiro: { x: -999, y: -999, dentro: false },
};

(() => {
  const { rand, randi, pick, clamp, lerp, smooth, hex, mix, css } = CU;

  /* ---- Cor sob a luz da cena (cacheada) ---- */
  const luzCache = new Map();
  C.luz = (h, a = 1) => {
    const k = Math.round(C.f.luz * 60);
    const key = h + k + a;
    let v = luzCache.get(key);
    if (!v) {
      const c = hex(h), q = k / 60, n = 1 - q;
      v = css([c[0] * q + 10 * n, c[1] * q + 16 * n, c[2] * q + 34 * n], a);
      if (luzCache.size > 4000) luzCache.clear();
      luzCache.set(key, v);
    }
    return v;
  };
  C.luzRGB = (h) => {
    const c = hex(h), q = C.f.luz, n = 1 - q;
    return [c[0] * q + 10 * n, c[1] * q + 16 * n, c[2] * q + 34 * n];
  };

  /* Onda de vento que atravessa a tela (rajada) */
  C.rajada = (x) => {
    const w = Math.sin(x * 0.0032 - C.t * 0.9) * 0.5 + 0.5;
    return w * w;
  };
  C.forcaVento = () => 0.35 + C.f.vento * 0.035 + C.f.tempestade * 1.6 + C.f.chuva * 0.4;

  C.riverAt = (x) => {
    const i = clamp(Math.round(x / C.rio.passo), 0, C.rio.topo.length - 1);
    return [C.rio.topo[i], C.rio.base[i]];
  };
  C.profundidade = (y) => clamp((y - C.horizonte) / (C.H - C.horizonte), 0, 1);
  C.escalaY = (y) => lerp(0.42, 1.28, C.profundidade(y));

  /* =========================================================
     CÉU
     ========================================================= */
  const P = {
    dia:      ["#2a74c9", "#62a9e6", "#cde7f6"],
    diaNub:   ["#7a8793", "#9aa6b1", "#c2cad1"],
    chuva:    ["#434e5a", "#5b6773", "#77828c"],
    noite:    ["#030812", "#0a1630", "#1b2a48"],
    noiteNub: ["#090c12", "#12171f", "#1f2631"],
    crep:     ["#2b3d73", "#c9707a", "#ffb46b"],
  };

  C.calcCeu = () => {
    const { noite, nuvem, chuva, crep } = C.f;
    const nb = smooth(0.35, 1, nuvem);
    for (let i = 0; i < 3; i++) {
      let dia = mix(hex(P.dia[i]), hex(P.diaNub[i]), nb);
      dia = mix(dia, hex(P.chuva[i]), chuva);
      let nt = mix(hex(P.noite[i]), hex(P.noiteNub[i]), nb);
      let c = mix(dia, nt, noite);
      c = mix(c, hex(P.crep[i]), crep * (1 - nb * 0.8) * (1 - chuva) * [0.35, 0.75, 0.9][i]);
      C.ceu[i] = c;
    }
  };

  C.desenharCeu = () => {
    const { ctx, W, horizonte } = C;
    const g = ctx.createLinearGradient(0, 0, 0, horizonte);
    g.addColorStop(0, css(C.ceu[0]));
    g.addColorStop(0.62, css(C.ceu[1]));
    g.addColorStop(1, css(C.ceu[2]));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, horizonte + 4);
  };

  /* ---- Estrelas e estrelas cadentes ---- */
  let estrelas = [];
  let cadentes = [];
  C.gerarEstrelas = () => {
    estrelas = [];
    const n = Math.floor((C.W * C.horizonte) / 3200);
    for (let i = 0; i < n; i++) {
      const brilho = Math.pow(Math.random(), 3);
      estrelas.push({
        x: rand(0, C.W), y: rand(0, C.horizonte * 0.92),
        r: 0.4 + brilho * 1.3, a: 0.35 + brilho * 0.65,
        fase: rand(0, 6.28), vel: rand(0.6, 2.4),
        cor: brilho > 0.7 ? pick(["#cfe0ff", "#fff1d6", "#ffffff"]) : "#ffffff",
      });
    }
  };
  C.estrelaCadente = (x, y) => {
    cadentes.push({ x: x ?? rand(C.W * 0.1, C.W * 0.9), y: y ?? rand(10, C.horizonte * 0.4),
      vx: rand(-520, -300) * (Math.random() < 0.5 ? -1 : 1), vy: rand(140, 240), vida: 1 });
  };
  C.desenharEstrelas = () => {
    const vis = C.f.noite * (1 - smooth(0.2, 0.85, C.f.nuvem)) * (1 - C.f.chuva);
    if (vis < 0.02) { cadentes.length = 0; return; }
    const { ctx, t } = C;
    estrelas.forEach((s) => {
      const tw = 0.65 + 0.35 * Math.sin(t * s.vel + s.fase);
      const fadeHoriz = smooth(C.horizonte, C.horizonte * 0.55, s.y);
      ctx.globalAlpha = s.a * tw * vis * fadeHoriz;
      ctx.fillStyle = s.cor;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, 6.283);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
    if (Math.random() < 0.0009 * vis) C.estrelaCadente();
    for (let i = cadentes.length - 1; i >= 0; i--) {
      const c = cadentes[i];
      c.x += c.vx * C.dt; c.y += c.vy * C.dt; c.vida -= C.dt * 1.1;
      if (c.vida <= 0) { cadentes.splice(i, 1); continue; }
      const len = 0.16;
      const g = ctx.createLinearGradient(c.x, c.y, c.x - c.vx * len, c.y - c.vy * len);
      g.addColorStop(0, `rgba(255,255,255,${0.9 * c.vida * vis})`);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x - c.vx * len, c.y - c.vy * len);
      ctx.stroke();
    }
  };

  /* ---- Sol ---- */
  C.posAstros = () => {
    const s = Clima.sol();
    const arco = (p) => ({ x: C.W * (0.06 + 0.88 * p), y: C.horizonte + 10 - Math.sin(Math.PI * p) * C.horizonte * 0.82 });
    if (s.diurno) {
      const a = arco(s.prog);
      Object.assign(C.sol, a, { alt: s.alt });
      C.lua.vis = 0;
    } else {
      C.sol.alt = s.alt;
      C.sol.y = C.horizonte + 60;
      const a = arco(s.prog);
      Object.assign(C.lua, a);
    }
    C.lua.fase = Clima.faseLua();
    const cob = 1 - smooth(0.25, 1, C.f.nuvem) * 0.85;
    C.sol.vis = s.diurno ? cob * (1 - C.f.chuva) : 0;
    C.lua.vis = s.diurno ? 0 : smooth(0, 0.15, -s.alt) * cob * (1 - C.f.chuva);
    return s;
  };

  C.desenharSol = () => {
    const { ctx, sol } = C;
    const perto = 1 - smooth(0.05, 0.45, sol.alt);
    const difuso = (1 - C.f.chuva) * 0.35 * smooth(0, 0.1, sol.alt);
    const vis = Math.max(sol.vis, difuso);
    if (vis < 0.02) return;
    const R = lerp(150, 260, perto);
    const core = mix(hex("#fff8e1"), hex("#ffb35c"), perto);
    const halo = mix(hex("#fff2c0"), hex("#ff8f4a"), perto);
    ctx.save();
    const g = ctx.createRadialGradient(sol.x, sol.y, 0, sol.x, sol.y, R);
    g.addColorStop(0, css(halo, 0.55 * vis));
    g.addColorStop(0.25, css(halo, 0.22 * vis));
    g.addColorStop(1, css(halo, 0));
    ctx.fillStyle = g;
    ctx.fillRect(sol.x - R, sol.y - R, R * 2, R * 2);
    if (sol.vis > 0.05) {
      ctx.globalAlpha = sol.vis;
      ctx.fillStyle = css(core);
      ctx.shadowColor = css(halo);
      ctx.shadowBlur = 30;
      ctx.beginPath();
      ctx.arc(sol.x, sol.y, lerp(24, 30, perto), 0, 6.283);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ---- Lua com fase real (vista do hemisfério sul) ---- */
  C.desenharLua = () => {
    const { ctx, lua } = C;
    if (lua.vis < 0.02) return;
    const r = 15, p = lua.fase;
    ctx.save();
    ctx.translate(lua.x, lua.y);
    const brilho = 1 - Math.abs(p - 0.5) * 2; // 1 na cheia
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 120);
    g.addColorStop(0, `rgba(220,228,255,${0.22 * lua.vis * (0.3 + brilho * 0.7)})`);
    g.addColorStop(1, "rgba(220,228,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(-120, -120, 240, 240);

    ctx.globalAlpha = lua.vis;
    ctx.fillStyle = "rgba(60,70,95,0.35)"; // luz cinérea
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.fill();

    ctx.scale(-1, 1); // hemisfério sul: o lado iluminado aparece invertido
    let q = p;
    if (q > 0.5) { ctx.scale(-1, 1); q = 1 - q; }
    const rx = Math.abs(Math.cos(q * 2 * Math.PI)) * r;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    if (q < 0.25) ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, true);
    else ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, Math.PI * 1.5, false);
    ctx.closePath();
    ctx.fillStyle = "#eee9d6";
    ctx.shadowColor = "rgba(230,236,255,0.8)";
    ctx.shadowBlur = 12;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.clip();
    ctx.fillStyle = "rgba(150,150,140,0.35)";
    [[-4, -5, 5], [5, 2, 4], [-2, 6, 3], [6, -6, 2.4]].forEach(([x, y, rr]) => {
      ctx.beginPath(); ctx.arc(x, y, rr, 0, 6.283); ctx.fill();
    });
    ctx.restore();
  };

  /* =========================================================
     NUVENS — sprites sombreados, regerados quando a luz muda
     ========================================================= */
  let nuvens = [];
  function gerarPuffs(w, h, estrato) {
    const puffs = [];
    const n = estrato ? Math.round(w / 9) : Math.round(w / 6);
    for (let i = 0; i < n; i++) {
      const x = rand(-w / 2, w / 2);
      const perfil = Math.cos((x / (w / 2)) * Math.PI / 2);
      const y = -rand(0, perfil * h);
      const r = (estrato ? rand(12, 24) : rand(14, 30)) * (0.6 + perfil * 0.55);
      puffs.push({ x, y, r });
    }
    return puffs;
  }
  C.gerarNuvens = () => {
    nuvens = [];
    const n = Math.max(10, Math.round(C.W / 110));
    for (let i = 0; i < n; i++) {
      const estrato = i % 3 === 0;
      const camada = Math.random();
      const w = estrato ? rand(260, 520) : rand(120, 300);
      const h = estrato ? rand(14, 28) : rand(34, 70);
      nuvens.push({
        x: rand(-200, C.W + 200),
        y: lerp(C.horizonte * 0.08, C.horizonte * 0.62, camada),
        camada, estrato, w, h,
        escala: lerp(0.6, 1.15, camada),
        limiar: estrato ? rand(0.55, 0.95) : rand(0, 0.9),
        puffs: gerarPuffs(w, h, estrato),
        sprite: null, chave: "",
        a: 0,
      });
    }
    nuvens.sort((a, b) => a.camada - b.camada);
  };

  function coresNuvem() {
    const { noite, chuva, crep, nuvem } = C.f;
    let topo = mix(hex("#ffffff"), hex("#d5dbe1"), smooth(0.5, 1, nuvem));
    let base = mix(hex("#b7c1cc"), hex("#87919b"), smooth(0.5, 1, nuvem));
    topo = mix(topo, hex("#8c959d"), chuva);
    base = mix(base, hex("#3f4851"), chuva);
    topo = mix(topo, hex("#ffcf9e"), crep * (1 - chuva) * 0.8);
    base = mix(base, hex("#7d5f86"), crep * (1 - chuva) * 0.7);
    topo = mix(topo, hex("#2c3444"), noite * 0.9);
    base = mix(base, hex("#0f131b"), noite * 0.92);
    return { topo, base };
  }

  function renderSprite(nv, cores) {
    const pad = 44;
    const cw = Math.ceil(nv.w + pad * 2), ch = Math.ceil(nv.h + pad * 2 + 20);
    const cv = nv.sprite || document.createElement("canvas");
    cv.width = cw; cv.height = ch;
    const x = cv.getContext("2d");
    x.clearRect(0, 0, cw, ch);
    const ox = cw / 2, oy = nv.h + pad;
    x.save();
    x.beginPath();
    x.rect(0, 0, cw, oy + 10); // base achatada, como cúmulo de verdade
    x.clip();
    nv.puffs.forEach((p) => {
      const g = x.createRadialGradient(ox + p.x, oy + p.y, p.r * 0.15, ox + p.x, oy + p.y, p.r);
      g.addColorStop(0, css(cores.topo, 0.7));
      g.addColorStop(0.5, css(cores.topo, 0.45));
      g.addColorStop(1, css(cores.topo, 0));
      x.fillStyle = g;
      x.beginPath();
      x.arc(ox + p.x, oy + p.y, p.r, 0, 6.283);
      x.fill();
    });
    x.globalCompositeOperation = "source-atop";
    const sg = x.createLinearGradient(0, oy - nv.h - 10, 0, oy + 12);
    sg.addColorStop(0, css(cores.base, 0));
    sg.addColorStop(0.55, css(cores.base, 0.35));
    sg.addColorStop(1, css(cores.base, 0.95));
    x.fillStyle = sg;
    x.fillRect(0, 0, cw, ch);
    x.restore();
    nv.sprite = cv;
    nv.ox = ox; nv.oy = oy;
  }

  C.desenharNuvens = (frente) => {
    const { ctx, W } = C;
    const cores = coresNuvem();
    const chave = cores.topo.map((v) => Math.round(v / 6)).join() + cores.base.map((v) => Math.round(v / 6)).join();
    let refeitas = 0;
    const vel = 3 + C.f.vento * 0.9 + C.f.tempestade * 10;
    nuvens.forEach((nv) => {
      if ((nv.camada > 0.55) !== frente) return;
      const alvo = smooth(nv.limiar - 0.12, nv.limiar + 0.08, C.f.nuvem);
      nv.a += (alvo - nv.a) * Math.min(1, C.dt * 0.35);
      nv.x += vel * lerp(0.5, 1.2, nv.camada) * C.dt;
      const largura = (nv.w + 100) * nv.escala;
      if (nv.x - largura / 2 > W) {
        nv.x = -largura / 2;
        nv.puffs = gerarPuffs(nv.w, nv.h, nv.estrato);
        nv.chave = "";
      }
      if (nv.a < 0.01) return;
      if (nv.chave !== chave && (refeitas < 2 || !nv.sprite)) {
        renderSprite(nv, cores);
        nv.chave = chave;
        refeitas++;
      }
      ctx.globalAlpha = nv.a;
      const s = nv.escala;
      ctx.drawImage(nv.sprite, nv.x - nv.ox * s, nv.y - nv.oy * s, nv.sprite.width * s, nv.sprite.height * s);
    });
    ctx.globalAlpha = 1;

    // manto de nuvens quando fecha o tempo
    const manto = smooth(0.7, 1, C.f.nuvem) * 0.55 + C.f.chuva * 0.25;
    if (frente && manto > 0.02) {
      const g = ctx.createLinearGradient(0, 0, 0, C.horizonte * 0.7);
      g.addColorStop(0, css(cores.base, manto));
      g.addColorStop(1, css(cores.base, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, C.horizonte * 0.7);
    }
  };

  /* =========================================================
     RELEVO — chapadas do Planalto Central + silhueta da cidade
     ========================================================= */
  let camadas = [];
  let predios = [];
  function ruido(fases) {
    return (x) => fases.reduce((s, f) => s + Math.sin(x * f.k + f.p) * f.a, 0);
  }
  C.gerarRelevo = () => {
    const { W, horizonte } = C;
    const defs = [
      { base: horizonte, plato: 46, amp: 16, cor: "#6c7f95", haze: 0.72 },
      { base: horizonte + 2, plato: 30, amp: 12, cor: "#4f6445", haze: 0.48 },
      { base: horizonte + 4, plato: 14, amp: 9, cor: "#5d6a36", haze: 0.22 },
    ];
    camadas = defs.map((d, i) => {
      const n = ruido([
        { k: rand(0.002, 0.004), p: rand(0, 6), a: 1 },
        { k: rand(0.007, 0.011), p: rand(0, 6), a: 0.45 },
        { k: rand(0.02, 0.04), p: rand(0, 6), a: 0.12 },
      ]);
      const pts = [];
      for (let x = -10; x <= W + 12; x += 6) {
        const h = n(x) * 0.5 + 0.5;
        const mesa = smooth(0.42, 0.58, h);
        const y = d.base - (mesa * d.plato + h * d.amp * 0.35 + Math.sin(x * 0.09 + i) * 0.8);
        pts.push([x, y]);
      }
      return { ...d, pts };
    });

    // cidade ao longe (lado direito), com janelas que acendem à noite
    predios = [];
    let x = W * 0.6;
    while (x < W * 0.97) {
      const w = rand(8, 20), h = rand(10, 44) * (Math.random() < 0.15 ? 1.6 : 1);
      const janelas = [];
      for (let jy = 4; jy < h - 3; jy += 4) {
        for (let jx = 2; jx < w - 2; jx += 3.5) {
          if (Math.random() < 0.4) janelas.push({ x: jx, y: jy, on: Math.random() < 0.55, troca: rand(5, 40) });
        }
      }
      predios.push({ x, w, h, janelas, tom: rand(-12, 12) });
      x += w + rand(0, 6);
    }
    const maisAlto = predios.reduce((a, b) => (b.h > a.h ? b : a), predios[0]);
    if (maisAlto) maisAlto.antena = true;
  };

  function preencherCamada(cam) {
    const { ctx, H } = C;
    ctx.beginPath();
    ctx.moveTo(-10, H);
    cam.pts.forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.lineTo(C.W + 12, H);
    ctx.closePath();
  }

  C.desenharRelevo = () => {
    const { ctx } = C;
    camadas.forEach((cam, i) => {
      const base = C.luzRGB(cam.cor);
      const haze = cam.haze + C.f.chuva * 0.2 + C.f.nevoa * 0.3;
      const c = mix(base, C.ceu[2], clamp(haze, 0, 0.95));
      preencherCamada(cam);
      const g = ctx.createLinearGradient(0, cam.base - cam.plato - 10, 0, cam.base + 8);
      g.addColorStop(0, css(mix(c, C.ceu[2], 0.08)));
      g.addColorStop(1, css(mix(c, [0, 0, 0], 0.12)));
      ctx.fillStyle = g;
      ctx.fill();
      if (i === 0) desenharCidade();
    });
  };

  function desenharCidade() {
    const { ctx, horizonte, t } = C;
    const base = horizonte + 1;
    const cor = mix(C.luzRGB("#7d8794"), C.ceu[2], 0.55 + C.f.chuva * 0.2);
    const acesa = smooth(0.35, 0.8, C.f.noite);
    predios.forEach((p) => {
      ctx.fillStyle = css(mix(cor, [0, 0, 0], p.tom / 100 + 0.05));
      ctx.fillRect(p.x, base - p.h, p.w, p.h);
      if (acesa > 0.02) {
        ctx.fillStyle = `rgba(255,214,140,${0.85 * acesa})`;
        p.janelas.forEach((j) => {
          j.troca -= C.dt;
          if (j.troca <= 0) { j.on = Math.random() < 0.6; j.troca = rand(8, 60); }
          if (j.on) ctx.fillRect(p.x + j.x, base - p.h + j.y, 1.4, 1.8);
        });
      }
      if (p.antena) {
        ctx.strokeStyle = css(cor);
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(p.x + p.w / 2, base - p.h); ctx.lineTo(p.x + p.w / 2, base - p.h - 14); ctx.stroke();
        if (acesa > 0.1 && Math.sin(t * 3.2) > 0.3) {
          ctx.fillStyle = "rgba(255,60,50,0.95)";
          ctx.shadowColor = "rgba(255,60,50,1)"; ctx.shadowBlur = 8;
          ctx.beginPath(); ctx.arc(p.x + p.w / 2, base - p.h - 14, 1.6, 0, 6.283); ctx.fill();
          ctx.shadowBlur = 0;
        }
      }
    });
  }

  /* =========================================================
     CHÃO — capim do cerrado (dourado na seca, verde com chuva)
     ========================================================= */
  let laminas = [];
  let manchas = [];
  let flores = [];
  const SECO = ["#c2ad62", "#a8964c", "#8c813f", "#d3c27a"];
  const VERDE = ["#6f9a45", "#5a8a3a", "#4a7430", "#88ae56"];

  C.gerarChao = () => {
    const { W, H, horizonte } = C;
    laminas = [];
    const n = Math.min(2600, Math.floor((W * (H - horizonte)) / 260));
    for (let i = 0; i < n; i++) {
      const y = horizonte + Math.pow(Math.random(), 0.75) * (H - horizonte);
      const x = rand(-4, W + 4);
      const [t2, b2] = C.riverAt(x);
      if (y > t2 - 2 && y < b2 + 3) continue;
      const s = C.escalaY(y);
      laminas.push({ x, y, h: rand(5, 16) * s * s, fase: rand(0, 6.28), tom: randi(0, 3), w: s });
    }
    laminas.sort((a, b) => a.y - b.y);

    manchas = [];
    for (let i = 0; i < 40; i++) {
      const y = rand(horizonte + 6, H);
      manchas.push({ x: rand(0, W), y, rx: rand(40, 140) * C.escalaY(y), ry: rand(5, 16) * C.escalaY(y), escuro: Math.random() < 0.5 });
    }

    flores = [];
    const cores = ["#b98ae0", "#f2f0e6", "#f5c542", "#e46a8d"];
    for (let i = 0; i < Math.round(W / 22); i++) {
      const y = rand(C.rio.base[0] + 20, H - 4);
      const s = C.escalaY(y);
      flores.push({ x: rand(0, W), y, h: rand(10, 22) * s, cor: pick(cores), fase: rand(0, 6.28), s });
    }
  };

  C.desenharChao = () => {
    const { ctx, W, H, horizonte } = C;
    const v = C.f.verde;
    const perto = mix(hex("#7d7236"), hex("#3f6128"), v);
    const longe = mix(hex("#a79c5c"), hex("#6f8c4c"), v);
    const g = ctx.createLinearGradient(0, horizonte, 0, H);
    g.addColorStop(0, css(mix(longe.map((c) => c * C.f.luz + 10 * (1 - C.f.luz)), C.ceu[2], 0.3)));
    g.addColorStop(1, css(perto.map((c) => c * C.f.luz + 12 * (1 - C.f.luz))));
    ctx.fillStyle = g;
    ctx.fillRect(0, horizonte, W, H - horizonte);

    manchas.forEach((m) => {
      ctx.fillStyle = m.escuro ? `rgba(20,30,10,${0.12 * C.f.luz})` : `rgba(255,240,190,${0.07 * C.f.luz})`;
      ctx.beginPath();
      ctx.ellipse(m.x, m.y, m.rx, m.ry, 0, 0, 6.283);
      ctx.fill();
    });

    // poças quando está bem molhado
    if (C.f.molhado > 0.3) {
      const a = (C.f.molhado - 0.3) * 0.6;
      manchas.forEach((m, i) => {
        if (i % 4 || m.y < C.rio.base[0]) return;
        const gg = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.rx * 0.5);
        gg.addColorStop(0, css(mix(C.ceu[1], [255, 255, 255], 0.1), a));
        gg.addColorStop(1, css(C.ceu[1], 0));
        ctx.fillStyle = gg;
        ctx.beginPath();
        ctx.ellipse(m.x, m.y, m.rx * 0.5, m.ry * 0.55, 0, 0, 6.283);
        ctx.fill();
      });
    }
  };

  /* capim desenhado em lotes (por tom) para ficar leve */
  C.desenharCapim = (yMin, yMax) => {
    const { ctx, t } = C;
    const fv = C.forcaVento();
    const cores = [0, 1, 2, 3].map((i) => css(mix(hex(SECO[i]), hex(VERDE[i]), C.f.verde).map((c) => c * C.f.luz + 12 * (1 - C.f.luz))));
    ctx.lineCap = "round";
    for (let tom = 0; tom < 4; tom++) {
      ctx.beginPath();
      for (let i = 0; i < laminas.length; i++) {
        const b = laminas[i];
        if (b.y < yMin || b.y >= yMax || b.tom !== tom) continue;
        const sw = (Math.sin(t * 1.7 + b.fase) * 0.25 + C.rajada(b.x) * 0.9) * fv * b.h * 0.45;
        ctx.moveTo(b.x, b.y);
        ctx.quadraticCurveTo(b.x + sw * 0.3, b.y - b.h * 0.6, b.x + sw, b.y - b.h + Math.abs(sw) * 0.2);
      }
      ctx.strokeStyle = cores[tom];
      ctx.lineWidth = 1.3;
      ctx.stroke();
    }
    // florzinhas do cerrado
    flores.forEach((f) => {
      if (f.y < yMin || f.y >= yMax) return;
      const sw = (Math.sin(t * 1.5 + f.fase) * 0.3 + C.rajada(f.x)) * fv * f.h * 0.35;
      ctx.strokeStyle = C.luz("#5b6b33");
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(f.x, f.y);
      ctx.quadraticCurveTo(f.x + sw * 0.3, f.y - f.h * 0.6, f.x + sw, f.y - f.h);
      ctx.stroke();
      ctx.fillStyle = C.luz(f.cor);
      ctx.beginPath();
      ctx.arc(f.x + sw, f.y - f.h, 2.1 * f.s, 0, 6.283);
      ctx.fill();
    });
  };

  /* =========================================================
     RIO (vereda) — reflete o céu, brilho do sol/lua, correnteza
     ========================================================= */
  C.gerarRio = () => {
    const { W, H } = C;
    const passo = C.rio.passo;
    const f1 = rand(0, 6), f2 = rand(0, 6);
    C.rio.topo = []; C.rio.base = [];
    for (let x = 0; x <= W + passo; x += passo) {
      const top = H * 0.695 + Math.sin(x * 0.0035 + f1) * H * 0.014 + Math.sin(x * 0.011 + f2) * H * 0.004;
      const larg = H * 0.068 + Math.sin(x * 0.005 + f2) * H * 0.012;
      C.rio.topo.push(top);
      C.rio.base.push(top + larg);
    }
  };

  let ondas = []; // anéis na água (chuva, peixe, clique)
  C.anelAgua = (x, y, forca = 1) => ondas.push({ x, y, r: 1, a: 0.55 * forca, v: 24 + forca * 20 });

  C.desenharRio = () => {
    const { ctx, W, t } = C;
    const { topo, base, passo } = C.rio;
    ctx.beginPath();
    ctx.moveTo(0, topo[0]);
    topo.forEach((y, i) => ctx.lineTo(i * passo, y));
    for (let i = base.length - 1; i >= 0; i--) ctx.lineTo(i * passo, base[i]);
    ctx.closePath();
    const yTop = Math.min(...topo), yBot = Math.max(...base);
    const agua = C.luzRGB("#2b5566");
    const g = ctx.createLinearGradient(0, yTop, 0, yBot);
    g.addColorStop(0, css(mix(C.ceu[2], agua, 0.45)));
    g.addColorStop(1, css(mix(C.ceu[1], agua, 0.62)));
    ctx.save();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.clip();

    // reflexo das margens (faixa escura logo abaixo da margem de cima)
    ctx.fillStyle = `rgba(20,30,15,${0.28 * C.f.luz + 0.1})`;
    ctx.beginPath();
    topo.forEach((y, i) => (i ? ctx.lineTo(i * passo, y + 6) : ctx.moveTo(0, y + 6)));
    for (let i = topo.length - 1; i >= 0; i--) ctx.lineTo(i * passo, topo[i]);
    ctx.fill();

    // correnteza: traços claros que andam
    const vel = 14 + C.f.chuva * 10;
    ctx.strokeStyle = css(mix(C.ceu[2], [255, 255, 255], 0.5), 0.25 + 0.15 * C.f.luz);
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 7; k++) {
      const frac = (k + 0.5) / 7;
      for (let x = ((t * vel + k * 53) % 90) - 90; x < W; x += 90) {
        const [tt, bb] = C.riverAt(Math.max(0, x));
        const y = lerp(tt, bb, frac) + Math.sin(x * 0.03 + t) * 0.8;
        const len = 10 + ((k * 17 + x) % 18);
        ctx.moveTo(x, y);
        ctx.lineTo(x + len, y);
      }
    }
    ctx.stroke();

    // brilho do sol / lua na água
    const astro = C.sol.vis > 0.05 ? { x: C.sol.x, a: C.sol.vis, cor: "255,236,190" } : C.lua.vis > 0.05 ? { x: C.lua.x, a: C.lua.vis * 0.7, cor: "220,230,255" } : null;
    if (astro) {
      for (let i = 0; i < 26; i++) {
        const fx = astro.x + Math.sin(i * 12.9898 + Math.floor(t * 4 + i) * 0.7) * (14 + i * 1.8);
        const [tt, bb] = C.riverAt(fx);
        const fy = lerp(tt, bb, (i / 26));
        const tw = 0.5 + 0.5 * Math.sin(t * 7 + i * 2.1);
        ctx.fillStyle = `rgba(${astro.cor},${0.55 * astro.a * tw})`;
        ctx.fillRect(fx, fy, 4 + tw * 5, 1.2);
      }
    }

    // anéis
    for (let i = ondas.length - 1; i >= 0; i--) {
      const o = ondas[i];
      o.r += C.dt * o.v;
      o.a -= C.dt * 0.55;
      if (o.a <= 0) { ondas.splice(i, 1); continue; }
      ctx.strokeStyle = `rgba(230,240,255,${o.a})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(o.x, o.y, o.r, o.r * 0.28, 0, 0, 6.283);
      ctx.stroke();
    }
    ctx.restore();

    // margens: barro molhado
    ctx.strokeStyle = C.luz("#4a3d2a", 0.55);
    ctx.lineWidth = 2;
    ctx.beginPath();
    topo.forEach((y, i) => (i ? ctx.lineTo(i * passo, y) : ctx.moveTo(0, y)));
    ctx.stroke();
    ctx.strokeStyle = C.luz("#3b4a28", 0.6);
    ctx.lineWidth = 3;
    ctx.beginPath();
    base.forEach((y, i) => (i ? ctx.lineTo(i * passo, y + 1) : ctx.moveTo(0, y + 1)));
    ctx.stroke();
  };

  /* =========================================================
     ÁRVORES — pau-terra torto, ipês floridos, buritis
     ========================================================= */
  const IPE = {
    amarelo: ["#f5c518", "#e2a90d", "#ffd84a", "#c98f0a"],
    roxo: ["#d77fb7", "#bf5f9f", "#ec9fcf", "#a24d86"],
    branco: ["#f4f1ea", "#dcd6c9", "#ffffff", "#c9c2b3"],
  };
  const FOLHA = ["#4d6a2c", "#5e7d34", "#73913f", "#3e5824"];

  function gerarArvore(tipo, x, y, s) {
    const a = { tipo, x, y, s, fase: rand(0, 6.28), vel: rand(0.6, 1.1), sacode: 0, galhos: [], copa: [], frondes: [], morador: null };
    if (tipo === "buriti") {
      a.altura = rand(170, 240) * s;
      a.curva = rand(-14, 14) * s;
      const n = randi(13, 17);
      for (let i = 0; i < n; i++) {
        const ang = lerp(-2.7, -0.45, i / (n - 1)) + rand(-0.12, 0.12);
        a.frondes.push({ ang, len: rand(40, 62) * s, fase: rand(0, 6.28), tom: randi(0, 3), seca: false });
      }
      for (let i = 0; i < 4; i++) a.frondes.push({ ang: rand(1.2, 1.95), len: rand(26, 40) * s, fase: rand(0, 6), tom: 0, seca: true });
      return a;
    }
    const ipe = tipo.startsWith("ipe");
    a.altura = (ipe ? rand(80, 120) : rand(60, 95)) * s;
    // tronco: segmentos tortos (cerrado) ou retos (ipê)
    const segs = ipe ? 3 : 5;
    const tronco = [[0, 0]];
    let cx = 0;
    for (let i = 1; i <= segs; i++) {
      cx += rand(-1, 1) * (ipe ? 4 : 10) * s;
      tronco.push([cx, -a.altura * (i / segs)]);
    }
    a.galhos.push({ pts: tronco, w: (ipe ? 8 : 9) * s });
    const topo = tronco[tronco.length - 1];
    const meio = tronco[Math.floor(segs * 0.65)];
    const nG = ipe ? randi(3, 4) : randi(2, 4);
    const pontas = [topo];
    for (let i = 0; i < nG; i++) {
      const de = i % 2 ? topo : meio;
      const lado = i % 2 ? 1 : -1;
      const fim = [de[0] + lado * rand(18, 42) * s, de[1] - rand(12, 34) * s];
      const mid = [lerp(de[0], fim[0], 0.5) + rand(-6, 6) * s, lerp(de[1], fim[1], 0.5) + rand(-4, 8) * s];
      a.galhos.push({ pts: [de, mid, fim], w: 4 * s });
      pontas.push(fim);
    }
    const paleta = ipe ? IPE[tipo.split("-")[1]] : FOLHA;
    pontas.forEach((p) => {
      const n = ipe ? randi(8, 11) : randi(5, 8);
      for (let i = 0; i < n; i++) {
        const r = rand(ipe ? 10 : 8, ipe ? 16 : 14) * s;
        const sub = [];
        const nSub = randi(5, 8);
        for (let k = 0; k < nSub; k++) {
          const ang = (k / nSub) * 6.283 + rand(-0.3, 0.3);
          sub.push([Math.cos(ang) * r * 0.85, Math.sin(ang) * r * 0.75, r * rand(0.28, 0.42)]);
        }
        a.copa.push({
          x: p[0] + rand(-22, 22) * s, y: p[1] + rand(-16, 10) * s,
          r, sub, tom: randi(0, 2), alt: -p[1] / a.altura,
        });
      }
    });
    if (false) { // ipê florido fica praticamente sem folhas
      for (let i = 0; i < 4; i++) {
        const c = pick(a.copa);
        a.copa.push({ x: c.x + rand(-8, 8) * s, y: c.y + rand(-4, 6) * s, r: rand(5, 8) * s, sub: [], tom: 4, alt: c.alt });
      }
    }
    a.paleta = paleta;
    a.copa.sort((p, q) => q.r - p.r);
    a.bbox = {
      x0: Math.min(...a.copa.map((c) => c.x - c.r)), x1: Math.max(...a.copa.map((c) => c.x + c.r)),
      y0: Math.min(...a.copa.map((c) => c.y - c.r)), y1: 0,
    };
    return a;
  }

  C.gerarArvores = () => {
    const { W, H, horizonte } = C;
    C.arvores = [];
    const add = (tipo, x, y, sExtra = 1) => C.arvores.push(gerarArvore(tipo, x, y, C.escalaY(y) * sExtra));
    const tiposFundo = ["cerrado", "cerrado", "cerrado", "ipe-amarelo", "ipe-roxo", "cerrado"];
    const nFundo = Math.max(6, Math.round(W / 150));
    for (let i = 0; i < nFundo; i++) {
      const x = (i + 0.5) * (W / nFundo) + rand(-40, 40);
      const [rt] = C.riverAt(x);
      add(pick(tiposFundo), x, rand(horizonte + 8, rt - 16), 0.9);
    }
    // vereda: buritis nas duas margens
    const nBur = Math.max(4, Math.round(W / 260));
    for (let i = 0; i < nBur; i++) {
      const x = rand(0.02, 0.98) * W;
      const [rt, rb] = C.riverAt(x);
      if (Math.random() < 0.5) add("buriti", x, rt - rand(3, 10));
      else add("buriti", x, rb + rand(6, 16));
    }
    // primeiro plano: árvores grandes emoldurando os cantos
    add(pick(["ipe-amarelo", "ipe-amarelo", "ipe-branco"]), rand(W * 0.02, W * 0.1), H - rand(10, 40), 1.25);
    add("cerrado", rand(W * 0.88, W * 0.97), H - rand(14, 50), 1.3);
    add(pick(["ipe-roxo", "cerrado"]), rand(W * 0.72, W * 0.82), rand(C.rio.base[0] + 40, H - 60), 1.05);
    add(pick(["cerrado", "ipe-amarelo"]), rand(W * 0.16, W * 0.26), rand(C.rio.base[0] + 40, H - 70), 1.05);
    C.arvores.sort((p, q) => p.y - q.y);
  };

  function balanço(a) {
    const fv = C.forcaVento();
    const amp = (1.2 + fv * 3.2) * a.s;
    return (Math.sin(C.t * a.vel + a.fase) * 0.6 + C.rajada(a.x) * 0.9) * amp + Math.sin(C.t * 26) * a.sacode * 6 * a.s;
  }

  C.desenharSombraArvore = (a) => {
    if (C.sol.vis < 0.05) return;
    const { ctx } = C;
    const dx = (a.x - C.sol.x) / C.W * 60 * a.s;
    ctx.fillStyle = `rgba(20,25,10,${0.2 * C.sol.vis})`;
    ctx.beginPath();
    ctx.ellipse(a.x + dx, a.y + 2, (a.tipo === "buriti" ? 24 : 40) * a.s, 7 * a.s, 0, 0, 6.283);
    ctx.fill();
  };

  C.desenharArvore = (a) => {
    const { ctx } = C;
    const bal = balanço(a);
    a.sacode = Math.max(0, a.sacode - C.dt * 1.2);
    C.desenharSombraArvore(a);
    ctx.save();
    ctx.translate(a.x, a.y);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    if (a.tipo === "buriti") {
      const topoX = a.curva + bal * 0.5, topoY = -a.altura;
      // tronco com anéis
      const tg = ctx.createLinearGradient(-5 * a.s, 0, 5 * a.s, 0);
      tg.addColorStop(0, C.luz("#5f584e")); tg.addColorStop(0.5, C.luz("#8a8174")); tg.addColorStop(1, C.luz("#4d473f"));
      ctx.strokeStyle = tg;
      ctx.lineWidth = 7 * a.s;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(a.curva * 0.2, -a.altura * 0.5, topoX, topoY);
      ctx.stroke();
      ctx.strokeStyle = C.luz("#3f3a33", 0.35);
      ctx.lineWidth = 1;
      for (let k = 0.08; k < 0.95; k += 0.06) {
        const px = lerp(0, topoX, k * k), py = -a.altura * k;
        ctx.beginPath(); ctx.moveTo(px - 3.4 * a.s, py); ctx.lineTo(px + 3.4 * a.s, py + 1); ctx.stroke();
      }
      // folhas em leque
      a.frondes.forEach((fr) => {
        const mexe = Math.sin(C.t * 1.8 + fr.fase) * 0.07 * C.forcaVento() + bal * 0.004;
        const ang = fr.ang + mexe;
        const ex = topoX + Math.cos(ang) * fr.len, ey = topoY + Math.sin(ang) * fr.len + (fr.seca ? 0 : fr.len * 0.25);
        const cor = fr.seca ? "#8a6a40" : FOLHA[fr.tom];
        ctx.strokeStyle = C.luz(cor);
        ctx.lineWidth = 1.6 * a.s;
        ctx.beginPath();
        ctx.moveTo(topoX, topoY);
        ctx.quadraticCurveTo(topoX + Math.cos(ang) * fr.len * 0.6, topoY + Math.sin(ang) * fr.len * 0.5 - 6 * a.s, ex, ey);
        ctx.stroke();
        if (!fr.seca) {
          ctx.lineWidth = 1.1 * a.s;
          ctx.beginPath();
          for (let k = -4; k <= 4; k++) {
            const aa = ang + k * 0.16 + mexe * 2;
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex + Math.cos(aa) * 22 * a.s, ey + Math.sin(aa) * 22 * a.s + 8 * a.s);
          }
          ctx.stroke();
        }
      });
      ctx.restore();
      a.bbox = { x0: -60 * a.s, x1: 60 * a.s, y0: topoY - 50 * a.s, y1: 0 };
      a.topo = { x: a.x + topoX, y: a.y + topoY };
      return;
    }

    // galhos: pontos mais altos balançam mais
    const desloca = (p) => [p[0] + bal * Math.pow(-p[1] / a.altura, 1.6) * 0.8, p[1]];
    const casca = a.tipo === "cerrado" ? "#5a4632" : "#6b5a48";
    a.galhos.forEach((g, gi) => {
      const pts = g.pts.map(desloca);
      ctx.strokeStyle = C.luz(gi === 0 ? casca : "#4e3d2b");
      ctx.lineWidth = g.w;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) {
        const [px, py] = pts[i - 1], [qx, qy] = pts[i];
        ctx.quadraticCurveTo(px, py, (px + qx) / 2, (py + qy) / 2);
        ctx.lineTo(qx, qy);
      }
      ctx.stroke();
      if (gi === 0) {
        // textura de casca grossa (cortiça do cerrado)
        ctx.strokeStyle = C.luz("#2f241a", 0.45);
        ctx.lineWidth = 1;
        for (let i = 1; i < pts.length; i++) {
          const [px, py] = pts[i - 1], [qx, qy] = pts[i];
          ctx.beginPath();
          ctx.moveTo(px - g.w * 0.2, py - 2); ctx.lineTo(qx - g.w * 0.15, qy + 3);
          ctx.moveTo(px + g.w * 0.25, py - 5); ctx.lineTo(qx + g.w * 0.2, qy + 6);
          ctx.stroke();
        }
      }
    });

    // copa: base escura (volume), tons por cima com bordas recortadas de folhagem, luz do lado do sol
    const lado = C.sol.vis > 0.05 ? Math.sign(C.sol.x - a.x) || 1 : 0;
    const cores = a.paleta.concat(FOLHA[1]);
    const dxDe = (c) => bal * Math.pow(c.alt, 1.4) * 1.1;
    const blob = (c, dx, dy, esc) => {
      const cx = c.x + dx, cy = c.y + dy;
      ctx.moveTo(cx + c.r * esc, cy);
      ctx.arc(cx, cy, c.r * esc, 0, 6.283);
      c.sub.forEach(([sx, sy, sr]) => {
        ctx.moveTo(cx + sx * esc + sr * esc, cy + sy * esc);
        ctx.arc(cx + sx * esc, cy + sy * esc, sr * esc, 0, 6.283);
      });
    };
    ctx.beginPath();
    a.copa.forEach((c) => { if (c.tom !== 4) blob(c, dxDe(c), c.r * 0.14, 1.04); });
    ctx.fillStyle = C.luz(a.paleta[3] || FOLHA[3]);
    ctx.fill();
    for (let tom = 0; tom <= 4; tom++) {
      ctx.beginPath();
      a.copa.forEach((c) => { if (c.tom === tom) blob(c, dxDe(c), -c.r * 0.1, 0.84); });
      ctx.fillStyle = C.luz(cores[tom] || FOLHA[0]);
      ctx.fill();
    }
    if (lado) {
      ctx.beginPath();
      a.copa.forEach((c, i) => {
        if (i % 2 || c.tom === 4) return;
        const cx = c.x + dxDe(c) + lado * c.r * 0.32, cy = c.y - c.r * 0.38;
        ctx.moveTo(cx + c.r * 0.42, cy);
        ctx.arc(cx, cy, c.r * 0.42, 0, 6.283);
      });
      ctx.fillStyle = `rgba(255,248,215,${0.2 * C.sol.vis})`;
      ctx.fill();
    }
    // gotinhas brilhando depois da chuva
    if (C.f.molhado > 0.15) {
      ctx.fillStyle = `rgba(235,245,255,${C.f.molhado * 0.5})`;
      a.copa.forEach((c, i) => {
        if (i % 3) return;
        const tw = Math.sin(C.t * 3 + i) > 0.6 ? 1.4 : 0.8;
        ctx.fillRect(c.x + bal * c.alt + c.r * 0.3, c.y - c.r * 0.4, tw, tw);
      });
    }
    ctx.restore();
    a.balanco = bal;
  };

  /* Pétalas de ipê caindo sem parar */
  const petalas = [];
  C.soltarPetalas = (a, n) => {
    if (!a.tipo.startsWith("ipe")) return;
    for (let i = 0; i < n; i++) {
      const c = pick(a.copa);
      petalas.push({
        x: a.x + c.x, y: a.y + c.y, vx: rand(-8, 8), vy: rand(6, 16), rot: rand(0, 6.28), vr: rand(-4, 4),
        cor: a.paleta[randi(0, 2)], chao: a.y + rand(-6, 18) * a.s, s: a.s, vida: 1, pousada: false,
      });
    }
  };
  C.desenharPetalas = () => {
    const { ctx } = C;
    if (Math.random() < 0.06 + C.forcaVento() * 0.04) {
      const ipes = C.arvores.filter((a) => a.tipo.startsWith("ipe"));
      if (ipes.length && petalas.length < 90) C.soltarPetalas(pick(ipes), 1);
    }
    const fv = C.forcaVento();
    for (let i = petalas.length - 1; i >= 0; i--) {
      const p = petalas[i];
      if (!p.pousada) {
        p.vx += (C.rajada(p.x) * fv * 30 - p.vx) * C.dt * 0.8;
        p.x += (p.vx + Math.sin(C.t * 2 + i) * 10) * C.dt;
        p.y += p.vy * C.dt * (1 + C.f.chuva * 2);
        p.rot += p.vr * C.dt;
        if (p.y >= p.chao) { p.pousada = true; }
      } else {
        p.vida -= C.dt * 0.08;
        if (p.vida <= 0) { petalas.splice(i, 1); continue; }
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.scale(1, p.pousada ? 0.4 : Math.abs(Math.sin(p.rot * 1.3)) * 0.8 + 0.2);
      ctx.globalAlpha = Math.min(1, p.vida * 2);
      ctx.fillStyle = C.luz(p.cor);
      ctx.beginPath();
      ctx.ellipse(0, 0, 3 * p.s, 1.8 * p.s, 0, 0, 6.283);
      ctx.fill();
      ctx.restore();
    }
  };
})();
