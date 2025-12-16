export default class HealthPickup {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;
    this.radius = 16;
    this.pulse = Math.random() * Math.PI * 2;
    this.collected = false;
  }

  get bounds() {
    return {
      x: this.x - this.radius,
      y: this.y - this.radius,
      width: this.radius * 2,
      height: this.radius * 2,
    };
  }

  update(dt) {
    if (!this.collected) {
      this.pulse += dt * 3;
    }
  }
}

