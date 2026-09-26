/* ---------------------------------------------------------
   SESSÃO + utilidades compartilhadas por todas as páginas
   Requer: firebase-app/auth/database (compat) e firebase-config.js
   --------------------------------------------------------- */
const Sessao = (() => {
  const auth = firebase.auth();
  const db = firebase.database();

  const ref = (path = "") => db.ref(path ? `${DB_ROOT}/${path}` : DB_ROOT);

  /* Espera o Firebase dizer se há alguém logado (uma única vez) */
  function usuarioAtual() {
    return new Promise((resolve) => {
      const off = auth.onAuthStateChanged((u) => { off(); resolve(u); });
    });
  }

  async function carregarPerfil(uid) {
    const snap = await ref(`usuarios/${uid}`).once("value");
    return snap.exists() ? { uid, ...snap.val() } : null;
  }

  /* Protege a página: sem login volta para a tela de entrada.
     opts.admin = true exige perfil de administrador. */
  async function exigir(opts = {}) {
    const user = await usuarioAtual();
    if (!user) {
      location.replace("index.html");
      throw new Error("sem sessão");
    }
    let perfil = null;
    try { perfil = await carregarPerfil(user.uid); } catch (e) { console.warn(e); }

    if (!perfil || perfil.ativo === false) {
      sessionStorage.setItem("aviso_login", "Sua conta está desativada. Fale com o administrador.");
      await auth.signOut();
      location.replace("index.html");
      throw new Error("conta inativa");
    }
    if (opts.admin && perfil.perfil !== "admin") {
      location.replace("registro.html");
      throw new Error("sem permissão");
    }
    return { user, perfil };
  }

  async function sair() {
    sessionStorage.removeItem("boas_vindas_vista");
    await auth.signOut();
    location.replace("index.html");
  }

  /* App paralelo: permite ao admin criar/alterar contas sem perder a própria sessão */
  function appSecundario() {
    const nome = "secundario";
    const existente = firebase.apps.find((a) => a.name === nome);
    return existente || firebase.initializeApp(firebaseConfig, nome);
  }

  function traduzErro(err) {
    const code = (err && err.code) || "";
    const mapa = {
      "auth/invalid-email": "E-mail inválido.",
      "auth/user-disabled": "Esta conta foi desativada.",
      "auth/user-not-found": "Não achei nenhuma conta com esse e-mail.",
      "auth/wrong-password": "Senha incorreta.",
      "auth/invalid-credential": "E-mail ou senha não conferem.",
      "auth/invalid-login-credentials": "E-mail ou senha não conferem.",
      "auth/email-already-in-use": "Esse e-mail já tem cadastro. Tente entrar ou recuperar a senha.",
      "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
      "auth/too-many-requests": "Muitas tentativas seguidas. Espere um pouco e tente de novo.",
      "auth/network-request-failed": "Sem conexão com a internet.",
      "auth/requires-recent-login": "Por segurança, entre de novo e repita a operação.",
      "auth/operation-not-allowed": "Login por e-mail/senha não está ativado no Firebase.",
      "PERMISSION_DENIED": "Sem permissão no banco de dados. Confira as regras do Firebase.",
    };
    if (mapa[code]) return mapa[code];
    if (String(err && err.message).includes("PERMISSION_DENIED")) return mapa.PERMISSION_DENIED;
    return (err && err.message) || "Algo deu errado. Tente novamente.";
  }

  /* ---------------------------------------------------------
     ÍNDICE DE LOGIN — permite entrar com e-mail, nome ou número
     protocolos/logins/n_<nome> = email   |   m_<numero> = email
     (cada chave só pode ser lida individualmente; não dá para listar)
     --------------------------------------------------------- */
  const normNome = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase().trim().replace(/\s+/g, " ");
  const chaveNome = (nome) => "n_" + normNome(nome).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  const chaveNumero = (num) => "m_" + String(num || "").replace(/\D+/g, "");

  async function emailDaChave(chave) {
    const s = await ref(`logins/${chave}`).once("value");
    return s.exists() ? String(s.val()) : null;
  }

  /* Recebe o que a pessoa digitou e devolve o e-mail da conta (ou null) */
  async function resolverLogin(texto) {
    const t = String(texto || "").trim();
    if (!t) return null;
    if (t.includes("@")) return t;
    if (/^\d+$/.test(t)) return emailDaChave(chaveNumero(t));
    return emailDaChave(chaveNome(t));
  }

  /* Nome/número livres? (ou já pertencem a este e-mail) */
  async function disponivel(tipo, valor, emailDono) {
    const chave = tipo === "nome" ? chaveNome(valor) : chaveNumero(valor);
    const dono = await emailDaChave(chave);
    return !dono || (emailDono && dono.toLowerCase() === String(emailDono).toLowerCase());
  }

  /* Grava as chaves novas e apaga as antigas (quando nome/número mudam) */
  async function indexar(novo, antigo = {}) {
    const email = String(novo.email || "").toLowerCase();
    const tarefas = [];
    const trocar = (chaveVelha, chaveNova) => {
      if (chaveVelha && chaveVelha !== chaveNova) {
        tarefas.push(emailDaChave(chaveVelha).then((dono) => {
          if (dono && dono.toLowerCase() === String(antigo.email || email).toLowerCase()) return ref(`logins/${chaveVelha}`).remove();
        }).catch(() => {}));
      }
      if (chaveNova) {
        tarefas.push(emailDaChave(chaveNova).then((dono) => {
          if (!dono || dono.toLowerCase() !== email) return ref(`logins/${chaveNova}`).set(email);
        }).catch((e) => console.warn("índice de login:", e)));
      }
    };
    trocar(antigo.nome ? chaveNome(antigo.nome) : null, novo.nome ? chaveNome(novo.nome) : null);
    trocar(antigo.numero ? chaveNumero(antigo.numero) : null, novo.numero ? chaveNumero(novo.numero) : null);
    await Promise.all(tarefas);
  }

  async function desindexar(p) {
    const email = String(p.email || "").toLowerCase();
    const chaves = [p.nome && chaveNome(p.nome), p.numero && chaveNumero(p.numero)].filter(Boolean);
    await Promise.all(chaves.map((c) => emailDaChave(c).then((dono) => {
      if (dono && dono.toLowerCase() === email) return ref(`logins/${c}`).remove();
    }).catch(() => {})));
  }

  return {
    auth, db, ref, usuarioAtual, carregarPerfil, exigir, sair, appSecundario, traduzErro,
    normNome, chaveNome, chaveNumero, resolverLogin, disponivel, indexar, desindexar,
  };
})();

