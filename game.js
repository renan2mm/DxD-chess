document.addEventListener("DOMContentLoaded", () => {

/* ELEMENTOS */
const menu = document.getElementById("menu");
const game = document.getElementById("game");
const startBtn = document.getElementById("startGame");
const board = document.getElementById("board");

const botCards = document.querySelectorAll(".bot-card");
const colorBtns = document.querySelectorAll(".color-btn");

const botAvatar = document.getElementById("botAvatar");
const botName = document.getElementById("botName");
const botSpeech = document.getElementById("botSpeech");

/* ESTADO */
let chess;
let selectedSquare = null;

let selectedBot = null;
let playerColor = null;
let playerSide = null;
let botSide = null;

let lastMoveByHuman = false;
let gameEnded = false;

/* BOTS */
const bots = {
  rias: { skill: 8 },
  akeno: { skill: 4 }
};

/* FRASES */
const phrases = {
  rias: {
    check: [
      "Xeque.",
      "Cuidado com o seu rei.",
      "Essa posição é perigosa."
    ],
    checkmateWin: [
      "Xeque-mate. A partida acabou.",
      "Vitória decisiva.",
      "Você jogou bem."
    ],
    checkmateLose: [
      "Xeque-mate.",
      "Foi um erro fatal.",
      "Essa partida termina aqui."
    ],
    draw: [
      "Empate… interessante.",
      "Um resultado equilibrado.",
      "Nenhum de nós conseguiu vantagem."
    ],
    normal: [
      "Interessante.",
      "Vamos ver como isso evolui.",
      "Continue."
    ]
  },

  akeno: {
    check: [
      "Ara~ xeque ♡",
      "Seu rei está em perigo~",
      "Hehe~ cuidado~"
    ],
    checkmateWin: [
      "Xeque-mate~ foi divertido ♡",
      "Ara~ que final lindo~",
      "Você se saiu muito bem~"
    ],
    checkmateLose: [
      "Oh meu… xeque-mate~",
      "Ara~ isso acabou rápido~",
      "Que pena~"
    ],
    draw: [
      "Empate~ que gracinha~",
      "Ara~ ninguém venceu~",
      "Foi divertido mesmo assim~"
    ],
    normal: [
      "Ara~",
      "Hehe~",
      "Interessante~"
    ]
  }
};

/* SELEÇÃO DO BOT */
botCards.forEach(card => {
  card.onclick = () => {
    botCards.forEach(c => c.classList.remove("selected"));
    card.classList.add("selected");

    selectedBot = {
      id: card.dataset.bot,
      name: card.dataset.name,
      avatar: card.dataset.avatar
    };
  };
});

/* SELEÇÃO DE COR */
colorBtns.forEach(btn => {
  btn.onclick = () => {
    colorBtns.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    playerColor = btn.dataset.color;
  };
});

/* ENGINE */
const engine = new Worker("engine/stockfish.js");
engine.postMessage("uci");

engine.onmessage = e => {
  if (!e.data.startsWith("bestmove") || gameEnded) return;

  const m = e.data.split(" ")[1];

  chess.move({
    from: m.slice(0, 2),
    to: m.slice(2, 4),
    promotion: "q"
  });

  draw();
  evaluatePosition();
};

/* START */
startBtn.onclick = () => {
  if (!selectedBot || !playerColor) {
    alert("Escolha o bot e a cor antes de iniciar.");
    return;
  }

  gameEnded = false;

  if (playerColor === "white") {
    playerSide = "w";
    botSide = "b";
  } else {
    playerSide = "b";
    botSide = "w";
  }

  botAvatar.src = selectedBot.avatar;
  botName.textContent = selectedBot.name;

  menu.classList.add("hidden");
  game.classList.remove("hidden");

  chess = new Chess();
  createBoard();
  draw();

  if (playerSide === "b") {
    setTimeout(botMove, 500);
  }
};

/* TABULEIRO */
function createBoard() {
  board.innerHTML = "";

  const rows =
    playerSide === "w"
      ? [7,6,5,4,3,2,1,0]
      : [0,1,2,3,4,5,6,7];

  for (let r of rows) {
    for (let c = 0; c < 8; c++) {
      const s = document.createElement("div");
      s.className = "square " + ((r + c) % 2 ? "dark" : "light");
      s.dataset.sq = "abcdefgh"[c] + (r + 1);
      s.onclick = () => clickSquare(s);
      board.appendChild(s);
    }
  }
}

/* DESENHAR */
function draw() {
  document.querySelectorAll(".square").forEach(s => {
    s.innerHTML = "";
    const p = chess.get(s.dataset.sq);
    if (!p) return;

    const e = document.createElement("span");
    e.className = "piece " + (p.color === "w" ? "white-piece" : "red-piece");
    e.textContent = {
      p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚"
    }[p.type];

    s.appendChild(e);
  });
}

/* CLIQUE */
function clickSquare(s) {
  if (chess.turn() !== playerSide || gameEnded) return;

  if (!selectedSquare) {
    const p = chess.get(s.dataset.sq);
    if (!p || p.color !== playerSide) return;

    selectedSquare = s;
    s.classList.add("selected");
  } else {
    const move = chess.move({
      from: selectedSquare.dataset.sq,
      to: s.dataset.sq,
      promotion: "q"
    });

    document.querySelectorAll(".square").forEach(x => x.classList.remove("selected"));
    selectedSquare = null;

    if (move) {
      draw();
      evaluatePosition();
      if (!gameEnded) setTimeout(botMove, 500);
    }
  }
}

/* BOT MOVE */
function botMove() {
  engine.postMessage(`setoption name Skill Level value ${bots[selectedBot.id].skill}`);
  engine.postMessage(`position fen ${chess.fen()}`);
  engine.postMessage("go depth 12");
}

/* AVALIA POSIÇÃO */
function evaluatePosition() {
  const botLines = phrases[selectedBot.id];

  if (chess.in_checkmate()) {
    gameEnded = true;
    showSpeech(
      chess.turn() === playerSide
        ? random(botLines.checkmateLose)
        : random(botLines.checkmateWin)
    );
    return;
  }

  if (chess.in_draw()) {
    gameEnded = true;
    showSpeech(random(botLines.draw));
    return;
  }

  if (chess.in_check()) {
    showSpeech(random(botLines.check));
    return;
  }

  if (Math.random() < 0.25) {
    showSpeech(random(botLines.normal));
  }
}

/* SPEECH */
function showSpeech(text) {
  botSpeech.textContent = text;
  botSpeech.classList.remove("hidden");
  setTimeout(() => botSpeech.classList.add("hidden"), 6000);
}

function random(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

});




