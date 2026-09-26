/* ---------------------------------------------------------
   CENA — parte 3: chuva, raios, névoa, interação e loop
   Use: Cena.iniciar(document.getElementById("sky-canvas"))
   --------------------------------------------------------- */
const Cena = (() => {
  const { rand, pick, clamp, lerp, smooth } = CU;

  const alvo = { nuvem: 0.3, chuva: 0, tempestade: 0, vento: 8 };
  const VERDE_MES = [0.9, 0.9, 0.9, 0.85, 0.7, 0.5, 0.3, 0.2, 0.2, 0.45, 0.75, 0.85];
  let primeiro = true;

  function lerClima(e) {
    const base = { sol: 0.08, parcial: 0.45, nublado: 0.92, chuva: 1, tempestade: 1 }[e.cond] ?? 0.4;
    const cob = e.nuvens != null ? e.nuvens / 100 : base;
    alvo.nuvem = e.cond === "sol" ? Math.min(0.25, cob) : e.cond === "parcial" ? clamp(cob, 0.3, 0.7) : Math.max(base, cob);
    alvo.chuva = e.cond === "tempestade" ? 1 : e.cond === "chuva" ? 0.35 + 0.65 * (e.intensidade || 0.5) : 0;
    alvo.tempestade = e.cond === "tempestade" ? 1 : 0;
    alvo.vento = e.vento ?? 8;
    if (primeiro) {
      Object.assign(C.f, alvo);
      C.f.molhado = alvo.chuva > 0 ? 0.8 : 0;
      C.f.verde = Math.max(VERDE_MES[new Date().getMonth()], alvo.chuva * 0.6);
      primeiro = false;
    }
  }

  function atualizarAmbiente() {
    const f = C.f, dt = C.dt;
    const k = Math.min(1, dt * 0.12);
    f.nuvem += (alvo.nuvem - f.nuvem) * k;
    f.chuva += (alvo.chuva - f.chuva) * Math.min(1, dt * 0.2);
    f.tempestade += (alvo.tempestade - f.tempestade) * k;
    f.vento += (alvo.vento - f.vento) * k;
    f.molhado = clamp(f.molhado + (f.chuva > 0.2 ? dt * 0.05 : -dt * 0.004), 0, 1);
    const verdeBase = VERDE_MES[new Date().getMonth()];
    f.verde += ((f.molhado > 0.4 ? Math.max(verdeBase, 0.85) : verdeBase) - f.verde) * dt * 0.01;

    const s = C.posAstros();
    f.noite = 1 - smooth(-0.16, 0.1, s.alt);
    f.crep = s.crepusculo;
    const dia = 0.26 + smooth(-0.12, 0.35, s.alt) * 0.74;
    f.luz = clamp(dia * (1 - f.nuvem * 0.16 - f.chuva * 0.22), 0.22, 1);
    f.nevoa = smooth(0, 0.25, s.alt) * (1 - smooth(0.25, 0.5, s.alt)) * 0.5 * (s.hora < 12 ? 1 : 0);
  }

  /* =========================================================
     CHUVA — duas camadas (perto/longe), respingos e anéis
     ========================================================= */
  let gotas = [];
  let respingos = [];
  function gerarChuva() {
    gotas = [];
    const n = Math.round(Math.min(900, (C.W * C.H) / 1700));
    for (let i = 0; i < n; i++) {
      const perto = Math.random() < 0.35;
      gotas.push({
        x: rand(-100, C.W + 100), y: rand(-C.H, C.H),
        len: perto ? rand(16, 26) : rand(8, 14),
        vel: perto ? rand(900, 1200) : rand(600, 800),
        perto, chao: rand(C.horizonte, C.H),
      });
    }
  }

  function desenharChuva() {
    const { ctx, W, H, dt } = C;
    const I = C.f.chuva;
    if (I < 0.02) { respingos.length = 0; return; }
    const ativos = Math.floor(gotas.length * I);
    const vx = 40 + C.f.vento * 6 + C.f.tempestade * 160;
    const incl = vx / 1000;
    const cor = C.f.noite > 0.5 ? "190,205,230" : "215,225,240";
    [false, true].forEach((camada) => {
      ctx.beginPath();
      for (let i = 0; i < ativos; i++) {
        const d = gotas[i];
        if (d.perto !== camada) continue;
        d.y += d.vel * dt;
        d.x += vx * dt * (d.perto ? 1 : 0.7);
        if (d.y > d.chao) {
          const [tt, bb] = C.riverAt(clamp(d.x, 0, W));
          if (d.y > tt && d.y < bb) { if (Math.random() < 0.25) C.anelAgua(d.x, d.y, 0.35); }
          else if (respingos.length < 160 && Math.random() < 0.5) {
            const s = C.escalaY(d.y);
            respingos.push({ x: d.x, y: d.y, vx: rand(-20, 20) * s, vy: -rand(30, 60) * s, vida: 0.35 });
          }
          d.y = rand(-80, -10);
          d.x = rand(-100, W + 50);
          d.chao = rand(C.horizonte, H);
        }
        ctx.moveTo(d.x, d.y);
        ctx.lineTo(d.x - incl * d.len, d.y - d.len);
      }
      ctx.strokeStyle = `rgba(${cor},${camada ? 0.42 : 0.22})`;
      ctx.lineWidth = camada ? 1.3 : 0.8;
      ctx.stroke();
    });
    ctx.fillStyle = `rgba(${cor},0.55)`;
    for (let i = respingos.length - 1; i >= 0; i--) {
      const r = respingos[i];
      r.vida -= dt; r.vy += 260 * dt; r.x += r.vx * dt; r.y += r.vy * dt;
      if (r.vida <= 0) { respingos.splice(i, 1); continue; }
      ctx.fillRect(r.x, r.y, 1.3, 1.3);
    }
  }

  /* =========================================================
     RAIOS — clarão duplo e descarga ramificada
     ========================================================= */
  let proximoRaio = 6, clarao = 0, raio = null;
  function gerarRaio() {
    const x0 = rand(C.W * 0.1, C.W * 0.9);
    const segs = [];
    const ramo = (x, y, ang, comp, prof) => {
      let px = x, py = y;
      const passos = prof ? 6 : 14;
      for (let i = 0; i < passos; i++) {
        const nx = px + Math.sin(ang + rand(-0.6, 0.6)) * comp;
        const ny = py + Math.cos(ang) * comp + rand(0, comp * 0.4);
        segs.push([px, py, nx, ny, prof]);
        if (!prof && Math.random() < 0.22) ramo(nx, ny, ang + pick([-0.8, 0.8]), comp * 0.6, 1);
        px = nx; py = ny;
        if (py > C.horizonte) break;
      }
    };
    ramo(x0, C.horizonte * 0.12, rand(-0.2, 0.2), C.horizonte * 0.07, 0);
    return { segs, vida: 0.32 };
  }
  function desenharRaio(ctx) {
    if (!raio) return;
    raio.vida -= C.dt;
    if (raio.vida <= 0) { raio = null; return; }
    const a = raio.vida > 0.22 || (raio.vida < 0.14 && raio.vida > 0.08) ? 1 : 0.35;
    ctx.save();
    ctx.shadowColor = "rgba(190,210,255,1)";
    ctx.shadowBlur = 18;
    ctx.lineCap = "round";
    raio.segs.forEach(([x1, y1, x2, y2, prof]) => {
      ctx.strokeStyle = `rgba(245,248,255,${a * (prof ? 0.55 : 1)})`;
      ctx.lineWidth = prof ? 1 : 2.2;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    });
    ctx.restore();
  }
  function atualizarRaios() {
    if (C.f.tempestade < 0.4) return;
    proximoRaio -= C.dt;
    if (proximoRaio < 0) {
      proximoRaio = rand(4, 13);
      if (Math.random() < 0.65) raio = gerarRaio();
      clarao = 1;
      setTimeout(() => { clarao = Math.max(clarao, 0.7); }, 140);
    }
    clarao = Math.max(0, clarao - C.dt * 3.2);
  }

  /* =========================================================
     LOOP
     ========================================================= */
  function quadro(agoraMs) {
    const t = agoraMs / 1000;
    C.dt = Math.min(0.05, Math.max(0.001, t - (C.t || t)));
    C.t = t;
    const { ctx, W, H } = C;

    atualizarAmbiente();
    C.calcCeu();
    C.atualizarFauna();
    atualizarRaios();

    ctx.setTransform(C.dpr, 0, 0, C.dpr, 0, 0);
    C.desenharCeu();
    C.desenharEstrelas();
    C.desenharLua();
    C.desenharSol();
    C.desenharNuvens(false);
    C.desenharCeuFauna(true);
    C.desenharNuvens(true);
    desenharRaio(ctx);
    C.desenharRelevo();
    C.desenharChao();

    // árvores e bichos ordenados pela profundidade, com o capim intercalado
    const itens = [];
    C.arvores.forEach((a) => itens.push({ y: a.y, x: a.x, arv: a }));
    C.faunaChao().forEach((b) => itens.push({ y: b.y, x: b.x, bicho: b }));
    itens.sort((a, b) => a.y - b.y);
    const antes = [], depois = [];
    itens.forEach((it) => (it.y < C.riverAt(clamp(it.x, 0, W))[0] + 2 ? antes : depois).push(it));
    const desenhaItem = (it) => (it.arv ? C.desenharArvore(it.arv) : C.desenharBicho(it.bicho));
    const faixas = (lista, y0, y1) => {
      let j = 0;
      for (let y = y0; y < y1; y += 28) {
        C.desenharCapim(y, y + 28);
        while (j < lista.length && lista[j].y < y + 28) desenhaItem(lista[j++]);
      }
      while (j < lista.length) desenhaItem(lista[j++]);
    };
    const topoMax = Math.max(...C.rio.topo), baseMin = Math.min(...C.rio.base);
    faixas(antes, C.horizonte, topoMax);
    C.desenharRio();
    C.desenharPeixes();
    faixas(depois, baseMin, H + 30);

    C.desenharParticulas();
    C.desenharPetalas();
    C.desenharInsetos();
    C.desenharCeuFauna(false);

    // névoa da manhã / ar pesado de chuva
    const nev = C.f.nevoa + C.f.chuva * 0.35;
    if (nev > 0.02) {
      const g = ctx.createLinearGradient(0, C.horizonte - 60, 0, C.horizonte + 90);
      const c = C.ceu[2];
      g.addColorStop(0, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`);
      g.addColorStop(0.5, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${nev})`);
      g.addColorStop(1, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0)`);
      ctx.fillStyle = g;
      ctx.fillRect(0, C.horizonte - 60, W, 150);
    }
    desenharChuva();
    if (clarao > 0.01) {
      ctx.fillStyle = `rgba(225,232,255,${clarao * 0.45})`;
      ctx.fillRect(0, 0, W, H);
    }
    // vinheta sutil para dar profundidade
    const v = ctx.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.8);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, `rgba(0,0,0,${0.22 + C.f.noite * 0.2})`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);

    requestAnimationFrame(quadro);
  }

  /* =========================================================
     MONTAGEM, REDIMENSIONAR E INTERAÇÃO
     ========================================================= */
  function montar() {
    const cv = C.cv;
    C.W = window.innerWidth;
    C.H = window.innerHeight;
    C.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(C.W * C.dpr);
    cv.height = Math.round(C.H * C.dpr);
    C.horizonte = Math.round(C.H * 0.56);
    C.gerarRio();
    C.gerarEstrelas();
    C.gerarNuvens();
    C.gerarRelevo();
    C.gerarChao();
    C.gerarArvores();
    C.gerarFauna();
    gerarChuva();
  }

  function arvoreEm(x, y) {
    for (let i = C.arvores.length - 1; i >= 0; i--) {
      const a = C.arvores[i];
      if (!a.bbox) continue;
      if (x > a.x + a.bbox.x0 && x < a.x + a.bbox.x1 && y > a.y + a.bbox.y0 && y < a.y) return a;
    }
    return null;
  }

  function interacao() {
    const cv = C.cv;
    const pos = (e) => ({ x: e.clientX, y: e.clientY });
    window.addEventListener("pointermove", (e) => {
      const p = pos(e);
      C.ponteiro.x = p.x; C.ponteiro.y = p.y;
      C.ponteiro.dentro = e.target === cv;
    }, { passive: true });
    window.addEventListener("pointerleave", () => { C.ponteiro.dentro = false; });
    cv.addEventListener("click", (e) => {
      const { x, y } = pos(e);
      if (C.cliqueFauna(x, y)) return;
      const [tt, bb] = C.riverAt(clamp(x, 0, C.W));
      if (y > tt && y < bb) { C.anelAgua(x, y, 1.3); setTimeout(() => C.anelAgua(x, y, 0.8), 180); return; }
      const a = arvoreEm(x, y);
      if (a) { a.sacode = 1; C.soltarPetalas(a, 14); C.espantarTucano(a); return; }
      if (y < C.horizonte && C.f.noite > 0.5) C.estrelaCadente(x, y);
    });
  }

  function iniciar(canvas) {
    if (!canvas) return;
    C.cv = canvas;
    C.ctx = canvas.getContext("2d");
    Clima.iniciar();
    Clima.aoMudar(lerClima);
    montar();
    interacao();
    let tmr;
    window.addEventListener("resize", () => { clearTimeout(tmr); tmr = setTimeout(montar, 180); });
    requestAnimationFrame(quadro);
  }

  return { iniciar };
})();
