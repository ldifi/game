export default class Player {
  constructor(game) {
    this.game = game;
    this.width = 36;
    this.height = 48;
    this.reset();
  }

  reset() {
    this.x = 80;
    this.y = this.game.height - this.height - 10;
    this.velocity = { x: 0, y: 0 };
    this.speed = 260;
    this.jumpForce = 720;
    this.isOnGround = false;
    this.invulnerableTimer = 0;
    this.facing = 1;
    this.animationTime = 0;
    this.floatTime = 0;
    this.isMoving = false;
    this.groundedPlatform = null;
  }

  get bounds() {
    return {
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  update(dt, input) {
    const wasOnGround = this.isOnGround;
    this.isOnGround = false;
    this.groundedPlatform = null;
    const acceleration = 1800;
    const friction = 1800;

    // Horizontal movement
    if (input.isPressed('left')) {
      this.velocity.x = Math.max(this.velocity.x - acceleration * dt, -this.speed);
    } else if (input.isPressed('right')) {
      this.velocity.x = Math.min(this.velocity.x + acceleration * dt, this.speed);
    } else {
      // apply friction
      if (this.velocity.x > 0) {
        this.velocity.x = Math.max(this.velocity.x - friction * dt, 0);
      } else if (this.velocity.x < 0) {
        this.velocity.x = Math.min(this.velocity.x + friction * dt, 0);
      }
    }

    if (this.velocity.x > 40) {
      this.facing = 1;
    } else if (this.velocity.x < -40) {
      this.facing = -1;
    }

    // Jump
    if (wasOnGround && input.isPressed('jump')) {
      this.velocity.y = -this.jumpForce;
    }

    // Gravity
    this.velocity.y += this.game.gravity * dt;

    // Integrate
    this.x += this.velocity.x * dt;
    this.y += this.velocity.y * dt;

    // Constrain inside level boundaries
    if (this.x < 0) {
      this.x = 0;
      this.velocity.x = 0;
    } else if (this.x + this.width > this.game.currentLevelWidth) {
      this.x = this.game.currentLevelWidth - this.width;
      this.velocity.x = 0;
    }

    // Не ограничиваем игрока по нижней границе уровня,
    // чтобы он мог падать в «ущелья» сквозь текстуры.

    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer -= dt;
    }
    if (this.isOnGround) {
      this.floatTime = 0;
    } else {
      this.floatTime += dt * 3;
    }

    const horizontalSpeed = Math.abs(this.velocity.x);
    const movingNow = (wasOnGround || this.isOnGround) && horizontalSpeed > 60;
    if (movingNow !== this.isMoving) {
      this.isMoving = movingNow;
    }

    if (this.isMoving) {
      const speedFactor = Math.min(horizontalSpeed / this.speed, 1);
      const baseAnimSpeed = 6 + speedFactor * 6;
      this.animationTime = (this.animationTime + dt * baseAnimSpeed) % (Math.PI * 2);
    } else {
      this.animationTime = 0;
    }
  }

  takeDamage(amount) {
    if (this.invulnerableTimer > 0) return;
    this.game.health = Math.max(0, this.game.health - amount);
    this.invulnerableTimer = 1.2; // seconds of invulnerability
    this.isMoving = false;
    if (this.game.health <= 0) {
      this.game.endLevel(false);
    }
  }
}

