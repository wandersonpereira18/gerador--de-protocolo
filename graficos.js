/* ---------------------------------------------------------
   GRÁFICOS em canvas, com cara de Power BI
   - animação de transição entre valores (cresce do eixo)
   - realce da seleção (os outros ficam apagados)
   - dica ao passar o mouse, clique para filtrar
   --------------------------------------------------------- */
const Graf = (() => {
  // Paleta categórica validada (ordem fixa; cor segue a pessoa, nunca a posição)
  const PAL = ["#118DFF", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7"];
  const OUTROS = "#a19f9d";
  const TXT = "#252423", TXT2 = "#605e5c", GRADE = "#edebe9", SUPERF = "#ffffff";
  const FONTE = '"Segoe UI", -apple-system, BlinkMacSystemFont, Roboto, sans-serif';
  const DUR = 520;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const fmt = (n) => Number(n).toLocaleString("pt-BR");
  const esc = (s) => UI.esc(s);

  function passoBonito(max, n = 4) {
    if (max <= 0) return 1;
    const bruto = max / n;
    const p = Math.pow(10, Math.floor(Math.log10(bruto)));
    const m = bruto / p;
    return Math.max(1, (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p);
  }

  function preparar(cv) {
    const dpr = window.devicePixelRatio || 1;
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) {
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    }
    const ctx = cv.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    cv._hits = [];
    return { ctx, w, h };
  }

  function vazio(ctx, w, h, msg = "Sem dados para os filtros atuais") {
    ctx.fillStyle = TXT2;
    ctx.font = `13px ${FONTE}`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(msg, w / 2, h / 2);
  }

  function cortar(ctx, t, max) {
    if (ctx.measureText(t).width <= max) return t;
    let s = t;
    while (s.length > 1 && ctx.measureText(s + "…").width > max) s = s.slice(0, -1);
    return s + "…";
  }

  /* Motor de animação: interpola os valores exibidos até o alvo */
  function animar(cv, alvo, desenhar, instantaneo) {
    const de = cv._mostrado || new Map();
    cv._alvo = alvo;
    cv._desenhar = desenhar;
    cancelAnimationFrame(cv._raf);
    const t0 = performance.now();
    const quadro = (agora) => {
      const p = instantaneo ? 1 : Math.min(1, (agora - t0) / DUR);
      const e = ease(p);
      const atual = new Map();
      alvo.forEach((v, k) => atual.set(k, (de.get(k) || 0) + (v - (de.get(k) || 0)) * e));
      cv._mostrado = atual;
      desenhar(atual, e);
      if (p < 1) cv._raf = requestAnimationFrame(quadro);
    };
    if (instantaneo) quadro(t0); else cv._raf = requestAnimationFrame(quadro);
  }
  function redesenhar(cv) { if (cv._desenhar && cv._mostrado) cv._desenhar(cv._mostrado, 1); }

  function grade(ctx, x0, x1, y0, y1, passo, topo, vertical) {
    ctx.font = `11px ${FONTE}`;
    ctx.fillStyle = TXT2;
    ctx.strokeStyle = GRADE;
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 3]);
    const n = Math.round(topo / passo);
    for (let i = 0; i <= n; i++) {
      const v = passo * i;
      if (vertical) {
        const x = x0 + (x1 - x0) * (v / topo);
        ctx.beginPath(); ctx.moveTo(Math.round(x) + .5, y0); ctx.lineTo(Math.round(x) + .5, y1); ctx.stroke();
        ctx.textAlign = "center"; ctx.textBaseline = "top";
        ctx.fillText(fmt(v), x, y1 + 4);
      } else {
        const y = y1 - (y1 - y0) * (v / topo);
        ctx.beginPath(); ctx.moveTo(x0, Math.round(y) + .5); ctx.lineTo(x1, Math.round(y) + .5); ctx.stroke();
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(fmt(v), x0 - 6, y);
      }
    }
    ctx.setLineDash([]);
  }

  /* ---------- Barras horizontais ---------- */
  function barrasH(cv, itens, op = {}) {
    const alvo = new Map(itens.map((i) => [i.k, i.v]));
    animar(cv, alvo, (val) => {
      const { ctx, w, h } = preparar(cv);
      if (!itens.length) return vazio(ctx, w, h);
      ctx.font = `12px ${FONTE}`;
      const larguraRot = Math.min(w * 0.38, Math.max(...itens.map((i) => ctx.measureText(i.label).width)) + 10);
      const padL = larguraRot + 8, padR = 40, padT = 4, padB = 22;
      const pw = w - padL - padR, ph = h - padT - padB;
      const max = Math.max(...itens.map((i) => i.v), 1);
      const passo = passoBonito(max, 4), topo = Math.ceil(max / passo) * passo;
      grade(ctx, padL, padL + pw, padT, padT + ph, passo, topo, true);
      const slot = ph / itens.length;
      const bh = Math.max(4, Math.min(24, slot * 0.62));
      itens.forEach((it, i) => {
        const v = val.get(it.k) || 0;
        const y = padT + slot * i + (slot - bh) / 2;
        const bw = (pw * v) / topo;
        const apagado = op.sel != null && op.sel !== it.k;
        ctx.globalAlpha = apagado ? 0.3 : 1;
        ctx.fillStyle = it.cor || op.cor || PAL[0];
        if (bw > 0.5) { ctx.beginPath(); ctx.roundRect(padL, y, bw, bh, [0, Math.min(4, bw), Math.min(4, bw), 0]); ctx.fill(); }
        ctx.globalAlpha = apagado ? 0.45 : 1;
        ctx.font = `12px ${FONTE}`;
        ctx.fillStyle = TXT;
        ctx.textAlign = "right"; ctx.textBaseline = "middle";
        ctx.fillText(cortar(ctx, it.label, larguraRot), padL - 8, y + bh / 2);
        ctx.fillStyle = TXT2;
        ctx.textAlign = "left";
        ctx.fillText(fmt(Math.round(v)), padL + bw + 5, y + bh / 2);
        ctx.globalAlpha = 1;
        const s0 = padT + slot * i, s1 = s0 + slot;
        cv._hits.push({
          test: (mx, my) => my >= s0 && my < s1 && mx >= 0,
          k: it.k,
          dica: `<div class="l"><span>${esc(op.rotuloCat || "Categoria")}</span><b>${esc(it.label)}</b></div><div class="l"><span>${esc(op.rotuloVal || "Registros")}</span><b>${fmt(it.v)}</b></div>${it.extra || ""}`,
        });
      });
    });
  }

  /* ---------- Colunas ---------- */
  function colunas(cv, itens, op = {}) {
    const alvo = new Map(itens.map((i) => [i.k, i.v]));
    animar(cv, alvo, (val) => {
      const { ctx, w, h } = preparar(cv);
      if (!itens.some((i) => i.v > 0)) return vazio(ctx, w, h);
      const padL = 36, padR = 8, padT = 16, padB = 24;
      const pw = w - padL - padR, ph = h - padT - padB;
      const max = Math.max(...itens.map((i) => i.v), 1);
      const passo = passoBonito(max), topo = Math.ceil(max / passo) * passo;
      grade(ctx, padL, padL + pw, padT, padT + ph, passo, topo, false);
      const n = itens.length, slot = pw / n;
      const bw = Math.max(2, Math.min(34, slot * 0.64));
      const pula = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 30))));
      itens.forEach((it, i) => {
        const v = val.get(it.k) || 0;
        const x = padL + slot * i + (slot - bw) / 2;
        const bh = (ph * v) / topo;
        const y = padT + ph - bh;
        const apagado = op.sel != null && op.sel !== it.k;
        ctx.globalAlpha = apagado ? 0.3 : 1;
        ctx.fillStyle = op.cor || PAL[0];
        if (bh > 0.5) { ctx.beginPath(); ctx.roundRect(x, y, bw, bh, [Math.min(4, bh), Math.min(4, bh), 0, 0]); ctx.fill(); }
        ctx.globalAlpha = 1;
        if (bw >= 18 && it.v > 0) {
          ctx.font = `11px ${FONTE}`; ctx.fillStyle = TXT2;
          ctx.textAlign = "center"; ctx.textBaseline = "bottom";
          ctx.fillText(fmt(Math.round(v)), x + bw / 2, y - 3);
        }
        if (i % pula === 0) {
          ctx.font = `11px ${FONTE}`; ctx.fillStyle = TXT2;
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText(it.label, x + bw / 2, padT + ph + 6);
        }
        const x0 = padL + slot * i;
        cv._hits.push({
          test: (mx, my) => mx >= x0 && mx < x0 + slot && my >= padT - 10 && my <= padT + ph + 20,
          k: it.k,
          dica: `<div class="l"><span>${esc(op.rotuloCat || "Categoria")}</span><b>${esc(it.dica || it.label)}</b></div><div class="l"><span>Registros</span><b>${fmt(it.v)}</b></div>`,
        });
      });
    });
  }

  /* ---------- Linha com área (com cruz de mira no hover) ---------- */
  function linha(cv, itens, op = {}) {
    const alvo = new Map(itens.map((i) => [i.k, i.v]));
    animar(cv, alvo, (val, prog) => {
      const { ctx, w, h } = preparar(cv);
      if (!itens.length) return vazio(ctx, w, h);
      const padL = 36, padR = 14, padT = 16, padB = 24;
      const pw = w - padL - padR, ph = h - padT - padB;
      const max = Math.max(...itens.map((i) => i.v), 1);
      const passo = passoBonito(max), topo = Math.ceil(max / passo) * passo;
      grade(ctx, padL, padL + pw, padT, padT + ph, passo, topo, false);
      const n = itens.length;
      const xAt = (i) => (n === 1 ? padL + pw / 2 : padL + (pw * i) / (n - 1));
      const yAt = (v) => padT + ph - (ph * v) / topo;
      const cor = PAL[0];
      const pts = itens.map((it, i) => [xAt(i), yAt(val.get(it.k) || 0)]);

      const g = ctx.createLinearGradient(0, padT, 0, padT + ph);
      g.addColorStop(0, "rgba(17,141,255,.22)"); g.addColorStop(1, "rgba(17,141,255,0)");
      ctx.beginPath();
      ctx.moveTo(pts[0][0], padT + ph);
      pts.forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.lineTo(pts[n - 1][0], padT + ph);
      ctx.closePath();
      ctx.fillStyle = g; ctx.fill();

      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = cor; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();

      const pula = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 44))));
      const meio = n > 1 ? pw / (n - 1) / 2 : pw / 2;
      const hover = cv._hoverK;
      itens.forEach((it, i) => {
        const [x, y] = pts[i];
        const apagado = op.sel != null && op.sel !== it.k;
        if (hover === it.k) {
          ctx.strokeStyle = "#c8c6c4"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
          ctx.beginPath(); ctx.moveTo(x + .5, padT); ctx.lineTo(x + .5, padT + ph); ctx.stroke(); ctx.setLineDash([]);
        }
        if (n <= 45 || hover === it.k || op.sel === it.k) {
          ctx.globalAlpha = apagado ? 0.35 : 1;
          ctx.beginPath(); ctx.arc(x, y, hover === it.k || op.sel === it.k ? 5.5 : 4, 0, 6.283);
          ctx.fillStyle = cor; ctx.fill();
          ctx.strokeStyle = SUPERF; ctx.lineWidth = 2; ctx.stroke();
          ctx.globalAlpha = 1;
        }
        if (i % pula === 0) {
          ctx.font = `11px ${FONTE}`; ctx.fillStyle = TXT2;
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText(it.label, x, padT + ph + 6);
        }
        cv._hits.push({
          test: (mx, my) => Math.abs(mx - x) <= Math.max(6, meio) && my >= padT - 10 && my <= padT + ph + 20,
          k: it.k,
          dica: `<div class="l"><span>Data</span><b>${esc(it.dica || it.label)}</b></div><div class="l"><span>Registros</span><b>${fmt(it.v)}</b></div>`,
        });
      });
      // rótulo só no maior valor (rótulo seletivo)
      if (prog >= 1 && n > 1) {
        let im = 0; itens.forEach((it, i) => { if (it.v > itens[im].v) im = i; });
        const [x, y] = pts[im];
        ctx.font = `600 11px ${FONTE}`; ctx.fillStyle = TXT;
        ctx.textAlign = x > w - 40 ? "right" : "center"; ctx.textBaseline = "bottom";
        ctx.fillText(fmt(itens[im].v), x, y - 8);
      }
    });
  }

  /* ---------- Rosca com legenda ---------- */
  function rosca(cv, itens, op = {}) {
    const alvo = new Map(itens.map((i) => [i.k, i.v]));
    animar(cv, alvo, (val, prog) => {
      const { ctx, w, h } = preparar(cv);
      const total = itens.reduce((a, i) => a + i.v, 0);
      if (!total) return vazio(ctx, w, h);
      const legW = Math.min(170, w * 0.46);
      const cx = (w - legW) / 2, cy = h / 2;
      const R = Math.max(24, Math.min(h / 2 - 12, cx - 12));
      const r = R * 0.6;
      let a0 = -Math.PI / 2;
      const soma = [...val.values()].reduce((a, b) => a + b, 0) || 1;
      const giro = Math.PI * 2 * prog;
      itens.forEach((it) => {
        const v = val.get(it.k) || 0;
        const a1 = a0 + (v / soma) * giro;
        const hov = cv._hoverK === it.k;
        const apagado = op.sel != null && op.sel !== it.k;
        const RR = R + (hov ? 5 : 0);
        ctx.globalAlpha = apagado ? 0.3 : 1;
        ctx.beginPath();
        ctx.arc(cx, cy, RR, a0, a1);
        ctx.arc(cx, cy, r, a1, a0, true);
        ctx.closePath();
        ctx.fillStyle = it.cor; ctx.fill();
        ctx.strokeStyle = SUPERF; ctx.lineWidth = 2; ctx.stroke();
        ctx.globalAlpha = 1;
        const ini = a0, fim = a1;
        const pct = ((it.v / total) * 100).toFixed(1).replace(".", ",");
        cv._hits.push({
          test: (mx, my) => {
            const dx = mx - cx, dy = my - cy, d = Math.hypot(dx, dy);
            if (d < r || d > R + 6) return false;
            let ang = Math.atan2(dy, dx);
            if (ang < -Math.PI / 2) ang += Math.PI * 2;
            return ang >= ini && ang < fim;
          },
          k: it.k,
          dica: `<div class="l"><span><i class="cor" style="background:${it.cor}"></i>${esc(it.label)}</span><b>${fmt(it.v)}</b></div><div class="l"><span>% do total</span><b>${pct}%</b></div>`,
        });
        a0 = a1;
      });
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `600 22px ${FONTE}`; ctx.fillStyle = TXT;
      ctx.fillText(fmt(Math.round([...val.values()].reduce((a, b) => a + b, 0))), cx, cy - 7);
      ctx.font = `11px ${FONTE}`; ctx.fillStyle = TXT2;
      ctx.fillText("registros", cx, cy + 12);

      // legenda (identidade nunca só pela cor: nome + valor)
      const lx = w - legW + 6;
      const linhaH = 20;
      const y0 = Math.max(10, cy - (itens.length * linhaH) / 2 + linhaH / 2);
      itens.forEach((it, i) => {
        const y = y0 + i * linhaH;
        if (y > h - 6) return;
        const apagado = op.sel != null && op.sel !== it.k;
        ctx.globalAlpha = apagado ? 0.45 : 1;
        ctx.fillStyle = it.cor;
        ctx.beginPath(); ctx.arc(lx + 4, y, 4, 0, 6.283); ctx.fill();
        ctx.font = `12px ${FONTE}`; ctx.fillStyle = TXT;
        ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(cortar(ctx, it.label, legW - 58), lx + 14, y);
        ctx.fillStyle = TXT2; ctx.textAlign = "right";
        ctx.fillText(`${Math.round((it.v / total) * 100)}%`, w - 4, y);
        ctx.globalAlpha = 1;
        cv._hits.push({ test: (mx, my) => mx >= lx && my >= y - 10 && my < y + 10, k: it.k, dica: `<div class="l"><span>${esc(it.label)}</span><b>${fmt(it.v)}</b></div>` });
      });
    });
  }

  /* ---------- Colunas empilhadas (dia × pessoa) ---------- */
  function empilhadas(cv, cats, series, op = {}) {
    const alvo = new Map();
    series.forEach((s) => s.vals.forEach((v, i) => alvo.set(`${s.k}|${i}`, v)));
    animar(cv, alvo, (val) => {
      const { ctx, w, h } = preparar(cv);
      if (!cats.length) return vazio(ctx, w, h);
      // legenda no topo
      ctx.font = `12px ${FONTE}`;
      let lx = 4, ly = 8;
      series.forEach((s) => {
        const tw = ctx.measureText(s.label).width + 22;
        if (lx + tw > w) { lx = 4; ly += 18; }
        ctx.fillStyle = s.cor; ctx.beginPath(); ctx.arc(lx + 4, ly, 4, 0, 6.283); ctx.fill();
        ctx.fillStyle = TXT; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(s.label, lx + 12, ly);
        lx += tw;
      });
      const padL = 36, padR = 8, padT = ly + 18, padB = 24;
      const pw = w - padL - padR, ph = h - padT - padB;
      const totais = cats.map((_, i) => series.reduce((a, s) => a + s.vals[i], 0));
      const max = Math.max(...totais, 1);
      const passo = passoBonito(max), topo = Math.ceil(max / passo) * passo;
      grade(ctx, padL, padL + pw, padT, padT + ph, passo, topo, false);
      const n = cats.length, slot = pw / n;
      const bw = Math.max(3, Math.min(40, slot * 0.64));
      const pula = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(pw / 44))));
      cats.forEach((c, i) => {
        const x = padL + slot * i + (slot - bw) / 2;
        let y = padT + ph;
        const partes = [];
        series.forEach((s) => {
          const v = val.get(`${s.k}|${i}`) || 0;
          const bh = (ph * v) / topo;
          if (bh <= 0.3) return;
          const apagado = op.sel != null && op.sel !== s.k;
          ctx.globalAlpha = apagado ? 0.25 : 1;
          ctx.fillStyle = s.cor;
          ctx.fillRect(x, y - bh, bw, Math.max(0.5, bh - 2)); // 2px de respiro entre segmentos
          ctx.globalAlpha = 1;
          y -= bh;
          partes.push(s);
        });
        if (i % pula === 0) {
          ctx.font = `11px ${FONTE}`; ctx.fillStyle = TXT2;
          ctx.textAlign = "center"; ctx.textBaseline = "top";
          ctx.fillText(c.label, x + bw / 2, padT + ph + 6);
        }
        const x0 = padL + slot * i;
        const linhas = series.filter((s) => s.vals[i] > 0)
          .map((s) => `<div class="l"><span><i class="cor" style="background:${s.cor}"></i>${esc(s.label)}</span><b>${fmt(s.vals[i])}</b></div>`).join("");
        cv._hits.push({
          test: (mx, my) => mx >= x0 && mx < x0 + slot && my >= padT && my <= padT + ph + 20,
          k: c.k,
          dica: `<div class="l"><span>Data</span><b>${esc(c.dica)}</b></div>${linhas}<div class="l"><span>Total</span><b>${fmt(totais[i])}</b></div>`,
        });
      });
    });
  }

  /* ---------- interação padrão em qualquer canvas ---------- */
  function ligar(cv, aoClicar) {
    const achar = (e) => {
      const r = cv.getBoundingClientRect();
      const mx = e.clientX - r.left, my = e.clientY - r.top;
      return (cv._hits || []).find((h) => h.test(mx, my));
    };
    cv.addEventListener("pointermove", (e) => {
      const hit = achar(e);
      const k = hit ? hit.k : null;
      if (k !== cv._hoverK) { cv._hoverK = k; redesenhar(cv); }
      cv.classList.toggle("clicavel", !!hit && !!aoClicar);
      if (hit) PB.mostrarDica(hit.dica, e.clientX, e.clientY); else PB.esconderDica();
    });
    cv.addEventListener("pointerleave", () => { cv._hoverK = null; redesenhar(cv); PB.esconderDica(); });
    if (aoClicar) cv.addEventListener("click", (e) => { const hit = achar(e); aoClicar(hit ? hit.k : null); });
  }

  return { PAL, OUTROS, barrasH, colunas, linha, rosca, empilhadas, ligar, redesenhar, fmt };
})();
