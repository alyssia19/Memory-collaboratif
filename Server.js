const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// 20 paires mélangées
const EMOJIS = [
  '🐶', '🦊', '🐼', '🐸',
  '🌸', '🌻', '🌹', '🍄',
  '🍕', '🍓', '🥑', '🍩',
  '🎨', '⚽', '🚀', '🎸',
  '⭐', '🌈', '🔥', '💎'
];

let gameState = {
  cards: [],
  flipped: [],
  matchedPairs: 0,
  scores: {},
  isLock: false
};

function initGame() {
  const deck = [...EMOJIS, ...EMOJIS]
    .sort(() => Math.random() - 0.5)
    .map((val, index) => ({ id: index, val, flipped: false, matched: false }));
  
  gameState.cards = deck;
  gameState.flipped = [];
  gameState.matchedPairs = 0;
  gameState.isLock = false;
}

initGame();

io.on('connection', (socket) => {
  gameState.scores[socket.id] = 0;
  io.emit('stateUpdate', gameState);

  socket.on('flipCard', (cardIndex) => {
    if (gameState.isLock) return;
    const card = gameState.cards[cardIndex];
    if (!card || card.flipped || card.matched) return;

    card.flipped = true;
    gameState.flipped.push(cardIndex);
    io.emit('stateUpdate', gameState);

    if (gameState.flipped.length === 2) {
      gameState.isLock = true;
      const [firstIdx, secondIdx] = gameState.flipped;
      const c1 = gameState.cards[firstIdx];
      const c2 = gameState.cards[secondIdx];

      if (c1.val === c2.val) {
        c1.matched = true;
        c2.matched = true;
        gameState.scores[socket.id] = (gameState.scores[socket.id] || 0) + 1;
        gameState.matchedPairs += 1;
        gameState.flipped = [];
        gameState.isLock = false;
        io.emit('stateUpdate', gameState);
      } else {
        setTimeout(() => {
          c1.flipped = false;
          c2.flipped = false;
          gameState.flipped = [];
          gameState.isLock = false;
          io.emit('stateUpdate', gameState);
        }, 3000);
      }
    }
  });

  socket.on('restart', () => {
    Object.keys(gameState.scores).forEach(id => gameState.scores[id] = 0);
    initGame();
    io.emit('stateUpdate', gameState);
  });

  socket.on('disconnect', () => {
    delete gameState.scores[socket.id];
    io.emit('stateUpdate', gameState);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Serveur prêt sur le port ${PORT}`));
