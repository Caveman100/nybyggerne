// Nybyggerne – gemmer små ting i browseren (navn, indstillinger, igangværende spil).
export const store = {
  get(k, sess) { try { const v = (sess ? sessionStorage : localStorage).getItem('nyb-' + k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v, sess) { try { (sess ? sessionStorage : localStorage).setItem('nyb-' + k, JSON.stringify(v)); } catch (e) {} },
};
export const randId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
