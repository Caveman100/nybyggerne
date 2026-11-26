// Nybyggerne – 3D-brættet: Selve øen: sekskantfelter med malede billeder, kanter og nummerbrikker.
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.
import * as THREE from 'three';
import { K } from './constants.js';
import { paintPasture } from './textures.js';
import { TILE_IMAGES } from '../assets.js';

// Farvefilter på felterne (ganges på maleriet). Hvid = ingen ændring.
const TERRAIN_TINT = { forest: '#9fd58f', hills: '#ffab8a', pasture: '#d6ff9e', fields: '#ffe680', mountains: '#c3cfe0', gold: '#fff0a0', desert: '#ffffff' };

export class TileParts {
  _buildBoard(s) {
    if (this.boardGroup) { this.scene.remove(this.boardGroup); }
    this.roadMeshes.clear();
    this.buildingMeshes.clear();
    const G = this.G;
    const grp = (this.boardGroup = new THREE.Group());
    this.piecesGroup = new THREE.Group();
    this.markerGroup = new THREE.Group();
    grp.add(this.piecesGroup, this.markerGroup);
    this.scene.add(grp);
    this.tokens = [];
    this.hexInfo = [];

    s.hexes.forEach((h, i) => {
      const H = G.HEXES[i];
      const x = H.x * K, z = H.y * K;
      if (h.terrain === 'sea') { this.hexInfo[i] = { x, z, token: null }; return; }
      const side = new THREE.Mesh(this._hexSideGeo(), this._sideMat || (this._sideMat = new THREE.MeshStandardMaterial({ color: '#6a4a2c', roughness: 1, flatShading: true })));
      side.position.set(x, -0.15, z); side.receiveShadow = true;
      const top = new THREE.Mesh(this._hexTopGeo(), this._terrainMat(h.terrain));
      top.position.set(x, 0, z); top.receiveShadow = true;
      const frame = new THREE.Mesh(this._hexFrameGeo(), this._frameMat || (this._frameMat = new THREE.MeshStandardMaterial({ color: '#4a321b', roughness: 0.8 })));
      frame.position.set(x, 0.004, z); frame.receiveShadow = true;
      grp.add(side, top, frame);
      let token = null;
      if (h.number) {
        token = this._makeToken(h.number);
        token.position.set(x, 0.42, z);
        grp.add(token);
        this.tokens.push({ sprite: token, hex: i, base: 0.8 });
        token.scale.setScalar(0.8);
      }
      this.hexInfo[i] = { x, z, token };
    });

    this.lastHexes = s.hexes;
    s.ports.forEach(pt => grp.add(this._makePort(pt)));

    // Røveren
    this.robber = this._makeRobber();
    const rp = this._robberPos(s.robber);
    this.robber.position.copy(rp);
    this.robberHex = s.robber;
    grp.add(this.robber);
  }

  _hexPts(r) { return [0, 1, 2, 3, 4, 5].map(i => { const a = Math.PI / 2 + i * Math.PI / 3; return [Math.cos(a) * r, Math.sin(a) * r]; }); }

  _hexTopGeo() {
    if (this._topGeo) return this._topGeo;
    const shape = new THREE.Shape(this._hexPts(K).map(([x, y]) => new THREE.Vector2(x, y)));
    const geo = new THREE.ShapeGeometry(shape);
    const pos = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 2 + 0.5, pos.getY(i) / (2 * K) + 0.5);
    geo.rotateX(-Math.PI / 2);
    return (this._topGeo = geo);
  }

  _hexFrameGeo() {
    if (this._frameGeo) return this._frameGeo;
    const shape = new THREE.Shape(this._hexPts(K).map(([x, y]) => new THREE.Vector2(x, y)));
    shape.holes.push(new THREE.Path(this._hexPts(K * 0.965).map(([x, y]) => new THREE.Vector2(x, y)).reverse()));
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateX(-Math.PI / 2);
    return (this._frameGeo = geo);
  }

  _hexSideGeo() {
    return this._sideGeo || (this._sideGeo = new THREE.CylinderGeometry(K, K * 1.01, 0.3, 6, 1, true));
  }

  _terrainMat(terrain) {
    this._tmats = this._tmats || {};
    if (this._tmats[terrain]) return this._tmats[terrain];
    const key = { forest: 'wood', hills: 'brick', fields: 'wheat', mountains: 'ore', desert: 'desert', pasture: 'sheep' }[terrain];
    let tex;
    if (terrain === 'gold') tex = new THREE.TextureLoader().load(TILE_IMAGES.gold);
    else if (key && TILE_IMAGES[key]) { tex = new THREE.TextureLoader().load(TILE_IMAGES[key]); }
    else tex = new THREE.CanvasTexture(paintPasture());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    // Farvefilter pr. råstof, så felterne er lette at kende fra hinanden (som i originalspillet)
    const tint = TERRAIN_TINT[terrain] || '#ffffff';
    const m = new THREE.MeshStandardMaterial({ map: tex, color: tint, roughness: 1, emissive: tint, emissiveMap: tex, emissiveIntensity: 0.34 });
    return (this._tmats[terrain] = m);
  }

  _canvasSprite(w, h, draw, scale) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false }));
    sp.scale.set(scale * (w / h), scale, 1);
    sp.renderOrder = 5;
    return sp;
  }

  _makeToken(n) {
    const hot = n === 6 || n === 8;
    const sp = this._canvasSprite(256, 256, (ctx, w) => {
      const r = w / 2;
      ctx.shadowColor = 'rgba(0,0,0,.45)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 6;
      ctx.beginPath(); ctx.arc(r, r - 4, r - 18, 0, Math.PI * 2);
      const gr = ctx.createRadialGradient(r - 30, r - 40, 10, r, r, r);
      gr.addColorStop(0, '#fff6dc'); gr.addColorStop(1, '#e2c88f');
      ctx.fillStyle = gr; ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 9; ctx.strokeStyle = '#6b4a24'; ctx.stroke();
      ctx.beginPath(); ctx.arc(r, r - 4, r - 34, 0, Math.PI * 2); ctx.lineWidth = 2.5; ctx.strokeStyle = 'rgba(107,74,36,.55)'; ctx.stroke();
      ctx.fillStyle = hot ? '#a5221b' : '#2d2116';
      ctx.font = `700 ${n >= 10 ? 96 : 110}px Cinzel, Georgia, serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(String(n), r, r - 16);
      const pips = 6 - Math.abs(7 - n);
      for (let k = 0; k < pips; k++) { ctx.beginPath(); ctx.arc(r + (k - (pips - 1) / 2) * 17, r + 54, 6.5, 0, Math.PI * 2); ctx.fill(); }
    }, 0.66);
    sp.userData.baseColor = new THREE.Color('#ffffff');
    return sp;
  }
}
