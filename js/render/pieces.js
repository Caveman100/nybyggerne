// Nybyggerne – 3D-brættet: Spillernes brikker: veje, skibe, bosættelser, byer, riddere og røveren.
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { K, rng } from './constants.js';
import { ROBBER_IMAGE } from '../assets.js';

export class PieceParts {
  _vpos(v) { const V = this.G.VERTS[v]; return new THREE.Vector3(V.x * K, 0, V.y * K); }

  _makeRoad(e, owner) {
    const G = this.G, E = G.EDGES[e];
    const a = this._vpos(E.a), b = this._vpos(E.b);
    const col = new THREE.Color(G.COLORS[owner]);
    const g = new THREE.Group();
    const len = a.distanceTo(b) * 0.66;
    const base = new THREE.Mesh(new RoundedBoxGeometry(len + 0.04, 0.07, 0.17, 2, 0.025), new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.45), roughness: 0.9 }));
    base.position.y = 0.035;
    const top = new THREE.Mesh(new RoundedBoxGeometry(len, 0.08, 0.12, 2, 0.03), new THREE.MeshStandardMaterial({ color: col, roughness: 0.55 }));
    top.position.y = 0.08;
    [base, top].forEach(m => { m.castShadow = m.receiveShadow = true; g.add(m); });
    g.position.copy(a).add(b).multiplyScalar(0.5);
    g.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
    return g;
  }

  _shipTex(owner) {
    this._sTex = this._sTex || {};
    if (this._sTex[owner]) return this._sTex[owner];
    const c = document.createElement('canvas'); c.width = c.height = 160;
    const x = c.getContext('2d'), col = this.G.COLORS[owner];
    x.lineJoin = 'round'; x.lineCap = 'round';
    // skrog
    x.fillStyle = '#6b4426'; x.strokeStyle = '#2b1a0c'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(18, 104); x.lineTo(142, 104); x.quadraticCurveTo(132, 136, 104, 138); x.lineTo(52, 138); x.quadraticCurveTo(28, 134, 18, 104); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#a77a48'; x.fillRect(24, 104, 112, 7);
    // master
    x.strokeStyle = '#3b2412'; x.lineWidth = 5;
    x.beginPath(); x.moveTo(62, 104); x.lineTo(62, 18); x.moveTo(104, 104); x.lineTo(104, 34); x.stroke();
    // sejl i spillerens farve
    const sail = (cx, top, w, h) => { x.fillStyle = col; x.strokeStyle = '#f6ecd6'; x.lineWidth = 4; x.beginPath(); x.moveTo(cx - w / 2, top); x.quadraticCurveTo(cx, top + 8, cx + w / 2, top); x.lineTo(cx + w / 2 + 4, top + h); x.quadraticCurveTo(cx, top + h + 10, cx - w / 2 - 4, top + h); x.closePath(); x.fill(); x.stroke(); };
    sail(62, 26, 52, 34); sail(62, 64, 58, 32); sail(104, 42, 40, 26); sail(104, 72, 44, 26);
    x.fillStyle = col; x.beginPath(); x.moveTo(62, 18); x.lineTo(84, 23); x.lineTo(62, 29); x.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    return (this._sTex[owner] = t);
  }

  _makeShip(e, owner) {
    const G = this.G, E = G.EDGES[e];
    const a = this._vpos(E.a), b = this._vpos(E.b);
    const g = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.28, 20), new THREE.MeshBasicMaterial({ map: this._softTex(), color: '#000', transparent: true, opacity: 0.35, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.scale.set(1.3, 0.6, 1); sh.position.set(0.04, -0.15, 0.08);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._shipTex(owner), depthWrite: false }));
    sp.scale.set(0.8, 0.8, 1); sp.position.y = 0.3; sp.renderOrder = 4;
    g.add(sh, sp);
    g.position.copy(a).add(b).multiplyScalar(0.5);
    return g;
  }

  _guardTex(owner, active) {
    this._gTex = this._gTex || {};
    const key = owner + ':' + active;
    if (this._gTex[key]) return this._gTex[key];
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const x = c.getContext('2d');
    x.fillStyle = active ? this.G.COLORS[owner] : '#6d655c'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill();
    x.lineWidth = 8; x.strokeStyle = active ? '#f2d27a' : '#3b352f'; x.beginPath(); x.arc(64, 64, 56, 0, 7); x.stroke();
    x.font = '64px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (!active) x.globalAlpha = 0.55;
    x.fillText('🛡️', 64, 70);
    x.globalAlpha = 1;
    if (!active) { x.fillStyle = '#fbeccb'; x.font = '700 30px Cinzel, Georgia, serif'; x.fillText('z', 96, 30); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (this._gTex[key] = t);
  }

  _makeGuard(v, gd) {
    const side = new THREE.MeshStandardMaterial({ color: gd.active ? '#3a2a18' : '#4a4540', roughness: 0.6 });
    const top = new THREE.MeshStandardMaterial({ map: this._guardTex(gd.owner, gd.active), roughness: 0.6 });
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.25, 0.07, 28), [side, top, side]);
    m.position.copy(this._vpos(v)).setY(0.05);
    m.castShadow = true;
    const g = new THREE.Group(); g.add(m);
    return g;
  }

  _makeBuilding(v, b) {
    const G = this.G;
    const key = G.COLOR_KEYS[b.owner];
    const g = new THREE.Group();
    const col = new THREE.Color(G.COLORS[b.owner]);
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(b.type === 'city' ? 0.42 : 0.33, b.type === 'city' ? 0.45 : 0.36, 0.06, 6),
      new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.55), roughness: 0.85, flatShading: true }));
    plinth.position.y = 0.03; plinth.castShadow = plinth.receiveShadow = true;
    g.add(plinth);
    const m = b.type === 'city' ? this._clone(`building_castle_${key}`, 0.37) : this._clone(`building_home_A_${key}`, 0.64);
    m.position.y = 0.06;
    m.rotation.y = Math.floor(rng(v * 13 + 5)() * 6) * (Math.PI / 3);
    g.add(m);
    g.position.copy(this._vpos(v));
    return g;
  }

  _makeRobber() {
    const g = new THREE.Group();
    const img = new Image();
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const draw = () => {
      const x = c.getContext('2d'), r = 128;
      x.clearRect(0, 0, 256, 256);
      x.shadowColor = 'rgba(0,0,0,.5)'; x.shadowBlur = 10; x.shadowOffsetY = 4;
      x.fillStyle = '#2a1a0c'; x.beginPath(); x.arc(r, r - 3, r - 10, 0, 7); x.fill();
      x.shadowColor = 'transparent';
      x.save(); x.beginPath(); x.arc(r, r - 3, r - 20, 0, 7); x.clip();
      if (img.width) x.drawImage(img, 8, 5, 240, 240);
      x.restore();
      x.lineWidth = 7; x.strokeStyle = '#c9a24a'; x.beginPath(); x.arc(r, r - 3, r - 17, 0, 7); x.stroke();
      tex.needsUpdate = true;
    };
    img.onload = draw; img.src = ROBBER_IMAGE; draw();
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
    sp.scale.set(0.92, 0.92, 1); sp.position.y = 0.55; sp.renderOrder = 6;
    g.add(sp);
    const sh = new THREE.Mesh(new THREE.CircleGeometry(0.36, 24), new THREE.MeshBasicMaterial({ map: this._softTex(), color: '#000000', transparent: true, opacity: 0.45, depthWrite: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = 0.012;
    g.add(sh);
    return g;
  }

  _robberPos(hex) {
    const h = this.hexInfo[hex];
    return new THREE.Vector3(h.x + 0.5, 0.0, h.z + 0.32);
  }
}
