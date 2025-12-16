import InputHandler from './InputHandler.js';
import Player from './Player.js';
import Platform from './Platform.js';
import Collectible from './Collectible.js';
import Enemy from './Enemy.js';
import Renderer from './Renderer.js';
import Camera from './Camera.js';
import Note from './Note.js';
import HealthPickup from './HealthPickup.js';
import LevelGenerator from './LevelGenerator.js';
import { checkAABBCollision, resolvePlatformCollision } from './Collision.js';

export default class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
    this.gravity = 1900;
    this.fixedDt = 1 / 60;
    this.accumulator = 0;
    this.lastTimestamp = 0;

    this.input = new InputHandler();
    this.renderer = new Renderer(this.ctx);
    this.camera = new Camera(this.width, this.height);
    this.player = new Player(this);
    this.state = 'idle'; // idle, running, paused, victory, gameover
    this.score = 0;
    this.health = 3;
    this.currentLevel = 0;
    this.hasWonGame = false;
    this.storageKey = 'canvas-platformer-best-score';
    this.bestScore = this.readBestScore();
    this.entities = { platforms: [], collectibles: [], enemies: [], goal: null, notes: [], healthPickups: [] };
    this.storyIndex = 0;
    this.showingStory = false;
    this.currentLevelWidth = this.width;
    this.currentLevelHeight = this.height;
    this.collectedNotes = [];
    this.showingNote = false;
    this.lastSafePosition = { x: 50, y: this.height - 24 - 50 };
    this.isRespawning = false;

    this.levelGenerator = new LevelGenerator(this.width, this.height);
    this.levelWidth = this.width * 3;
    this.levels = [];
    this.regenerateLevels();
    this.loadLevel(0);
    this.loop = this.loop.bind(this);
  }

  start() {
    if (this.state === 'running') return;
    if (this.state === 'idle') {
      this.score = 0;
      this.health = 3;
      this.currentLevel = 0;
      this.hasWonGame = false;
      this.regenerateLevels();
      this.loadLevel(0);
    }
    this.state = 'running';
    this.lastTimestamp = performance.now();
    requestAnimationFrame(this.loop);
  }

  togglePause() {
    if (this.state === 'paused') {
      this.state = 'running';
      this.lastTimestamp = performance.now();
      requestAnimationFrame(this.loop);
    } else if (this.state === 'running') {
      this.state = 'paused';
      this.player.isMoving = false;
      this.render();
    }
  }

  restartGame() {
    this.score = 0;
    this.health = 3;
    this.currentLevel = 0;
    this.hasWonGame = false;
    this.regenerateLevels();
    this.loadLevel(0);
    this.player.reset();
    this.state = 'idle';
    this.updateHUD();
    this.render();
  }

  loadLevel(index) {
    const level = this.levels[index];
    if (!level) return;
    this.entities.platforms = level.platforms.map((data) => new Platform(data));
    this.entities.collectibles = level.collectibles.map((data) => new Collectible(data));
    this.entities.enemies = level.enemies.map((data) => new Enemy(data));
    this.entities.notes = level.notes ? level.notes.map((data) => new Note(data)) : [];
    this.entities.healthPickups = level.healthPickups ? level.healthPickups.map((data) => new HealthPickup(data)) : [];
    this.entities.goal = { ...level.goal };
    this.currentLevelWidth = level.width || this.width;
    this.currentLevelHeight = level.height || this.height;
    this.player.reset();
    this.player.x = level.spawn.x;
    this.player.y = level.spawn.y;
    this.lastSafePosition = { x: level.spawn.x, y: level.spawn.y };
    this.camera.x = Math.max(0, this.player.x - this.width / 2);
    this.camera.y = Math.max(0, this.player.y - this.height / 2);
    this.collectedNotes = [];
    this.isRespawning = false;
    this.updateHUD();
  }

  update(dt) {
    if (this.state !== 'running') return;

    this.player.update(dt, this.input);

    // Update moving platforms
    this.entities.platforms.forEach((platform) => platform.update(dt));

    // Platform collisions
    this.entities.platforms.forEach((platform) => resolvePlatformCollision(this.player, platform));

    const groundPlatform = this.player.groundedPlatform;
    if (groundPlatform && groundPlatform.type === 'moving' && groundPlatform.deltaX) {
      this.player.x += groundPlatform.deltaX;
      // Clamp to level boundaries
      if (this.player.x < 0) {
        this.player.x = 0;
      } else if (this.player.x + this.player.width > this.currentLevelWidth) {
        this.player.x = this.currentLevelWidth - this.player.width;
      }
    }

    // Update camera
    this.camera.update(this.player.x, this.player.y, this.currentLevelWidth, this.currentLevelHeight);

    // Collectibles
    this.entities.collectibles.forEach((item) => {
      if (item.collected) return;
      item.update(dt);
      if (checkAABBCollision(this.player.bounds, item.bounds)) {
        item.collected = true;
        this.score += item.value;
        this.updateHUD();
        this.updateBestScore();
      }
    });

    // Notes
    this.entities.notes.forEach((note) => {
      if (note.collected) return;
      note.update(dt);
      if (checkAABBCollision(this.player.bounds, note.bounds)) {
        note.collected = true;
        this.collectedNotes.push({ title: note.title, text: note.text });
        this.showingNote = true;
      }
    });

    // Health Pickups
    this.entities.healthPickups.forEach((pickup) => {
      if (pickup.collected) return;
      pickup.update(dt);
      if (checkAABBCollision(this.player.bounds, pickup.bounds)) {
        pickup.collected = true;
        this.health = Math.min(3, this.health + 1); // Максимум 3 здоровья
        this.updateHUD();
      }
    });

    // Enemies
    this.entities.enemies.forEach((enemy) => {
      enemy.update(dt, this.entities.platforms);
      if (checkAABBCollision(this.player.bounds, enemy.bounds)) {
        this.player.takeDamage(1);
        this.updateHUD();
      }
    });

    // Goal
    if (this.entities.goal && checkAABBCollision(this.player.bounds, this.entities.goal)) {
      this.endLevel(true);
    }

    // Check if player is on a platform (for safe position tracking)
    let isOnPlatform = false;
    this.entities.platforms.forEach((platform) => {
      if (checkAABBCollision(this.player.bounds, platform)) {
        isOnPlatform = true;
        // Update safe position when on platform
        if (this.player.isOnGround) {
          this.lastSafePosition = { x: this.player.x, y: this.player.y };
        }
      }
    });

    // Проверка падения в «ущелье» (ниже уровня земли) — мгновенная смерть
    const groundY = this.height - 24;
    if (this.player.y + this.player.height > groundY + 100 && this.state === 'running') {
      this.endLevel(false);
    }
  }

  endLevel(success) {
    if (success) {
      const isLastLevel = this.currentLevel >= this.levels.length - 1;
      this.state = 'victory';
      this.player.isMoving = false;
      if (isLastLevel) {
        this.hasWonGame = true;
        this.updateBestScore();
        this.render();
        return;
      }
      // Show story before next level
      this.showingStory = true;
      this.storyIndex = this.currentLevel + 1;
      this.render();
      setTimeout(() => {
        this.showingStory = false;
        this.currentLevel += 1;
        this.loadLevel(this.currentLevel);
        this.state = 'running';
        this.lastTimestamp = performance.now();
        requestAnimationFrame(this.loop);
      }, 4000);
    } else {
      this.state = 'gameover';
      this.player.isMoving = false;
      this.render();
    }
  }

  updateHUD() {
    document.getElementById('scoreLabel').textContent = `Очки: ${this.score}`;
    document.getElementById('levelLabel').textContent = `Уровень: ${this.currentLevel + 1}`;
    document.getElementById('healthLabel').textContent = `Здоровье: ${this.health}`;
    const bestNode = document.getElementById('bestLabel');
    if (bestNode) {
      bestNode.textContent = `Рекорд: ${this.bestScore}`;
    }
  }

  render() {
    this.renderer.clear(this.width, this.height, this.camera);
    this.renderer.drawPlatforms(this.entities.platforms, this.camera);
    this.renderer.drawCollectibles(this.entities.collectibles, this.camera);
    this.renderer.drawHealthPickups(this.entities.healthPickups, this.camera);
    this.renderer.drawNotes(this.entities.notes, this.camera);
    this.renderer.drawEnemies(this.entities.enemies, this.camera);
    if (this.entities.goal) {
      this.renderer.drawGoal(this.entities.goal, this.camera);
    }
    this.renderer.drawPlayer(this.player, this.camera);

    if (this.state !== 'running') {
      const status = this.getStatusMessage();
      this.renderer.drawHUDOverlay({
        status,
        width: this.width,
        height: this.height,
      });
    }
    
    // Show collected notes if any
    if (this.showingNote && this.collectedNotes.length > 0) {
      this.renderer.drawNotesOverlay(this.collectedNotes, this.width, this.height);
    }
  }

  loop(timestamp) {
    if (this.state !== 'running') return;
    const delta = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    this.accumulator += delta;

    while (this.accumulator >= this.fixedDt) {
      this.update(this.fixedDt);
      this.accumulator -= this.fixedDt;
    }
    this.render();
    requestAnimationFrame(this.loop);
  }

  getStatusMessage() {
    if (this.state === 'idle') {
      const story = this.getStory(0);
      return {
        title: story ? story.title : 'Нажмите Старт',
        subtitle: story ? story.text : 'Соберите все сферы и доберитесь до портала',
      };
    }
    if (this.state === 'paused') {
      return { title: 'Пауза', subtitle: 'Нажмите "Пауза", чтобы продолжить' };
    }
    if (this.state === 'victory') {
      if (this.hasWonGame) {
        return { title: 'Вы прошли игру!', subtitle: 'Попробуйте побить рекорд очков' };
      }
      if (this.showingStory) {
        const story = this.getStory(this.storyIndex);
        return {
          title: story ? story.title : 'Уровень пройден!',
          subtitle: story ? story.text : 'Загрузка следующего уровня...',
        };
      }
      return { title: 'Уровень пройден!', subtitle: 'Загрузка следующего уровня...' };
    }
    if (this.state === 'gameover') {
      return { title: 'Игра окончена', subtitle: 'Нажмите Рестарт, чтобы попробовать снова' };
    }
    return null;
  }

  getStory(levelIndex) {
    const stories = [
      {
        title: 'Глава 1: Крушение',
        text: 'Ваш корабль потерпел крушение на неизвестной планете. Нужно найти все кристаллы энергии и активировать портал для возвращения домой.',
      },
      {
        title: 'Глава 2: Опасности планеты',
        text: 'Планета полна пропастей и роботов-охранников. Соберите кристаллы и избегайте врагов. Ищите записки - они могут помочь.',
      },
      {
        title: 'Глава 3: Механизмы активированы',
        text: 'Платформы начали двигаться. Враги стали быстрее. Будьте осторожны и используйте движущиеся платформы для продвижения.',
      },
      {
        title: 'Глава 4: Лабиринт',
        text: 'Вы в сложном лабиринте с множеством ям. Каждый шаг опасен. Соберите все кристаллы и найдите выход к порталу.',
      },
      {
        title: 'Глава 5: Финальный путь',
        text: 'Последний уровень перед порталом. Все опасности планеты собраны здесь. Покажите всё своё мастерство!',
      },
    ];
    return stories[levelIndex] || null;
  }

  readBestScore() {
    try {
      return Number(localStorage.getItem(this.storageKey)) || 0;
    } catch {
      return 0;
    }
  }

  updateBestScore() {
    if (this.score <= this.bestScore) return;
    this.bestScore = this.score;
    try {
      localStorage.setItem(this.storageKey, String(this.bestScore));
    } catch (error) {
      console.warn('Не удалось сохранить рекорд', error);
    }
    const bestNode = document.getElementById('bestLabel');
    if (bestNode) {
      bestNode.textContent = `Рекорд: ${this.bestScore}`;
    }
  }

  createLevels() {
    const levelWidth = this.levelWidth; // Уровни в 3 раза шире canvas
    const numLevels = 5;
    const levels = [];

    // Generate levels using generator
    for (let i = 0; i < numLevels; i++) {
      levels.push(this.levelGenerator.generateLevel(i, levelWidth));
    }

    return levels;
  }

  regenerateLevels() {
    this.levels = this.createLevels();
  }

  createLevelsOld() {
    const groundHeight = 24;
    const groundY = this.height - groundHeight;
    const levelWidth = this.width * 3; // Уровни в 3 раза шире canvas
    const makeGround = (startX = 0, endX = levelWidth) => ({
      x: startX,
      y: groundY,
      width: endX - startX,
      height: groundHeight,
    });

    return [
      // Уровень 1: Введение - простой, меньше ям
      {
        width: levelWidth,
        height: this.height,
        spawn: { x: 50, y: groundY - 50 },
        goal: { x: levelWidth - 200, y: groundY - 120, width: 60, height: 120 },
        platforms: [
          makeGround(0, 400), // Длинная начальная платформа
          makeGround(500, 900), // Длинная платформа
          makeGround(1100, 1600), // Длинная платформа
          makeGround(1800, levelWidth), // Финальная платформа
          // Платформы на разных высотах
          { x: 450, y: groundY - 100, width: 50, height: 22 },
          { x: 950, y: groundY - 150, width: 150, height: 22 },
          { x: 1150, y: groundY - 120, width: 100, height: 22 },
          { x: 1400, y: groundY - 180, width: 200, height: 22 },
          { x: 1650, y: groundY - 100, width: 150, height: 22 },
          { x: levelWidth - 180, y: groundY - 120, width: 100, height: 22 },
        ],
        collectibles: [
          { x: 200, y: groundY - 80 },
          { x: 700, y: groundY - 80 },
          { x: 1300, y: groundY - 80 },
          { x: 1900, y: groundY - 80 },
        ],
        healthPickups: [
          { x: 800, y: groundY - 130 },
          { x: 1500, y: groundY - 160 },
        ],
        notes: [
          { x: 600, y: groundY - 110, title: 'Записка #1', text: 'Корабль разбился. Системы повреждены. Нужно найти кристаллы энергии для активации портала.' },
          { x: 1200, y: groundY - 130, title: 'Записка #2', text: 'Роботы-охранники патрулируют территорию. Они не агрессивны, но лучше их избегать.' },
        ],
        enemies: [
          { x: 600, y: groundY - 30, range: 150, speed: 80 }, // Больше расстояния между врагами
          { x: 1400, y: groundY - 30, range: 150, speed: 80 },
        ],
      },
      // Уровень 2: Движущиеся платформы, меньше ям
      {
        width: levelWidth,
        height: this.height,
        spawn: { x: 50, y: groundY - 50 },
        goal: { x: levelWidth - 200, y: groundY - 180, width: 80, height: 180 },
        platforms: [
          makeGround(0, 450), // Длинная платформа
          makeGround(600, 1100), // Длинная платформа
          makeGround(1400, 1900), // Длинная платформа
          makeGround(2100, levelWidth), // Финальная платформа
          // Движущиеся и статичные платформы на разных высотах
          { x: 500, y: groundY - 120, width: 100, height: 22, type: 'moving', range: 60, speed: 100 },
          { x: 1200, y: groundY - 160, width: 200, height: 22 },
          { x: 1450, y: groundY - 140, width: 100, height: 22, type: 'moving', range: 70, speed: 120 },
          { x: 1700, y: groundY - 200, width: 150, height: 22 },
          { x: 2000, y: groundY - 120, width: 100, height: 22 },
          { x: levelWidth - 180, y: groundY - 180, width: 120, height: 22 },
        ],
        collectibles: [
          { x: 250, y: groundY - 80 },
          { x: 800, y: groundY - 80 },
          { x: 1600, y: groundY - 80 },
          { x: 2200, y: groundY - 80 },
        ],
        healthPickups: [
          { x: 1100, y: groundY - 140 },
          { x: 1950, y: groundY - 100 },
        ],
        notes: [
          { x: 750, y: groundY - 100, title: 'Записка #3', text: 'Движущиеся платформы активированы. Используйте их для преодоления пропастей. Будьте осторожны с таймингом!' },
          { x: 1500, y: groundY - 120, title: 'Записка #4', text: 'Враги стали быстрее. Они патрулируют свои зоны. Наблюдайте за их паттернами движения.' },
        ],
        enemies: [
          { x: 700, y: groundY - 30, range: 150, speed: 100 }, // Больше расстояния
          { x: 1600, y: groundY - 30, range: 150, speed: 110 },
        ],
      },
      // Уровень 3: Сложные прыжки, больше разнообразия высот
      {
        width: levelWidth,
        height: this.height,
        spawn: { x: 50, y: groundY - 50 },
        goal: { x: levelWidth - 200, y: groundY - 220, width: 100, height: 220 },
        platforms: [
          makeGround(0, 500), // Длинная платформа
          makeGround(700, 1200), // Длинная платформа
          makeGround(1500, 2100), // Длинная платформа
          makeGround(2300, levelWidth), // Финальная платформа
          // Сложная нелинейная структура с большим разнообразием высот
          { x: 550, y: groundY - 120, width: 150, height: 22 },
          { x: 800, y: groundY - 180, width: 100, height: 22 },
          { x: 1000, y: groundY - 140, width: 200, height: 22, type: 'moving', range: 80, speed: 130 },
          { x: 1300, y: groundY - 200, width: 200, height: 22 },
          { x: 1600, y: groundY - 100, width: 150, height: 22 },
          { x: 1900, y: groundY - 240, width: 200, height: 22 },
          { x: 2200, y: groundY - 160, width: 100, height: 22 },
          { x: levelWidth - 180, y: groundY - 220, width: 140, height: 22 },
        ],
        collectibles: [
          { x: 250, y: groundY - 80 },
          { x: 900, y: groundY - 80 },
          { x: 1700, y: groundY - 80 },
          { x: 2400, y: groundY - 80 },
        ],
        healthPickups: [
          { x: 1250, y: groundY - 180 },
          { x: 2100, y: groundY - 220 },
        ],
        notes: [
          { x: 850, y: groundY - 150, title: 'Записка #5', text: 'Платформы на разных высотах требуют точных прыжков. Тренируйте тайминг и не торопитесь.' },
        ],
        enemies: [
          { x: 600, y: groundY - 30, range: 150, speed: 120 }, // Больше расстояния
          { x: 1400, y: groundY - 30, range: 150, speed: 130 },
          { x: 2000, y: groundY - 30, range: 150, speed: 120 },
        ],
      },
      // Уровень 4: Очень сложный, меньше ям, больше высот
      {
        width: levelWidth,
        height: this.height,
        spawn: { x: 50, y: groundY - 50 },
        goal: { x: levelWidth - 200, y: groundY - 240, width: 120, height: 240 },
        platforms: [
          makeGround(0, 600), // Очень длинная платформа
          makeGround(800, 1400), // Длинная платформа
          makeGround(1700, 2300), // Длинная платформа
          makeGround(2500, levelWidth), // Финальная платформа
          // Очень сложная нелинейная структура с большим разнообразием высот
          { x: 650, y: groundY - 140, width: 150, height: 22, type: 'moving', range: 90, speed: 150 },
          { x: 1000, y: groundY - 200, width: 200, height: 22 },
          { x: 1300, y: groundY - 120, width: 100, height: 22 },
          { x: 1600, y: groundY - 240, width: 100, height: 22 },
          { x: 1900, y: groundY - 180, width: 200, height: 22, type: 'moving', range: 100, speed: 160 },
          { x: 2200, y: groundY - 160, width: 150, height: 22 },
          { x: 2500, y: groundY - 220, width: 200, height: 22 },
          { x: levelWidth - 180, y: groundY - 240, width: 140, height: 22 },
        ],
        collectibles: [
          { x: 300, y: groundY - 80 },
          { x: 1100, y: groundY - 80 },
          { x: 2000, y: groundY - 80 },
          { x: 2600, y: groundY - 80 },
        ],
        healthPickups: [
          { x: 1200, y: groundY - 180 },
          { x: 2400, y: groundY - 200 },
        ],
        notes: [
          { x: 1100, y: groundY - 180, title: 'Записка #6', text: 'Лабиринт становится всё сложнее. Маленькие платформы требуют точности. Не паникуйте, планируйте маршрут.' },
        ],
        enemies: [
          { x: 700, y: groundY - 30, range: 150, speed: 140 }, // Больше расстояния
          { x: 1500, y: groundY - 30, range: 150, speed: 150 },
          { x: 2200, y: groundY - 30, range: 150, speed: 140 },
        ],
      },
      // Уровень 5: Финальный - максимальная сложность, меньше ям
      {
        width: levelWidth,
        height: this.height,
        spawn: { x: 50, y: groundY - 50 },
        goal: { x: levelWidth - 200, y: groundY - 260, width: 140, height: 260 },
        platforms: [
          makeGround(0, 700), // Очень длинная платформа
          makeGround(900, 1600), // Длинная платформа
          makeGround(1900, 2500), // Длинная платформа
          makeGround(2700, levelWidth), // Финальная платформа
          // Максимально сложная структура с большим разнообразием высот
          { x: 750, y: groundY - 160, width: 150, height: 22, type: 'moving', range: 100, speed: 160 },
          { x: 1100, y: groundY - 220, width: 200, height: 22 },
          { x: 1400, y: groundY - 140, width: 200, height: 22 },
          { x: 1700, y: groundY - 260, width: 200, height: 22 },
          { x: 2000, y: groundY - 180, width: 150, height: 22, type: 'moving', range: 110, speed: 170 },
          { x: 2300, y: groundY - 240, width: 200, height: 22 },
          { x: 2600, y: groundY - 200, width: 100, height: 22 },
          { x: levelWidth - 180, y: groundY - 260, width: 160, height: 22 },
        ],
        collectibles: [
          { x: 350, y: groundY - 80 },
          { x: 1200, y: groundY - 80 },
          { x: 2100, y: groundY - 80 },
          { x: 2800, y: groundY - 80 },
        ],
        healthPickups: [
          { x: 1500, y: groundY - 200 },
          { x: 2400, y: groundY - 220 },
        ],
        notes: [
          { x: 1200, y: groundY - 200, title: 'Записка #7', text: 'Последний уровень. Портал близко. Все опасности планеты здесь. Соберите все кристаллы и доберитесь до цели!' },
        ],
        enemies: [
          { x: 800, y: groundY - 30, range: 150, speed: 150 }, // Больше расстояния
          { x: 1700, y: groundY - 30, range: 150, speed: 160 },
          { x: 2400, y: groundY - 30, range: 150, speed: 150 },
        ],
      },
    ];
  }
}