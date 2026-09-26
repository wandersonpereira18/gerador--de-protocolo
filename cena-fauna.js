/* ---------------------------------------------------------
   CENA — parte 2: fauna do cerrado
   Quadrúpedes com pernas articuladas (ciclo de passada real),
   aves de chão, aves no céu, insetos e peixes.
   Cada bicho tem rotina própria e reage ao mouse/toque.
   --------------------------------------------------------- */
(() => {
  const { rand, randi, pick, clamp, lerp, smooth } = CU;

  /* =========================================================
     QUADRÚPEDES — espécies (medidas em px, escala 1)
     ========================================================= */
  const ESP = {
    capivara: {
      L: 48, A: 25, P: 11, pw: 6.5, pesc: { len: 7, ang: -0.1, w: 16 }, cab: { len: 24, h: 16, foc: "rombudo" },
      orelha: "pequena", cauda: "nenhuma", cor: "#8a6a45", ventre: "#a3845c", perna: "#6a5035",
      vel: 13, freq: 3.2, dia: true, noite: true,
    },
    lobo: {
      L: 40, A: 15, P: 36, pw: 3.6, pesc: { len: 15, ang: -0.55, w: 9 }, cab: { len: 19, h: 10, foc: "fino" },
      orelha: "grande", cauda: "peluda", cor: "#c9652b", ventre: "#dc9352", perna: "#1b1410", crina: true,
      vel: 44, freq: 4.4, jarrete: true, dia: 0.3, noite: true,
    },
    tamandua: {
      L: 54, A: 20, P: 14, pw: 5, pesc: { len: 10, ang: 0.12, w: 12 }, cab: { len: 32, h: 8, foc: "tubo" },
      orelha: "mini", cauda: "bandeira", cor: "#8f887a", ventre: "#6f695d", perna: "#3a342c", faixa: true,
      vel: 15, freq: 2.8, dia: true, noite: 0.3,
    },
    veado: {
      L: 36, A: 15, P: 31, pw: 2.8, pesc: { len: 19, ang: -0.95, w: 7 }, cab: { len: 15, h: 8, foc: "fino" },
      orelha: "grande", cauda: "curta", cor: "#b98652", ventre: "#eadcc0", perna: "#8a6440", chifre: true,
      vel: 36, freq: 4.2, jarrete: true, dia: true, noite: 0.4,
    },
    tatu: {
      L: 26, A: 13, P: 5, pw: 3, pesc: { len: 2, ang: 0.35, w: 7 }, cab: { len: 12, h: 6, foc: "fino" },
      orelha: "pequena", cauda: "fina", cor: "#9b8f7c", ventre: "#7d7262", perna: "#6d6354", casco: true,
      vel: 30, freq: 9, dia: 0.3, noite: true,
    },
    onca: {
      L: 52, A: 21, P: 22, pw: 5.2, pesc: { len: 8, ang: -0.18, w: 14 }, cab: { len: 18, h: 14, foc: "rombudo" },
      orelha: "pequena", cauda: "longa", cor: "#d9a441", ventre: "#f1e3c4", perna: "#c99536", pintas: true,
      vel: 30, freq: 3.6, dia: 0, noite: true,
    },
    prea: {
      L: 18, A: 10, P: 4, pw: 2.4, pesc: { len: 2, ang: 0.1, w: 7 }, cab: { len: 9, h: 7, foc: "rombudo" },
      orelha: "pequena", cauda: "nenhuma", cor: "#7a6a52", ventre: "#a8987c", perna: "#5d4f3c",
      vel: 34, freq: 10, dia: true, noite: 0.5,
    },
  };

  /* Quem anda em cada horário (peso de aparição por período do dia) */
  const HORARIO = {
    lobo:     { madrugada: 3, manha: 1,   dia: 0,   tarde: 2,   noite: 3 },
    tamandua: { madrugada: 0, manha: 2,   dia: 2,   tarde: 1.5, noite: 0.3 },
    veado:    { madrugada: 0.3, manha: 3, dia: 1,   tarde: 3,   noite: 0.5 },
    tatu:     { madrugada: 3, manha: 0.5, dia: 0,   tarde: 0.5, noite: 3 },
    onca:     { madrugada: 1, manha: 0,   dia: 0,   tarde: 0.2, noite: 1 },
    prea:     { madrugada: 1, manha: 2,   dia: 1,   tarde: 2,   noite: 1 },
  };
  C.periodo = () => {
    const h = Clima.agora().getHours();
    return h < 5 ? "madrugada" : h < 9 ? "manha" : h < 16 ? "dia" : h < 19 ? "tarde" : "noite";
  };
  const noturno = () => { const p = C.periodo(); return p === "noite" || p === "madrugada"; };

  /* Partículas (poeira, gotas, pedacinhos de fruta) */
  const particulas = [];
  function poeira(x, y, n = 8, cor = "#9c8466", forca = 1) {
    for (let i = 0; i < n; i++) {
      particulas.push({ x: x + rand(-6, 6), y: y - rand(0, 4), vx: rand(-30, 30) * forca, vy: -rand(10, 40) * forca, r: rand(1.2, 3.2), vida: rand(0.5, 1.1), max: 1, cor });
    }
  }
  C.desenharParticulas = () => {
    const { ctx, dt } = C;
    for (let i = particulas.length - 1; i >= 0; i--) {
      const p = particulas[i];
      p.vida -= dt;
      if (p.vida <= 0) { particulas.splice(i, 1); continue; }
      p.vy += (p.gota ? 260 : 40) * dt; p.x += p.vx * dt; p.y += p.vy * dt;
      ctx.globalAlpha = Math.min(1, p.vida * 1.6) * (p.gota ? 0.8 : 0.45);
      ctx.fillStyle = p.gota ? "rgba(225,238,255,1)" : C.luz(p.cor);
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (p.gota ? 0.6 : 1 + (1 - p.vida)), 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  const OFFS = [0, Math.PI, Math.PI * 0.5, Math.PI * 1.5]; // traseira-longe, traseira-perto, dianteira-longe, dianteira-perto

  function perna(ctx, x, y, comp, ang, dobra, w, cor, jarrete) {
    const u = comp * 0.52, l = comp * 0.52;
    const a1 = ang + (jarrete ? 0.28 : 0);
    const kx = x + Math.sin(a1) * u, ky = y + Math.cos(a1) * u;
    const a2 = ang - dobra - (jarrete ? 0.32 : 0);
    const fx = kx + Math.sin(a2) * l, fy = ky + Math.cos(a2) * l;
    ctx.strokeStyle = cor;
    ctx.lineWidth = w;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(kx, ky); ctx.stroke();
    ctx.lineWidth = w * 0.72;
    ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
    ctx.fillStyle = cor;
    ctx.beginPath(); ctx.ellipse(fx + w * 0.3, fy, w * 0.5, w * 0.32, 0, 0, 6.283); ctx.fill();
  }

  function desenharQuadrupede(b) {
    const { ctx } = C;
    const sp = b.sp, L = sp.L, A = sp.A, P = sp.P;
    const deitado = b.estado === "deitado";
    const cy = deitado ? -(A * 0.42) : -(P + A * 0.45);
    const andando = b.estado === "andando" || b.estado === "correndo";
    const passo = andando ? 1 : 0;
    const bob = andando ? Math.abs(Math.sin(b.ph)) * (b.estado === "correndo" ? 2.6 : 1.1) : Math.sin(C.t * 1.2 + b.semente) * 0.4;

    // sombra
    if (C.f.luz > 0.35) {
      ctx.fillStyle = `rgba(15,20,8,${0.22 * C.f.luz})`;
      ctx.beginPath(); ctx.ellipse(b.x, b.y + 1, L * 0.55 * b.s, 3.5 * b.s, 0, 0, 6.283); ctx.fill();
    }

    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.s * b.dir, b.s);
    ctx.translate(b.lunge || 0, -bob - (b.pulinho || 0));
    ctx.lineCap = "round";

    const corPerna = C.luz(sp.perna);
    const corPernaLonge = C.luz(sp.perna === "#1b1410" ? "#0f0b08" : sp.ventre);
    const swing = b.estado === "correndo" ? 0.7 : 0.42;
    const pernas = [
      { x: -L * 0.3, longe: true, jar: sp.jarrete }, { x: -L * 0.3, longe: false, jar: sp.jarrete },
      { x: L * 0.3, longe: true, jar: false }, { x: L * 0.3, longe: false, jar: false },
    ];
    const desenhaPerna = (pp, i) => {
      const f = b.ph + OFFS[i];
      const ang = passo * Math.sin(f) * swing;
      const dobra = passo * Math.max(0, Math.cos(f)) * 0.8;
      perna(ctx, pp.x + (pp.longe ? 2 : 0), cy + A * 0.28, P + A * 0.2 + bob, ang, dobra, sp.pw, pp.longe ? corPernaLonge : corPerna, pp.jar);
    };
    if (!deitado) { desenhaPerna(pernas[0], 0); desenhaPerna(pernas[2], 2); }

    // cauda (atrás do corpo)
    const rabo = Math.sin(C.t * (andando ? 6 : 2) + b.semente) * 0.2 + (b.abana > 0 ? Math.sin(C.t * 22) * 0.5 : 0);
    b.abana = Math.max(0, (b.abana || 0) - C.dt);
    ctx.save();
    ctx.translate(-L * 0.47, cy - A * 0.15);
    if (sp.cauda === "peluda") {
      ctx.rotate(0.9 + rabo * 0.4);
      ctx.fillStyle = C.luz(sp.cor);
      ctx.beginPath(); ctx.ellipse(0, 12, 4.5, 13, 0.1, 0, 6.283); ctx.fill();
      ctx.fillStyle = C.luz("#f1ece0");
      ctx.beginPath(); ctx.ellipse(0.8, 23, 3.2, 4.5, 0.1, 0, 6.283); ctx.fill();
    } else if (sp.cauda === "bandeira") {
      ctx.rotate(0.35 + rabo * 0.25);
      ctx.strokeStyle = C.luz("#4b463d");
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let k = 0; k < 16; k++) {
        const aa = -0.2 + k * 0.08;
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(-18, 4 + k, -34 + Math.sin(C.t * 2 + k) * 1.5, 8 + k * 1.6 + aa * 4);
      }
      ctx.stroke();
      ctx.fillStyle = C.luz("#5a544a");
      ctx.beginPath(); ctx.ellipse(-16, 12, 18, 9, 0.35, 0, 6.283); ctx.fill();
    } else if (sp.cauda === "curta") {
      ctx.rotate(-0.9 + rabo * 0.8);
      ctx.fillStyle = C.luz("#f4efe4");
      ctx.beginPath(); ctx.ellipse(-2, -3, 2.6, 5, 0, 0, 6.283); ctx.fill();
    } else if (sp.cauda === "longa") {
      ctx.strokeStyle = C.luz(sp.cor); ctx.lineWidth = 3.4;
      const ond = Math.sin(C.t * 2.4 + b.semente) * 4;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.bezierCurveTo(-12, 10, -22, 16 + ond, -30, 8 + ond); ctx.stroke();
      ctx.strokeStyle = C.luz("#231a10"); ctx.lineWidth = 3.6;
      ctx.beginPath(); ctx.moveTo(-27, 10 + ond * 0.9); ctx.lineTo(-31, 7 + ond); ctx.stroke();
    } else if (sp.cauda === "fina") {
      ctx.strokeStyle = C.luz(sp.cor); ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(-8, 6, -14 + rabo * 3, 9); ctx.stroke();
    }
    ctx.restore();

    // corpo com volume (gradiente de cima para baixo)
    const corpo = new Path2D();
    corpo.moveTo(-L * 0.5, cy);
    corpo.bezierCurveTo(-L * 0.52, cy - A * 0.72, -L * 0.1, cy - A * 0.64, L * 0.24, cy - A * 0.56);
    corpo.bezierCurveTo(L * 0.52, cy - A * 0.5, L * 0.58, cy + A * 0.3, L * 0.36, cy + A * 0.46);
    corpo.bezierCurveTo(L * 0.1, cy + A * 0.6, -L * 0.3, cy + A * 0.58, -L * 0.45, cy + A * 0.36);
    corpo.bezierCurveTo(-L * 0.56, cy + A * 0.2, -L * 0.56, cy + A * 0.02, -L * 0.5, cy);
    const g = ctx.createLinearGradient(0, cy - A * 0.6, 0, cy + A * 0.6);
    g.addColorStop(0, C.luz(sp.cor));
    g.addColorStop(0.55, C.luz(sp.cor));
    g.addColorStop(1, C.luz(sp.ventre));
    ctx.fillStyle = g;
    ctx.fill(corpo);
    // luz no dorso
    ctx.save();
    ctx.clip(corpo);
    ctx.fillStyle = `rgba(255,245,220,${0.12 * C.f.luz})`;
    ctx.beginPath(); ctx.ellipse(0, cy - A * 0.55, L * 0.42, A * 0.22, 0, 0, 6.283); ctx.fill();
    if (sp.faixa) {
      ctx.strokeStyle = C.luz("#f0ece2"); ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(L * 0.42, cy + A * 0.3); ctx.lineTo(-L * 0.1, cy - A * 0.6); ctx.stroke();
      ctx.strokeStyle = C.luz("#1a1712"); ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(L * 0.46, cy + A * 0.4); ctx.lineTo(-L * 0.12, cy - A * 0.7); ctx.stroke();
    }
    if (sp.casco) {
      ctx.strokeStyle = C.luz("#6a604f"); ctx.lineWidth = 1.2;
      for (let k = -3; k <= 3; k++) {
        ctx.beginPath(); ctx.moveTo(k * 4.2, cy - A * 0.8); ctx.quadraticCurveTo(k * 4.6, cy, k * 4.2, cy + A * 0.6); ctx.stroke();
      }
    }
    if (sp.crina) {
      ctx.fillStyle = C.luz("#1b1410");
      ctx.beginPath(); ctx.ellipse(L * 0.28, cy - A * 0.52, L * 0.22, A * 0.22, -0.2, 0, 6.283); ctx.fill();
    }
    if (sp.pintas) { // rosetas da onça
      ctx.strokeStyle = C.luz("#2a1d0e"); ctx.lineWidth = 1.3;
      ctx.fillStyle = C.luz("#b57a26");
      for (let k = 0; k < 14; k++) {
        const px = -L * 0.42 + ((k * 37) % 100) / 100 * L * 0.84;
        const py = cy - A * 0.45 + ((k * 53) % 100) / 100 * A * 0.8;
        ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 6.283); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();

    if (deitado) {
      ctx.fillStyle = C.luz(sp.perna); // patas dobradas por baixo
      ctx.beginPath(); ctx.ellipse(L * 0.3, -2, sp.pw * 1.2, 2.4, 0, 0, 6.283); ctx.ellipse(-L * 0.28, -2, sp.pw * 1.2, 2.4, 0, 0, 6.283); ctx.fill();
    } else {
      desenhaPerna(pernas[1], 1);
      desenhaPerna(pernas[3], 3);
    }

    // pescoço e cabeça
    const pastar = b.pastar;
    const olhar = b.olhar;
    const nAng = sp.pesc.ang + pastar * 1.25 - olhar * 0.35 + (andando ? Math.sin(b.ph * 2) * 0.05 : 0);
    const sx = L * 0.33, sy = cy - A * 0.22;
    const nx = sx + Math.cos(nAng) * sp.pesc.len, ny = sy + Math.sin(nAng) * sp.pesc.len;
    ctx.strokeStyle = C.luz(sp.cor);
    ctx.lineWidth = sp.pesc.w;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(nx, ny); ctx.stroke();
    if (sp.crina) {
      ctx.strokeStyle = C.luz("#1b1410"); ctx.lineWidth = sp.pesc.w * 0.45;
      ctx.beginPath(); ctx.moveTo(sx - 2, sy - sp.pesc.w * 0.4); ctx.lineTo(nx - 1, ny - sp.pesc.w * 0.35); ctx.stroke();
    }

    ctx.save();
    ctx.translate(nx, ny);
    const mastiga = b.estado === "comendo" ? Math.sin(C.t * 13 + b.semente) * 0.1 : pastar > 0.5 ? Math.sin(C.t * 7 + b.semente) * 0.05 : 0;
    const hAng = nAng * 0.35 + pastar * 0.7 - olhar * 0.2 + mastiga;
    ctx.rotate(hAng + 0.15);
    const cl = sp.cab.len, chh = sp.cab.h;
    // orelhas
    ctx.fillStyle = C.luz(sp.cor);
    if (sp.orelha === "grande") {
      const mex = Math.sin(C.t * 0.7 + b.semente) > 0.95 ? 0.3 : 0;
      ctx.beginPath(); ctx.moveTo(cl * 0.05, -chh * 0.2); ctx.lineTo(-cl * 0.08 - mex * 3, -chh * 1.35); ctx.lineTo(cl * 0.3, -chh * 0.35); ctx.fill();
      ctx.fillStyle = C.luz(sp.ventre);
      ctx.beginPath(); ctx.moveTo(cl * 0.1, -chh * 0.3); ctx.lineTo(0, -chh * 1.1); ctx.lineTo(cl * 0.24, -chh * 0.4); ctx.fill();
    } else if (sp.orelha === "pequena") {
      ctx.beginPath(); ctx.ellipse(cl * 0.12, -chh * 0.45, chh * 0.2, chh * 0.24, 0, 0, 6.283); ctx.fill();
    }
    if (sp.chifre) {
      ctx.strokeStyle = C.luz("#5a4630"); ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(cl * 0.2, -chh * 0.45); ctx.lineTo(cl * 0.12, -chh * 1.5); ctx.lineTo(cl * 0.02, -chh * 1.9);
      ctx.moveTo(cl * 0.14, -chh * 1.2); ctx.lineTo(cl * 0.34, -chh * 1.6);
      ctx.stroke();
    }
    // crânio + focinho
    const cg = ctx.createLinearGradient(0, -chh * 0.6, 0, chh * 0.6);
    cg.addColorStop(0, C.luz(sp.cor)); cg.addColorStop(1, C.luz(sp.ventre));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(cl * 0.3, 0, cl * 0.36, chh * 0.52, 0, 0, 6.283);
    if (sp.cab.foc === "tubo") {
      ctx.moveTo(cl * 0.4, -chh * 0.3);
      ctx.quadraticCurveTo(cl * 0.9, -chh * 0.18, cl * 1.15, chh * 0.05);
      ctx.lineTo(cl * 1.12, chh * 0.2);
      ctx.quadraticCurveTo(cl * 0.8, chh * 0.25, cl * 0.4, chh * 0.35);
    } else if (sp.cab.foc === "rombudo") {
      ctx.moveTo(cl * 0.4, -chh * 0.5);
      ctx.bezierCurveTo(cl * 0.95, -chh * 0.55, cl * 1.02, chh * 0.5, cl * 0.8, chh * 0.55);
      ctx.lineTo(cl * 0.35, chh * 0.5);
    } else {
      ctx.moveTo(cl * 0.4, -chh * 0.4);
      ctx.quadraticCurveTo(cl * 0.85, -chh * 0.15, cl * 1.02, chh * 0.12);
      ctx.lineTo(cl * 0.98, chh * 0.3);
      ctx.lineTo(cl * 0.35, chh * 0.45);
    }
    ctx.fill();
    // nariz e olho (com piscada)
    ctx.fillStyle = C.luz("#1a1510");
    const nzx = sp.cab.foc === "tubo" ? cl * 1.13 : sp.cab.foc === "rombudo" ? cl * 0.92 : cl * 1.0;
    ctx.beginPath(); ctx.arc(nzx, chh * 0.1, sp.cab.foc === "tubo" ? 1.2 : 1.8, 0, 6.283); ctx.fill();
    if (sp.cab.foc === "tubo" && b.estado === "comendo") { // língua do tamanduá entrando no cupinzeiro
      const lg = (Math.sin(C.t * 16) * 0.5 + 0.5) * 14;
      ctx.strokeStyle = C.luz("#d77a86"); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(nzx, chh * 0.15); ctx.quadraticCurveTo(nzx + lg * 0.6, chh * 0.6, nzx + lg, chh * 0.4); ctx.stroke();
    }
    const pisca = (Math.sin(C.t * 0.9 + b.semente * 3) > 0.985) ? 0.15 : 1;
    ctx.beginPath(); ctx.ellipse(cl * 0.36, -chh * 0.12, 1.6, 1.6 * pisca, 0, 0, 6.283); ctx.fill();
    if (C.f.noite > 0.6 && sp.noite === true && !deitado) {
      ctx.fillStyle = "rgba(210,255,190,0.55)"; // brilho dos olhos na noite
      ctx.beginPath(); ctx.arc(cl * 0.37, -chh * 0.14, 1.2, 0, 6.283); ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(cl * 0.36, -chh * 0.2, 0.7, 0.7);
    }
    ctx.restore();
    ctx.restore();
  }

  /* =========================================================
     AVES DE CHÃO
     ========================================================= */
  function desenharSeriema(b) {
    const { ctx, t } = C;
    const andando = b.estado === "andando" || b.estado === "correndo";
    const f = b.ph;
    const s = b.s;
    if (C.f.luz > 0.35) {
      ctx.fillStyle = `rgba(15,20,8,${0.2 * C.f.luz})`;
      ctx.beginPath(); ctx.ellipse(b.x, b.y + 1, 12 * s, 2.6 * s, 0, 0, 6.283); ctx.fill();
    }
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(s * b.dir, s);
    ctx.lineCap = "round";
    const leg = 30, hip = -leg;
    // pernas vermelhas finas
    ctx.strokeStyle = C.luz("#c8452f");
    ctx.lineWidth = 1.6;
    [0, Math.PI].forEach((o) => {
      const a = andando ? Math.sin(f + o) * 0.5 : 0;
      const dob = andando ? Math.max(0, Math.cos(f + o)) * 0.9 : 0;
      const kx = Math.sin(a + 0.15) * leg * 0.5, ky = hip + Math.cos(a + 0.15) * leg * 0.5;
      ctx.beginPath(); ctx.moveTo(0, hip); ctx.lineTo(kx, ky);
      ctx.lineTo(kx + Math.sin(a - dob - 0.2) * leg * 0.52, ky + Math.cos(a - dob - 0.2) * leg * 0.52); ctx.stroke();
    });
    // cauda longa
    ctx.fillStyle = C.luz("#6f6556");
    ctx.beginPath(); ctx.moveTo(-8, hip - 6); ctx.quadraticCurveTo(-22, hip - 2, -26, hip + 6); ctx.lineTo(-10, hip); ctx.fill();
    // corpo
    const g = ctx.createLinearGradient(0, hip - 16, 0, hip + 2);
    g.addColorStop(0, C.luz("#9a8c74")); g.addColorStop(1, C.luz("#d9cfb9"));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, hip - 7, 13, 8.5, -0.15, 0, 6.283); ctx.fill();
    // pescoço + cabeça com o “vai-e-vem” típico
    const bobx = andando ? Math.sin(f * 2) * 2.5 : Math.sin(t * 0.8 + b.semente) * 0.6;
    const baixa = b.pastar * 14 + (b.bate || 0) * 18;
    ctx.strokeStyle = C.luz("#a89a80");
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(8, hip - 11); ctx.quadraticCurveTo(12 + bobx * 0.4, hip - 22 + baixa * 0.6, 12 + bobx, hip - 31 + baixa); ctx.stroke();
    const hx = 12 + bobx, hy = hip - 32 + baixa;
    ctx.fillStyle = C.luz("#a89a80");
    ctx.beginPath(); ctx.arc(hx, hy, 4, 0, 6.283); ctx.fill();
    // topete
    ctx.strokeStyle = C.luz("#6f6556"); ctx.lineWidth = 1;
    ctx.beginPath();
    for (let k = 0; k < 4; k++) { ctx.moveTo(hx - 1, hy - 3); ctx.lineTo(hx - 3 + k * 1.4, hy - 9 - k * 0.5 + Math.sin(t * 3 + k) * 0.4); }
    ctx.stroke();
    ctx.fillStyle = C.luz("#d0402c");
    ctx.beginPath(); ctx.moveTo(hx + 3, hy - 1); ctx.lineTo(hx + 10, hy + 1); ctx.lineTo(hx + 3, hy + 1.6); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(hx + 1.2, hy - 0.8, 0.9, 0, 6.283); ctx.fill();
    // canto: bico aberto de vez em quando
    if (b.canto > 0) {
      ctx.strokeStyle = C.luz("#d0402c"); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(hx + 3, hy + 1.5); ctx.lineTo(hx + 9, hy + 4); ctx.stroke();
    }
    // cobra presa no bico (a seriema bate a cobra no chão antes de comer)
    if (b.presa > 0.02) {
      const len = 26 * b.presa;
      ctx.strokeStyle = C.luz("#6b5634"); ctx.lineWidth = 2.6 * Math.max(0.5, b.presa); ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(hx + 8, hy + 1);
      for (let k = 1; k <= 6; k++) {
        const t = k / 6;
        ctx.lineTo(hx + 8 + Math.sin(t * 6 + C.t * 9) * 4 * t, hy + 1 + len * t * (b.bate > 0.5 ? 0.5 : 1) + (b.bate > 0.5 ? -len * t * 0.4 : 0));
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  function desenharQueroQuero(b) {
    const { ctx, t } = C;
    const s = b.s;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(s * b.dir, s);
    const bica = b.pastar;
    ctx.strokeStyle = C.luz("#c77a8a"); ctx.lineWidth = 1.2;
    const a = b.estado === "andando" ? Math.sin(b.ph) * 0.4 : 0;
    ctx.beginPath(); ctx.moveTo(-1, -10); ctx.lineTo(-1 + Math.sin(a) * 10, 0); ctx.moveTo(1, -10); ctx.lineTo(1 - Math.sin(a) * 10, 0); ctx.stroke();
    ctx.save();
    ctx.translate(0, -12);
    ctx.rotate(bica * 0.6);
    ctx.fillStyle = C.luz("#8f8a7e");
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 5, -0.1, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#f2efe8");
    ctx.beginPath(); ctx.ellipse(1, 2.5, 7, 2.6, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#15130f");
    ctx.beginPath(); ctx.ellipse(6, -1, 3, 3.6, 0, 0, 6.283); ctx.fill(); // peito preto
    ctx.fillStyle = C.luz("#8f8a7e");
    ctx.beginPath(); ctx.arc(8, -5, 3.2, 0, 6.283); ctx.fill();
    ctx.strokeStyle = C.luz("#15130f"); ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.moveTo(7, -7.5); ctx.quadraticCurveTo(4, -11, 1 + Math.sin(t * 2) * 0.5, -10.5); ctx.stroke();
    ctx.fillStyle = C.luz("#d9505a");
    ctx.beginPath(); ctx.moveTo(10.5, -5.4); ctx.lineTo(14.5, -4.6); ctx.lineTo(10.5, -3.8); ctx.fill();
    ctx.fillStyle = "#d33"; ctx.beginPath(); ctx.arc(9, -5.6, 0.8, 0, 6.283); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function desenharCoruja(b) {
    const { ctx, t } = C;
    const s = b.s;
    // toca (montinho de terra)
    ctx.fillStyle = C.luz("#8a6b44");
    ctx.beginPath(); ctx.ellipse(b.x, b.y, 18 * s, 5 * s, 0, Math.PI, 0); ctx.fill();
    ctx.fillStyle = C.luz("#2a1f14");
    ctx.beginPath(); ctx.ellipse(b.x - 7 * s, b.y - 1 * s, 5 * s, 2.2 * s, 0, 0, 6.283); ctx.fill();
    const sobe = b.sobe; // 0 = escondida na toca
    if (sobe < 0.05) return;
    ctx.save();
    ctx.translate(b.x + 4 * s, b.y - 2 * s);
    ctx.scale(s, s);
    ctx.beginPath(); ctx.rect(-20, -40, 40, 40); ctx.clip();
    ctx.translate(0, (1 - sobe) * 30);
    // pernas compridas
    ctx.strokeStyle = C.luz("#c9b99a"); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-2, -6); ctx.lineTo(-2.5, 0); ctx.moveTo(2, -6); ctx.lineTo(2.5, 0); ctx.stroke();
    // corpo pintadinho
    const g = ctx.createLinearGradient(0, -24, 0, -4);
    g.addColorStop(0, C.luz("#8a6a44")); g.addColorStop(1, C.luz("#d8c7a4"));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, -13, 7, 9, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#f0e8d8", 0.8);
    [[-3, -17], [2, -15], [-1, -11], [3, -9], [-4, -9]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.9, 0, 6.283); ctx.fill(); });
    // cabeça que gira e “balança” (o famoso movimento de cabeça)
    const giro = Math.sin(t * 0.5 + b.semente) * 0.6 + b.olhar * Math.sign(C.ponteiro.x - b.x) * 0.8;
    const bob = Math.sin(t * 1.6 + b.semente) > 0.9 ? Math.sin(t * 16) * 1.6 : 0;
    ctx.save();
    ctx.translate(bob, -25);
    ctx.fillStyle = C.luz("#7d5f3c");
    ctx.beginPath(); ctx.ellipse(0, 0, 6.2, 5.6, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#efe6d2");
    ctx.beginPath(); ctx.ellipse(giro * 2, 1.4, 4.6, 2.8, 0, 0, 6.283); ctx.fill();
    const pisca = Math.sin(t * 0.8 + b.semente * 2) > 0.97 ? 0.2 : 1;
    const olhoCor = C.f.noite > 0.5 ? "#ffe25a" : "#f2cd2e";
    [-2.2, 2.2].forEach((ox) => {
      ctx.fillStyle = olhoCor;
      if (C.f.noite > 0.5) { ctx.shadowColor = "rgba(255,226,90,0.9)"; ctx.shadowBlur = 5; }
      ctx.beginPath(); ctx.ellipse(ox + giro * 2, -0.6, 1.7, 1.7 * pisca, 0, 0, 6.283); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "#111";
      ctx.beginPath(); ctx.arc(ox + giro * 2.3, -0.6, 0.8 * pisca, 0, 6.283); ctx.fill();
    });
    ctx.fillStyle = C.luz("#8e8a78");
    ctx.beginPath(); ctx.moveTo(giro * 2 - 0.8, 1); ctx.lineTo(giro * 2 + 0.8, 1); ctx.lineTo(giro * 2, 2.8); ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function desenharSapo(b) {
    const { ctx, t } = C;
    const s = b.s;
    const pulo = b.pulo > 0 ? Math.sin((1 - b.pulo) * Math.PI) : 0;
    ctx.save();
    ctx.translate(b.x, b.y - pulo * 12 * s);
    ctx.scale(s * b.dir, s);
    ctx.fillStyle = C.luz("#4d6b35");
    ctx.beginPath(); ctx.ellipse(0, -4, 7, 4.2, -0.15, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-4, -2, 4, 3 + pulo * 2, 0.4 - pulo, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#6f8f4a");
    ctx.beginPath(); ctx.ellipse(1, -6, 4, 2, -0.1, 0, 6.283); ctx.fill();
    const papo = Math.sin(t * 5 + b.semente) > 0.6 ? 2.6 : 0;
    if (papo) { ctx.fillStyle = C.luz("#d8d2a0"); ctx.beginPath(); ctx.arc(5.5, -2.4, papo, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = C.luz("#c5b84a");
    ctx.beginPath(); ctx.arc(4, -7.2, 1.5, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(4.3, -7.2, 0.7, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  /* =========================================================
     AVES NO CÉU e INSETOS
     ========================================================= */
  function asa(ctx, envergadura, bat, cor, pontas) {
    ctx.fillStyle = cor;
    ctx.beginPath();
    ctx.moveTo(-3, 0);
    const ang = -bat * 1.1;
    const tx = Math.cos(ang) * envergadura * 0.2, ty = Math.sin(ang) * envergadura;
    ctx.quadraticCurveTo(-2 + tx * 0.2, ty * 0.6, tx - 5, ty);
    if (pontas) {
      for (let k = 0; k < 4; k++) ctx.lineTo(tx - 5 + k * 3, ty + (k % 2 ? 3 : 0));
    }
    ctx.quadraticCurveTo(6, ty * 0.45, 5, 0);
    ctx.closePath();
    ctx.fill();
  }

  function desenharArara(b) {
    const { ctx } = C;
    const bat = Math.sin(b.bat);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.s * b.dir, b.s);
    ctx.rotate(Math.sin(b.bat * 0.5) * 0.04);
    asa(ctx, 20, -bat * 0.6 + 0.2, C.luz("#1d5fa8"), false);
    // cauda longa
    ctx.fillStyle = C.luz("#1f63b0");
    ctx.beginPath(); ctx.moveTo(-6, -1); ctx.lineTo(-30, 2 + bat); ctx.lineTo(-29, 4 + bat); ctx.lineTo(-6, 2); ctx.fill();
    ctx.fillStyle = C.luz("#2c72c2");
    ctx.beginPath(); ctx.ellipse(0, 0, 9, 3.6, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#f2b51e");
    ctx.beginPath(); ctx.ellipse(1, 1.8, 7, 1.8, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#2c72c2");
    ctx.beginPath(); ctx.arc(9, -1, 3, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#f4f1ea");
    ctx.beginPath(); ctx.arc(10, -0.5, 1.6, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#1b1b1b");
    ctx.beginPath(); ctx.moveTo(11.5, -2); ctx.quadraticCurveTo(15, -1, 12.6, 2); ctx.lineTo(11.5, 1); ctx.fill();
    asa(ctx, 22, bat, C.luz("#2f78c8"), false);
    ctx.restore();
  }

  function desenharUrubu(b) {
    const { ctx } = C;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.s * b.dir, b.s);
    ctx.rotate(Math.sin(b.fase) * 0.12);
    const bat = b.batendo > 0 ? Math.sin(b.bat) * 0.6 : 0.06;
    ctx.fillStyle = C.luz("#191715");
    ctx.beginPath(); ctx.ellipse(0, 0, 8, 2.8, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-7, 0); ctx.lineTo(-13, -1.6); ctx.lineTo(-13, 1.6); ctx.fill();
    ctx.fillStyle = C.luz("#4a3b36");
    ctx.beginPath(); ctx.arc(8.5, -0.4, 1.8, 0, 6.283); ctx.fill();
    ctx.save(); ctx.scale(1, 1); asa(ctx, 24, bat, C.luz("#1f1c19"), true); ctx.restore();
    ctx.save(); ctx.scale(1, -1); asa(ctx, 20, -bat * 0.4, C.luz("#141210"), true); ctx.restore();
    ctx.restore();
  }

  function desenharMorcego(b) {
    const { ctx } = C;
    const bat = Math.sin(b.bat);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.s, b.s);
    ctx.fillStyle = "rgba(12,10,14,0.92)";
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(-6, -4 - bat * 6, -13, -2 - bat * 8);
    ctx.quadraticCurveTo(-10, 0, -9, 2 - bat * 2);
    ctx.quadraticCurveTo(-5, 1, 0, 3);
    ctx.quadraticCurveTo(5, 1, 9, 2 - bat * 2);
    ctx.quadraticCurveTo(10, 0, 13, -2 - bat * 8);
    ctx.quadraticCurveTo(6, -4 - bat * 6, 0, -1);
    ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 0.5, 1.8, 2.6, 0, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function desenharBeijaFlor(b) {
    const { ctx, t } = C;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.s * b.dir, b.s);
    ctx.rotate(-0.35);
    ctx.fillStyle = `rgba(210,230,220,${0.35})`;
    const bat = Math.sin(t * 90);
    ctx.beginPath(); ctx.ellipse(-1, -4, 2, 7, bat * 0.9, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#1f7d5c");
    ctx.beginPath(); ctx.ellipse(0, 0, 5, 2.2, 0, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.arc(4.5, -1, 1.9, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#2fb487");
    ctx.beginPath(); ctx.ellipse(1, 0.8, 3, 1, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = C.luz("#151515"); ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(6, -1); ctx.lineTo(12, 0); ctx.stroke();
    ctx.fillStyle = C.luz("#12402f");
    ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(-9, 1.5); ctx.lineTo(-8, -1); ctx.fill();
    ctx.restore();
  }

  function desenharTucano(b) {
    const { ctx, t } = C;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(b.s * b.dir, b.s);
    if (b.voando) {
      ctx.rotate(-0.1);
      asa(ctx, 16, Math.sin(b.bat), C.luz("#141414"), false);
    }
    const vira = b.voando ? 0 : Math.sin(t * 0.6 + b.semente) * 0.25;
    ctx.fillStyle = C.luz("#141414");
    ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 8, -0.3, 0, 6.283); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, 6); ctx.lineTo(-6, 15); ctx.lineTo(-2, 14); ctx.fill();
    ctx.fillStyle = C.luz("#f4f1ea");
    ctx.beginPath(); ctx.ellipse(3, -5, 3.2, 3, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = C.luz("#141414");
    ctx.beginPath(); ctx.arc(2, -8, 3.6, 0, 6.283); ctx.fill();
    ctx.save();
    ctx.translate(4, -8.5);
    ctx.rotate(vira);
    const bg = ctx.createLinearGradient(0, -3, 16, 3);
    bg.addColorStop(0, C.luz("#f7a51b")); bg.addColorStop(0.8, C.luz("#f07c10")); bg.addColorStop(1, C.luz("#1a1a1a"));
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.moveTo(0, -2.6); ctx.quadraticCurveTo(12, -3.6, 17, 1.6); ctx.quadraticCurveTo(10, 2.6, 0, 2.2); ctx.fill();
    ctx.restore();
    ctx.fillStyle = C.luz("#8fd0ff");
    ctx.beginPath(); ctx.arc(2.6, -8.6, 1.3, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#111";
    ctx.beginPath(); ctx.arc(2.8, -8.6, 0.6, 0, 6.283); ctx.fill();
    ctx.restore();
  }

  function desenharBorboleta(b) {
    const { ctx } = C;
    const bat = Math.abs(Math.sin(b.bat));
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.sin(b.bat * 0.2) * 0.3);
    ctx.scale(b.s, b.s);
    ctx.fillStyle = C.luz(b.cor);
    [-1, 1].forEach((lado) => {
      ctx.save();
      ctx.scale(lado * (0.25 + bat * 0.75), 1);
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.bezierCurveTo(4, -9, 11, -7, 8, 0);
      ctx.bezierCurveTo(9, 5, 4, 7, 0, 2);
      ctx.fill();
      ctx.fillStyle = C.luz("#1a1a1a", 0.55);
      ctx.beginPath(); ctx.arc(6.5, -4, 1.3, 0, 6.283); ctx.fill();
      ctx.restore();
      ctx.fillStyle = C.luz(b.cor);
    });
    ctx.strokeStyle = C.luz("#1a1a1a"); ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 4); ctx.stroke();
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(-2, -7); ctx.moveTo(0, -3); ctx.lineTo(2, -7); ctx.stroke();
    ctx.restore();
  }

  /* =========================================================
     POPULAÇÃO E COMPORTAMENTO
     ========================================================= */
  const chao = [];   // tudo que anda no chão (ordenado por y junto com as árvores)
  const ceu = [];    // voadores
  const insetos = [];
  let vagalumes = [];
  let peixes = [];
  let proximoVisitante = 6;

  const novo = (tipo, extra) => ({
    tipo, x: 0, y: 0, dir: 1, s: 1, ph: rand(0, 6.28), estado: "parado", tEstado: rand(1, 4),
    pastar: 0, olhar: 0, semente: rand(0, 100), vel: 0, fugindo: false, residente: false, ...extra,
  });

  function laneChao(min, max) {
    const base = C.rio.base[0] || C.H * 0.8;
    return rand(Math.max(base + 20, C.H * min), C.H * max);
  }

  C.gerarFauna = () => {
    const { W, H } = C;
    chao.length = 0; ceu.length = 0; insetos.length = 0;

    // família de capivaras na margem de baixo do rio
    const xc = rand(W * 0.3, W * 0.65);
    [1, 0.62, 0.55].forEach((esc, i) => {
      const x = xc + i * rand(40, 70);
      const [, rb] = C.riverAt(x);
      const y = rb + rand(8, 22);
      chao.push(novo("quad", { sp: ESP.capivara, x, y, s: C.escalaY(y) * esc, dir: pick([-1, 1]), residente: true, casa: x, raio: 120, estado: "pastando" }));
    });

    // corujas-buraqueiras (bem de Brasília) num montinho no primeiro plano
    const cx = rand(W * 0.6, W * 0.8), cy = H - rand(26, 60);
    chao.push(novo("coruja", { x: cx, y: cy, s: C.escalaY(cy) * 1.05, sobe: 1 }));
    chao.push(novo("coruja", { x: cx + 26 * C.escalaY(cy), y: cy + 3, s: C.escalaY(cy) * 0.9, sobe: 1 }));

    // seriema passeando (só de dia; à noite ela dorme empoleirada)
    const sy = laneChao(0.8, 0.95);
    if (!noturno()) chao.push(novo("seriema", { x: rand(W * 0.1, W * 0.4), y: sy, s: C.escalaY(sy), residente: true, casa: W * 0.3, raio: W * 0.25, canto: 0 }));

    // quero-queros
    for (let i = 0; i < 2; i++) {
      const y = laneChao(0.85, 0.97);
      chao.push(novo("queroquero", { x: rand(W * 0.05, W * 0.35), y, s: C.escalaY(y), residente: true, casa: W * 0.2, raio: 90 }));
    }

    // urubus planando, araras em casal
    for (let i = 0; i < 3; i++) {
      ceu.push({ tipo: "urubu", cx: rand(W * 0.1, W * 0.9), cy: rand(C.horizonte * 0.15, C.horizonte * 0.4), r: rand(60, 140), fase: rand(0, 6.28), vel: rand(0.12, 0.22), s: rand(0.6, 0.9), bat: 0, batendo: 0, x: 0, y: 0, dir: 1 });
    }
    // tucano morando numa árvore
    const casa = C.arvores.filter((a) => a.tipo !== "buriti" && a.s > 0.8);
    if (casa.length) {
      const arv = pick(casa);
      ceu.push({ tipo: "tucano", arv, x: 0, y: 0, s: arv.s * 0.9, dir: pick([-1, 1]), semente: rand(0, 99), voando: false, bat: 0, pousado: true, t: rand(10, 25) });
    }

    // borboletas
    const coresB = ["#f2b51e", "#6fb8ff", "#f4efe4", "#e87a3a", "#c48bff"];
    for (let i = 0; i < 6; i++) {
      const y = laneChao(0.72, 0.95);
      insetos.push({ tipo: "borboleta", x: rand(0, W), y, ay: y, s: C.escalaY(y) * 0.9, cor: pick(coresB), bat: rand(0, 6), fase: rand(0, 6.28), vx: rand(-14, 14) });
    }

    // vaga-lumes
    vagalumes = [];
    for (let i = 0; i < 38; i++) {
      vagalumes.push({ x: rand(0, W), y: rand(C.horizonte + 10, H - 6), fase: rand(0, 6.28), vel: rand(0.5, 1.4), dx: rand(-6, 6), dy: rand(-4, 4) });
    }
    // cupinzeiro e pé de lobeira (fruta-do-lobo) no primeiro plano
    const ycu = laneChao(0.82, 0.9);
    chao.push(novo("cupim", { x: rand(W * 0.36, W * 0.48), y: ycu, s: C.escalaY(ycu) * 1.1, estatico: true }));
    const ylo = laneChao(0.8, 0.88);
    chao.push(novo("lobeira", { x: rand(W * 0.52, W * 0.62), y: ylo, s: C.escalaY(ylo) * 1.2, estatico: true, frutas: [true, true, true, true, true] }));

    peixes = [];
    proximoVisitante = rand(3, 8);
    proximoEvento = rand(8, 16);
  };

  /* =========================================================
     CUPINZEIRO, LOBEIRA E COBRA (cenário vivo do cerrado)
     ========================================================= */
  function desenharCupim(b) {
    const { ctx } = C;
    const s = b.s;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(s, s);
    const g = ctx.createLinearGradient(-18, -44, 18, 0);
    g.addColorStop(0, C.luz("#b86a3e")); g.addColorStop(1, C.luz("#7d4526"));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(-22, 0);
    ctx.bezierCurveTo(-20, -18, -14, -30, -8, -38);
    ctx.quadraticCurveTo(-3, -46, 2, -40);
    ctx.bezierCurveTo(8, -34, 12, -22, 14, -26);
    ctx.quadraticCurveTo(18, -18, 22, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.luz("#5a2f18", 0.55);
    [[-8, -12], [4, -20], [-2, -30], [9, -8], [-13, -4]].forEach(([x, y]) => { ctx.beginPath(); ctx.ellipse(x, y, 2, 1.3, 0, 0, 6.283); ctx.fill(); });
    ctx.fillStyle = `rgba(255,220,180,${0.12 * C.f.luz})`;
    ctx.beginPath(); ctx.ellipse(-6, -28, 4, 10, 0.3, 0, 6.283); ctx.fill();
    // formiguinhas/cupins andando na base
    ctx.fillStyle = C.luz("#2a1a10");
    for (let k = 0; k < 5; k++) {
      const a = (C.t * 0.6 + k * 1.3) % 6.283;
      ctx.fillRect(Math.cos(a) * 20, -2 + Math.sin(a) * 2, 1.2, 1);
    }
    ctx.restore();
  }

  function desenharLobeira(b) {
    const { ctx } = C;
    const s = b.s;
    const bal = Math.sin(C.t * 1.3 + b.semente) * C.forcaVento() * 1.5;
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.scale(s, s);
    ctx.strokeStyle = C.luz("#6b5a3f"); ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(-2, -14, -10 + bal, -26);
    ctx.moveTo(0, 0); ctx.quadraticCurveTo(3, -16, 11 + bal, -24);
    ctx.moveTo(0, -8); ctx.lineTo(2 + bal, -30);
    ctx.stroke();
    // folhas grandes e aveludadas (verde-acinzentado)
    [[-12, -28, 9], [12, -26, 9], [1, -34, 10], [-4, -20, 7], [7, -18, 7]].forEach(([x, y, r], i) => {
      ctx.fillStyle = C.luz(i % 2 ? "#7f9a6c" : "#93ad7e");
      ctx.beginPath(); ctx.ellipse(x + bal, y, r, r * 0.62, i * 0.7, 0, 6.283); ctx.fill();
    });
    // frutas (fruta-do-lobo)
    b.frutas.forEach((f, i) => {
      if (!f) return;
      ctx.fillStyle = C.luz("#9dbb4c");
      ctx.beginPath(); ctx.arc([-9, 9, 0, -3, 5][i] + bal * 0.8, [-14, -12, -22, -8, -6][i], 4, 0, 6.283); ctx.fill();
      ctx.fillStyle = `rgba(255,255,230,${0.25 * C.f.luz})`;
      ctx.beginPath(); ctx.arc([-9, 9, 0, -3, 5][i] + bal * 0.8 - 1, [-14, -12, -22, -8, -6][i] - 1.2, 1.2, 0, 6.283); ctx.fill();
    });
    ctx.restore();
  }

  function desenharCobra(b) {
    const { ctx } = C;
    const s = b.s;
    const n = 20;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const px = b.x - b.dir * i * 2.6 * s;
      const py = b.y + Math.sin(i * 0.55 - b.ph) * 4 * s * (i / n + 0.3);
      pts.push([px, py]);
    }
    ctx.lineCap = "round";
    for (let i = n - 1; i > 0; i--) {
      const w = (1 - i / n) * 4.2 * s + 1;
      ctx.strokeStyle = C.luz(i % 3 === 0 ? "#3f3322" : "#7a6440");
      ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i - 1][0], pts[i - 1][1]); ctx.stroke();
    }
    const [hx, hy] = pts[0];
    ctx.fillStyle = C.luz("#6a5636");
    ctx.beginPath(); ctx.ellipse(hx + b.dir * 2 * s, hy, 3.6 * s, 2.4 * s, 0, 0, 6.283); ctx.fill();
    if (Math.sin(C.t * 5 + b.semente) > 0.7) {
      ctx.strokeStyle = C.luz("#c0392b"); ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(hx + b.dir * 5 * s, hy); ctx.lineTo(hx + b.dir * 9 * s, hy + 0.6); ctx.stroke();
    }
  }

  /* =========================================================
     COMPORTAMENTO
     ========================================================= */
  function perto(b, raio) {
    const p = C.ponteiro;
    if (!p.dentro) return false;
    const dx = p.x - b.x, dy = p.y - (b.y - 15 * b.s);
    return dx * dx + dy * dy < raio * raio;
  }
  const fora = (b, m = 90) => b.x < -m || b.x > C.W + m;
  function mover(b, vel, freq) {
    b.x += vel * b.dir * b.s * C.dt;
    b.ph += C.dt * freq;
  }
  function remover(b) { b.removido = true; }

  /* Visitantes: a espécie depende do horário real */
  function chamarVisitante() {
    const per = C.periodo();
    const pool = [];
    Object.entries(HORARIO).forEach(([k, pesos]) => {
      for (let i = 0; i < Math.round((pesos[per] || 0) * 2); i++) pool.push(ESP[k]);
    });
    if (!pool.length) return;
    const sp = pick(pool);
    const dir = Math.random() < 0.5 ? 1 : -1;
    const y = Math.random() < 0.55 ? laneChao(0.78, 0.97) : rand(C.horizonte + 10, (C.rio.topo[0] || C.H * 0.68) - 8);
    chao.push(novo("quad", {
      sp, dir, x: dir > 0 ? -60 : C.W + 60, y, s: C.escalaY(y), estado: "andando", tEstado: rand(3, 8), visitante: true,
    }));
  }

  /* ---------------------------------------------------------
     EVENTOS: caça, briga, seriema × cobra, tamanduá no cupim,
     lobo comendo fruta-do-lobo. Um de cada vez, de vez em quando.
     --------------------------------------------------------- */
  let proximoEvento = 10;
  const emEvento = () => chao.some((b) => b.evento && !b.removido);

  function evCaca() {
    const onca = noturno() && Math.random() < 0.4;
    const pred = onca ? ESP.onca : ESP.lobo;
    const presaSp = onca ? ESP.capivara : pick([ESP.prea, ESP.prea, ESP.tatu]);
    const dir = pick([-1, 1]);
    const y = laneChao(0.8, 0.95), s = C.escalaY(y);
    const vPresa = Math.max(presaSp.vel * 2.4, 70);
    const presa = novo("quad", { sp: presaSp, dir, x: dir > 0 ? -30 : C.W + 30, y, s: s * (presaSp === ESP.capivara ? 0.9 : 1), estado: "correndo", evento: true });
    const cacador = novo("quad", { sp: pred, dir, x: presa.x - dir * 190 * s, y: y + 3, s, estado: "andando", evento: true, fase: "espreita", t2: 0 });
    presa.ia = (b) => {
      b.arrancada = Math.max(0, (b.arrancada || 0) - C.dt);
      b.estado = "correndo";
      mover(b, vPresa * (b.arrancada > 0 ? 1.45 : 1), presaSp.freq * 2);
      b.y += Math.sin(C.t * 4 + b.semente) * 10 * C.dt * b.s; // ziguezague
      if (fora(b)) remover(b);
    };
    cacador.ia = (b) => {
      b.t2 += C.dt;
      if (b.fase === "comendo") {
        b.estado = "comendo";
        if (Math.random() < C.dt * 2) poeira(b.x + b.dir * pred.L * 0.6 * b.s, b.y, 2, "#7a5a3a", 0.4);
        if ((b.tComer -= C.dt) < 0) b.fase = "saindo";
        return;
      }
      if (b.fase === "saindo" || b.fase === "desistiu") {
        b.estado = "andando";
        mover(b, pred.vel, pred.freq);
        if (fora(b)) remover(b);
        return;
      }
      if (b.fase === "espreita") { // agachado, se aproximando devagar
        b.estado = "andando"; b.pastar = 0.35;
        mover(b, pred.vel * 0.7, pred.freq * 0.8);
        if (b.t2 > 1.4) b.fase = "correndo";
        return;
      }
      b.estado = "correndo";
      const cansado = (b.cansado = Math.max(0, (b.cansado || 0) - C.dt)) > 0;
      mover(b, vPresa * (cansado ? 0.75 : 1.4), pred.freq * 2);
      if (presa.removido) { b.fase = "desistiu"; return; }
      const d = Math.abs(presa.x - b.x);
      if (!b.tentou && d < (pred.L * 0.55 + presaSp.L * 0.35) * b.s) {
        b.tentou = true;
        poeira((presa.x + b.x) / 2, b.y, 12);
        if (Math.random() < (onca ? 0.5 : 0.35)) {
          remover(presa);
          b.fase = "comendo"; b.tComer = rand(6, 9);
        } else {
          presa.arrancada = 3; b.cansado = 2.5; // a presa escapa por pouco
          setTimeout(() => { if (b.fase === "correndo") b.fase = "desistiu"; }, 2600);
        }
      }
      if (fora(b, 140)) remover(b);
    };
    chao.push(presa, cacador);
  }

  function evBriga() {
    const per = C.periodo();
    const sp = (per === "manha" || per === "tarde") && Math.random() < 0.55 ? ESP.veado : ESP.capivara;
    const y = laneChao(0.8, 0.94), s = C.escalaY(y);
    const meio = rand(C.W * 0.25, C.W * 0.75);
    const luta = { fase: "chegando", t: 0, perdedor: Math.random() < 0.5 ? 0 : 1 };
    const lados = [1, -1].map((dir, i) => novo("quad", {
      sp, dir, x: dir > 0 ? -50 : C.W + 50, y: y + i * 3, s, estado: "andando", evento: true, lado: i,
      alvoX: meio - dir * sp.L * 0.62 * s,
    }));
    const ia = (b) => {
      const outro = lados[1 - b.lado];
      if (b.lado === 0) luta.t += C.dt;
      if (luta.fase === "chegando") {
        if (Math.abs(b.x - b.alvoX) > 3) { b.estado = "andando"; mover(b, Math.max(sp.vel * 1.6, 55), sp.freq * 1.8); }
        else b.estado = "parado";
        if (lados.every((x) => Math.abs(x.x - x.alvoX) <= 3)) { luta.fase = "encarando"; luta.t = 0; }
      } else if (luta.fase === "encarando") {
        b.estado = "parado"; b.olhar = 1; b.pastar = 0.2;
        if (luta.t > 1.3) { luta.fase = "brigando"; luta.t = 0; }
      } else if (luta.fase === "brigando") {
        b.estado = "brigando";
        b.pastar = 0.55;
        b.lunge = Math.max(0, Math.sin(luta.t * 7 + b.lado * Math.PI)) * 9;
        b.pulinho = Math.max(0, Math.sin(luta.t * 7 + b.lado * Math.PI)) * 3;
        if (b.lado === 0 && Math.random() < C.dt * 6) poeira(meio, y + 2, 3);
        if (luta.t > 5) { luta.fase = "fuga"; luta.t = 0; lados.forEach((x) => { x.lunge = 0; x.pulinho = 0; }); }
      } else {
        const perdeu = b.lado === luta.perdedor;
        if (perdeu && !b.virou) { b.dir *= -1; b.virou = true; poeira(b.x, b.y, 8); }
        b.estado = perdeu || luta.t < 1.8 ? "correndo" : "andando";
        b.pastar = 0;
        mover(b, sp.vel * (b.estado === "correndo" ? 3 : 1), sp.freq * (b.estado === "correndo" ? 2 : 1));
        if (!perdeu && luta.t < 1.8 && Math.sign(outro.x - b.x) !== b.dir) b.dir *= -1;
        if (fora(b)) remover(b);
      }
    };
    lados.forEach((b) => { b.ia = ia; });
    chao.push(...lados);
  }

  function evSeriemaCobra() {
    let ser = chao.find((b) => b.tipo === "seriema" && !b.removido && !b.ia);
    if (!ser) {
      const y = laneChao(0.8, 0.95);
      ser = novo("seriema", { x: -30, y, s: C.escalaY(y), dir: 1, residente: true, casa: C.W * 0.3, raio: C.W * 0.25, canto: 0 });
      chao.push(ser);
    }
    const dirC = pick([-1, 1]);
    const cobra = novo("cobra", { x: clamp(ser.x + rand(160, 260) * (Math.random() < 0.5 ? -1 : 1), 60, C.W - 60), y: ser.y + rand(-6, 6), s: ser.s, dir: dirC, evento: true });
    cobra.ia = (b) => { if (!b.pega) { b.ph += C.dt * 6; b.x += b.dir * 12 * b.s * C.dt; if (fora(b)) remover(b); } };
    let fase = "indo", t = 0;
    ser.evento = true;
    ser.ia = (b) => {
      t += C.dt;
      if (fase === "indo") {
        b.dir = cobra.x > b.x ? 1 : -1;
        b.estado = "andando";
        b.x += b.dir * 38 * b.s * C.dt; b.ph += C.dt * 7;
        if (Math.abs(cobra.x - b.x) < 16 * b.s) { fase = "batendo"; t = 0; cobra.pega = true; remover(cobra); b.presa = 1; b.canto = 1.2; }
        if (cobra.removido && !cobra.pega) fase = "fim";
      } else if (fase === "batendo") { // bate a cobra no chão, como a seriema faz de verdade
        b.estado = "parado";
        b.bate = Math.pow(Math.abs(Math.sin(t * 7)), 3);
        if (b.bate > 0.95 && Math.random() < 0.5) poeira(b.x + b.dir * 14 * b.s, b.y, 3);
        if (t > 3.2) { fase = "comendo"; t = 0; b.bate = 0; }
      } else if (fase === "comendo") {
        b.estado = "parado";
        b.presa = Math.max(0, 1 - t / 2.8);
        b.pastar = 0.3 + Math.abs(Math.sin(t * 8)) * 0.2;
        if (t > 3) fase = "fim";
      } else {
        b.presa = 0; b.bate = 0; b.pastar = 0; b.ia = null; b.evento = false; b.tEstado = 1;
      }
    };
    chao.push(cobra);
  }

  function evTamanduaCupim() {
    const cupim = chao.find((b) => b.tipo === "cupim");
    if (!cupim) return;
    const dir = cupim.x > C.W / 2 ? -1 : 1;
    const y = cupim.y + 2, s = cupim.s;
    const sp = ESP.tamandua;
    const parar = cupim.x - dir * (sp.L * 0.5 + sp.cab.len + 14) * s;
    let fase = "indo", t = 0;
    const b0 = novo("quad", { sp, dir, x: dir > 0 ? -60 : C.W + 60, y, s, estado: "andando", evento: true });
    b0.ia = (b) => {
      t += C.dt;
      if (fase === "indo") {
        b.estado = "andando"; mover(b, sp.vel * 3, sp.freq * 2);
        if (Math.abs(b.x - parar) < 4) { fase = "comendo"; t = 0; }
      } else if (fase === "comendo") {
        b.estado = "comendo";
        if (Math.random() < C.dt * 5) poeira(cupim.x - dir * 16 * s, y - 4 * s, 2, "#a0603a", 0.6); // cavando com as garras
        if (t > rand(10, 13)) fase = "saindo";
      } else {
        b.estado = "andando"; mover(b, sp.vel, sp.freq);
        if (fora(b)) remover(b);
      }
    };
    chao.push(b0);
  }

  function evLoboFruta() {
    const lob = chao.find((b) => b.tipo === "lobeira");
    if (!lob || !lob.frutas.some(Boolean)) return evCaca();
    const dir = lob.x > C.W / 2 ? -1 : 1;
    const sp = ESP.lobo;
    const s = lob.s;
    const parar = lob.x - dir * (sp.L * 0.5 + 22) * s;
    let fase = "indo", t = 0, mordida = 0;
    const b0 = novo("quad", { sp, dir, x: dir > 0 ? -60 : C.W + 60, y: lob.y + 3, s, estado: "andando", evento: true });
    b0.ia = (b) => {
      t += C.dt;
      if (fase === "indo") {
        b.estado = "andando"; mover(b, sp.vel, sp.freq);
        if (Math.abs(b.x - parar) < 3) { fase = "comendo"; t = 0; }
      } else if (fase === "comendo") {
        b.estado = "comendo";
        mordida += C.dt;
        if (mordida > 1.6) {
          mordida = 0;
          const i = lob.frutas.findIndex(Boolean);
          if (i >= 0) { lob.frutas[i] = false; poeira(lob.x, lob.y - 14 * s, 4, "#9dbb4c", 0.5); }
        }
        if (t > 6.5 || !lob.frutas.some(Boolean)) fase = "saindo";
      } else {
        b.estado = "andando"; mover(b, sp.vel, sp.freq);
        if (fora(b)) remover(b);
      }
    };
    chao.push(b0);
  }

  function dispararEvento() {
    const per = C.periodo();
    const opcoes = [];
    if (per !== "dia") opcoes.push(evCaca, evCaca);
    opcoes.push(evBriga);
    if (per === "manha" || per === "dia" || per === "tarde") opcoes.push(evSeriemaCobra, evSeriemaCobra, evTamanduaCupim, evTamanduaCupim);
    if (per !== "dia") opcoes.push(evLoboFruta, evLoboFruta);
    if (per === "dia") opcoes.push(evCaca); // de dia: lobo atrás de preá é raro, mas acontece
    pick(opcoes)();
  }
  C.forcarEvento = (nome) => ({ caca: evCaca, briga: evBriga, cobra: evSeriemaCobra, cupim: evTamanduaCupim, fruta: evLoboFruta }[nome] || dispararEvento)();

  /* Residentes seguem o relógio: seriema dorme à noite, capivara deita de madrugada */
  function residentesPorHorario() {
    const noite = noturno();
    const ser = chao.find((b) => b.tipo === "seriema" && !b.removido);
    if (noite && ser && !ser.ia && !ser.indoDormir) {
      ser.indoDormir = true;
      ser.dir = ser.x < C.W / 2 ? -1 : 1;
      ser.ia = (b) => { b.estado = "andando"; b.x += b.dir * 30 * b.s * C.dt; b.ph += C.dt * 6; if (fora(b)) remover(b); };
    }
    if (!noite && !ser && Math.random() < C.dt * 0.1) {
      const y = laneChao(0.8, 0.95);
      const d = pick([-1, 1]);
      chao.push(novo("seriema", { x: d > 0 ? -30 : C.W + 30, y, dir: d, s: C.escalaY(y), residente: true, casa: C.W * 0.3, raio: C.W * 0.25, canto: 0, estado: "andando", alvo: C.W * 0.3, tEstado: 6 }));
    }
    // sapos na beira do rio à noite (e em qualquer hora com chuva)
    const querSapo = C.f.chuva > 0.3 || (noite && C.f.chuva < 0.3);
    if (querSapo && chao.filter((b) => b.tipo === "sapo").length < (C.f.chuva > 0.3 ? 5 : 3) && Math.random() < C.dt * 0.3) {
      const x = rand(20, C.W - 20);
      const y = noite && C.f.chuva < 0.3 ? C.riverAt(x)[1] + rand(4, 14) : laneChao(0.8, 0.98);
      chao.push(novo("sapo", { x, y, s: C.escalaY(y), dir: pick([-1, 1]), tEstado: rand(0.5, 2), deNoite: C.f.chuva < 0.3 }));
    }
    // fruta-do-lobo volta a crescer
    const lob = chao.find((b) => b.tipo === "lobeira");
    if (lob && Math.random() < C.dt / 25) { const i = lob.frutas.indexOf(false); if (i >= 0) lob.frutas[i] = true; }
  }

  function atualizarChao() {
    const dt = C.dt;
    const chuva = C.f.chuva;
    const per = C.periodo();
    residentesPorHorario();
    for (let i = chao.length - 1; i >= 0; i--) {
      const b = chao[i];
      if (b.removido) { chao.splice(i, 1); continue; }
      if (b.estatico) continue;
      b.tEstado -= dt;

      if (b.tipo === "coruja") {
        const esconder = chuva > 0.45 || b.fugindo;
        b.sobe += ((esconder ? 0 : 1) - b.sobe) * dt * (esconder ? 3 : 0.6);
        if (b.fugindo && b.tEstado < 0) b.fugindo = false;
        b.olhar += ((perto(b, 140) ? 1 : 0) - b.olhar) * dt * 3;
        continue;
      }

      if (b.tipo === "sapo") {
        b.pulo = Math.max(0, (b.pulo || 0) - dt * 2.2);
        if (b.pulo > 0) b.x += b.dir * 26 * b.s * dt;
        if (b.tEstado < 0) { b.pulo = 1; b.tEstado = rand(1.2, 4); if (Math.random() < 0.3) b.dir *= -1; }
        const some = b.deNoite ? !noturno() : chuva < 0.15;
        if (some) b.some = (b.some || 0) + dt;
        if (b.some > 4 || fora(b, 30)) chao.splice(i, 1);
        continue;
      }

      if (b.tipo === "cobra") { if (b.ia) b.ia(b); continue; }

      if (b.ia) {
        b.ia(b);
        const alvoP = b.estado === "comendo" ? 1 : b.estado === "pastando" ? 1 : b.estado === "deitado" ? 0.3 : null;
        if (alvoP !== null) b.pastar += (alvoP - b.pastar) * dt * 2.5;
        else if (b.estado === "andando" || b.estado === "correndo") b.pastar += (0 - b.pastar) * dt * 3;
        if (b.canto) b.canto = Math.max(0, b.canto - dt);
        continue;
      }

      // reações ao mouse
      const aproximou = perto(b, 90 * b.s + 20);
      if (!b.fugindo) b.olhar += ((aproximou ? 1 : 0) - b.olhar) * dt * 4;

      if (b.fugindo) {
        b.estado = "correndo";
      } else if (aproximou && b.tipo !== "queroquero" && b.estado !== "deitado") {
        b.estado = "parado";
      } else if (b.tEstado < 0) {
        if (b.visitante) {
          b.estado = b.estado === "andando" ? pick(["parado", "pastando", "andando"]) : "andando";
          b.tEstado = b.estado === "andando" ? rand(3, 7) : rand(1.2, 3.5);
        } else {
          const capivaraDorme = b.tipo === "quad" && b.sp === ESP.capivara && per === "madrugada";
          b.estado = capivaraDorme ? pick(["deitado", "deitado", "deitado", "pastando"])
            : pick(b.tipo === "quad" ? ["pastando", "pastando", "andando", "parado"] : ["andando", "pastando", "parado"]);
          b.tEstado = b.estado === "deitado" ? rand(20, 60) : b.estado === "pastando" ? rand(3, 9) : rand(1.5, 5);
          if (b.estado === "andando") {
            b.alvo = clamp(b.casa + rand(-b.raio, b.raio), 20, C.W - 20);
            b.dir = b.alvo > b.x ? 1 : -1;
          }
          if (b.tipo === "seriema" && Math.random() < (per === "manha" ? 0.5 : 0.2)) b.canto = 1.6; // canta mais cedo
        }
      }
      if (b.canto) b.canto = Math.max(0, b.canto - dt);

      const alvoPastar = b.estado === "pastando" ? 1 : b.estado === "deitado" ? 0.3 : 0;
      b.pastar += (alvoPastar - b.pastar) * dt * 2.2;

      let vel = 0;
      if (b.tipo === "quad") {
        vel = b.estado === "andando" ? b.sp.vel : b.estado === "correndo" ? b.sp.vel * 3 : 0;
        b.ph += dt * (b.estado === "correndo" ? b.sp.freq * 2 : b.sp.freq) * (vel ? 1 : 0);
      } else if (b.tipo === "seriema") {
        vel = b.estado === "andando" ? 22 : b.estado === "correndo" ? 120 : 0;
        b.ph += dt * (b.estado === "correndo" ? 16 : 5) * (vel ? 1 : 0);
      } else if (b.tipo === "queroquero") {
        vel = b.estado === "andando" ? 16 : 0;
        b.ph += dt * 9 * (vel ? 1 : 0);
        // quero-quero defende o território: voa em cima de lobo ou onça
        const ameaca = chao.find((o) => o.tipo === "quad" && !o.removido && (o.sp === ESP.lobo || o.sp === ESP.onca) && Math.abs(o.x - b.x) < 150 && Math.abs(o.y - b.y) < 90);
        if (b.fugindo || aproximou || ameaca) {
          chao.splice(i, 1);
          const d = ameaca ? Math.sign(ameaca.x - b.x) || 1 : (C.ponteiro.x > b.x ? -1 : 1);
          ceu.push({ tipo: "qqvoo", x: b.x, y: b.y - 10 * b.s, vx: d * rand(90, 130), vy: -rand(50, 80), bat: 0, s: b.s, dir: d, vida: ameaca ? 7 : 6, alvo: ameaca || null, casaY: b.y });
          setTimeout(() => chao.push(novo("queroquero", { x: rand(C.W * 0.05, C.W * 0.35), y: laneChao(0.85, 0.97), s: b.s, residente: true, casa: C.W * 0.2, raio: 90 })), rand(9000, 16000));
          continue;
        }
      }
      b.x += vel * b.dir * b.s * dt;

      if (b.alvo != null && b.estado === "andando" && Math.abs(b.x - b.alvo) < 6) { b.estado = "pastando"; b.tEstado = rand(3, 7); }

      if (fora(b)) {
        if (b.visitante || b.fugindo) {
          chao.splice(i, 1);
          if (b.residente) {
            const volta = { ...b, fugindo: false, estado: "andando", x: b.dir > 0 ? C.W + 60 : -60, dir: -b.dir, tEstado: rand(3, 6), alvo: b.casa };
            setTimeout(() => chao.push(volta), rand(12000, 22000));
          }
        } else b.dir *= -1;
      }
    }

    // visitantes do horário (menos com chuva)
    proximoVisitante -= dt;
    if (proximoVisitante < 0) {
      proximoVisitante = rand(10, 22) * (1 + chuva * 2);
      if (chao.filter((b) => b.visitante && !b.removido).length < 2 && chuva < 0.6) chamarVisitante();
    }
    // de vez em quando: caça, briga, alguém comendo
    proximoEvento -= dt;
    if (proximoEvento < 0) {
      proximoEvento = rand(22, 45) * (1 + chuva);
      if (!emEvento() && chuva < 0.7) dispararEvento();
    }
  }

  C.faunaChao = () => chao;

  C.desenharBicho = (b) => {
    if (b.tipo === "quad") desenharQuadrupede(b);
    else if (b.tipo === "seriema") desenharSeriema(b);
    else if (b.tipo === "queroquero") desenharQueroQuero(b);
    else if (b.tipo === "coruja") desenharCoruja(b);
    else if (b.tipo === "sapo") desenharSapo(b);
    else if (b.tipo === "cobra") desenharCobra(b);
    else if (b.tipo === "cupim") desenharCupim(b);
    else if (b.tipo === "lobeira") desenharLobeira(b);
  };

  /* ---- céu: urubus, araras, morcegos, tucano, beija-flor ---- */
  let proximaArara = rand(4, 10);
  let proximoMorcego = 1;

  function atualizarCeu() {
    const dt = C.dt, { W } = C;
    const dia = C.f.noite < 0.5, chuva = C.f.chuva;
    const per = C.periodo(), hora = Clima.agora().getHours() + Clima.agora().getMinutes() / 60;
    const termica = hora >= 8.5 && hora <= 17.3; // urubu só plana com o ar quente subindo
    const crepusculo = hora >= 17.8 || hora < 5.5;

    proximaArara -= dt;
    if (proximaArara < 0 && dia && chuva < 0.4) {
      // araras voam em casal principalmente cedo e no fim da tarde
      proximaArara = (per === "manha" || per === "tarde") ? rand(10, 20) : rand(30, 60);
      const dir = pick([-1, 1]);
      const y = rand(C.horizonte * 0.2, C.horizonte * 0.6);
      const vx = dir * rand(70, 95);
      for (let k = 0; k < 2; k++) ceu.push({ tipo: "arara", x: dir > 0 ? -40 - k * 34 : W + 40 + k * 34, y: y + k * 10, vx, bat: rand(0, 6) + k, s: rand(0.8, 0.95), dir, fase: rand(0, 6) });
    }
    proximoMorcego -= dt;
    if (proximoMorcego < 0 && (C.f.noite > 0.6 || crepusculo) && chuva < 0.5) {
      proximoMorcego = rand(3, 8);
      if (ceu.filter((c) => c.tipo === "morcego").length < 5) {
        const dir = pick([-1, 1]);
        ceu.push({ tipo: "morcego", x: dir > 0 ? -20 : W + 20, y: rand(C.horizonte * 0.4, C.horizonte * 1.05), vx: dir * rand(90, 150), vy: 0, bat: 0, s: rand(0.7, 1), fase: rand(0, 6) });
      }
    }
    // beija-flor nos ipês de dia
    if (dia && chuva < 0.3 && !ceu.some((c) => c.tipo === "beija") && Math.random() < dt * 0.1) {
      const ipes = C.arvores.filter((a) => a.tipo.startsWith("ipe") && a.s > 0.7);
      if (ipes.length) {
        const a = pick(ipes);
        ceu.push({ tipo: "beija", arv: a, x: a.x - 80, y: a.y - a.altura, alvo: null, t: 0, s: a.s * 0.8, dir: 1, vida: rand(14, 26) });
      }
    }

    for (let i = ceu.length - 1; i >= 0; i--) {
      const c = ceu[i];
      if (c.tipo === "urubu") {
        c.fase += dt * c.vel;
        c.x = c.cx + Math.cos(c.fase) * c.r;
        c.y = c.cy + Math.sin(c.fase) * c.r * 0.28;
        c.dir = Math.sin(c.fase) > 0 ? -1 : 1;
        c.cx += Math.sin(C.t * 0.05 + c.r) * 4 * dt;
        c.batendo = Math.max(0, c.batendo - dt);
        if (Math.random() < 0.002) c.batendo = 1.2;
        c.bat += dt * 9;
        c.visivel = termica && chuva < 0.5;
      } else if (c.tipo === "arara") {
        c.x += c.vx * dt; c.bat += dt * 11;
        c.y += Math.sin(C.t * 2 + c.fase) * 6 * dt;
        if (c.x < -120 || c.x > W + 120) ceu.splice(i, 1);
      } else if (c.tipo === "morcego") {
        c.x += c.vx * dt;
        c.vy += rand(-300, 300) * dt; c.vy *= 0.94;
        c.y += c.vy * dt; c.bat += dt * 26;
        if (c.x < -40 || c.x > W + 40 || (C.f.noite < 0.3 && !crepusculo)) ceu.splice(i, 1);
      } else if (c.tipo === "qqvoo") {
        c.bat += dt * 18; c.vida -= dt;
        if (c.alvo && !c.alvo.removido && c.vida > 1.5) {
          // rasantes em cima do intruso, subindo e descendo
          const tx = c.alvo.x + Math.sin(C.t * 2.2 + c.bat * 0.01) * 50, ty = c.alvo.y - 30 * c.s - Math.abs(Math.sin(C.t * 3.1)) * 45 * c.s;
          c.vx += (tx - c.x) * dt * 3; c.vy += (ty - c.y) * dt * 3;
          c.vx *= 0.96; c.vy *= 0.96;
          c.dir = Math.sign(c.vx) || c.dir;
          c.x += c.vx * dt; c.y += c.vy * dt;
        } else {
          if (c.alvo) { c.alvo = null; c.vy = -60; c.vx = c.dir * 120; }
          c.x += c.vx * dt; c.y += c.vy * dt; c.vy += 12 * dt;
        }
        if (c.vida < 0 || c.x < -40 || c.x > W + 40) ceu.splice(i, 1);
      } else if (c.tipo === "tucano") {
        const a = c.arv;
        const topo = a.copa.reduce((m, p) => (p.y < m.y ? p : m), a.copa[0]);
        const px = a.x + topo.x + (a.balanco || 0) * 0.9, py = a.y + topo.y - topo.r * 0.7;
        c.t -= dt;
        if (c.pousado) {
          c.x = px; c.y = py;
          if (c.t < 0) { c.t = rand(8, 20); c.dir *= -1; }
          c.visivel = !(noturno() || chuva > 0.5);
        } else {
          c.bat += dt * 14;
          c.x += c.vx * dt; c.y += c.vy * dt;
          if (c.voltando) {
            const dx = px - c.x, dy = py - c.y, d = Math.hypot(dx, dy);
            c.vx = dx / d * 110; c.vy = dy / d * 110; c.dir = Math.sign(dx) || 1;
            if (d < 6) { c.pousado = true; c.voando = false; c.voltando = false; }
          } else if (c.t < 0) { c.voltando = true; c.x = c.vx > 0 ? -30 : W + 30; }
        }
      } else if (c.tipo === "beija") {
        c.vida -= dt; c.t -= dt;
        const a = c.arv;
        if (!c.alvo || c.t < 0) {
          const f = pick(a.copa);
          c.alvo = { x: a.x + f.x + f.r * 0.9 * pick([-1, 1]), y: a.y + f.y + rand(-4, 6) };
          c.t = rand(0.8, 2.2);
        }
        const dx = c.alvo.x - c.x, dy = c.alvo.y - c.y;
        c.x += dx * Math.min(1, dt * 5); c.y += dy * Math.min(1, dt * 5) + Math.sin(C.t * 9) * 0.3;
        if (Math.abs(dx) > 2) c.dir = Math.sign(dx);
        if (c.vida < 0 || !dia || chuva > 0.3) { c.alvo = { x: c.x + 400 * c.dir, y: c.y - 100 }; if (c.vida < -3) ceu.splice(i, 1); }
      }
    }
  }

  C.desenharCeuFauna = (atras) => {
    ceu.forEach((c) => {
      if (c.visivel === false) return;
      if ((c.tipo === "urubu") !== atras) return;
      if (c.tipo === "urubu") desenharUrubu(c);
      else if (c.tipo === "arara") desenharArara(c);
      else if (c.tipo === "morcego") desenharMorcego(c);
      else if (c.tipo === "qqvoo") {
        const { ctx } = C;
        ctx.save(); ctx.translate(c.x, c.y); ctx.scale(c.s * c.dir, c.s);
        asa(ctx, 14, Math.sin(c.bat), C.luz("#8f8a7e"), false);
        ctx.fillStyle = C.luz("#8f8a7e"); ctx.beginPath(); ctx.ellipse(0, 0, 7, 3, 0, 0, 6.283); ctx.fill();
        ctx.fillStyle = C.luz("#15130f"); ctx.beginPath(); ctx.ellipse(4, 1, 2.5, 2, 0, 0, 6.283); ctx.fill();
        asa(ctx, 12, -Math.sin(c.bat) * 0.8, C.luz("#f2efe8"), false);
        ctx.restore();
      } else if (c.tipo === "tucano") desenharTucano(c);
      else if (c.tipo === "beija") desenharBeijaFlor(c);
    });
  };

  /* ---- insetos e vaga-lumes ---- */
  function atualizarInsetos() {
    const dt = C.dt;
    insetos.forEach((b) => {
      b.bat += dt * (12 + Math.sin(C.t + b.fase) * 4);
      b.fase += dt;
      b.vx += rand(-40, 40) * dt;
      b.vx = clamp(b.vx, -30, 30) + C.rajada(b.x) * C.forcaVento() * 3 * dt;
      b.x += b.vx * dt;
      b.y = b.ay + Math.sin(b.fase * 1.7) * 14 + Math.sin(b.fase * 0.5) * 20;
      if (perto(b, 60)) { b.vx += (b.x - C.ponteiro.x) * 2 * dt; b.ay -= 30 * dt; }
      b.ay += ((b.ayBase ?? (b.ayBase = b.ay)) - b.ay) * dt * 0.3;
      if (b.x < -20) b.x = C.W + 20;
      if (b.x > C.W + 20) b.x = -20;
    });
  }
  C.desenharInsetos = () => {
    const { ctx, t } = C;
    if (C.f.noite < 0.55 && C.f.chuva < 0.3) insetos.forEach(desenharBorboleta);
    const vis = smooth(0.55, 0.9, C.f.noite) * (1 - C.f.chuva * 0.9);
    if (vis > 0.02) {
      vagalumes.forEach((v) => {
        v.x += (Math.sin(t * 0.3 + v.fase) * 8 + v.dx) * C.dt;
        v.y += Math.cos(t * 0.4 + v.fase) * 6 * C.dt + v.dy * C.dt * 0.2;
        if (v.x < 0) v.x = C.W; if (v.x > C.W) v.x = 0;
        if (v.y < C.horizonte + 5 || v.y > C.H) v.dy *= -1;
        const acende = Math.max(0, Math.sin(t * v.vel + v.fase)) ** 3;
        if (acende < 0.03) return;
        const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, 9);
        g.addColorStop(0, `rgba(230,255,120,${0.9 * acende * vis})`);
        g.addColorStop(1, "rgba(230,255,120,0)");
        ctx.fillStyle = g;
        ctx.fillRect(v.x - 9, v.y - 9, 18, 18);
      });
    }
  };

  /* ---- peixes do cerrado pulando no rio (várias espécies) ---- */
  const PEIXES = [
    { nome: "lambari",  dorso: "#6f8d96", corpo: "#cfd8da", ventre: "#eef2f0", nad: "#e4b64a", L: 9,  A: 3.2, salto: 16, dist: 22, cardume: true, peso: 3 },
    { nome: "pacu",     dorso: "#4d585e", corpo: "#8e999e", ventre: "#e0a24a", nad: "#6a4e3a", L: 15, A: 8,   salto: 22, dist: 30, peso: 2 },
    { nome: "dourado",  dorso: "#b37a14", corpo: "#e9b43a", ventre: "#f6dd8a", nad: "#d4622a", L: 20, A: 5.6, salto: 38, dist: 50, peso: 1.2 },
    { nome: "tucunare", dorso: "#51693a", corpo: "#c9b64c", ventre: "#e9e0a8", nad: "#d6562a", L: 16, A: 5.4, salto: 26, dist: 36, listras: true, ocelo: true, peso: 1.5 },
    { nome: "piranha",  dorso: "#56616a", corpo: "#9da7ad", ventre: "#d8452e", nad: "#8a3a2a", L: 11, A: 6.2, salto: 17, dist: 24, peso: 2 },
    { nome: "traira",   dorso: "#3c3a28", corpo: "#716c4f", ventre: "#b7ad86", nad: "#4d4a35", L: 16, A: 4.2, salto: 18, dist: 26, manchas: true, peso: 1.2 },
  ];
  const POOL_PEIXE = [];
  PEIXES.forEach((p) => { for (let i = 0; i < p.peso * 2; i++) POOL_PEIXE.push(p); });
  let proximoPeixe = 2;

  function respingo(x, y, n, s) {
    for (let i = 0; i < n; i++) particulas.push({ x, y, vx: rand(-40, 40) * s, vy: -rand(40, 110) * s, r: rand(1, 2), vida: rand(0.35, 0.6), gota: true });
  }

  function desenharPeixe(sp, s) {
    const { ctx } = C;
    const L = sp.L, A = sp.A;
    const bate = Math.sin(C.t * 28) * 0.25;
    // cauda
    ctx.fillStyle = C.luz(sp.nad);
    ctx.save(); ctx.translate(-L * 0.9, 0); ctx.rotate(bate);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-L * 0.45, -A * 0.9); ctx.quadraticCurveTo(-L * 0.3, 0, -L * 0.45, A * 0.9); ctx.closePath(); ctx.fill();
    ctx.restore();
    // nadadeira dorsal e anal
    ctx.beginPath(); ctx.moveTo(-L * 0.2, -A * 0.85); ctx.quadraticCurveTo(-L * 0.05, -A * 1.6, L * 0.2, -A * 0.8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-L * 0.4, A * 0.6); ctx.lineTo(-L * 0.55, A * 1.2); ctx.lineTo(-L * 0.2, A * 0.8); ctx.fill();
    // corpo com degradê dorso → ventre
    const g = ctx.createLinearGradient(0, -A, 0, A);
    g.addColorStop(0, C.luz(sp.dorso)); g.addColorStop(0.5, C.luz(sp.corpo)); g.addColorStop(1, C.luz(sp.ventre));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(L, 0);
    ctx.bezierCurveTo(L * 0.7, -A * 1.1, -L * 0.5, -A * 1.05, -L * 0.95, 0);
    ctx.bezierCurveTo(-L * 0.5, A * 1.05, L * 0.7, A * 1.1, L, 0);
    ctx.fill();
    ctx.save(); ctx.clip();
    if (sp.listras) { ctx.fillStyle = C.luz("#2c3a20", 0.55); [-0.35, 0.05, 0.42].forEach((f) => ctx.fillRect(L * f - 1.2, -A, 2.4, A * 2)); }
    if (sp.manchas) { ctx.fillStyle = C.luz("#24220f", 0.5); [[-0.5, -0.2], [-0.1, 0.3], [0.3, -0.3], [0.1, 0.1]].forEach(([fx, fy]) => { ctx.beginPath(); ctx.arc(L * fx, A * fy, 1.3, 0, 6.283); ctx.fill(); }); }
    ctx.fillStyle = "rgba(255,255,255,0.25)"; // brilho molhado
    ctx.beginPath(); ctx.ellipse(L * 0.1, -A * 0.45, L * 0.5, A * 0.18, 0, 0, 6.283); ctx.fill();
    ctx.restore();
    if (sp.ocelo) { // mancha-olho do tucunaré no rabo
      ctx.fillStyle = C.luz("#f0c040"); ctx.beginPath(); ctx.arc(-L * 0.85, 0, 2.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = C.luz("#1a1a1a"); ctx.beginPath(); ctx.arc(-L * 0.85, 0, 1.3, 0, 6.283); ctx.fill();
    }
    // nadadeira peitoral + olho
    ctx.fillStyle = C.luz(sp.nad, 0.8);
    ctx.beginPath(); ctx.ellipse(L * 0.35, A * 0.35, L * 0.14, A * 0.2, 0.6 + bate, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#f2f2e8"; ctx.beginPath(); ctx.arc(L * 0.68, -A * 0.18, 1.4, 0, 6.283); ctx.fill();
    ctx.fillStyle = "#111"; ctx.beginPath(); ctx.arc(L * 0.7, -A * 0.18, 0.8, 0, 6.283); ctx.fill();
  }

  C.desenharPeixes = () => {
    const { ctx } = C;
    proximoPeixe -= C.dt;
    if (proximoPeixe < 0) {
      proximoPeixe = rand(1.6, 5.5) * (1 + C.f.tempestade);
      const sp = pick(POOL_PEIXE);
      const x = rand(C.W * 0.04, C.W * 0.96);
      const [tt, bb] = C.riverAt(x);
      const y0 = lerp(tt, bb, rand(0.3, 0.85));
      const s = C.escalaY(y0);
      const dir = pick([-1, 1]);
      const n = sp.cardume ? randi(3, 6) : 1;
      for (let k = 0; k < n; k++) {
        peixes.push({ sp, x: x + k * rand(8, 16) * dir * s, y0: y0 + rand(-2, 2), t: -k * rand(0.12, 0.25), dur: rand(0.75, 1.05) * (sp.salto / 22) ** 0.5, dir, s: s * rand(0.85, 1.1), alt: sp.salto * rand(0.8, 1.2) });
      }
    }
    for (let i = peixes.length - 1; i >= 0; i--) {
      const p = peixes[i];
      p.t += C.dt / p.dur;
      if (p.t < 0) continue;
      if (!p.saiu) { p.saiu = true; C.anelAgua(p.x, p.y0, 0.6 * p.s); respingo(p.x, p.y0, 5, p.s); }
      if (p.t >= 1) {
        const xf = p.x + p.dir * p.sp.dist * 1.4 * p.s;
        C.anelAgua(xf, p.y0, 1.1 * p.s);
        respingo(xf, p.y0, 8, p.s);
        peixes.splice(i, 1);
        continue;
      }
      const x = p.x + p.dir * p.sp.dist * 1.4 * p.s * p.t;
      const y = p.y0 - Math.sin(p.t * Math.PI) * p.alt * 1.4 * p.s;
      const dx = p.dir * p.sp.dist, dy = -Math.cos(p.t * Math.PI) * Math.PI * p.alt;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.atan2(dy, Math.abs(dx)) * p.dir);
      ctx.scale(p.s * p.dir * 1.5, p.s * 1.5);
      desenharPeixe(p.sp, p.s);
      ctx.restore();
      if (Math.random() < 0.35) particulas.push({ x: x - p.dir * 6 * p.s, y, vx: rand(-10, 10), vy: rand(0, 20), r: 1, vida: 0.3, gota: true });
    }
  };

  C.atualizarFauna = () => { atualizarChao(); atualizarCeu(); atualizarInsetos(); };

  /* ---- clique na cena ---- */
  C.cliqueFauna = (x, y) => {
    let acertou = false;
    chao.forEach((b) => {
      const d = Math.hypot(b.x - x, b.y - 15 * b.s - y);
      if (b.estatico || b.ia || b.tipo === "cobra") return;
      if (d < 70 * b.s + 15) {
        acertou = true;
        if (b.tipo === "coruja") { b.fugindo = true; b.tEstado = rand(4, 8); return; }
        if (b.tipo === "sapo") { b.pulo = 1; b.dir = x > b.x ? -1 : 1; return; }
        b.fugindo = true;
        b.dir = x > b.x ? -1 : 1;
        b.abana = 0.8;
      }
    });
    ceu.forEach((c) => {
      if (c.tipo === "tucano" && c.pousado && Math.hypot(c.x - x, c.y - y) < 40) {
        c.pousado = false; c.voando = true; c.vx = (x > c.x ? -1 : 1) * 120; c.vy = -40; c.dir = Math.sign(c.vx); c.t = rand(6, 10);
        acertou = true;
      }
    });
    return acertou;
  };

  C.espantarTucano = (arv) => {
    ceu.forEach((c) => {
      if (c.tipo === "tucano" && c.pousado && c.arv === arv) {
        c.pousado = false; c.voando = true; c.vx = pick([-1, 1]) * 120; c.vy = -50; c.dir = Math.sign(c.vx); c.t = rand(6, 10);
      }
    });
  };
})();
