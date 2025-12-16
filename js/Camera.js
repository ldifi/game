export default class Camera {
  constructor(canvasWidth, canvasHeight) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.x = 0;
    this.y = 0;
    this.targetX = 0;
    this.targetY = 0;
    this.followSpeed = 0.15; // Smooth following
  }

  update(playerX, playerY, levelWidth, levelHeight) {
    // Target position: center player on screen
    this.targetX = playerX - this.canvasWidth / 2;
    this.targetY = playerY - this.canvasHeight / 2;

    // Clamp to level boundaries
    this.targetX = Math.max(0, Math.min(this.targetX, levelWidth - this.canvasWidth));
    this.targetY = Math.max(0, Math.min(this.targetY, levelHeight - this.canvasHeight));

    // Smooth interpolation
    this.x += (this.targetX - this.x) * this.followSpeed;
    this.y += (this.targetY - this.y) * this.followSpeed;
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }

  screenToWorld(screenX, screenY) {
    return {
      x: screenX + this.x,
      y: screenY + this.y,
    };
  }
}

