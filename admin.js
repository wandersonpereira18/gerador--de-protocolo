/* ---------------------------------------------------------
   ADMINISTRAÇÃO — usuários (login/senha/perfil) e registros
   Contas são criadas/alteradas/excluídas por um app Firebase
   paralelo, para o admin não perder a própria sessão.
   --------------------------------------------------------- */
(async () => {
  const $ = (id) => document.getElementById(id);
  PB.icones();

  let sessao;
  try { sessao = await Sessao.exigir({ admin: true }); } catch { return; }
  const { user, perfil } = sessao;
  PB.montar({ perfil, user, pagina: "admin", migalha: `Configurações &nbsp;›&nbsp; <b>Administração</b>` });

  const TS = firebase.database.ServerValue.TIMESTAMP;
  const fmt = (n) => Number(n).toLocaleString("pt-BR");
  const esc = UI.esc;
  let USU = [];  // perfis
  let REG = [];  // registros
  let carregou = { u: false, r: false };
  let senhasVisiveis = false;
  let aba = "usuarios";
  let indexado = false;

  function pronto() {
    if (carregou.u && carregou.r) document.body.classList.remove("carregando-dados");
    $("resumo").textContent = `${fmt(USU.length)} usuário(s) · ${fmt(REG.length)} registro(s)`;
  }

  /* ---------- abas ---------- */
  $("abas").addEventListener("click", (e) => {
    const b = e.target.closest("[data-ir]");
    if (!b) return;
    aba = b.dataset.ir;
    $("abas").querySelectorAll("[data-ir]").forEach((x) => x.classList.toggle("ativo", x === b));
    document.querySelectorAll(".pb-pagina").forEach((p) => { p.hidden = p.dataset.pagina !== aba; });
  });

  /* ---------- modal genérico ---------- */
  function modal({ titulo, sub = "", corpo = "", botoes = [] }) {
    const m = document.createElement("div");
    m.className = "pb-modal";
    m.innerHTML = `<div class="pb-modal-caixa" role="dialog" aria-modal="true">
      <h3>${esc(titulo)}</h3>${sub ? `<p class="sub">${sub}</p>` : ""}
      <div class="pb-form">${corpo}<div class="pb-erro" data-erro></div></div>
      <div class="rodape">${botoes.map((b, i) => `<button type="button" class="pb-btn ${b.cls || ""}" data-i="${i}">${esc(b.txt)}</button>`).join("")}</div>
    </div>`;
    document.body.appendChild(m);
    const fechar = () => { m.classList.add("saindo"); setTimeout(() => m.remove(), 200); document.removeEventListener("keydown", tecla); };
    const tecla = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", tecla);
    m.addEventListener("mousedown", (e) => { if (e.target === m) fechar(); });
    const api = {
      el: m, fechar,
      q: (s) => m.querySelector(s),
      erro: (t) => { m.querySelector("[data-erro]").textContent = t; },
      ocupado: (sim) => m.querySelectorAll(".rodape button").forEach((b) => { b.disabled = sim; }),
    };
    m.querySelectorAll(".rodape button").forEach((b) => b.addEventListener("click", () => botoes[b.dataset.i].acao(api)));
    m.querySelectorAll("[data-olho]").forEach((b) => b.addEventListener("click", () => {
      const i = b.previousElementSibling; i.type = i.type === "password" ? "text" : "password";
    }));
    setTimeout(() => { const f = m.querySelector("input:not([disabled]), select"); if (f) f.focus(); }, 60);
    return api;
  }
  const confirmar = (titulo, texto, rotulo = "Excluir") => new Promise((ok) => {
    modal({
      titulo, sub: texto,
      botoes: [
        { txt: "Cancelar", acao: (m) => { m.fechar(); ok(false); } },
        { txt: rotulo, cls: "perigo", acao: (m) => { m.fechar(); ok(true); } },
      ],
    });
  });

  /* Executa algo logado como outro usuário, sem derrubar a sessão do admin */
  async function comoUsuario(email, senha, fn) {
    const sec = Sessao.appSecundario().auth();
    const cred = await sec.signInWithEmailAndPassword(email, senha);
    try { return await fn(cred.user); } finally { await sec.signOut().catch(() => {}); }
  }

  /* =========================================================
     USUÁRIOS
     ========================================================= */
  function renderUsuarios() {
    const q = $("busca-u").value.trim().toLocaleLowerCase("pt-BR");
    const cont = new Map();
    REG.forEach((r) => cont.set(r.uid, (cont.get(r.uid) || 0) + 1));
    const lista = USU.filter((u) => !q || `${u.nome} ${u.email} ${u.numero || ""}`.toLocaleLowerCase("pt-BR").includes(q));
    const quando = (t) => (t ? new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—");
    $("qtd-u").textContent = `${lista.length} de ${USU.length}`;
    $("t-usuarios").innerHTML = `
      <thead><tr><th>Nome</th><th>Número</th><th>Login (e-mail)</th><th>Senha</th><th>Perfil</th><th>Ativo</th><th class="num">Registros</th><th>Último acesso</th><th></th></tr></thead>
      <tbody>${lista.length ? lista.map((u, i) => {
        const eu = u.uid === user.uid;
        const adm = u.perfil === "admin";
        return `<tr data-uid="${esc(u.uid)}" class="entra" style="animation-delay:${Math.min(i, 12) * 25}ms">
          <td><span class="pessoa"><span class="ini ${adm ? "admin" : ""}">${esc(UI.iniciais(u.nome))}</span><span>${esc(u.nome)}${eu ? "<small>você</small>" : ""}</span></span></td>
          <td>${u.numero ? esc(u.numero) : '<span style="color:#8a8886">—</span>'}</td>
          <td>${esc(u.email)}</td>
          <td><span class="senha-cel"><span class="txt">${u.senha ? (senhasVisiveis ? esc(u.senha) : "••••••••") : '<span style="color:#8a8886">—</span>'}</span>${u.senha ? `<button type="button" data-a="ver" title="Mostrar/ocultar">${PB.I.olho}</button>` : ""}</span></td>
          <td><span class="selo ${adm ? "admin" : ""}">${adm ? "Administrador" : "Usuário"}</span></td>
          <td><button type="button" class="chave ${u.ativo !== false ? "on" : ""}" data-a="ativo" ${eu ? "disabled title='Você não pode se desativar'" : ""} aria-label="Ativo"></button></td>
          <td class="num">${fmt(cont.get(u.uid) || 0)}</td>
          <td>${quando(u.ultimoAcesso)}</td>
          <td><span class="acoes">
            <button type="button" data-a="editar" title="Editar">${PB.I.lapis}</button>
            <button type="button" data-a="email" title="Enviar e-mail de recuperação de senha">${PB.I.email}</button>
            <button type="button" class="del" data-a="excluir" title="Excluir" ${eu ? "disabled" : ""}>${PB.I.lixo}</button>
          </span></td>
        </tr>`;
      }).join("") : '<tr><td colspan="9" class="pb-vazio">Nenhum usuário encontrado.</td></tr>'}</tbody>`;
  }
  $("busca-u").addEventListener("input", renderUsuarios);
  $("mostrar-senhas").addEventListener("click", (e) => {
    senhasVisiveis = !senhasVisiveis;
    e.currentTarget.textContent = senhasVisiveis ? "Ocultar senhas" : "Mostrar senhas";
    renderUsuarios();
  });

  $("t-usuarios").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-a]");
    if (!b || b.disabled) return;
    const tr = b.closest("tr");
    const u = USU.find((x) => x.uid === tr.dataset.uid);
    if (!u) return;
    const a = b.dataset.a;
    if (a === "ver") {
      const t = tr.querySelector(".senha-cel .txt");
      t.textContent = t.textContent.startsWith("•") ? u.senha : "••••••••";
    } else if (a === "ativo") {
      const novo = u.ativo === false;
      b.classList.toggle("on", novo);
      try {
        await Sessao.ref(`usuarios/${u.uid}`).update({ ativo: novo });
        UI.toast(`${u.nome} ${novo ? "pode entrar de novo" : "foi desativado(a)"}.`, "ok");
      } catch (err) { b.classList.toggle("on", !novo); UI.toast(Sessao.traduzErro(err), "erro"); }
    } else if (a === "editar") {
      formUsuario(u);
    } else if (a === "email") {
      try {
        await Sessao.auth.sendPasswordResetEmail(u.email);
        UI.toast(`E-mail de recuperação enviado para ${u.email}.`, "ok");
      } catch (err) { UI.toast(Sessao.traduzErro(err), "erro"); }
    } else if (a === "excluir") {
      excluirUsuario(u, tr);
    }
  });

  function formUsuario(u) {
    const novo = !u;
    const eu = u && u.uid === user.uid;
    const m = modal({
      titulo: novo ? "Novo usuário" : `Editar ${u.nome}`,
      sub: novo ? "A pessoa já vai poder entrar com este e-mail e senha." : "Altere o que precisar. Os registros antigos continuam ligados a esta pessoa.",
      corpo: `
        <div class="pb-campo"><label for="m-nome">Nome</label><input class="pb-input" id="m-nome" maxlength="80" value="${esc(u ? u.nome : "")}"></div>
        <div class="pb-campo"><label for="m-numero">Número (também serve para entrar)</label><input class="pb-input" id="m-numero" inputmode="numeric" maxlength="15" value="${esc(u ? u.numero || "" : "")}"></div>
        <div class="pb-campo"><label for="m-email">Login (e-mail)</label><input class="pb-input" id="m-email" type="email" value="${esc(u ? u.email : "")}"></div>
        <div class="pb-campo"><label for="m-senha">Senha</label>
          <div class="com-olho"><input class="pb-input" id="m-senha" type="text" value="${esc(u ? u.senha || "" : "")}" placeholder="mínimo 6 caracteres"><button type="button" data-olho title="Mostrar/ocultar">${PB.I.olho}</button></div>
          ${u && !u.senha ? "<small>Senha atual desconhecida (a pessoa ainda não entrou depois da mudança). Para trocar, use o e-mail de recuperação.</small>" : ""}
        </div>
        <div class="linha2">
          <div class="pb-campo"><label for="m-perfil">Perfil</label>
            <select class="pb-select" id="m-perfil" ${eu ? "disabled" : ""}>
              <option value="usuario" ${!u || u.perfil !== "admin" ? "selected" : ""}>Usuário</option>
              <option value="admin" ${u && u.perfil === "admin" ? "selected" : ""}>Administrador</option>
            </select></div>
          <div class="pb-campo"><label>Acesso</label><label class="pb-check"><input type="checkbox" id="m-ativo" ${!u || u.ativo !== false ? "checked" : ""} ${eu ? "disabled" : ""}> Pode entrar no sistema</label></div>
        </div>
        ${novo ? "" : '<label class="pb-check"><input type="checkbox" id="m-renomear" checked> Atualizar o nome também nos registros já digitados</label>'}`,
      botoes: [
        { txt: "Cancelar", acao: (mm) => mm.fechar() },
        { txt: novo ? "Criar usuário" : "Salvar", cls: "prim", acao: (mm) => salvar(mm) },
      ],
    });

    async function salvar(mm) {
      const nome = mm.q("#m-nome").value.trim().replace(/\s+/g, " ");
      const email = mm.q("#m-email").value.trim();
      const numero = mm.q("#m-numero").value.replace(/\D+/g, "");
      const senha = mm.q("#m-senha").value;
      const perfilSel = mm.q("#m-perfil").value;
      const ativo = mm.q("#m-ativo").checked;
      if (nome.length < 2) return mm.erro("Digite o nome.");
      if (/^\d+$/.test(nome)) return mm.erro("O nome não pode ser só números.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return mm.erro("Digite um e-mail válido.");
      if (novo && !numero) return mm.erro("Digite o número da pessoa (só números).");
      // nunca permite nome, número ou e-mail repetidos
      const outros = USU.filter((x) => !u || x.uid !== u.uid);
      if (outros.some((x) => Sessao.normNome(x.nome) === Sessao.normNome(nome))) return mm.erro("Já existe um usuário com esse nome.");
      if (numero && outros.some((x) => String(x.numero || "") === numero)) return mm.erro("Esse número já é de outro usuário.");
      if (outros.some((x) => String(x.email).toLowerCase() === email.toLowerCase())) return mm.erro("Esse e-mail já é de outro usuário.");
      const [nLivre, mLivre] = await Promise.all([Sessao.disponivel("nome", nome, u ? u.email : email), numero ? Sessao.disponivel("numero", numero, u ? u.email : email) : true]);
      if (!nLivre) return mm.erro("Já existe uma conta com esse nome.");
      if (!mLivre) return mm.erro("Esse número já está em uso.");
      if ((novo || senha !== (u.senha || "")) && senha.length < 6) return mm.erro("A senha precisa ter pelo menos 6 caracteres.");
      mm.erro(""); mm.ocupado(true);
      try {
        if (novo) {
          const sec = Sessao.appSecundario().auth();
          const cred = await sec.createUserWithEmailAndPassword(email, senha);
          await cred.user.updateProfile({ displayName: nome }).catch(() => {});
          await sec.signOut().catch(() => {});
          await Sessao.ref(`usuarios/${cred.user.uid}`).set({ nome, email: cred.user.email || email, numero, senha, perfil: perfilSel, ativo, criadoEm: TS, criadoPor: perfil.nome });
          await Sessao.indexar({ nome, numero, email: cred.user.email || email });
          UI.toast(`${nome} foi cadastrado(a).`, "ok");
        } else {
          const mudouSenha = senha !== (u.senha || "") && senha;
          const mudouEmail = email.toLowerCase() !== String(u.email).toLowerCase();
          if (mudouSenha || mudouEmail) {
            const aplicar = async (conta) => {
              if (mudouEmail) await conta.updateEmail(email);
              if (mudouSenha) await conta.updatePassword(senha);
            };
            if (eu) await aplicar(Sessao.auth.currentUser);
            else if (u.senha) await comoUsuario(u.email, u.senha, aplicar);
            else throw { message: "Não dá para trocar a senha/e-mail sem a senha atual. Use o botão de e-mail de recuperação." };
          }
          const upd = { nome, email, senha: mudouSenha ? senha : (u.senha || "") };
          if (numero) upd.numero = numero; else upd.numero = null;
          if (!eu) { upd.perfil = perfilSel; upd.ativo = ativo; }
          await Sessao.ref(`usuarios/${u.uid}`).update(upd);
          if (mudouEmail) await Sessao.desindexar(u);
          await Sessao.indexar({ nome, numero, email }, mudouEmail ? {} : u);
          if (nome !== u.nome && mm.q("#m-renomear") && mm.q("#m-renomear").checked) {
            const multi = {};
            REG.filter((r) => r.uid === u.uid).forEach((r) => { multi[`registros/${r.id}/digitadoPor`] = nome; });
            if (Object.keys(multi).length) await Sessao.ref().update(multi);
          }
          UI.toast("Alterações salvas.", "ok");
        }
        mm.fechar();
      } catch (err) {
        mm.ocupado(false);
        const msg = err.code === "auth/wrong-password" || err.code === "auth/invalid-credential" || err.code === "auth/invalid-login-credentials"
          ? "A senha guardada não confere mais (a pessoa trocou pelo e-mail de recuperação). Peça para ela entrar uma vez ou envie o e-mail de recuperação."
          : Sessao.traduzErro(err);
        mm.erro(msg);
      }
    }
  }
  $("bt-novo-usuario").addEventListener("click", () => formUsuario(null));
  $("bt-novo-usuario-2").addEventListener("click", () => formUsuario(null));

  async function excluirUsuario(u, tr) {
    const ok = await confirmar(`Excluir ${u.nome}?`, `A conta <b>${esc(u.email)}</b> deixa de existir e não entra mais. Os registros que essa pessoa digitou <b>continuam</b> no banco e no dashboard.`);
    if (!ok) return;
    try {
      let apagouConta = false;
      if (u.senha) {
        try { await comoUsuario(u.email, u.senha, (conta) => conta.delete()); apagouConta = true; } catch (e) { console.warn(e); }
      }
      tr.classList.add("saindo");
      await Sessao.desindexar(u);
      if (apagouConta) await Sessao.ref(`usuarios/${u.uid}`).remove();
      else await Sessao.ref(`usuarios/${u.uid}`).update({ ativo: false, excluido: true });
      UI.toast(apagouConta ? `${u.nome} foi excluído(a).` : `${u.nome} foi removido(a) e bloqueado(a).`, "ok");
    } catch (err) {
      tr.classList.remove("saindo");
      UI.toast(Sessao.traduzErro(err), "erro");
    }
  }

  /* =========================================================
     REGISTROS
     ========================================================= */
  let pag = 0;
  const POR = 60;
  function montarFiltroNomes() {
    const sel = $("filtro-r-nome");
    const atual = sel.value;
    const nomes = [...new Set(REG.map((r) => r.digitadoPor).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    sel.innerHTML = '<option value="">Todas as pessoas</option>' + nomes.map((n) => `<option>${esc(n)}</option>`).join("");
    sel.value = nomes.includes(atual) ? atual : "";
  }
  function filtrados() {
    const q = $("busca-r").value.trim().toLocaleLowerCase("pt-BR");
    const n = $("filtro-r-nome").value;
    const d = $("filtro-r-data").value;
    return REG.filter((r) =>
      (!n || r.digitadoPor === n) && (!d || r.dataISO === d) &&
      (!q || `${r.protocolo} ${r.caixa} ${r.digitadoPor}`.toLocaleLowerCase("pt-BR").includes(q)))
      .sort((a, b) => `${b.dataISO} ${b.hora} ${b.criadoEm || ""}`.localeCompare(`${a.dataISO} ${a.hora} ${a.criadoEm || ""}`));
  }
  function renderRegistros() {
    montarFiltroNomes();
    const lista = filtrados();
    const paginas = Math.max(1, Math.ceil(lista.length / POR));
    pag = Math.min(pag, paginas - 1);
    const fatia = lista.slice(pag * POR, (pag + 1) * POR);
    $("qtd-r").textContent = `${fmt(lista.length)} de ${fmt(REG.length)}`;
    $("t-registros").innerHTML = `
      <thead><tr><th>Data</th><th>Hora</th><th>Protocolo</th><th>Caixa</th><th>Digitado por</th><th>Login</th><th></th></tr></thead>
      <tbody>${fatia.length ? fatia.map((r, i) => `
        <tr data-id="${esc(r.id)}" class="entra" style="animation-delay:${Math.min(i, 15) * 12}ms">
          <td>${r.dataISO ? UI.dataBR(r.dataISO) : "—"}</td><td>${esc(r.hora)}</td>
          <td>${esc(r.protocolo)}</td><td>${esc(r.caixa)}</td>
          <td>${esc(r.digitadoPor || "—")}</td><td style="color:#605e5c">${esc(r.email || (r.uid === "legado" ? "importado" : ""))}</td>
          <td><span class="acoes">
            <button type="button" data-a="editar" title="Editar">${PB.I.lapis}</button>
            <button type="button" class="del" data-a="excluir" title="Excluir">${PB.I.lixo}</button>
          </span></td>
        </tr>`).join("") : '<tr><td colspan="7" class="pb-vazio">Nenhum registro encontrado.</td></tr>'}</tbody>`;
    $("r-info").textContent = `Página ${pag + 1} de ${paginas}`;
    $("r-ant").disabled = pag === 0;
    $("r-prox").disabled = pag >= paginas - 1;
  }
  ["busca-r", "filtro-r-nome", "filtro-r-data"].forEach((id) => $(id).addEventListener("input", () => { pag = 0; renderRegistros(); }));
  $("r-ant").addEventListener("click", () => { pag--; renderRegistros(); });
  $("r-prox").addEventListener("click", () => { pag++; renderRegistros(); });

  $("t-registros").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-a]");
    if (!b) return;
    const tr = b.closest("tr");
    const r = REG.find((x) => x.id === tr.dataset.id);
    if (!r) return;
    if (b.dataset.a === "editar") return formRegistro(r);
    const ok = await confirmar("Excluir registro?", `Protocolo <b>${esc(r.protocolo)}</b>, caixa <b>${esc(r.caixa)}</b>, digitado por ${esc(r.digitadoPor)} em ${r.dataISO ? UI.dataBR(r.dataISO) : "—"} às ${esc(r.hora)}.`);
    if (!ok) return;
    tr.classList.add("saindo");
    Sessao.ref(`registros/${r.id}`).remove()
      .then(() => UI.toast("Registro excluído.", "ok"))
      .catch((err) => { tr.classList.remove("saindo"); UI.toast(Sessao.traduzErro(err), "erro"); });
  });

  function formRegistro(r) {
    const novo = !r;
    const agora = new Date();
    const opcoes = USU.map((u) => `<option value="${esc(u.uid)}" ${r && r.uid === u.uid ? "selected" : ""}>${esc(u.nome)}</option>`).join("");
    const semDono = r && !USU.some((u) => u.uid === r.uid);
    modal({
      titulo: novo ? "Incluir registro" : "Editar registro",
      sub: novo ? "Lança um protocolo em nome de alguém (não imprime)." : "",
      corpo: `
        <div class="linha2">
          <div class="pb-campo"><label for="r-prot">Nº Protocolo</label><input class="pb-input" id="r-prot" inputmode="numeric" value="${esc(r ? r.protocolo : "")}"></div>
          <div class="pb-campo"><label for="r-caixa">Nº Caixa</label><input class="pb-input" id="r-caixa" inputmode="numeric" value="${esc(r ? r.caixa : "")}"></div>
        </div>
        <div class="linha2">
          <div class="pb-campo"><label for="r-data">Data</label><input class="pb-input" id="r-data" type="date" value="${esc(r ? r.dataISO : UI.hojeISO(agora))}"></div>
          <div class="pb-campo"><label for="r-hora">Hora</label><input class="pb-input" id="r-hora" type="time" value="${esc(r ? r.hora : agora.toTimeString().slice(0, 5))}"></div>
        </div>
        <div class="pb-campo"><label for="r-quem">Digitado por</label>
          <select class="pb-select" id="r-quem">${semDono ? `<option value="" selected>${esc(r.digitadoPor || "—")} (sem conta)</option>` : ""}${opcoes}</select></div>`,
      botoes: [
        { txt: "Cancelar", acao: (m) => m.fechar() },
        { txt: novo ? "Incluir" : "Salvar", cls: "prim", acao: async (m) => {
          const protocolo = m.q("#r-prot").value.trim();
          const caixa = m.q("#r-caixa").value.trim();
          const dataISO = m.q("#r-data").value;
          const hora = m.q("#r-hora").value;
          const uid = m.q("#r-quem").value;
          if (!protocolo || !caixa) return m.erro("Preencha protocolo e caixa.");
          if (!dataISO || !hora) return m.erro("Preencha data e hora.");
          const dono = USU.find((u) => u.uid === uid);
          const dados = {
            protocolo, caixa, dataISO, hora, data: UI.dataBR(dataISO),
            digitadoPor: dono ? dono.nome : (r ? r.digitadoPor : "—"),
            uid: dono ? dono.uid : (r ? r.uid : "legado"),
            email: dono ? dono.email : (r ? r.email || "" : ""),
          };
          m.ocupado(true);
          try {
            if (novo) await Sessao.ref("registros").push({ ...dados, criadoEm: TS, incluidoPor: perfil.nome });
            else await Sessao.ref(`registros/${r.id}`).update({ ...dados, editadoPor: perfil.nome, editadoEm: TS });
            UI.toast(novo ? "Registro incluído." : "Registro atualizado.", "ok");
            m.fechar();
          } catch (err) { m.ocupado(false); m.erro(Sessao.traduzErro(err)); }
        } },
      ],
    });
  }
  $("bt-novo-registro").addEventListener("click", () => formRegistro(null));
  $("bt-novo-registro-2").addEventListener("click", () => formRegistro(null));

  /* ---------- exportar ---------- */
  $("bt-exportar").addEventListener("click", () => {
    if (aba === "usuarios") {
      PB.baixarCSV(`usuarios_${UI.hojeISO()}.csv`, ["Nome", "Número", "Login", "Senha", "Perfil", "Ativo"],
        USU.map((u) => [u.nome, u.numero || "", u.email, u.senha || "", u.perfil, u.ativo !== false ? "sim" : "não"]));
    } else {
      PB.baixarCSV(`registros_${UI.hojeISO()}.csv`, ["Data", "Hora", "Protocolo", "Caixa", "Digitado por", "Login"],
        filtrados().map((r) => [UI.dataBR(r.dataISO), r.hora, r.protocolo, r.caixa, r.digitadoPor, r.email || ""]));
    }
  });

  /* ---------- importar registros antigos (localStorage da versão anterior) ---------- */
  $("bt-importar").addEventListener("click", async () => {
    const pad = UI.pad;
    const isoBR = (s) => { const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(String(s || "").trim()); return m ? `${m[3]}-${m[2]}-${m[1]}` : ""; };
    const normHora = (s) => { const m = /^(\d{1,2}):(\d{2})/.exec(String(s || "")); return m ? `${pad(Number(m[1]))}:${m[2]}` : "00:00"; };
    const achados = [];
    try {
      const base = JSON.parse(localStorage.getItem("db_protocolos_v1") || "[]");
      if (Array.isArray(base)) base.forEach((r) => achados.push(r));
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith("registros_")) continue;
        const dia = k.slice(10);
        const l = JSON.parse(localStorage.getItem(k) || "[]");
        if (Array.isArray(l)) l.forEach((r) => achados.push({ ...r, dataISO: /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : isoBR(r.data) }));
      }
    } catch (e) { console.warn(e); }
    const sig = (r) => [r.protocolo, r.caixa, r.dataISO, r.hora, String(r.digitadoPor || "").trim().toLowerCase()].join("|");
    const noBanco = new Set(REG.map(sig));
    const vistos = new Set();
    const novos = [];
    achados.forEach((r) => {
      if (!r || !r.protocolo || !r.caixa) return;
      const rec = { protocolo: String(r.protocolo), caixa: String(r.caixa), dataISO: r.dataISO || isoBR(r.data), hora: normHora(r.hora), digitadoPor: String(r.digitadoPor || "").trim() || "—" };
      if (!rec.dataISO) return;
      const s = sig(rec);
      if (noBanco.has(s) || vistos.has(s)) return;
      vistos.add(s);
      novos.push(rec);
    });
    if (!novos.length) return UI.toast("Nada para importar: este navegador não tem registros antigos que faltem no banco.", "info", 5000);
    const ok = await confirmar("Importar registros antigos?", `Achei <b>${novos.length}</b> registro(s) salvos só neste navegador (versão anterior do sistema). Eles vão para o banco com o nome de quem digitou. Quando o nome bater com um usuário cadastrado, o registro fica ligado a ele.`, "Importar");
    if (!ok) return;
    const porNome = new Map(USU.map((u) => [String(u.nome).trim().toLowerCase(), u]));
    const multi = {};
    novos.forEach((r) => {
      const dono = porNome.get(r.digitadoPor.toLowerCase());
      const id = Sessao.ref("registros").push().key;
      multi[`registros/${id}`] = { ...r, data: UI.dataBR(r.dataISO), uid: dono ? dono.uid : "legado", email: dono ? dono.email : "", criadoEm: TS, importado: true };
    });
    try {
      await Sessao.ref().update(multi);
      UI.toast(`${novos.length} registro(s) importado(s).`, "ok");
    } catch (err) { UI.toast(Sessao.traduzErro(err), "erro", 7000); }
  });
  /* ---------- dados em tempo real (liga por último) ---------- */
  Sessao.ref("usuarios").on("value", (s) => {
    const arr = [];
    s.forEach((c) => { arr.push({ uid: c.key, ...c.val() }); });
    USU = arr.filter((u) => !u.excluido).sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR"));
    carregou.u = true; pronto();
    renderUsuarios(); montarFiltroNomes();
    if (!indexado) { indexado = true; USU.forEach((u) => Sessao.indexar(u).catch(() => {})); }
  }, (e) => UI.toast(Sessao.traduzErro(e), "erro", 8000));

  Sessao.ref("registros").on("value", (s) => {
    const arr = [];
    s.forEach((c) => { arr.push({ id: c.key, ...c.val() }); });
    REG = arr;
    carregou.r = true; pronto();
    renderRegistros(); renderUsuarios();
  }, (e) => UI.toast(Sessao.traduzErro(e), "erro", 8000));

})();
