// HUD и диалоговая система на промисах.
import { sfx } from './audio.js';

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.el = {
      dlg: $('dialogue'), name: $('dlg-name'), text: $('dlg-text'), choices: $('dlg-choices'), hint: $('dlg-hint'),
      objective: $('objective'), prompt: $('prompt'), toast: $('toast'), vision: $('vision-label'),
      crosshair: $('crosshair'), fade: $('fade'), panel: $('panel'),
    };
    this.inDialogue = false;
    this.cursorMode = false;   // нужен ли свободный курсор (выборы, панели)
    this.onCursorRelease = null; // вызывается из обработчика клика — для повторного захвата мыши
    this._advance = null;
    this._typing = null;

    const advance = (e) => {
      if (!this.inDialogue || this.el.choices.childElementCount) return;
      if (e.type === 'keydown' && !['Space', 'Enter', 'KeyE'].includes(e.code)) return;
      if (e.type === 'mousedown' && (e.button !== 0 || e.target.closest?.('button, .screen, #panel'))) return;
      if (this._typing) { this._typing(); return; }
      this._advance?.();
    };
    addEventListener('mousedown', advance);
    addEventListener('keydown', advance);
  }

  objective(text) { this.el.objective.textContent = text ? `Цель: ${text}` : ''; }
  prompt(text) {
    this.el.prompt.textContent = text || '';
    this.el.crosshair.classList.toggle('active', !!text);
  }
  vision(text) { this.el.vision.textContent = text || ''; }

  toast(text, ms = 2600) {
    const t = this.el.toast;
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => t.classList.remove('show'), ms);
  }

  fade(opacity, ms = 1200) {
    this.el.fade.style.transitionDuration = `${ms}ms`;
    this.el.fade.style.opacity = opacity;
    return new Promise((r) => setTimeout(r, ms));
  }

  _open(name, text, thought) {
    this.inDialogue = true;
    this.el.dlg.classList.remove('hidden');
    this.el.name.textContent = name || '';
    this.el.text.classList.toggle('thought', !!thought);
    this.el.choices.innerHTML = '';
    return new Promise((done) => {
      let i = 0;
      const full = text;
      this.el.text.textContent = '';
      const timer = setInterval(() => {
        i += 1;
        this.el.text.textContent = full.slice(0, i);
        if (i % 3 === 0 && full[i - 1] !== ' ') sfx.blip(thought ? 0.8 : 1);
        if (i >= full.length) finish();
      }, 22);
      const finish = () => { clearInterval(timer); this.el.text.textContent = full; this._typing = null; done(); };
      this._typing = finish;
    });
  }

  close() {
    this.inDialogue = false;
    this.el.dlg.classList.add('hidden');
  }

  // Реплика. thought: true — внутренний голос Миши.
  async say(name, text, { thought = false, keepOpen = false } = {}) {
    this.el.hint.classList.remove('hidden');
    await this._open(name, text, thought);
    await new Promise((r) => { this._advance = () => { this._advance = null; r(); }; });
    if (!keepOpen) this.close();
  }

  // Последовательность реплик: [[имя, текст, opts?], ...]
  async lines(list) {
    for (const [n, t, o] of list) await this.say(n, t, { ...(o || {}), keepOpen: true });
    this.close();
  }

  // Выбор варианта. Возвращает индекс.
  async choose(name, text, options) {
    this.el.hint.classList.add('hidden');
    this.cursorMode = true;
    await this._open(name, text, false);
    const pick = await this._buttons(this.el.choices, options);
    this.el.choices.innerHTML = '';
    this.close();
    return pick;
  }

  // Кнопки с горячими клавишами 1..9. Сам клик возвращает захват мыши (жест пользователя).
  _buttons(container, options, { release = true } = {}) {
    document.exitPointerLock?.();
    return new Promise((resolve) => {
      const done = (i) => {
        removeEventListener('keydown', onKey);
        sfx.click();
        if (release) { this.cursorMode = false; this.onCursorRelease?.(); }
        resolve(i);
      };
      const onKey = (e) => {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= options.length) done(n - 1);
      };
      addEventListener('keydown', onKey);
      options.forEach((o, i) => {
        const b = document.createElement('button');
        b.innerHTML = `<span class="key">${i + 1}.</span> ${o}`;
        b.addEventListener('click', (e) => { e.stopPropagation(); done(i); });
        container.appendChild(b);
      });
    });
  }

  // Панель справа (тест, головоломка). html — разметка, buttons — список подписей.
  async panelChoose(html, options, { gridClass = '' } = {}) {
    this.cursorMode = true;
    const p = this.el.panel;
    p.innerHTML = html;
    p.classList.remove('hidden');
    const box = document.createElement('div');
    box.className = gridClass || 'col';
    box.style.display = gridClass ? '' : 'flex';
    box.style.flexDirection = 'column';
    box.style.gap = '6px';
    p.appendChild(box);
    const i = await this._buttons(box, options, { release: false });
    return i;
  }

  hidePanel({ release = true } = {}) {
    this.el.panel.classList.add('hidden');
    this.el.panel.innerHTML = '';
    if (release) { this.cursorMode = false; this.onCursorRelease?.(); }
  }
}
