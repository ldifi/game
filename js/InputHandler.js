export default class InputHandler {
  constructor() {
    this.active = new Set();
    this.listeners = [];
    this._bindEvents();
  }

  isPressed(action) {
    return this.active.has(action);
  }

  clear() {
    this.active.clear();
  }

  destroy() {
    this.listeners.forEach(({ type, handler }) => {
      window.removeEventListener(type, handler);
    });
    this.listeners = [];
  }

  _bindEvents() {
    const keydownHandler = (event) => {
      const action = this._mapKey(event.key);
      if (!action) return;
      event.preventDefault();
      this.active.add(action);
    };

    const keyupHandler = (event) => {
      const action = this._mapKey(event.key);
      if (!action) return;
      event.preventDefault();
      this.active.delete(action);
    };

    this.listeners.push(
      { type: 'keydown', handler: keydownHandler },
      { type: 'keyup', handler: keyupHandler },
    );

    window.addEventListener('keydown', keydownHandler);
    window.addEventListener('keyup', keyupHandler);
  }

  _mapKey(key) {
    if (!key) return null;
    const normalized = key === ' ' ? 'space' : key.toLowerCase();
    if (normalized === 'arrowleft' || normalized === 'a') return 'left';
    if (normalized === 'arrowright' || normalized === 'd') return 'right';
    if (normalized === 'arrowup' || normalized === 'w' || normalized === 'space' || normalized === 'spacebar')
      return 'jump';
    return null;
  }
}

