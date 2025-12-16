export default class Note {
  constructor({ x, y, text, title }) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.title = title;
    this.collected = false;
    this.pulse = Math.random() * Math.PI * 2;
    this.radius = 12;
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
      this.pulse += dt * 2;
    }
  }
}

