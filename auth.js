/* ---------------------------------------------------------
   TELA DE ENTRADA — login, cadastro, esqueci a senha
   --------------------------------------------------------- */
(() => {
  const $ = (id) => document.getElementById(id);
  const auth = Sessao.auth;
  const TS = firebase.database.ServerValue.TIMESTAMP;
  let entrando = false;

  Cena.iniciar($("sky-canvas"));
  Clima.montarWidget($("clima"));
  UI.ativarOndas();

  /* Já está logado? Vai direto para o registro */
  Sessao.usuarioAtual().then(async (u) => {
    if (!u || entrando) return;
    const p = await Sessao.carregarPerfil(u.uid).catch(() => null);
    if (p && p.ativo !== false) location.replace("registro.html");
  });

  const aviso = sessionStorage.getItem("aviso_login");
  if (aviso) { $("login-aviso").textContent = aviso; sessionStorage.removeItem("aviso_login"); }

  try { $("login-email").value = localStorage.getItem("ultimo_email") || ""; } catch {}

  /* ---------- troca de telas com altura animada ---------- */
  const telas = { login: $("tela-login"), cadastro: $("tela-cadastro"), esqueci: $("tela-esqueci") };
  const ordem = ["login", "cadastro", "esqueci"];
  let atual = "login";
  const caixa = $("telas");
  let tmrAltura;

  function ir(nome) {
    if (nome === atual) return;
    const de = telas[atual], para = telas[nome];
    const frente = ordem.indexOf(nome) > ordem.indexOf(atual);
    caixa.style.height = `${caixa.offsetHeight}px`;
    para.classList.add(frente ? "sai-dir" : "sai-esq");
    para.hidden = false;
    void caixa.offsetHeight;
    caixa.style.height = `${para.offsetHeight}px`;
    clearTimeout(tmrAltura);
    tmrAltura = setTimeout(() => { caixa.style.height = "auto"; }, 460);
    requestAnimationFrame(() => {
      de.classList.add(frente ? "sai-esq" : "sai-dir");
      para.classList.remove("sai-dir", "sai-esq");
      de.hidden = true;
      setTimeout(() => de.classList.remove("sai-esq", "sai-dir"), 450);
    });
    atual = nome;
    const abas = $("abas");
    abas.classList.toggle("escondida", nome === "esqueci");
    if (nome !== "esqueci") abas.dataset.aba = nome;
    abas.querySelectorAll("[role=tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.ir === nome)));
    if (nome === "esqueci") $("esq-email").value = $("login-email").value;
    setTimeout(() => { const f = para.querySelector("input"); if (f) f.focus({ preventScroll: true }); }, 380);
  }
  document.querySelectorAll("[data-ir]").forEach((b) => b.addEventListener("click", () => ir(b.dataset.ir)));

  /* ---------- olho de mostrar senha ---------- */
  const OLHO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>
    <line class="risco" x1="4" y1="4" x2="20" y2="20"/></svg>`;
  document.querySelectorAll(".olho").forEach((b) => {
    b.innerHTML = OLHO;
    b.addEventListener("click", () => {
      const inp = $(b.dataset.alvo);
      const mostrar = inp.type === "password";
      inp.type = mostrar ? "text" : "password";
      b.classList.toggle("mostrando", mostrar);
      b.setAttribute("aria-label", mostrar ? "Esconder senha" : "Mostrar senha");
      inp.focus({ preventScroll: true });
    });
  });

  /* ---------- Caps Lock ---------- */
  document.querySelectorAll("input[type=password]").forEach((inp) => {
    const tag = document.querySelector(`[data-caps="${inp.id}"]`);
    if (!tag) return;
    const ver = (e) => tag.classList.toggle("on", !!(e.getModifierState && e.getModifierState("CapsLock")));
    inp.addEventListener("keydown", ver);
    inp.addEventListener("keyup", ver);
    inp.addEventListener("blur", () => tag.classList.remove("on"));
  });

  $("cad-numero").addEventListener("input", (e) => { e.target.value = e.target.value.replace(/\D+/g, ""); });

  /* ---------- força da senha ---------- */
  $("cad-senha").addEventListener("input", (e) => {
    const s = e.target.value;
    let n = 0;
    if (s.length >= 6) n++;
    if (s.length >= 10) n++;
    if (/[A-Z]/.test(s) && /[a-z]/.test(s)) n++;
    if (/\d/.test(s) && /[^A-Za-z0-9]/.test(s)) n++;
    if (!s) n = 0; else if (n === 0) n = 1;
    $("forca").dataset.n = n;
    $("forca-txt").textContent = s ? ["", "fraca", "razoável", "boa", "forte"][n] : "";
  });

  /* ---------- ajudantes ---------- */
  const emailOk = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s);
  function ocupado(form, sim) {
    const b = form.querySelector("button[type=submit]");
    b.classList.toggle("ocupado", sim);
    b.disabled = sim;
  }
  function erro(avisoEl, msg, ...campos) {
    avisoEl.classList.remove("ok");
    avisoEl.textContent = msg;
    campos.forEach((c) => { c.classList.remove("invalid"); void c.offsetWidth; c.classList.add("invalid"); });
    const card = $("auth-card");
    card.classList.remove("tremer"); void card.offsetWidth; card.classList.add("tremer");
  }
  document.querySelectorAll(".form-auth input").forEach((i) => i.addEventListener("input", () => i.classList.remove("invalid")));

  async function concluirEntrada(user, senha, nomeNovo, numeroNovo) {
    let perfil = await Sessao.carregarPerfil(user.uid);
    const ref = Sessao.ref(`usuarios/${user.uid}`);
    if (!perfil) {
      perfil = {
        nome: nomeNovo || user.displayName || user.email.split("@")[0],
        email: user.email,
        ...(numeroNovo ? { numero: numeroNovo } : {}),
        senha,
        perfil: user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase() ? "admin" : "usuario",
        ativo: true,
        criadoEm: TS,
        ultimoAcesso: TS,
      };
      await ref.set(perfil);
      perfil.uid = user.uid;
    } else if (perfil.ativo === false) {
      await auth.signOut();
      throw { code: "conta-inativa", message: "Sua conta está desativada. Fale com o administrador." };
    } else {
      ref.update({ senha, ultimoAcesso: TS }).catch(() => {});
    }
    // garante que dá para entrar também pelo nome e pelo número
    Sessao.indexar({ nome: perfil.nome, numero: perfil.numero, email: user.email }).catch(() => {});
    sessionStorage.setItem("boas_vindas_vista", "1");
    $("auth-card").style.transition = "opacity .5s, transform .5s";
    $("auth-card").style.opacity = "0";
    $("auth-card").style.transform = "translateY(-14px) scale(.98)";
    await Saudacao.mostrar(perfil);
    location.href = "registro.html";
  }

  /* ---------- ENTRAR ---------- */
  $("form-login").addEventListener("submit", async (e) => {
    e.preventDefault();
    const digitado = $("login-email").value.trim();
    const senha = $("login-senha").value;
    const av = $("login-aviso");
    av.textContent = "";
    if (!digitado) return erro(av, "Digite seu e-mail, nome ou número.", $("login-email"));
    if (digitado.includes("@") && !emailOk(digitado)) return erro(av, "Esse e-mail não parece válido.", $("login-email"));
    if (!senha) return erro(av, "Digite sua senha.", $("login-senha"));

    entrando = true;
    ocupado(e.target, true);
    try {
      const email = await Sessao.resolverLogin(digitado);
      if (!email) throw { code: "sem-login", message: /^\d+$/.test(digitado) ? "Não achei ninguém com esse número." : "Não achei ninguém com esse nome. Tente o e-mail ou o número." };
      const cred = await auth.signInWithEmailAndPassword(email, senha);
      try { $("lembrar").checked ? localStorage.setItem("ultimo_email", digitado) : localStorage.removeItem("ultimo_email"); } catch {}
      await concluirEntrada(cred.user, senha);
    } catch (err) {
      entrando = false;
      ocupado(e.target, false);
      const proprio = err.code === "conta-inativa" || err.code === "sem-login";
      erro(av, proprio ? err.message : Sessao.traduzErro(err), err.code === "sem-login" ? $("login-email") : $("login-senha"));
      if (err.code !== "sem-login") $("login-senha").select();
    }
  });

  /* ---------- CRIAR CONTA ---------- */
  $("form-cadastro").addEventListener("submit", async (e) => {
    e.preventDefault();
    const nome = $("cad-nome").value.trim().replace(/\s+/g, " ");
    const numero = $("cad-numero").value.replace(/\D+/g, "");
    const email = $("cad-email").value.trim();
    const senha = $("cad-senha").value;
    const senha2 = $("cad-senha2").value;
    const av = $("cad-aviso");
    av.textContent = "";
    if (nome.length < 2) return erro(av, "Digite seu nome.", $("cad-nome"));
    if (/^\d+$/.test(nome)) return erro(av, "O nome não pode ser só números.", $("cad-nome"));
    if (!numero) return erro(av, "Digite seu número (só números).", $("cad-numero"));
    if (!emailOk(email)) return erro(av, "Digite um e-mail válido.", $("cad-email"));
    if (senha.length < 6) return erro(av, "A senha precisa ter pelo menos 6 caracteres.", $("cad-senha"));
    if (senha !== senha2) return erro(av, "As senhas não são iguais.", $("cad-senha2"));

    entrando = true;
    ocupado(e.target, true);
    try {
      // nunca deixa cadastrar nome ou número que já existem
      const [nomeLivre, numeroLivre] = await Promise.all([Sessao.disponivel("nome", nome), Sessao.disponivel("numero", numero)]);
      if (!nomeLivre) throw { code: "dup-nome", message: "Já existe alguém cadastrado com esse nome. Use seu nome completo ou acrescente um sobrenome." };
      if (!numeroLivre) throw { code: "dup-numero", message: "Esse número já está em uso por outra pessoa." };
      const cred = await auth.createUserWithEmailAndPassword(email, senha);
      await cred.user.updateProfile({ displayName: nome }).catch(() => {});
      try { localStorage.setItem("ultimo_email", email); } catch {}
      await concluirEntrada(cred.user, senha, nome, numero);
    } catch (err) {
      entrando = false;
      ocupado(e.target, false);
      const campo = { "auth/email-already-in-use": "cad-email", "auth/invalid-email": "cad-email", "dup-nome": "cad-nome", "dup-numero": "cad-numero" }[err.code] || "cad-senha";
      erro(av, err.code && err.code.startsWith("dup-") ? err.message : Sessao.traduzErro(err), $(campo));
    }
  });

  /* ---------- ESQUECI A SENHA ---------- */
  $("form-esqueci").addEventListener("submit", async (e) => {
    e.preventDefault();
    const digitado = $("esq-email").value.trim();
    const av = $("esq-aviso");
    av.textContent = "";
    if (!digitado) return erro(av, "Digite seu e-mail, nome ou número.", $("esq-email"));
    ocupado(e.target, true);
    const email = await Sessao.resolverLogin(digitado).catch(() => null);
    if (!email || !emailOk(email)) { ocupado(e.target, false); return erro(av, "Não achei nenhuma conta com esse dado.", $("esq-email")); }
    const volta = location.protocol.startsWith("http")
      ? { url: location.href.replace(/[^/]*(\?.*)?$/, "index.html") }
      : undefined;
    try {
      try {
        await auth.sendPasswordResetEmail(email, volta);
      } catch (err) {
        if (volta && /continue-uri|unauthorized/.test(err.code || "")) await auth.sendPasswordResetEmail(email);
        else throw err;
      }
      av.classList.add("ok");
      av.textContent = `Pronto! Se a conta existir, chega em instantes um e-mail com o seu login e o link para criar a nova senha. Confira também a caixa de spam.`;
      UI.toast("E-mail de recuperação enviado.", "ok");
    } catch (err) {
      if (err.code === "auth/user-not-found") erro(av, "Não achei nenhuma conta com esse e-mail.", $("esq-email"));
      else erro(av, Sessao.traduzErro(err), $("esq-email"));
    } finally {
      ocupado(e.target, false);
    }
  });
})();
