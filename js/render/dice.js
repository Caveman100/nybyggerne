// Nybyggerne – terningerne.
// Terningerne er almindelige HTML-elementer (CSS 3D), ikke en del af Three.js-scenen:
// ved et slag kastes to elfenbensterninger hen over bordet, triller, hopper og lander midt
// på skærmen. Derefter glider de ned i bakken øverst til højre. Udseendet står i css/dice.css.
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.

// Rotation der vender en bestemt side op mod spilleren
const SHOW = { 1: [0, 0], 6: [0, 180], 2: [0, -90], 5: [0, 90], 3: [-90, 0], 4: [90, 0] };
// Hvor prikkerne sidder i et 3×3-gitter
const PIPS = { 1: [5], 2: [1, 9], 3: [1, 5, 9], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
const FACES = { 1: 'front', 6: 'back', 2: 'right', 5: 'left', 3: 'top', 4: 'bottom' };

function makeDie() {
  const wrap = document.createElement('div'); wrap.className = 'die-wrap';
  const cube = document.createElement('div'); cube.className = 'die';
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const f = document.createElement('div'); f.className = `face ${FACES[n]}${n === 1 ? ' one' : ''}`;
    for (let k = 1; k <= 9; k++) { const p = document.createElement('i'); if (PIPS[n].includes(k)) p.className = 'pip'; f.appendChild(p); }
    cube.appendChild(f);
  }
  const shadow = document.createElement('div'); shadow.className = 'die-shadow';
  wrap.append(shadow, cube);
  return { wrap, cube, shadow };
}
const rot = (n, twist = 0) => `rotateZ(${twist}deg) rotateX(${SHOW[n][0]}deg) rotateY(${SHOW[n][1]}deg)`;

export class DiceParts {
  _buildDice() {
    // Bakken øverst til højre
    this.tray = document.createElement('div'); this.tray.className = 'dice-tray';
    this.trayDice = [makeDie(), makeDie()];
    this.trayDice.forEach(d => this.tray.appendChild(d.wrap));
    // Kastet midt på skærmen
    this.throwLayer = document.createElement('div'); this.throwLayer.className = 'dice-throw'; this.throwLayer.hidden = true;
    this.throwDice = [makeDie(), makeDie()];
    this.throwDice.forEach(d => this.throwLayer.appendChild(d.wrap));
    this.container.append(this.tray, this.throwLayer);
    this._placeDiceTray();
    this.setDice([3, 4], false);
  }

  _placeDiceTray() {
    const r = this.diceRect(); if (!r || !this.tray) return;
    Object.assign(this.tray.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    this.tray.style.setProperty('--ds', Math.round(r.h * 0.42) + 'px');
  }

  setDice(vals, animate) {
    const R = Math.random;
    const showInTray = () => this.trayDice.forEach((d, i) => { d.cube.style.transform = rot(vals[i], (R() - 0.5) * 30); });
    if (!animate) { showInTray(); this.onDiceDone(vals); return; }

    const { w, h } = this.size;
    const size = Math.round(Math.min(110, Math.max(64, Math.min(w, h) * 0.11)));
    this.throwLayer.style.setProperty('--ds', size + 'px');
    this.throwLayer.classList.remove('fade'); this.throwLayer.hidden = false;
    const cx = w / 2, cy = h * 0.46, from = R() < 0.5 ? -1 : 1;   // kastes ind fra venstre eller højre
    let landed = 0;
    this.throwDice.forEach((d, i) => {
      const endX = cx + (i ? 0.75 : -0.75) * size + (R() - 0.5) * size * 0.4 - size / 2;
      const endY = cy + (R() - 0.5) * size * 0.5 - size / 2;
      const startX = from < 0 ? -size * 2 : w + size, startY = h * (0.75 + R() * 0.15);
      const twist = (R() - 0.5) * 50, sx = (R() < 0.5 ? -1 : 1) * 360 * (2 + Math.floor(R() * 2)), sy = (R() < 0.5 ? -1 : 1) * 360 * (1 + Math.floor(R() * 2));
      const [fx, fy] = SHOW[vals[i]];
      const dur = 1250 + i * 120;
      // Banen: tre hop, der bliver lavere og lavere
      const path = [[0, 1, 0], [0.38, 0.32, 1.35], [0.55, 0.12, 1], [0.7, 0.06, 1.12], [0.82, 0.02, 1], [0.9, 0.005, 1.04], [1, 0, 1]];
      d.wrap.animate(path.map(([o, k, sc]) => ({ offset: o, transform: `translate(${startX + (endX - startX) * (1 - k)}px, ${startY + (endY - startY) * (1 - k)}px) scale(${sc})` })),
        { duration: dur, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
      d.shadow.animate([{ opacity: 0.15, transform: 'translate(18px, 26px) scale(1.3)' }, { offset: 0.38, opacity: 0.1, transform: 'translate(40px, 50px) scale(1.6)' }, { opacity: 0.55, transform: 'translate(6px, 8px) scale(1)' }],
        { duration: dur, easing: 'ease-out', fill: 'forwards' });
      d.cube.animate([
        { transform: `rotateZ(${twist + 200}deg) rotateX(${fx + sx}deg) rotateY(${fy + sy}deg)` },
        { offset: 0.55, transform: `rotateZ(${twist + 30}deg) rotateX(${fx + sx * 0.18}deg) rotateY(${fy + sy * 0.15}deg)` },
        { transform: `rotateZ(${twist}deg) rotateX(${fx}deg) rotateY(${fy}deg)` },
      ], { duration: dur, easing: 'cubic-bezier(.15,.6,.25,1)', fill: 'forwards' }).onfinish = () => {
        if (++landed < 2) return;
        showInTray();
        this._diceLanded(vals);
        // lad dem ligge et øjeblik, og lad dem så forsvinde
        clearTimeout(this._diceFade);
        this._diceFade = setTimeout(() => { this.throwLayer.classList.add('fade'); this._diceFade = setTimeout(() => (this.throwLayer.hidden = true), 450); }, 1100);
      };
    });
    this._sound('dice');
  }

  _diceLanded(vals) {
    const f = this.pendingFlash; this.pendingFlash = null;
    if (f && f.n !== 7) this.flashProduction(f);
    this.onDiceDone(vals);
  }
}