/* ---------------------------------------------------------
   UI — pequenos ajudantes visuais
   --------------------------------------------------------- */
const UI = (() => {
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));

  const pad = (n) => String(n).padStart(2, "0");
  const hojeISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const dataBR = (iso) => { const [y, m, d] = String(iso).split("-"); return `${d}/${m}/${y}`; };

  function periodo(d = new Date()) {
    const h = d.getHours();
    if (h >= 5 && h < 12) return "manha";
    if (h >= 12 && h < 18) return "tarde";
    return "noite";
  }
  const cumprimento = (d = new Date()) => ({ manha: "Bom dia", tarde: "Boa tarde", noite: "Boa noite" }[periodo(d)]);

  const iniciais = (nome) => String(nome || "?").trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  const primeiroNome = (nome) => String(nome || "").trim().split(/\s+/)[0] || "";

  /* Toast empilhável — some sozinho, pausa ao passar o mouse */
  let pilha;
  function toast(msg, tipo = "info", ms = 3800) {
    if (!pilha) {
      pilha = document.createElement("div");
      pilha.className = "toasts";
      pilha.setAttribute("role", "status");
      document.body.appendChild(pilha);
    }
    const el = document.createElement("div");
    el.className = `toast toast-${tipo}`;
    el.innerHTML = `<span class="toast-dot"></span><span>${esc(msg)}</span>`;
    pilha.appendChild(el);
    let restante = ms, inicio = Date.now(), timer;
    const fechar = () => { el.classList.add("saindo"); setTimeout(() => el.remove(), 320); };
    const agendar = () => { inicio = Date.now(); timer = setTimeout(fechar, restante); };
    el.addEventListener("mouseenter", () => { clearTimeout(timer); restante -= Date.now() - inicio; });
    el.addEventListener("mouseleave", agendar);
    el.addEventListener("click", fechar);
    agendar();
  }

  /* Ondinha no clique dos botões (posição real do dedo/mouse) */
  function ativarOndas(root = document) {
    root.addEventListener("pointerdown", (e) => {
      const b = e.target.closest(".btn, .onda");
      if (!b || b.disabled) return;
      const r = b.getBoundingClientRect();
      const s = document.createElement("span");
      s.className = "onda-fx";
      const d = Math.max(r.width, r.height) * 1.2;
      s.style.width = s.style.height = `${d}px`;
      s.style.left = `${e.clientX - r.left - d / 2}px`;
      s.style.top = `${e.clientY - r.top - d / 2}px`;
      b.appendChild(s);
      setTimeout(() => s.remove(), 650);
    });
  }

  /* Conta de 0 até o valor (ou do valor antigo até o novo) */
  function contar(el, alvo, ms = 700) {
    const de = Number(el.dataset.v || 0);
    el.dataset.v = alvo;
    if (de === alvo) { el.textContent = alvo.toLocaleString("pt-BR"); return; }
    const t0 = performance.now();
    const passo = (t) => {
      const p = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(de + (alvo - de) * e).toLocaleString("pt-BR");
      if (p < 1) requestAnimationFrame(passo);
    };
    requestAnimationFrame(passo);
  }

  return { esc, pad, hojeISO, dataBR, periodo, cumprimento, iniciais, primeiroNome, toast, ativarOndas, contar };
})();
