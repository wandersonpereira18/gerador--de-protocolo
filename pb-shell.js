/* ---------------------------------------------------------
   Moldura estilo Power BI: cabeçalho escuro, trilho lateral,
   conta do usuário e clima no canto. Usada no dashboard e no admin.
   --------------------------------------------------------- */
const PB = (() => {
  const I = {
    waffle: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="2" cy="2" r="1.4"/><circle cx="8" cy="2" r="1.4"/><circle cx="14" cy="2" r="1.4"/><circle cx="2" cy="8" r="1.4"/><circle cx="8" cy="8" r="1.4"/><circle cx="14" cy="8" r="1.4"/><circle cx="2" cy="14" r="1.4"/><circle cx="8" cy="14" r="1.4"/><circle cx="14" cy="14" r="1.4"/></svg>',
    registro: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM8.5 11h7M8.5 15h5"/></svg>',
    relatorio: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M5 20V11M10 20V5M15 20v-7M20 20V8"/></svg>',
    admin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M3 20c.8-3.6 3.2-5.5 6-5.5s5.2 1.9 6 5.5"/><path d="M17 11.5l1 1.8 2 .3-1.5 1.4.4 2-1.9-1-1.9 1 .4-2-1.5-1.4 2-.3z"/></svg>',
    sair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 16l-4-4 4-4M6 12h10"/></svg>',
    exportar: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v8M5 7l3 3 3-3M3 12v1.5h10V12"/></svg>',
    atualizar: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M13 8a5 5 0 1 1-1.5-3.6M13 2.5V5h-2.5"/></svg>',
    borracha: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M9.5 2.5l4 4-6 6H4l-1.5-1.5a1 1 0 0 1 0-1.4z"/><path d="M6 6l4 4M7.5 12.5H14"/></svg>',
    funil: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M2 3h12l-4.5 5.5V13l-3-1.5v-3z"/></svg>',
    foco: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4"/></svg>',
    mais: '<svg viewBox="0 0 16 16" fill="currentColor"><circle cx="3" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="13" cy="8" r="1.2"/></svg>',
    tabela: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="2" y="3" width="12" height="10" rx="1"/><path d="M2 6.5h12M2 10h12M6 3v10"/></svg>',
    seta: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
    dupla: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 4l4 4-4 4M3 4l4 4-4 4"/></svg>',
    check: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7"/></svg>',
    lupa: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></svg>',
    mais1: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>',
    lapis: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><path d="M10.5 2.5l3 3L6 13H3v-3z"/></svg>',
    lixo: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.6 9h5.8l.6-9"/></svg>',
    olho: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M1.5 8S4 3.5 8 3.5 14.5 8 14.5 8 12 12.5 8 12.5 1.5 8 1.5 8z"/><circle cx="8" cy="8" r="2"/></svg>',
    email: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"><rect x="2" y="3.5" width="12" height="9" rx="1"/><path d="M2.5 4.5L8 9l5.5-4.5"/></svg>',
    importar: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><path d="M8 10V2M5 5l3-3 3 3M3 12v1.5h10V12"/></svg>',
  };

  function montar({ perfil, user, pagina, migalha }) {
    const admin = perfil.perfil === "admin";
    const cab = document.createElement("header");
    cab.className = "pb-cab";
    cab.innerHTML = `
      <button class="pb-waffle" type="button" title="Voltar ao registro" onclick="location.href='registro.html'">${I.waffle}</button>
      <span class="pb-app">Protocolos</span>
      <span class="pb-migalha">${migalha}</span>
      <div class="pb-cab-dir">
        <span class="pb-vivo" id="pb-vivo" title="Os dados atualizam sozinhos quando alguém registra"><i></i><span>Ao vivo</span></span>
        <span class="pb-clima" id="pb-clima" title="Clima em Taguatinga"></span>
        <div class="pb-conta" id="pb-conta">
          <button type="button" class="pb-avatar ${admin ? "admin" : ""}" id="pb-avatar" aria-haspopup="true">${UI.esc(UI.iniciais(perfil.nome))}</button>
          <div class="pb-conta-menu">
            <div class="quem"><strong>${UI.esc(perfil.nome)}</strong><span>${UI.esc(perfil.email || user.email)} · ${admin ? "Administrador" : "Usuário"}</span></div>
            <a href="registro.html">Registrar protocolos</a>
            <a href="dashboard.html">Dashboard</a>
            ${admin ? '<a href="admin.html">Administração</a>' : ""}
            <button type="button" data-sair>Sair</button>
          </div>
        </div>
      </div>`;
    const rail = document.createElement("nav");
    rail.className = "pb-rail";
    rail.setAttribute("aria-label", "Navegação");
    rail.innerHTML = `
      <a href="registro.html" data-dica="Registrar protocolos" aria-label="Registrar protocolos">${I.registro}</a>
      <a href="dashboard.html" data-dica="Dashboard" aria-label="Dashboard" class="${pagina === "dashboard" ? "ativo" : ""}">${I.relatorio}</a>
      ${admin ? `<a href="admin.html" data-dica="Administração" aria-label="Administração" class="${pagina === "admin" ? "ativo" : ""}">${I.admin}</a>` : ""}
      <button type="button" class="base" data-sair data-dica="Sair" aria-label="Sair">${I.sair}</button>`;
    document.body.prepend(rail);
    document.body.prepend(cab);

    const conta = cab.querySelector("#pb-conta");
    cab.querySelector("#pb-avatar").addEventListener("click", (e) => { e.stopPropagation(); conta.classList.toggle("aberto"); });
    document.addEventListener("click", (e) => { if (!conta.contains(e.target)) conta.classList.remove("aberto"); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") conta.classList.remove("aberto"); });
    document.querySelectorAll("[data-sair]").forEach((b) => b.addEventListener("click", () => Sessao.sair()));

    // clima pequeno no cabeçalho
    Clima.iniciar();
    const cl = cab.querySelector("#pb-clima");
    Clima.aoMudar((e) => {
      cl.innerHTML = `${Clima.icone(e.cond, !Clima.sol().diurno)}<span class="txt">Taguatinga ${e.temp != null ? e.temp + "°" : "--°"} · ${UI.esc(Clima.rotulo(e))}</span>`;
    });

    // conexão com o banco
    Sessao.db.ref(".info/connected").on("value", (s) => {
      const on = s.val() === true;
      const v = cab.querySelector("#pb-vivo");
      v.classList.toggle("off", !on);
      v.querySelector("span").textContent = on ? "Ao vivo" : "Reconectando…";
    });
    UI.ativarOndas();
  }

  /* Dica flutuante (tooltip) */
  let dica;
  function mostrarDica(html, x, y) {
    if (!dica) { dica = document.createElement("div"); dica.className = "pb-dica"; document.body.appendChild(dica); }
    dica.innerHTML = html;
    dica.classList.add("on");
    const w = dica.offsetWidth, h = dica.offsetHeight;
    let px = x + 14, py = y + 14;
    if (px + w > innerWidth - 8) px = x - w - 14;
    if (py + h > innerHeight - 8) py = y - h - 14;
    dica.style.left = `${Math.max(8, px)}px`;
    dica.style.top = `${Math.max(8, py)}px`;
  }
  function esconderDica() { if (dica) dica.classList.remove("on"); }

  /* CSV com ; para o Excel brasileiro */
  function baixarCSV(nome, cabecalho, linhas) {
    const cel = (v) => {
      let s = String(v ?? "");
      if (/^[=+\-@]/.test(s)) s = "'" + s;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const txt = [cabecalho.map(cel).join(";")].concat(linhas.map((l) => l.map(cel).join(";"))).join("\r\n");
    const blob = new Blob(["﻿" + txt], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = nome;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* Troca os marcadores ${I.nome} escritos no HTML pelos ícones SVG */
  function icones(root = document.body) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nos = [];
    while (walker.nextNode()) if (walker.currentNode.nodeValue.includes("${I.")) nos.push(walker.currentNode);
    nos.forEach((n) => {
      const tmp = document.createElement("span");
      tmp.innerHTML = UI.esc(n.nodeValue).replace(/\$\{I\.(\w+)\}/g, (_, k) => I[k] || "");
      n.replaceWith(...tmp.childNodes);
    });
  }

  return { I, montar, icones, mostrarDica, esconderDica, baixarCSV };
})();
