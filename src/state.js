// Power Card economy: chips to play, tickets to redeem, prizes won. Persisted in localStorage.
const KEY = 'db-arcade-sim-card-v1';
const listeners = [];

export const state = {
  chips: 120,
  tickets: 0,
  prizes: [],
  name: 'GUEST',
  stats: { gamesPlayed: 0, ticketsEarned: 0, bestSkee: 0, bestHoops: 0 },
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw);
      Object.assign(state, s);
      state.stats = { ...{ gamesPlayed: 0, ticketsEarned: 0, bestSkee: 0, bestHoops: 0 }, ...(s.stats || {}) };
    }
  } catch (e) { /* storage unavailable: play as guest */ }
  emit();
}
export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
}
export function reset() {
  state.chips = 120; state.tickets = 0; state.prizes = []; state.stats = { gamesPlayed: 0, ticketsEarned: 0, bestSkee: 0, bestHoops: 0 };
  save(); emit();
}
export function onChange(fn) { listeners.push(fn); }
function emit(what) { listeners.forEach(fn => fn(state, what)); }

export function spend(n) {
  if (state.chips < n) return false;
  state.chips -= n; state.stats.gamesPlayed++;
  save(); emit('chips');
  return true;
}
export function addChips(n) { state.chips += n; save(); emit('chips'); }
export function addTickets(n) {
  if (n <= 0) return;
  state.tickets += n; state.stats.ticketsEarned += n;
  save(); emit('tickets');
}
export function spendTickets(n) {
  if (state.tickets < n) return false;
  state.tickets -= n; save(); emit('tickets');
  return true;
}
export function addPrize(p) { state.prizes.push(p); save(); emit('prizes'); }
