// input.js — unified keyboard + touch input. poll() returns a per-frame command.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.pressedThisFrame = new Set();
    this.mouseX = 0;
    this.mouseY = 0;

    // Touch joystick + action latches
    this.joy = { active: false, id: null, baseX: 0, baseY: 0, dx: 0, dy: 0 };
    this.touchDash = false;
    this.touchSing = false;

    this._bindKeyboard();
    this._bindTouch();
  }

  _bindKeyboard() {
    const block = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Spacebar']);
    window.addEventListener('keydown', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (block.has(e.key)) e.preventDefault();
      if (!this.keys.has(k)) this.pressedThisFrame.add(k);
      this.keys.add(k);
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      this.keys.delete(k);
    });
    window.addEventListener('blur', () => this.keys.clear());
    window.addEventListener('mousemove', (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - r.left;
      this.mouseY = e.clientY - r.top;
    });
  }

  _bindTouch() {
    const el = this.canvas;
    const startRadius = 70;
    const onStart = (e) => {
      for (const t of e.changedTouches) {
        const r = el.getBoundingClientRect();
        const x = t.clientX - r.left;
        const y = t.clientY - r.top;
        if (x < r.width * 0.5 && !this.joy.active) {
          this.joy.active = true; this.joy.id = t.identifier;
          this.joy.baseX = x; this.joy.baseY = y; this.joy.dx = 0; this.joy.dy = 0;
        }
      }
      e.preventDefault();
    };
    const onMove = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) {
          const r = el.getBoundingClientRect();
          const x = t.clientX - r.left;
          const y = t.clientY - r.top;
          let dx = x - this.joy.baseX;
          let dy = y - this.joy.baseY;
          const len = Math.hypot(dx, dy) || 1;
          const cl = Math.min(len, startRadius) / startRadius;
          this.joy.dx = (dx / len) * cl;
          this.joy.dy = (dy / len) * cl;
        }
      }
      e.preventDefault();
    };
    const onEnd = (e) => {
      for (const t of e.changedTouches) {
        if (t.identifier === this.joy.id) { this.joy.active = false; this.joy.id = null; this.joy.dx = 0; this.joy.dy = 0; }
      }
    };
    el.addEventListener('touchstart', onStart, { passive: false });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
  }

  bindButton(elDash, elSing) {
    const press = (prop) => (e) => { this[prop] = true; e.preventDefault(); };
    if (elDash) {
      elDash.addEventListener('touchstart', press('touchDash'), { passive: false });
      elDash.addEventListener('mousedown', press('touchDash'));
    }
    if (elSing) {
      elSing.addEventListener('touchstart', press('touchSing'), { passive: false });
      elSing.addEventListener('mousedown', press('touchSing'));
    }
  }

  isDown(...keys) { return keys.some((k) => this.keys.has(k)); }
  justPressed(...keys) { return keys.some((k) => this.pressedThisFrame.has(k)); }

  poll() {
    let mx = 0, my = 0;
    if (this.isDown('a', 'ArrowLeft')) mx -= 1;
    if (this.isDown('d', 'ArrowRight')) mx += 1;
    if (this.isDown('w', 'ArrowUp')) my -= 1;
    if (this.isDown('s', 'ArrowDown')) my += 1;
    if (this.joy.active) { mx += this.joy.dx; my += this.joy.dy; }

    const cmd = {
      moveX: mx,
      moveY: my,
      dash: this.justPressed(' ', 'Spacebar', 'k') || this.touchDash,
      singularity: this.justPressed('Shift', 'e', 'j') || this.touchSing,
      pause: this.justPressed('Escape', 'p'),
      restart: this.justPressed('r'),
      confirm: this.justPressed('Enter', ' '),
      choose: this.pressedThisFrame.has('1') ? 0 : this.pressedThisFrame.has('2') ? 1 : this.pressedThisFrame.has('3') ? 2 : -1,
    };

    this.pressedThisFrame.clear();
    this.touchDash = false;
    this.touchSing = false;
    return cmd;
  }
}
