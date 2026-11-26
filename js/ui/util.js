// Nybyggerne – små hjælpere til skærmen: find element, beskyt tekst, beskeder og ikoner.

import G from '../game/index.js';
import { Sound } from '../sound.js';
import { CARD_IMAGES } from '../assets.js';

import { app } from './state.js';
export const RES = G.RES;
export const $ = id => document.getElementById(id);
export const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export let toastTimer;
export function toast(msg, kind, ms = 3200) { const t = $('toast'); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), ms); if (kind === 'error') Sound.play('error'); }
export function banner(msg) { const b = $('banner'); b.textContent = msg || ''; b.hidden = !msg; }
export const pname = i => { const p = app.state && app.state.players[i]; return p ? `<span class="pn" style="color:${shade(p.color)}">${esc(p.name)}</span>` : '?'; };
export const shade = c => (c === '#e0b52c' ? '#a07a0c' : c);
export const fmtLog = m => esc(m).replace(/\[\[(\d)\]\]/g, (_, i) => pname(+i));
export const icon = (k, small) => {
  if (CARD_IMAGES[k]) return `<img class="art res-${k}${small ? ' sm' : ''}" src="${CARD_IMAGES[k]}" alt="${G.RES_DA[k]}">`;

  return `<span class="em">${G.RES_ICON[k]}</span>`;
};
export const resLine = r => RES.filter(k => r[k] > 0).map(k => `${r[k]} ${G.RES_ICON[k]}`).join(' ') || '–';
