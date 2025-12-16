import Platform from './Platform.js';
import Collectible from './Collectible.js';
import Enemy from './Enemy.js';
import Note from './Note.js';
import HealthPickup from './HealthPickup.js';

export default class LevelGenerator {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundHeight = 24;
    this.groundY = canvasHeight - this.groundHeight;
  }

  generateLevel(levelIndex, levelWidth) {
    const difficulty = levelIndex + 1;
    const level = {
      width: levelWidth,
      height: this.canvasHeight,
      spawn: { x: 50, y: this.groundY - 50 },
      goal: { x: levelWidth - 200, y: this.groundY - (100 + difficulty * 20), width: 60 + difficulty * 10, height: 120 + difficulty * 20 },
      platforms: [],
      collectibles: [],
      enemies: [],
      notes: [],
      healthPickups: [],
    };

    // Generate ground platforms (fewer gaps = fewer pits)
    const groundPlatforms = this.generateGroundPlatforms(levelWidth, difficulty);
    level.platforms.push(...groundPlatforms);

    // Generate floating platforms at different heights
    const floatingPlatforms = this.generateFloatingPlatforms(levelWidth, difficulty);
    level.platforms.push(...floatingPlatforms);

    // Generate collectibles (часть на земле, часть на платформах)
    level.collectibles = this.generateCollectibles(levelWidth, difficulty, level.platforms);

    // Generate enemies (with more distance between them)
    level.enemies = this.generateEnemies(levelWidth, difficulty);

    // Generate health pickups
    level.healthPickups = this.generateHealthPickups(levelWidth, difficulty, level.platforms);

    // Generate notes
    level.notes = this.generateNotes(levelWidth, levelIndex, level.platforms);

    // Place goal platform
    level.platforms.push({
      x: levelWidth - 200,
      y: this.groundY - (100 + difficulty * 20),
      width: 100,
      height: 22,
    });

    return level;
  }

  generateGroundPlatforms(levelWidth, difficulty) {
    const platforms = [];
    const minPlatformLength = 400 + difficulty * 50;
    const maxPlatformLength = 700 + difficulty * 100;
    const minGapLength = 80;
    const maxGapLength = 150;

    let currentX = 0;
    const numPlatforms = Math.floor(levelWidth / (minPlatformLength + maxGapLength)) + 1;

    for (let i = 0; i < numPlatforms && currentX < levelWidth; i++) {
      const platformLength = minPlatformLength + Math.random() * (maxPlatformLength - minPlatformLength);
      const endX = Math.min(currentX + platformLength, levelWidth);

      if (endX > currentX) {
        platforms.push({
          x: currentX,
          y: this.groundY,
          width: endX - currentX,
          height: this.groundHeight,
        });
      }

      // Add gap
      const gapLength = minGapLength + Math.random() * (maxGapLength - minGapLength);
      currentX = endX + gapLength;
    }

    // Ensure final platform reaches end
    if (platforms.length > 0) {
      const lastPlatform = platforms[platforms.length - 1];
      if (lastPlatform.x + lastPlatform.width < levelWidth) {
        platforms.push({
          x: lastPlatform.x + lastPlatform.width,
          y: this.groundY,
          width: levelWidth - (lastPlatform.x + lastPlatform.width),
          height: this.groundHeight,
        });
      }
    }

    return platforms;
  }

  generateFloatingPlatforms(levelWidth, difficulty) {
    const platforms = [];
    const numPlatforms = 6 + difficulty * 2;
    // Отступы по высоте от земли: чем больше значение, тем выше платформа.
    const heightVariations = [60, 90, 120, 150, 180];
    const minDistance = 140;
    const maxDistance = 200;

    // Максимальная разница высот между соседними платформами,
    // чтобы игрок мог допрыгнуть (рассчитано исходя из jumpForce и gravity).
    const maxHeightStep = 120;

    let lastPlatformX = 200;
    let lastHeightOffset =
      heightVariations[Math.floor(Math.random() * 2)]; // начинаем с относительно низкой платформы

    for (let i = 0; i < numPlatforms; i++) {
      const distance = minDistance + Math.random() * (maxDistance - minDistance);
      const x = lastPlatformX + distance;
      if (x > levelWidth - 400) break;

      // Выбираем высоту так, чтобы:
      // - отличалась от предыдущей
      // - разница не превышала maxHeightStep (игрок может допрыгнуть)
      const allowedHeights = heightVariations.filter((h) => {
        const diff = Math.abs(h - lastHeightOffset);
        return diff > 10 && diff <= maxHeightStep;
      });
      const heightOffset = (allowedHeights.length > 0
        ? allowedHeights[Math.floor(Math.random() * allowedHeights.length)]
        : heightVariations[Math.floor(Math.random() * heightVariations.length)]
      );

      const width = 80 + Math.random() * 90;
      const isMoving = Math.random() < 0.25 + difficulty * 0.08;

      const platform = {
        x: x,
        y: this.groundY - heightOffset,
        width: width,
        height: 22,
      };

      if (isMoving) {
        platform.type = 'moving';
        platform.range = 60 + difficulty * 10;
        platform.speed = 100 + difficulty * 20;
      }

      platforms.push(platform);
      lastPlatformX = x + width * 0.5;
      lastHeightOffset = heightOffset;
    }

    return platforms;
  }

  generateCollectibles(levelWidth, difficulty, platforms) {
    const collectibles = [];
    const totalCollectibles = 4 + Math.floor(difficulty * 0.5);
    const groundPlatforms = platforms.filter((p) => p.y === this.groundY);
    const elevatedPlatforms = platforms.filter((p) => p.y !== this.groundY);

    for (let i = 0; i < totalCollectibles; i++) {
      const preferGround = i < Math.ceil(totalCollectibles / 2);
      const candidates = preferGround
        ? groundPlatforms.length ? groundPlatforms : platforms
        : elevatedPlatforms.length ? elevatedPlatforms : platforms;
      const platform = this.pickRandomPlatform(candidates);
      const position = this.pointOnPlatform(platform, levelWidth);
      collectibles.push(position);
    }

    return collectibles;
  }

  generateEnemies(levelWidth, difficulty) {
    const enemies = [];
    const numEnemies = 2 + Math.floor(difficulty * 0.5);
    const minDistance = 600; // Больше расстояния между врагами
    const spacing = levelWidth / (numEnemies + 1);

    for (let i = 0; i < numEnemies; i++) {
      const baseX = spacing * (i + 1);
      const x = baseX + (Math.random() - 0.5) * 200;
      
      enemies.push({
        x: Math.max(200, Math.min(x, levelWidth - 200)),
        y: this.groundY - 30,
        range: 120 + difficulty * 10,
        speed: 80 + difficulty * 15,
      });
    }

    return enemies;
  }

  generateHealthPickups(levelWidth, difficulty, platforms) {
    const pickups = [];
    const numPickups = 2;
    const candidates = platforms.filter((p) => p.width >= 80);

    for (let i = 0; i < numPickups; i++) {
      const platform = this.pickRandomPlatform(candidates.length ? candidates : platforms);
      const position = this.pointOnPlatform(platform, levelWidth);
      pickups.push(position);
    }

    return pickups;
  }

  generateNotes(levelWidth, levelIndex, platforms) {
    const notes = [];
    const noteTexts = [
      { title: 'Записка #1', text: 'Корабль разбился. Системы повреждены. Нужно найти кристаллы энергии для активации портала.' },
      { title: 'Записка #2', text: 'Роботы-охранники патрулируют территорию. Они не агрессивны, но лучше их избегать.' },
      { title: 'Записка #3', text: 'Движущиеся платформы активированы. Используйте их для преодоления пропастей. Будьте осторожны с таймингом!' },
      { title: 'Записка #4', text: 'Враги стали быстрее. Они патрулируют свои зоны. Наблюдайте за их паттернами движения.' },
      { title: 'Записка #5', text: 'Платформы на разных высотах требуют точных прыжков. Тренируйте тайминг и не торопитесь.' },
      { title: 'Записка #6', text: 'Лабиринт становится всё сложнее. Маленькие платформы требуют точности. Не паникуйте, планируйте маршрут.' },
      { title: 'Записка #7', text: 'Последний уровень. Портал близко. Все опасности планеты здесь. Соберите все кристаллы и доберитесь до цели!' },
    ];

    if (levelIndex < noteTexts.length) {
      const platform = this.pickRandomPlatform(
        platforms,
        (p) => p.width >= 70 && p.y <= this.groundY - 40
      );
      const position = this.pointOnPlatform(platform, levelWidth);
      notes.push({
        x: position.x,
        y: position.y,
        title: noteTexts[levelIndex].title,
        text: noteTexts[levelIndex].text,
      });
    }

    return notes;
  }

  pickRandomPlatform(platforms, predicate = () => true) {
    if (!platforms || platforms.length === 0) return null;
    const pool = platforms.filter(predicate);
    if (pool.length === 0) {
      return platforms[Math.floor(Math.random() * platforms.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }

  pointOnPlatform(platform, levelWidth) {
    if (!platform) {
      return {
        x: Math.random() * Math.max(levelWidth, this.canvasWidth),
        y: this.groundY - 35,
      };
    }
    const margin = Math.min(40, platform.width * 0.2);
    const usableWidth = Math.max(10, platform.width - margin * 2);
    return {
      x: platform.x + margin + Math.random() * usableWidth,
      y: platform.y - 35,
    };
  }
}

