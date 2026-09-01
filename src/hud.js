// DOM heads-up display: overlay, crosshair, prompts, Power Card, toasts, game panel, modal.
const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.el = {
      overlay: $('overlay'), start: $('btn-start'), status: $('overlay-status'), tagline: $('overlay-tagline'),
      hud: $('hud'), crosshair: $('crosshair'), prompt: $('prompt'), promptText: $('prompt-text'), hint: $('hint'),
      chips: $('card-chips'), tickets: $('card-tickets'), prizes: $('card-prizes'), name: $('card-name'),
      gamehud: $('gamehud'), ghTitle: $('gh-title'), ghScore: $('gh-score'), ghExtra: $('gh-extra'), ghExtraLabel: $('gh-extra-label'), ghExtraWrap: $('gh-extra-wrap'), ghTime: $('gh-time'), ghTimeWrap: $('gh-time-wrap'), ghHelp: $('gh-help'),
      toasts: $('toasts'), modal: $('modal'), modalTitle: $('modal-title'), modalBody: $('modal-body'), modalClose: $('modal-close'), fps: $('fps'),
      quality: $('sel-quality'), audio: $('chk-audio'), reset: $('btn-reset'),
    };
    this.hintTimer = null;
    this.modalOpen = false;
    this.el.modalClose.addEventListener('click', () => this.closeModal());
  }
  setStatus(t) { this.el.status.textContent = t; }
  showOverlay({ title, button = 'CLICK TO ENTER', status = '' } = {}) {
    if (title) this.el.tagline.textContent = title;
    this.el.start.textContent = button;
    this.el.status.textContent = status;
    this.el.overlay.hidden = false;
  }
  hideOverlay() { this.el.overlay.hidden = true; this.el.hud.hidden = false; }
  prompt(text) {
    if (!text) { this.el.prompt.hidden = true; this.el.crosshair.classList.remove('active'); return; }
    if (this.el.promptText.textContent !== text) this.el.promptText.textContent = text;
    this.el.prompt.hidden = false; this.el.crosshair.classList.add('active');
  }
  hint(text, ms = 5000) {
    clearTimeout(this.hintTimer);
    this.el.hint.textContent = text; this.el.hint.classList.add('show');
    this.hintTimer = setTimeout(() => this.el.hint.classList.remove('show'), ms);
  }
  toast(text, kind = '', ms = 3200) {
    const d = document.createElement('div');
    d.className = `toast ${kind}`; d.textContent = text;
    this.el.toasts.appendChild(d);
    setTimeout(() => d.classList.add('fade'), ms - 500);
    setTimeout(() => d.remove(), ms);
  }
  card(state, what) {
    this.el.chips.textContent = state.chips;
    this.el.tickets.textContent = state.tickets;
    this.el.prizes.textContent = state.prizes.length;
    this.el.name.textContent = state.name;
    const bump = { chips: this.el.chips, tickets: this.el.tickets, prizes: this.el.prizes }[what];
    if (bump) { bump.classList.remove('bump'); void bump.offsetWidth; bump.classList.add('bump'); }
  }
  game({ title, score = 0, extraLabel = null, extra = null, time = null, help = '' } = {}) {
    this.el.gamehud.hidden = false;
    this.el.ghTitle.textContent = title;
    this.el.ghScore.textContent = score;
    this.el.ghExtraWrap.style.display = extraLabel == null ? 'none' : '';
    if (extraLabel != null) { this.el.ghExtraLabel.textContent = extraLabel; this.el.ghExtra.textContent = extra; }
    this.el.ghTimeWrap.style.display = time == null ? 'none' : '';
    if (time != null) this.el.ghTime.textContent = Math.max(0, Math.ceil(time));
    if (help !== undefined) this.el.ghHelp.innerHTML = help;
  }
  gameUpdate({ score, extra, time }) {
    if (score != null) this.el.ghScore.textContent = score;
    if (extra != null) this.el.ghExtra.textContent = extra;
    if (time != null) this.el.ghTime.textContent = Math.max(0, Math.ceil(time));
  }
  hideGame() { this.el.gamehud.hidden = true; }
  modal(title, bodyHTML) {
    this.el.modalTitle.textContent = title; this.el.modalBody.innerHTML = bodyHTML;
    this.el.modal.hidden = false; this.modalOpen = true;
    return this.el.modalBody;
  }
  closeModal() { this.el.modal.hidden = true; this.modalOpen = false; this.onModalClose?.(); }
  fps(text) { this.el.fps.hidden = !text; if (text) this.el.fps.textContent = text; }
}
