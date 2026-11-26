// Nybyggerne – 3D-brættet: Animationer og effekter: brikker der popper op, støv, og kort der flyver hen til spillerne.
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.
import * as THREE from 'three';
import { K, CW, CH, CT, ease } from './constants.js';
import { wrap } from './textures.js';

export class EffectParts {
  _anim(dur, step, done) { this.anims.push({ t0: performance.now(), dur: dur * 1000, step, done }); }

  _popIn(obj, height) {
    const y0 = obj.position.y;
    obj.scale.setScalar(0.01);
    this._anim(0.55, t => {
      const e = ease.outBack(t);
      obj.scale.setScalar(Math.max(0.01, e));
      obj.position.y = y0 + (1 - ease.outCubic(t)) * height;
    }, () => { obj.scale.setScalar(1); obj.position.y = y0; });
  }

  screenToWorld(pt) {
    if (!pt || !this.size) return null;
    const ndc = new THREE.Vector2((pt.x / this.size.w) * 2 - 1, -(pt.y / this.size.h) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -1.2), hit) ? hit : null;
  }

  _flyCard(from, to, res, faceUp, delay) {
    const card = this._card(this._cardFront(res), this._cardBack(false), faceUp);
    card.visible = false;
    this.scene.add(card);
    const end = to.clone().setY(1.2);
    const spin = (Math.random() - 0.5) * 0.6;
    this._anim(1.25 + delay, t => {
      const tt = Math.max(0, Math.min(1, (t * (1.25 + delay) - delay) / 1.25));
      card.visible = tt > 0;
      const e = ease.inOutCubic(tt);
      card.position.lerpVectors(from, end, e);
      card.position.y += Math.sin(tt * Math.PI) * 2.2;
      const sc = 1 + Math.sin(tt * Math.PI) * 0.6;
      card.scale.set(sc, sc, sc);
      card.rotation.y = spin * (1 - tt);
    }, () => { this.scene.remove(card); });
  }

  _dust(pos, size = 1) {
    const tex = this._softTex();
    for (let k = 0; k < 10; k++) {
      const m = new THREE.SpriteMaterial({ map: tex, color: '#d9c7a3', transparent: true, depthWrite: false, opacity: 0.8 });
      const sp = new THREE.Sprite(m);
      const a = (k / 10) * Math.PI * 2 + Math.random() * 0.4;
      const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      sp.position.copy(pos).setY(0.08);
      this.scene.add(sp);
      this._anim(0.8 + Math.random() * 0.3, t => {
        const e = ease.outCubic(t);
        sp.position.set(pos.x + dir.x * e * 0.45 * size, 0.08 + e * 0.18, pos.z + dir.z * e * 0.45 * size);
        sp.scale.setScalar((0.12 + e * 0.28) * size);
        m.opacity = 0.75 * (1 - t);
      }, () => { this.scene.remove(sp); m.dispose(); });
    }
  }

  flashProduction(info) {
    const G = this.G;
    info.hexes.forEach((h, i) => {
      if (h.number !== info.n || i === info.robber) return;
      const hi = this.hexInfo[i];
      const ringMat = new THREE.MeshBasicMaterial({ color: '#ffd76a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(K * 0.55, K * 1.0, 6, 1, Math.PI / 6), ringMat);
      ring.rotation.x = -Math.PI / 2; ring.position.set(hi.x, 0.12, hi.z);
      this.scene.add(ring);
      this._anim(1.8, t => { ringMat.opacity = Math.sin(t * Math.PI) * 0.8; }, () => { this.scene.remove(ring); ringMat.dispose(); });
      // Kort flyver fra feltet hen til spillernes pladser
      const res = G.TERRAIN_RES[h.terrain];
      let k = 0;
      G.HEXES[i].verts.forEach(v => {
        const b = info.buildings[v];
        const to = b && this.screenToWorld(this.flyTarget && this.flyTarget(b.owner));
        if (!to) return;
        for (let j = 0; j < (b.type === 'city' ? 2 : 1); j++) this._flyCard(new THREE.Vector3(hi.x, 0.4, hi.z), to, res === 'gold' ? 'ore' : res, b.owner === this.lastMe && res !== 'gold', (k++) * 0.18);
      });
      const tk = this.tokens.find(x => x.hex === i);
      if (tk) this._anim(0.9, t => { const s = tk.base * (1 + Math.sin(t * Math.PI) * 0.35); tk.sprite.scale.set(s, s, 1); });
    });
    this._sound('chime');
  }

  _cardFront(kind) {
    this._fronts = this._fronts || {};
    if (this._fronts[kind]) return this._fronts[kind];
    const G = this.G, W = 256, H = 364;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    const bg = x.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#f8eed6'); bg.addColorStop(1, '#e6d2a6');
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#5b3a1e'; x.lineWidth = 10; x.strokeRect(5, 5, W - 10, H - 10);
    x.strokeStyle = '#b08a3e'; x.lineWidth = 3; x.strokeRect(16, 16, W - 32, H - 32);
    x.textAlign = 'center'; x.fillStyle = '#2d2116';
    if (G.RES.includes(kind)) {
      const im = this.artImg[kind];
      if (im && im.width) { const w = 200, h = w * im.height / im.width; x.drawImage(im, (W - w) / 2, 34, w, h); }
      x.font = '700 34px Cinzel, Georgia, serif'; x.fillText(G.RES_DA[kind], W / 2, H - 42);
    } else {
      const icon = { knight: '⚔️', vp: '🏆', roadBuilding: '🛣️', yearOfPlenty: '🌾', monopoly: '💰' }[kind];
      x.font = '700 26px Cinzel, Georgia, serif'; x.fillText(G.DEV_DA[kind], W / 2, 64);
      x.font = '96px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.fillText(icon, W / 2, 190);
      x.font = 'italic 21px Fell, Georgia, serif'; x.fillStyle = '#4a3a28';
      wrap(x, G.DEV_DESC[kind], W / 2, 250, W - 50, 25);
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return (this._fronts[kind] = t);
  }

  _cardBack(dev) {
    const key = dev ? 'devback' : 'back';
    this._fronts = this._fronts || {};
    if (this._fronts[key]) return this._fronts[key];
    const W = 256, H = 364, c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d');
    x.fillStyle = dev ? '#1d3b45' : '#6b1c14'; x.fillRect(0, 0, W, H);
    x.strokeStyle = dev ? 'rgba(140,200,190,.18)' : 'rgba(230,170,90,.16)'; x.lineWidth = 2;
    for (let k = -H; k < W + H; k += 22) { x.beginPath(); x.moveTo(k, 0); x.lineTo(k + H, H); x.stroke(); x.beginPath(); x.moveTo(k, H); x.lineTo(k + H, 0); x.stroke(); }
    x.strokeStyle = '#c9a24a'; x.lineWidth = 8; x.strokeRect(10, 10, W - 20, H - 20);
    x.lineWidth = 2; x.strokeRect(22, 22, W - 44, H - 44);
    x.fillStyle = '#c9a24a'; x.beginPath(); x.arc(W / 2, H / 2, 58, 0, 7); x.fill();
    x.fillStyle = dev ? '#1d3b45' : '#6b1c14'; x.beginPath(); x.arc(W / 2, H / 2, 50, 0, 7); x.fill();
    x.fillStyle = '#e2c271'; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = dev ? '700 64px Cinzel, Georgia, serif' : '700 70px Cinzel, Georgia, serif';
    x.fillText(dev ? '?' : 'N', W / 2, H / 2 + 4);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return (this._fronts[key] = t);
  }

  _card(front, back, faceUp) {
    this._cardGeo = this._cardGeo || new THREE.BoxGeometry(CW, CT, CH);
    this._edgeMat = this._edgeMat || new THREE.MeshStandardMaterial({ color: '#eadcbc', roughness: 0.8 });
    this._matCache = this._matCache || new Map();
    const mat = t => { if (!this._matCache.has(t)) this._matCache.set(t, new THREE.MeshStandardMaterial({ map: t, roughness: 0.62 })); return this._matCache.get(t); };
    const m = new THREE.Mesh(this._cardGeo, [this._edgeMat, this._edgeMat, mat(front), mat(back), this._edgeMat, this._edgeMat]);
    if (!faceUp) m.rotation.z = Math.PI;
    m.castShadow = true; m.receiveShadow = true;
    return m;
  }
}
