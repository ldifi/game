export default class Platform {
  constructor({ x, y, width, height, type = 'static', range = 0, speed = 0 }) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.type = type;
    this.origin = { x, y };
    this.range = range;
    this.speed = speed;
    this.direction = 1;
    this.prevX = x;
    this.deltaX = 0;
  }

  update(dt) {
    this.prevX = this.x;
    if (this.type === 'moving') {
      this.x += this.speed * dt * this.direction;
      const minX = this.origin.x - this.range;
      const maxX = this.origin.x + this.range;
      if (this.x <= minX) {
        this.x = minX;
        this.direction = 1;
      } else if (this.x >= maxX) {
        this.x = maxX;
        this.direction = -1;
      }
    }
    this.deltaX = this.x - this.prevX;
  }
}

