/* ---------------------------------------------------------
   BOAS-VINDAS — cumprimento pelo horário + frase pelo clima real
   --------------------------------------------------------- */
const Saudacao = (() => {
  // {nome} é trocado pelo primeiro nome de quem entrou
  const FRASES = {
    chuva: {
      manha: [
        "Bom dia, {nome}! Amanheceu chovendo em Taguatinga — capricha no café e deixa o guarda-chuva por perto.",
        "Bom dia, {nome}! Manhã de chuva, daquelas que dão vontade de voltar pra cama. Mas bora que hoje rende.",
      ],
      tarde: [
        "Boa tarde, {nome}! A tarde está chuvosa — ótima pra um cafezinho enquanto os protocolos andam.",
        "Boa tarde, {nome}! Chuva lá fora, foco aqui dentro. Vamos nessa?",
      ],
      noite: [
        "Boa noite, {nome}! Hoje o dia está chuvoso, bom para ficar em casa debaixo das cobertas.",
        "Boa noite, {nome}! Noite de chuva é noite de coberta e chocolate quente. Só falta fechar esses registros.",
      ],
    },
    tempestade: {
      manha: ["Bom dia, {nome}! Tem tempestade em Taguatinga — se precisar sair, vai com calma e evita áreas alagadas."],
      tarde: ["Boa tarde, {nome}! O tempo fechou com raios e trovões. Fica em lugar seguro e tira os aparelhos da tomada se puder."],
      noite: ["Boa noite, {nome}! Tempestade lá fora — hoje o dia está chuvoso, bom para ficar em casa debaixo das cobertas e bem longe da janela."],
    },
    sol: {
      manha: [
        "Bom dia, {nome}! Sol bonito em Taguatinga — dia perfeito pra render.",
        "Bom dia, {nome}! Céu azul e sol de Brasília: bebe água e bora começar.",
      ],
      tarde: [
        "Boa tarde, {nome}! O sol está forte lá fora — hidrata e segue firme.",
        "Boa tarde, {nome}! Tarde ensolarada, daquelas de ipê florido. Vamos registrar?",
      ],
      noite: [
        "Boa noite, {nome}! Céu limpinho hoje, dá até pra ver as estrelas do cerrado.",
        "Boa noite, {nome}! Noite aberta e fresquinha em Taguatinga. Bom trabalho por aqui.",
      ],
    },
    parcial: {
      manha: ["Bom dia, {nome}! Sol entre nuvens hoje — clima gostoso pra começar o dia."],
      tarde: ["Boa tarde, {nome}! Umas nuvens passando, mas o sol ainda aparece. Bora continuar?"],
      noite: ["Boa noite, {nome}! Algumas nuvens no céu, mas a noite está tranquila."],
    },
    nublado: {
      manha: [
        "Bom dia, {nome}! O céu amanheceu nublado — dia calmo, bom pra trabalhar sem pressa.",
        "Bom dia, {nome}! Tempo fechado e fresquinho hoje. Um café resolve.",
      ],
      tarde: ["Boa tarde, {nome}! Tarde nublada e sem sol forte — clima ideal pra concentrar."],
      noite: ["Boa noite, {nome}! Céu nublado e noite quietinha. Bom pra fechar o dia com calma."],
    },
  };

  const esc = (s) => UI.esc(s);

  function frase(nome) {
    const e = Clima.estado;
    const lista = (FRASES[e.cond] || FRASES.parcial)[UI.periodo(Clima.agora())];
    const f = lista[Math.floor(Math.random() * lista.length)];
    return f.replace("{nome}", nome);
  }

  /* Mostra a tela e resolve quando a pessoa segue (clique, Enter ou 8s) */
  function mostrar(perfil) {
    return new Promise((resolve) => {
      const bv = document.getElementById("bv");
      const nome = UI.primeiroNome(perfil.nome) || "tudo bem";
      const e = Clima.estado;
      const noite = !Clima.sol().diurno;

      document.getElementById("bv-icone").innerHTML = Clima.icone(e.cond, noite);
      const oi = `${UI.cumprimento(Clima.agora())},`;
      document.getElementById("bv-oi").innerHTML =
        oi.split(" ").map((p, i) => `<span class="palavra" style="animation-delay:${0.25 + i * 0.14}s">${esc(p)}</span>`).join(" ") +
        ` <span class="palavra bv-nome" style="animation-delay:${0.25 + oi.split(" ").length * 0.14}s">${esc(nome)}</span>`;

      // a frase vem sem o cumprimento (ele já está no título)
      const texto = frase(nome).replace(/^(Bom dia|Boa tarde|Boa noite), [^!]+! /, "");
      document.getElementById("bv-frase").textContent = texto;
      document.getElementById("bv-meta").innerHTML =
        `<span>📍 Taguatinga-DF</span><span>${e.temp != null ? `${e.temp}°C` : "--°C"}</span><span>${esc(Clima.rotulo(e))}</span>`;

      bv.classList.add("on");
      const btn = document.getElementById("bv-ir");
      setTimeout(() => btn.focus(), 400);

      let feito = false;
      const seguir = () => {
        if (feito) return;
        feito = true;
        clearTimeout(tmr);
        document.removeEventListener("keydown", tecla);
        bv.classList.add("saindo");
        setTimeout(resolve, 450);
      };
      const tecla = (ev) => { if (ev.key === "Enter" || ev.key === "Escape") seguir(); };
      const tmr = setTimeout(seguir, 8300);
      btn.addEventListener("click", seguir, { once: true });
      document.addEventListener("keydown", tecla);
    });
  }

  return { mostrar, frase };
})();
