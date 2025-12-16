import Game from './Game.js';

const canvas = document.getElementById('gameCanvas');
const game = new Game(canvas);

const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

startBtn.addEventListener('click', () => {
  if (game.state === 'idle' || game.state === 'gameover' || game.hasWonGame) {
    game.restartGame();
    game.start();
  } else {
    game.start();
  }
  pauseBtn.textContent = 'Пауза';
});

pauseBtn.addEventListener('click', () => {
  game.togglePause();
  pauseBtn.textContent = game.state === 'paused' ? 'Продолжить' : 'Пауза';
});

restartBtn.addEventListener('click', () => {
  game.restartGame();
  game.updateHUD();
  pauseBtn.textContent = 'Пауза';
});

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    game.togglePause();
    pauseBtn.textContent = game.state === 'paused' ? 'Продолжить' : 'Пауза';
  }
  // Close note overlay
  if (game.showingNote) {
    game.showingNote = false;
  }
});

game.updateHUD();
game.render();

