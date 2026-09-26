/* ---------------------------------------------------------
   REGISTRO DE PROTOCOLO / CAIXA — ligado ao usuário logado
   Tudo vai para o Firebase (protocolos/registros) com o nome
   de quem digitou, nº da caixa e nº do protocolo.
   --------------------------------------------------------- */
(async () => {
  const $ = (id) => document.getElementById(id);
  const TS = firebase.database.ServerValue.TIMESTAMP;

  Cena.iniciar($("sky-canvas"));
  Clima.montarWidget($("clima"));
  UI.ativarOndas();

  let sessao;
  try { sessao = await Sessao.exigir(); } catch { return; }
  const { user, perfil } = sessao;
  const nome = perfil.nome;
  const admin = perfil.perfil === "admin";

  /* ---------- cabeçalho, crachá e menu ---------- */
  ["u-avatar", "c-avatar"].forEach((id) => {
    $(id).textContent = UI.iniciais(nome);
    $(id).classList.toggle("admin", admin);
  });
  $("u-nome").textContent = UI.primeiroNome(nome);
  $("m-nome").innerHTML = `${UI.esc(nome)}${admin ? '<span class="tag-perfil">admin</span>' : ""}`;
  $("m-email").textContent = perfil.email || user.email;
  $("c-nome").textContent = nome;
  $("footer-name").textContent = nome;
  $("m-admin").hidden = !admin;

  const caixaUsuario = $("usuario");
  const abrirMenu = (sim) => {
    caixaUsuario.classList.toggle("aberto", sim);
    $("usuario-btn").setAttribute("aria-expanded", String(sim));
  };
  $("usuario-btn").addEventListener("click", (e) => { e.stopPropagation(); abrirMenu(!caixaUsuario.classList.contains("aberto")); });
  document.addEventListener("click", (e) => { if (!caixaUsuario.contains(e.target)) abrirMenu(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") abrirMenu(false); });
  $("sair").addEventListener("click", () => Sessao.sair());

  /* indicador de conexão com o banco */
  Sessao.db.ref(".info/connected").on("value", (s) => {
    const on = s.val() === true;
    $("conexao").classList.toggle("off", !on);
    $("conexao").querySelector("span").textContent = on ? "conectado" : "offline · salva depois";
  });

  /* ---------- dados do usuário (tempo real) ---------- */
  const form = $("entry-form");
  const protocoloInput = $("protocolo");
  const caixaInput = $("caixa");
  const protocoloError = $("protocolo-error");
  const caixaError = $("caixa-error");
  const entryListEl = $("entry-list");
  const emptyStateEl = $("empty-state");
  const countBadge = $("count-badge");

  let meus = [];            // todos os registros deste usuário
  const vistos = new Set(); // ids já desenhados (para animar só os novos)
  let primeiraCarga = true;


  const regsRef = Sessao.ref("registros").orderByChild("uid").equalTo(user.uid);
  regsRef.on("value", (snap) => {
    const arr = [];
    snap.forEach((c) => { arr.push({ id: c.key, ...c.val() }); });
    meus = arr;
    renderEntries();
    primeiraCarga = false;
  }, (err) => UI.toast(Sessao.traduzErro(err), "erro", 6000));

  function doDia() {
    const hoje = UI.hojeISO();
    return meus
      .filter((r) => r.dataISO === hoje)
      .sort((a, b) => (Number(a.criadoEm) || 0) - (Number(b.criadoEm) || 0));
  }

  function renderEntries() {
    const lista = doDia();
    entryListEl.innerHTML = "";
    if (!lista.length) {
      entryListEl.appendChild(emptyStateEl);
    } else {
      const cont = new Map();
      lista.forEach((e) => cont.set(e.protocolo, (cont.get(e.protocolo) || 0) + 1));
      [...lista].reverse().forEach((entry) => {
        const dup = cont.get(entry.protocolo) > 1;
        const li = document.createElement("li");
        li.className = `entry-row ${dup ? "duplicate" : "valid"}${!primeiraCarga && !vistos.has(entry.id) ? " novo" : ""}`;
        li.innerHTML = `
          <span class="status" title="${dup ? "Protocolo repetido hoje" : "Registrado"}">${dup ? "!" : "✓"}</span>
          <span class="data">
            <span>Protocolo: ${UI.esc(entry.protocolo)}</span>
            <small>Caixa: ${UI.esc(entry.caixa)}</small>
          </span>
          <span class="meta-right">
            <span class="time">${UI.esc(entry.hora)}</span>
            <span class="who">${UI.esc(entry.digitadoPor || "—")}</span>
          </span>`;
        entryListEl.appendChild(li);
        vistos.add(entry.id);
      });
    }
    const n = lista.length;
    const novoTxt = `${n} ${n === 1 ? "impresso" : "impressos"}`;
    if (countBadge.textContent !== novoTxt) {
      countBadge.textContent = novoTxt;
      countBadge.classList.remove("pulo"); void countBadge.offsetWidth; countBadge.classList.add("pulo");
    }
  }

  /* ---------- busca (nos meus registros de qualquer dia) ---------- */
  const searchInput = $("search-input");
  const searchResultEl = $("search-result");
  function searchProtocolo(value) {
    const query = value.trim();
    if (!query) { searchResultEl.textContent = ""; searchResultEl.className = "search-result"; return; }
    const matches = meus.filter((e) => e.protocolo === query)
      .sort((a, b) => `${a.dataISO} ${a.hora}`.localeCompare(`${b.dataISO} ${b.hora}`));
    if (!matches.length) {
      searchResultEl.textContent = `Protocolo ${query} não encontrado nos seus registros.`;
      searchResultEl.className = "search-result not-found";
      return;
    }
    const text = matches.map((m) => `registrado em ${UI.dataBR(m.dataISO)} às ${m.hora} (caixa ${m.caixa})`).join(" · ");
    searchResultEl.textContent = `Protocolo ${query}: ${text}`;
    searchResultEl.className = "search-result found";
  }
  $("search-btn").addEventListener("click", () => searchProtocolo(searchInput.value));
  searchInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); searchProtocolo(searchInput.value); }
  });

  /* ---------- impressão ---------- */
  const printPage = $("print-page");
  function fitPrintValue(el, maxStartPx = 190, minPx = 32, step = 4) {
    const maxWidth = printPage.clientWidth - 28;
    let size = maxStartPx;
    el.style.fontSize = size + "px";
    while (el.scrollWidth > maxWidth && size > minPx) { size -= step; el.style.fontSize = size + "px"; }
  }
  function buildPrintArea(protocolo, caixa, hora, data, digitadoPor) {
    $("print-hora").textContent = `Hora: ${hora}`;
    $("print-data").textContent = `Data: ${data}`;
    $("print-protocolo-value").textContent = protocolo;
    $("print-caixa-value").textContent = caixa;
    $("print-footer").textContent = `Digitado por ${digitadoPor}`;
    fitPrintValue($("print-protocolo-value"));
    fitPrintValue($("print-caixa-value"));
  }

  /* ---------- enviar ---------- */
  function marcar(input, errEl, msg) {
    errEl.textContent = msg;
    input.classList.remove("invalid"); void input.offsetWidth; input.classList.add("invalid");
  }
  /* Nº Protocolo, Nº Caixa e busca aceitam só números */
  document.querySelectorAll(".so-numero").forEach((inp) => {
    inp.addEventListener("input", () => {
      const limpo = inp.value.replace(/\D+/g, "");
      if (limpo !== inp.value) {
        const pos = inp.selectionStart - (inp.value.length - limpo.length);
        inp.value = limpo;
        try { inp.setSelectionRange(pos, pos); } catch {}
      }
    });
    inp.addEventListener("keydown", (e) => {
      if (e.key.length === 1 && !/\d/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
    });
  });
  [protocoloInput, caixaInput].forEach((i) => i.addEventListener("input", () => {
    i.classList.remove("invalid");
    (i === protocoloInput ? protocoloError : caixaError).textContent = "";
  }));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const protocolo = protocoloInput.value.trim();
    const caixa = caixaInput.value.trim();
    protocoloError.textContent = ""; caixaError.textContent = "";
    let ok = true;
    if (!protocolo) { marcar(protocoloInput, protocoloError, "Informe o número do protocolo."); ok = false; }
    if (!caixa) { marcar(caixaInput, caixaError, "Informe o número da caixa."); ok = false; }
    if (!ok) return;

    const now = new Date();
    const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    const data = now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

    const antes = meus.find((r) => r.protocolo === protocolo);
    if (antes) UI.toast(`Atenção: o protocolo ${protocolo} já foi registrado em ${UI.dataBR(antes.dataISO)} às ${antes.hora}.`, "alerta", 6000);

    buildPrintArea(protocolo, caixa, hora, data, nome);

    Sessao.ref("registros").push({
      protocolo, caixa, hora, data,
      dataISO: UI.hojeISO(now),
      digitadoPor: nome,
      uid: user.uid,
      email: user.email,
      criadoEm: TS,
    }).catch((err) => UI.toast(`Não salvou no banco: ${Sessao.traduzErro(err)}`, "erro", 8000));

    const prancheta = $("prancheta");
    prancheta.classList.remove("estalo"); void prancheta.offsetWidth; prancheta.classList.add("estalo");

    protocoloInput.value = "";
    caixaInput.value = "";
    protocoloInput.focus();

    setTimeout(() => window.print(), 60);
  });

  /* ---------- bicho-guia ---------- */
  const fieldHelper = $("field-helper");
  const FIELD_HELP = {
    busca: { emoji: "🐢", text: "Digite um número de protocolo para consultar os seus registros." },
  };
  function positionFieldHelper(inputEl) {
    const rect = inputEl.getBoundingClientRect();
    let left = rect.left, top = rect.top - 92;
    if (top < 70) top = rect.bottom + 14;
    left = Math.max(10, Math.min(left, window.innerWidth - 270));
    fieldHelper.style.left = `${left}px`;
    fieldHelper.style.top = `${top}px`;
  }
  [[searchInput, "busca"]].forEach(([el, key]) => {
    el.addEventListener("focus", () => {
      $("helper-emoji").textContent = FIELD_HELP[key].emoji;
      $("helper-bubble").textContent = FIELD_HELP[key].text;
      positionFieldHelper(el);
      fieldHelper.classList.add("visible");
    });
    el.addEventListener("blur", () => fieldHelper.classList.remove("visible"));
  });
  window.addEventListener("resize", () => fieldHelper.classList.remove("visible"));
  window.addEventListener("scroll", () => fieldHelper.classList.remove("visible"), true);

  // vira o dia com a página aberta: a lista de "hoje" se atualiza sozinha
  let diaAtual = UI.hojeISO();
  setInterval(() => { if (UI.hojeISO() !== diaAtual) { diaAtual = UI.hojeISO(); renderEntries(); } }, 60 * 1000);

  protocoloInput.focus({ preventScroll: true });
})();
