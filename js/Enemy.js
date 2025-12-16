export default class Enemy {
  constructor({ x, y, width = 40, height = 30, speed = 70, range = 120 }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.originX = x;
    this.speed = speed;
    this.range = range;
    this.direction = 1;
  }

  get bounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  update(dt, platforms = []) {
    const oldX = this.x;
    this.x += this.speed * dt * this.direction;
    const minX = this.originX - this.range;
    const maxX = this.originX + this.range;
    
    // Check if enemy would be on a platform at new position
    let onPlatform = false;
    const enemyBottom = this.y + this.height;
    const tolerance = 5; // pixels
    
    for (const platform of platforms) {
      const platformTop = platform.y;
      const platformLeft = platform.x;
      const platformRight = platform.x + platform.width;
      
      // Check if enemy's feet are on this platform
      if (this.x + this.width > platformLeft && 
          this.x < platformRight &&
          Math.abs(enemyBottom - platformTop) < tolerance) {
        onPlatform = true;
        break;
      }
    }
    
    // Reverse direction if at boundary
    if (this.x <= minX) {
      this.x = minX;
      this.direction = 1;
    } else if (this.x >= maxX) {
      this.x = maxX;
      this.direction = -1;
    } else if (!onPlatform && platforms.length > 0) {
      // If about to fall off, reverse direction before moving
      this.direction *= -1;
      this.x = oldX; // Stay at old position
    }
  }
}

