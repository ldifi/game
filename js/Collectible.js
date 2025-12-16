export default class Collectible {
  constructor({ x, y, radius = 10, value = 10 }) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.value = value;
    this.collected = false;
    this.pulse = Math.random() * Math.PI * 2;
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
    this.pulse += dt * 2;
  }
}

