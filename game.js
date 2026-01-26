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

/* BOTS */
const bots = {
  rias: { skill: 16 },
  akeno: { skill: 6 }
};

/* FRASES */
const phrases = {
  rias: [
    "Essa jogada foi um pouco arriscada.",
    "Interessante… vamos ver onde isso leva.",
    "Você pode fazer melhor."
  ],
  akeno: [
    "Ara~ que jogada ousada ♡",
    "Hehe~ isso vai ser divertido~",
    "Vamos brincar mais um pouco~"
  ]
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

/* SELEÇÃO DE COR (lado que você joga) */
colorBtns.forEach(btn => {
  btn.onclick = () => {
    colorBtns.forEach(b => b.classList.remove("selected"));
    btn.classList.add("selected");
    playerColor = btn.dataset.color; // white | red
  };
});

/* ENGINE */
const engine = new Worker("engine/stockfish.js");
engine.postMessage("uci");

engine.onmessage = e => {
  if (!e.data.startsWith("bestmove")) return;

  const m = e.data.split(" ")[1];

  chess.move({
    from: m.slice(0, 2),
    to: m.slice(2, 4),
    promotion: "q"
  });

  draw();

  if (lastMoveByHuman) {
    showBotComment();
    lastMoveByHuman = false;
  }
};

/* START */
startBtn.onclick = () => {
  if (!selectedBot || !playerColor) {
    alert("Escolha o bot e a cor antes de iniciar.");
    return;
  }

  // LADO (quem joga de branco/preto no xadrez)
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

  // Se humano for vermelho (preto), bot começa
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

/* DESENHAR — COR FIXA */
function draw() {
  document.querySelectorAll(".square").forEach(s => {
    s.innerHTML = "";
    const p = chess.get(s.dataset.sq);
    if (!p) return;

    const e = document.createElement("span");
    e.className =
      "piece " + (p.color === "w" ? "white-piece" : "red-piece");

    e.textContent = {
      p:"♟", r:"♜", n:"♞", b:"♝", q:"♛", k:"♚"
    }[p.type];

    s.appendChild(e);
  });
}

/* CLIQUE */
function clickSquare(s) {
  if (chess.turn() !== playerSide) return;

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
      lastMoveByHuman = true;
      setTimeout(botMove, 500);
    }
  }
}

/* BOT MOVE */
function botMove() {
  engine.postMessage(`setoption name Skill Level value ${bots[selectedBot.id].skill}`);
  engine.postMessage(`position fen ${chess.fen()}`);
  engine.postMessage("go depth 12");
}

/* COMENTÁRIO */
function showBotComment() {
  if (Math.random() > 0.5) return;

  const list = phrases[selectedBot.id];
  botSpeech.textContent =
    list[Math.floor(Math.random() * list.length)];

  botSpeech.classList.remove("hidden");
  setTimeout(() => botSpeech.classList.add("hidden"), 3000);
}

});
