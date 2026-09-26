/* ---------------------------------------------------------
   DASHBOARD — relatório no estilo Power BI, em tempo real
   Admin vê todo mundo; usuário comum vê só o que ele digitou.
   --------------------------------------------------------- */
(async () => {
  const $ = (id) => document.getElementById(id);
  PB.icones();

  let sessao;
  try { sessao = await Sessao.exigir(); } catch { return; }
  const { user, perfil } = sessao;
  const admin = perfil.perfil === "admin";

  PB.montar({ perfil, user, pagina: "dashboard", migalha: `Relatórios &nbsp;›&nbsp; <b>Dashboard de protocolos</b>` });
  $("escopo").textContent = admin
    ? "Todos os usuários · os números mudam sozinhos quando alguém registra"
    : `Somente os seus registros, ${UI.primeiroNome(perfil.nome)} · atualiza sozinho`;

  const fmt = Graf.fmt;
  const pad = UI.pad;
  const hojeISO = UI.hojeISO;
  const isoMenos = (dias) => { const d = new Date(); d.setDate(d.getDate() - dias); return hojeISO(d); };
  const dataCurta = (iso) => `${iso.slice(8)}/${iso.slice(5, 7)}`;

  /* ---------- estado ---------- */
  let ALL = [];
  const F = { nomes: new Set(), d1: "", d2: "", h1: "", h2: "" };
  let cruz = null; // filtro cruzado vindo de clique num visual: { campo, valor }
  let pagina = "geral";
  const corDe = new Map();
  const rotuloDe = new Map();

  /* A cor segue a pessoa (ordem alfabética), nunca a posição no ranking */
  function colorir() {
    corDe.clear(); rotuloDe.clear();
    const chaves = [...new Set(ALL.map((r) => r.key))];
    ALL.forEach((r) => { if (!rotuloDe.has(r.key)) rotuloDe.set(r.key, r.nome); });
    chaves.sort((a, b) => rotuloDe.get(a).localeCompare(rotuloDe.get(b), "pt-BR"));
    chaves.forEach((k, i) => corDe.set(k, i < Graf.PAL.length ? Graf.PAL[i] : Graf.OUTROS));
  }

  /* ---------- filtros ---------- */
  function filtrar(ignorar) {
    return ALL.filter((r) => {
      if (F.nomes.size && !F.nomes.has(r.key)) return false;
      if (F.d1 && r.dataISO < F.d1) return false;
      if (F.d2 && r.dataISO > F.d2) return false;
      if (F.h1 || F.h2) {
        const h = r.hora;
        if (F.h1 && F.h2 && F.h1 > F.h2) { if (!(h >= F.h1 || h <= F.h2)) return false; }
        else { if (F.h1 && h < F.h1) return false; if (F.h2 && h > F.h2) return false; }
      }
      if (cruz && cruz.campo !== ignorar) {
        if (cruz.campo === "nome" && r.key !== cruz.valor) return false;
        if (cruz.campo === "hora" && r.hora.slice(0, 2) !== cruz.valor) return false;
        if (cruz.campo === "dia" && r.dataISO !== cruz.valor) return false;
        if (cruz.campo === "caixa" && r.caixa !== cruz.valor) return false;
      }
      return true;
    });
  }
  const contar = (lista, fn) => { const m = new Map(); lista.forEach((r) => { const k = fn(r); m.set(k, (m.get(k) || 0) + 1); }); return m; };

  function alternarCruz(campo, valor) {
    if (valor == null || (cruz && cruz.campo === campo && cruz.valor === valor)) cruz = null;
    else cruz = { campo, valor };
    render(true);
  }

  /* ---------- lista de nomes (painel de filtros) ---------- */
  const listaNomes = $("lista-nomes");
  function montarListaNomes() {
    const busca = $("busca-nome").value.trim().toLocaleLowerCase("pt-BR");
    const cont = contar(ALL, (r) => r.key);
    const chaves = [...cont.keys()].sort((a, b) => rotuloDe.get(a).localeCompare(rotuloDe.get(b), "pt-BR"));
    const tudo = F.nomes.size === 0;
    listaNomes.innerHTML =
      `<div class="slicer-item ${tudo ? "on" : ""}" data-k="*"><span class="caixinha">${PB.I.check}</span>Selecionar tudo</div>` +
      chaves.filter((k) => !busca || k.includes(busca)).map((k) => `
        <div class="slicer-item ${F.nomes.has(k) ? "on" : ""}" data-k="${UI.esc(k)}">
          <span class="caixinha">${PB.I.check}</span>
          <span class="bolinha" style="background:${corDe.get(k)}"></span>
          <span>${UI.esc(rotuloDe.get(k))}</span>
          <span class="qtd">${fmt(cont.get(k))}</span>
        </div>`).join("");
    const sel = $("f-nome-rapido");
    const atual = F.nomes.size === 1 ? [...F.nomes][0] : "";
    sel.innerHTML = '<option value="">Todos</option>' +
      chaves.map((k) => `<option value="${UI.esc(k)}">${UI.esc(rotuloDe.get(k))}</option>`).join("") +
      (F.nomes.size > 1 ? '<option value="__varios" disabled>Vários selecionados</option>' : "");
    sel.value = F.nomes.size > 1 ? "__varios" : atual;
  }
  listaNomes.addEventListener("click", (e) => {
    const it = e.target.closest(".slicer-item");
    if (!it) return;
    const k = it.dataset.k;
    if (k === "*") F.nomes.clear();
    else F.nomes.has(k) ? F.nomes.delete(k) : F.nomes.add(k);
    montarListaNomes();
    render(true);
  });
  $("busca-nome").addEventListener("input", montarListaNomes);
  $("f-nome-rapido").addEventListener("change", (e) => {
    F.nomes.clear();
    if (e.target.value && e.target.value !== "__varios") F.nomes.add(e.target.value);
    montarListaNomes();
    render(true);
  });

  /* datas e horas */
  [["f-d1", "d1"], ["f-d2", "d2"], ["f-h1", "h1"], ["f-h2", "h2"]].forEach(([id, campo]) => {
    $(id).addEventListener("change", (e) => { F[campo] = e.target.value; render(true); });
  });
  const PRESETS = {
    hoje: () => [hojeISO(), hojeISO()],
    ontem: () => [isoMenos(1), isoMenos(1)],
    "7d": () => [isoMenos(6), hojeISO()],
    "30d": () => [isoMenos(29), hojeISO()],
    mes: () => { const d = new Date(); return [`${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, hojeISO()]; },
    tudo: () => ["", ""],
  };
  $("chips-periodo").addEventListener("click", (e) => {
    const b = e.target.closest("[data-p]");
    if (!b) return;
    [F.d1, F.d2] = PRESETS[b.dataset.p]();
    $("f-d1").value = F.d1; $("f-d2").value = F.d2;
    render(true);
  });
  document.querySelectorAll("[data-limpa]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.limpa === "nome") F.nomes.clear();
    else { F.d1 = F.d2 = ""; $("f-d1").value = $("f-d2").value = ""; }
    montarListaNomes();
    render(true);
  }));

  /* cartões do painel abrem/fecham */
  document.querySelectorAll(".fcard-cab").forEach((b) => b.addEventListener("click", () => b.parentElement.classList.toggle("aberto")));
  $("fechar-filtros").addEventListener("click", () => $("painel-filtros").classList.toggle("fechado"));
  $("bt-filtros").addEventListener("click", () => $("painel-filtros").classList.toggle("fechado"));
  if (innerWidth < 860) $("painel-filtros").classList.add("fechado");

  $("bt-redefinir").addEventListener("click", () => {
    F.nomes.clear(); F.d1 = F.d2 = F.h1 = F.h2 = ""; cruz = null;
    ["f-d1", "f-d2", "f-h1", "f-h2", "busca-nome", "busca-det"].forEach((id) => { $(id).value = ""; });
    montarListaNomes();
    render(true);
    UI.toast("Filtros redefinidos.", "ok", 2200);
  });
  $("bt-atualizar").addEventListener("click", (e) => {
    const b = e.currentTarget;
    b.classList.remove("girar"); void b.offsetWidth; b.classList.add("girar");
    document.querySelectorAll(".vis canvas").forEach((cv) => { cv._mostrado = new Map(); });
    render(true);
  });
  $("bt-exportar").addEventListener("click", () => {
    const rows = filtrar().sort((a, b) => `${a.dataISO}${a.hora}`.localeCompare(`${b.dataISO}${b.hora}`));
    PB.baixarCSV(`protocolos_${hojeISO()}.csv`, ["Data", "Hora", "Protocolo", "Caixa", "Digitado por", "E-mail"],
      rows.map((r) => [UI.dataBR(r.dataISO), r.hora, r.protocolo, r.caixa, r.nome, r.email]));
  });

  /* ---------- abas de página ---------- */
  $("abas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ir]");
    if (!b || b.dataset.ir === pagina) return;
    pagina = b.dataset.ir;
    $("abas").querySelectorAll("[data-ir]").forEach((x) => x.classList.toggle("ativo", x === b));
    document.querySelectorAll(".pb-pagina").forEach((p) => { p.hidden = p.dataset.pagina !== pagina; });
    $("rolagem").scrollTop = 0;
    document.querySelectorAll(".vis canvas").forEach((cv) => { cv._mostrado = new Map(); });
    render(true);
  });

  /* ---------- visuais ---------- */
  const visEl = (nome) => document.querySelector(`[data-vis="${nome}"]`);
  const canvasDe = (nome) => visEl(nome).querySelector("canvas");

  Graf.ligar(canvasDe("nome"), (k) => alternarCruz("nome", k));
  Graf.ligar(canvasDe("dia"), (k) => alternarCruz("dia", k));
  Graf.ligar(canvasDe("hora"), (k) => alternarCruz("hora", k));
  Graf.ligar(canvasDe("rosca"), (k) => alternarCruz("nome", k === "__outros" ? null : k));
  Graf.ligar(canvasDe("caixa"), (k) => alternarCruz("caixa", k));
  Graf.ligar(canvasDe("empilhado"), (k) => alternarCruz("dia", k));

  // redimensionar redesenha sem animar
  const ro = new ResizeObserver((ents) => ents.forEach((en) => Graf.redesenhar(en.target)));
  document.querySelectorAll(".vis canvas").forEach((cv) => ro.observe(cv));

  function renderCards(rows) {
    const prot = contar(rows, (r) => r.protocolo);
    const dups = [...prot.values()].filter((n) => n > 1).length;
    UI.contar($("k-total").querySelector(".card-valor"), rows.length);
    UI.contar($("k-prot").querySelector(".card-valor"), prot.size);
    UI.contar($("k-caixa").querySelector(".card-valor"), new Set(rows.map((r) => r.caixa)).size);
    UI.contar($("k-dup").querySelector(".card-valor"), dups);
    $("k-dup").classList.toggle("alerta", dups > 0);
    $("k-dup-sub").textContent = dups ? "confira na aba Detalhes" : "nenhum protocolo repetido";
    const hoje = rows.filter((r) => r.dataISO === hojeISO()).length;
    const ontem = rows.filter((r) => r.dataISO === isoMenos(1)).length;
    const dif = hoje - ontem;
    $("k-total-sub").innerHTML = `hoje: <b>${fmt(hoje)}</b> <span class="${dif >= 0 ? "sobe" : "desce"}">${dif >= 0 ? "▲" : "▼"} ${fmt(Math.abs(dif))} vs ontem</span>`;
    const dias = new Set(rows.map((r) => r.dataISO)).size;
    $("k-prot").querySelector(".card-sub").textContent = `${fmt(rows.length - prot.size)} registro(s) além do 1º`;
    $("k-caixa").querySelector(".card-sub").textContent = dias ? `média de ${fmt(Math.round(rows.length / dias))} registros/dia` : " ";
  }

  function renderGeral() {
    // por nome
    const rN = filtrar("nome");
    const cN = contar(rN, (r) => r.key);
    const itensN = [...cN.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ k, label: rotuloDe.get(k), v }));
    Graf.barrasH(canvasDe("nome"), itensN, { sel: cruz && cruz.campo === "nome" ? cruz.valor : null, rotuloCat: "Nome", rotuloVal: "Quantidade" });
    canvasDe("nome")._tabela = { cols: ["Nome", "Quantidade"], linhas: itensN.map((i) => [i.label, i.v]) };

    // por dia (dias sem registro entram como zero, eixo contínuo)
    const rD = filtrar("dia");
    const cD = contar(rD, (r) => r.dataISO);
    let dias = [...cD.keys()].sort();
    if (dias.length) {
      const ini = new Date(`${dias[0]}T12:00:00`), fim = new Date(`${dias[dias.length - 1]}T12:00:00`);
      const todos = [];
      for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) todos.push(hojeISO(d));
      dias = todos;
    }
    const corte = dias.length > 60;
    if (corte) dias = dias.slice(-60);
    $("nota-dia").textContent = corte ? "últimos 60 dias do período" : "";
    const itensD = dias.map((d) => ({ k: d, label: dataCurta(d), dica: UI.dataBR(d), v: cD.get(d) || 0 }));
    Graf.linha(canvasDe("dia"), itensD, { sel: cruz && cruz.campo === "dia" ? cruz.valor : null });
    canvasDe("dia")._tabela = { cols: ["Data", "Registros"], linhas: itensD.map((i) => [i.dica, i.v]) };

    // por hora
    const rH = filtrar("hora");
    const cH = contar(rH, (r) => r.hora.slice(0, 2));
    const itensH = Array.from({ length: 24 }, (_, i) => { const k = pad(i); return { k, label: k, dica: `${k}h às ${pad((i + 1) % 24)}h`, v: cH.get(k) || 0 }; });
    Graf.colunas(canvasDe("hora"), itensH, { sel: cruz && cruz.campo === "hora" ? cruz.valor : null, rotuloCat: "Horário" });
    canvasDe("hora")._tabela = { cols: ["Horário", "Registros"], linhas: itensH.map((i) => [i.dica, i.v]) };

    // rosca por pessoa (quem não tem cor própria vira "Outros")
    const itensR = [];
    let outros = 0;
    [...cN.entries()].sort((a, b) => b[1] - a[1]).forEach(([k, v]) => {
      if (corDe.get(k) === Graf.OUTROS) outros += v;
      else itensR.push({ k, label: rotuloDe.get(k), v, cor: corDe.get(k) });
    });
    if (outros) itensR.push({ k: "__outros", label: "Outros", v: outros, cor: Graf.OUTROS });
    Graf.rosca(canvasDe("rosca"), itensR, { sel: cruz && cruz.campo === "nome" ? cruz.valor : null });
    canvasDe("rosca")._tabela = { cols: ["Pessoa", "Registros"], linhas: itensR.map((i) => [i.label, i.v]) };

    // top caixas
    const rC = filtrar("caixa");
    const cC = contar(rC, (r) => r.caixa);
    const itensC = [...cC.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8).map(([k, v]) => ({ k, label: k, v }));
    Graf.barrasH(canvasDe("caixa"), itensC, { sel: cruz && cruz.campo === "caixa" ? cruz.valor : null, rotuloCat: "Caixa" });
    canvasDe("caixa")._tabela = { cols: ["Caixa", "Registros"], linhas: itensC.map((i) => [i.label, i.v]) };
  }

  /* ---------- página "Por pessoa": matriz com barras de dados ---------- */
  let ordMatriz = { col: "total", desc: true };
  function renderPessoas() {
    const rows = filtrar("nome");
    const hoje = hojeISO(), sete = isoMenos(6);
    const por = new Map();
    rows.forEach((r) => {
      let p = por.get(r.key);
      if (!p) { p = { k: r.key, nome: rotuloDe.get(r.key), total: 0, hoje: 0, sete: 0, prots: new Map(), primeiro: "9", ultimo: "" }; por.set(r.key, p); }
      p.total++;
      if (r.dataISO === hoje) p.hoje++;
      if (r.dataISO >= sete) p.sete++;
      p.prots.set(r.protocolo, (p.prots.get(r.protocolo) || 0) + 1);
      const quando = `${r.dataISO} ${r.hora}`;
      if (quando < p.primeiro) p.primeiro = quando;
      if (quando > p.ultimo) p.ultimo = quando;
    });
    const lista = [...por.values()].map((p) => ({ ...p, unicos: p.prots.size, rep: [...p.prots.values()].filter((n) => n > 1).length }));
    const { col, desc } = ordMatriz;
    lista.sort((a, b) => {
      const va = a[col], vb = b[col];
      const c = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "pt-BR");
      return desc ? -c : c;
    });
    const max = Math.max(1, ...lista.map((p) => p.total));
    const quando = (s) => (s && s !== "9" ? `${UI.dataBR(s.slice(0, 10))} ${s.slice(11)}` : "—");
    const cols = [["nome", "Nome"], ["total", "Total"], ["hoje", "Hoje"], ["sete", "Últimos 7 dias"], ["unicos", "Protocolos únicos"], ["rep", "Repetidos"], ["ultimo", "Último registro"]];
    const soma = (c) => lista.reduce((a, p) => a + p[c], 0);
    $("matriz").innerHTML = `
      <thead><tr>${cols.map(([c, t]) => `<th data-col="${c}" class="${col === c && !desc ? "" : col === c ? "desc" : ""}">${t}${col === c ? '<span class="ord">▲</span>' : ""}</th>`).join("")}</tr></thead>
      <tbody>${lista.length ? lista.map((p, i) => `
        <tr data-k="${UI.esc(p.k)}" class="entra" style="animation-delay:${Math.min(i, 12) * 25}ms;${cruz && cruz.campo === "nome" && cruz.valor !== p.k ? "opacity:.45" : ""}">
          <td><span class="bolinha" style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:8px;background:${corDe.get(p.k)}"></span>${UI.esc(p.nome)}</td>
          <td class="num"><span class="barra-dado"><i style="width:${(p.total / max) * 100}%"></i><b>${fmt(p.total)}</b></span></td>
          <td class="num">${fmt(p.hoje)}</td>
          <td class="num">${fmt(p.sete)}</td>
          <td class="num">${fmt(p.unicos)}</td>
          <td class="num">${p.rep ? `<span class="rep">!</span>${fmt(p.rep)}` : "0"}</td>
          <td>${quando(p.ultimo)}</td>
        </tr>`).join("") : '<tr><td colspan="7" class="pb-vazio">Sem dados para os filtros atuais.</td></tr>'}</tbody>
      <tfoot><tr><td>Total</td><td class="num">${fmt(soma("total"))}</td><td class="num">${fmt(soma("hoje"))}</td><td class="num">${fmt(soma("sete"))}</td><td class="num">${fmt(soma("unicos"))}</td><td class="num">${fmt(soma("rep"))}</td><td></td></tr></tfoot>`;

    // colunas empilhadas: últimos 31 dias com registro
    const rE = filtrar("dia");
    let dias = [...new Set(rE.map((r) => r.dataISO))].sort();
    const corte = dias.length > 31;
    if (corte) dias = dias.slice(-31);
    $("nota-emp").textContent = corte ? "últimos 31 dias com registro" : "";
    const chaves = [...new Set(rE.map((r) => r.key))].sort((a, b) => rotuloDe.get(a).localeCompare(rotuloDe.get(b), "pt-BR"));
    const series = [];
    const outros = { k: "__outros", label: "Outros", cor: Graf.OUTROS, vals: dias.map(() => 0) };
    chaves.forEach((k) => {
      const vals = dias.map((d) => rE.filter((r) => r.key === k && r.dataISO === d).length);
      if (corDe.get(k) === Graf.OUTROS) vals.forEach((v, i) => { outros.vals[i] += v; });
      else series.push({ k, label: rotuloDe.get(k), cor: corDe.get(k), vals });
    });
    if (outros.vals.some((v) => v)) series.push(outros);
    Graf.empilhadas(canvasDe("empilhado"), dias.map((d) => ({ k: d, label: dataCurta(d), dica: UI.dataBR(d) })), series,
      { sel: cruz && cruz.campo === "nome" ? cruz.valor : null });
    canvasDe("empilhado")._tabela = { cols: ["Data", ...series.map((s) => s.label)], linhas: dias.map((d, i) => [UI.dataBR(d), ...series.map((s) => s.vals[i])]) };
  }
  $("matriz").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-col]");
    if (th) {
      const c = th.dataset.col;
      ordMatriz = { col: c, desc: ordMatriz.col === c ? !ordMatriz.desc : c !== "nome" };
      return renderPessoas();
    }
    const tr = e.target.closest("tr[data-k]");
    if (tr) alternarCruz("nome", tr.dataset.k);
  });

  /* ---------- página "Detalhes": tabela paginada ---------- */
  let ordDet = { col: "quando", desc: true };
  let paginaDet = 0;
  const POR_PAG = 50;
  function renderDetalhes() {
    const q = $("busca-det").value.trim().toLocaleLowerCase("pt-BR");
    let rows = filtrar();
    if (q) rows = rows.filter((r) => r.protocolo.includes(q) || r.caixa.includes(q) || r.key.includes(q));
    const cont = contar(rows, (r) => r.protocolo);
    const valor = (r, c) => (c === "quando" ? `${r.dataISO} ${r.hora} ${r.criadoEm}` : r[c]);
    rows.sort((a, b) => { const c = String(valor(a, ordDet.col)).localeCompare(String(valor(b, ordDet.col)), "pt-BR", { numeric: true }); return ordDet.desc ? -c : c; });
    const paginas = Math.max(1, Math.ceil(rows.length / POR_PAG));
    paginaDet = Math.min(paginaDet, paginas - 1);
    const fatia = rows.slice(paginaDet * POR_PAG, (paginaDet + 1) * POR_PAG);
    const cols = [["quando", "Data"], ["hora", "Hora"], ["protocolo", "Protocolo"], ["caixa", "Caixa"], ["nome", "Digitado por"]].concat(admin ? [["email", "E-mail"]] : []);
    $("det").innerHTML = `
      <thead><tr>${cols.map(([c, t]) => `<th data-col="${c}" class="${ordDet.col === c && ordDet.desc ? "desc" : ""}">${t}${ordDet.col === c ? '<span class="ord">▲</span>' : ""}</th>`).join("")}</tr></thead>
      <tbody>${fatia.length ? fatia.map((r, i) => `
        <tr class="entra" style="animation-delay:${Math.min(i, 15) * 15}ms">
          <td>${UI.dataBR(r.dataISO)}</td><td>${UI.esc(r.hora)}</td>
          <td>${cont.get(r.protocolo) > 1 ? '<span class="rep" title="Protocolo repetido">!</span>' : ""}${UI.esc(r.protocolo)}</td>
          <td>${UI.esc(r.caixa)}</td>
          <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;background:${corDe.get(r.key)}"></span>${UI.esc(r.nome)}</td>
          ${admin ? `<td style="color:#605e5c">${UI.esc(r.email)}</td>` : ""}
        </tr>`).join("") : `<tr><td colspan="${cols.length}" class="pb-vazio">Nenhum registro encontrado.</td></tr>`}</tbody>`;
    $("det-qtd").textContent = `${fmt(rows.length)} registro(s)`;
    $("pg-info").textContent = `Página ${paginaDet + 1} de ${paginas}`;
    $("pg-ant").disabled = paginaDet === 0;
    $("pg-prox").disabled = paginaDet >= paginas - 1;
  }
  $("det").addEventListener("click", (e) => {
    const th = e.target.closest("th[data-col]");
    if (!th) return;
    const c = th.dataset.col;
    ordDet = { col: c, desc: ordDet.col === c ? !ordDet.desc : c === "quando" };
    renderDetalhes();
  });
  $("busca-det").addEventListener("input", () => { paginaDet = 0; renderDetalhes(); });
  $("pg-ant").addEventListener("click", () => { paginaDet--; renderDetalhes(); });
  $("pg-prox").addEventListener("click", () => { paginaDet++; renderDetalhes(); });

  /* ---------- render geral ---------- */
  function render() {
    const rows = filtrar();
    $("info-filtro").textContent = `${fmt(rows.length)} de ${fmt(ALL.length)} registros${cruz ? " · filtro cruzado ativo (clique de novo para tirar)" : ""}`;
    renderCards(rows);
    if (pagina === "geral") renderGeral();
    if (pagina === "pessoas") renderPessoas();
    if (pagina === "detalhes") renderDetalhes();

    // resumos e estados dos filtros
    const nomesTxt = F.nomes.size === 0 ? "é (Tudo)" : F.nomes.size === 1 ? `é ${rotuloDe.get([...F.nomes][0])}` : `é ${F.nomes.size} selecionados`;
    $("fc-nome-resumo").textContent = nomesTxt;
    $("fc-nome").classList.toggle("ativo", F.nomes.size > 0);
    $("s-nome").classList.toggle("ativo", F.nomes.size > 0);
    const dt = F.d1 || F.d2 ? `${F.d1 ? UI.dataBR(F.d1) : "…"} a ${F.d2 ? UI.dataBR(F.d2) : "…"}` : "(Tudo)";
    $("fc-data-resumo").textContent = dt;
    $("fc-data").classList.toggle("ativo", !!(F.d1 || F.d2));
    $("s-periodo").classList.toggle("ativo", !!(F.d1 || F.d2));
    $("fc-hora-resumo").textContent = F.h1 || F.h2 ? `${F.h1 || "…"} a ${F.h2 || "…"}` : "(Tudo)";
    $("fc-hora").classList.toggle("ativo", !!(F.h1 || F.h2));
    document.querySelectorAll("#chips-periodo .chip").forEach((c) => {
      const [a, b] = PRESETS[c.dataset.p]();
      c.classList.toggle("on", a === F.d1 && b === F.d2);
    });
    const qs = $("f-nome-rapido");
    if (F.nomes.size <= 1) qs.value = F.nomes.size ? [...F.nomes][0] : "";
  }

  /* ---------- cabeçalho de cada visual: foco, tabela, exportar ---------- */
  document.querySelectorAll(".vis[data-vis]").forEach((vis) => {
    const cab = document.createElement("div");
    cab.className = "vis-cab";
    cab.innerHTML = `
      <button type="button" data-a="tabela" title="Mostrar como tabela">${PB.I.tabela}</button>
      <button type="button" data-a="csv" title="Exportar dados deste visual">${PB.I.exportar}</button>
      <button type="button" data-a="foco" title="Modo de foco">${PB.I.foco}</button>`;
    vis.appendChild(cab);
    const cv = vis.querySelector("canvas");
    cab.addEventListener("click", (e) => {
      const b = e.target.closest("button");
      if (!b) return;
      const a = b.dataset.a;
      if (a === "foco") return focar(vis);
      if (a === "csv") {
        const t = cv._tabela;
        if (t) PB.baixarCSV(`${vis.dataset.vis}_${hojeISO()}.csv`, t.cols, t.linhas);
        return;
      }
      if (a === "tabela") {
        let tv = vis.querySelector(".tabela-vis");
        if (tv) { tv.remove(); cv.style.display = ""; b.title = "Mostrar como tabela"; return; }
        const t = cv._tabela || { cols: [], linhas: [] };
        tv = document.createElement("div");
        tv.className = "tabela-vis";
        tv.innerHTML = `<table><thead><tr>${t.cols.map((c, i) => `<th class="${i ? "num" : ""}">${UI.esc(c)}</th>`).join("")}</tr></thead>
          <tbody>${t.linhas.map((l) => `<tr>${l.map((c, i) => `<td class="${i ? "num" : ""}">${UI.esc(typeof c === "number" ? fmt(c) : c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
        cv.style.display = "none";
        vis.insertBefore(tv, cab);
        b.title = "Mostrar como gráfico";
      }
    });
  });

  function focar(vis) {
    const lugar = document.createComment("lugar");
    vis.parentNode.insertBefore(lugar, vis);
    const fundo = document.createElement("div");
    fundo.className = "foco-fundo";
    fundo.innerHTML = `<button type="button" class="pb-acao voltar">← Voltar ao relatório</button>`;
    document.body.appendChild(fundo);
    fundo.appendChild(vis);
    const sair = () => {
      lugar.parentNode.insertBefore(vis, lugar);
      lugar.remove();
      fundo.remove();
      document.removeEventListener("keydown", tecla);
    };
    const tecla = (e) => { if (e.key === "Escape") sair(); };
    fundo.querySelector(".voltar").addEventListener("click", sair);
    document.addEventListener("keydown", tecla);
  }

  /* ---------- dados em tempo real ---------- */
  const consulta = admin ? Sessao.ref("registros") : Sessao.ref("registros").orderByChild("uid").equalTo(user.uid);
  let primeira = true;
  const conhecidos = new Set();
  consulta.on("value", (snap) => {
    const arr = [];
    snap.forEach((c) => {
      const r = c.val() || {};
      const nome = String(r.digitadoPor || "").trim() || "—";
      arr.push({
        id: c.key, protocolo: String(r.protocolo ?? ""), caixa: String(r.caixa ?? ""),
        dataISO: r.dataISO || "", hora: r.hora || "00:00", nome, key: nome.toLocaleLowerCase("pt-BR"),
        email: r.email || "", uid: r.uid || "", criadoEm: Number(r.criadoEm) || 0,
      });
    });
    if (!primeira) {
      const novos = arr.filter((r) => !conhecidos.has(r.id) && r.uid !== user.uid);
      novos.slice(0, 3).forEach((r) => UI.toast(`${r.nome} registrou o protocolo ${r.protocolo}`, "info"));
    }
    arr.forEach((r) => conhecidos.add(r.id));
    ALL = arr;
    colorir();
    montarListaNomes();
    render(!primeira);
    if (primeira) { document.body.classList.remove("carregando-dados"); primeira = false; }
    $("atualizado").textContent = `Atualizado às ${new Date().toLocaleTimeString("pt-BR")}`;
  }, (err) => {
    document.body.classList.remove("carregando-dados");
    UI.toast(Sessao.traduzErro(err), "erro", 8000);
    $("atualizado").textContent = "Erro ao carregar";
  });

})();
