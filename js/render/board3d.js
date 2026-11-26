// Nybyggerne – 3D-brættet (Three.js).
//
// Board3D tegner kroen, øen, brikkerne og terningerne. Klassen er delt op i flere filer
// efter emne; hver fil indeholder en "del" (TavernParts, TileParts, ...), hvis metoder
// blandes ind i Board3D nederst i denne fil. Så kan alle dele kalde hinanden med this.
//
//   board3d.js  – opsætning, opdatering, klik på brættet, tegne-løkke (denne fil)
//   tavern.js   – træbord, ildskær og hav
//   tiles.js    – sekskantfelter og nummerbrikker
//   harbors.js  – havne
//   pieces.js   – veje, skibe, huse, byer, riddere, røver
//   dice.js     – terningerne
//   effects.js  – animationer og flyvende kort
//   textures.js – billeder tegnet med kode (bordplade, guldfelt)
//
// Udefra bruges kun: new Board3D(container, G, {onPick, onDiceDone, flyTarget}),
// board.update(tilstand, visning), board.setDice(...), board.flashProduction(...) og board.diceRect().
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { K, ease } from './constants.js';
import { CARD_IMAGES, MODEL_DIR, MODEL_NAMES, inline } from '../assets.js';
import { Sound } from '../sound.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TavernParts } from './tavern.js';
import { TileParts } from './tiles.js';
import { HarborParts } from './harbors.js';
import { PieceParts } from './pieces.js';
import { DiceParts } from './dice.js';
import { EffectParts } from './effects.js';

export class Board3D {
  constructor(container, G, opts = {}) {
    this.G = G;
    this.container = container;
    this.onPick = opts.onPick || (() => {});
    this.onDiceDone = opts.onDiceDone || (() => {});
    this.flyTarget = opts.flyTarget || null;
    this.tpl = {};
    this.anims = [];
    this.pickables = [];
    this.roadMeshes = new Map();
    this.buildingMeshes = new Map();
    this.tokens = [];
    this.synced = false;
    this.boardSig = null;
    this.hlSig = null;
    this.lastRoll = null;
    this.clock = new THREE.Clock();
    this.ready = this._init();
  }

  // ------------------------------------------------------------ opsætning
  async _init() {
    const r = (this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 0.95;
    r.autoClear = false;
    this.container.appendChild(r.domElement);
    r.domElement.style.display = 'block';
    r.domElement.style.touchAction = 'none';

    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color('#120a05');

    // Kameraet ser lige ned ovenfra uden perspektiv
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 200);
    this.camera.position.set(0, 60, 0.001);

    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.target.set(0, 0, 0);
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.minZoom = 1;
    c.maxZoom = 3;
    c.zoomToCursor = true;
    c.enableRotate = false;   // brættet kan ikke drejes
    c.enablePan = false;
    c.zoomSpeed = 0.6;
    c.addEventListener('change', () => {
      c.target.x = THREE.MathUtils.clamp(c.target.x, -6, 6);
      c.target.z = THREE.MathUtils.clamp(c.target.z, -6, 6);
      c.target.y = 0;
    });

    this._buildTavern();
    await this._loadModels();
    this.artImg = {};
    await Promise.all(Object.keys(CARD_IMAGES).map(k => new Promise(res => { const im = new Image(); im.onload = im.onerror = () => res(); im.src = CARD_IMAGES[k]; this.artImg[k] = im; })));
    this._buildDice();
    this._bindInput();

    this.resizeObs = new ResizeObserver(() => this._resize());
    this.resizeObs.observe(this.container);
    this._resize();
    const loop = () => { this._frame(); this.raf = requestAnimationFrame(loop); };
    loop();
  }

  // Indlæser husene og borgene (glTF-filer) fra assets/models/
  async _loadModels() {
    THREE.Cache.enabled = true;
    const manager = new THREE.LoadingManager();
    manager.setURLModifier(inline); // bruges kun i én-fils-udgaven
    const loader = new GLTFLoader(manager);
    await Promise.all(MODEL_NAMES.map(async name => {
      const g = await loader.loadAsync(MODEL_DIR + name + '.gltf');
      g.scene.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      this.tpl[name] = g.scene;
    }));
    this.modelsLoaded = true;
  }

  _clone(name, s = 1) {
    const o = this.tpl[name].clone();
    o.scale.setScalar(s);
    return o;
  }

  // ------------------------------------------------------------ opdatering fra spillets tilstand
  // Kaldes hver gang spillet ændrer sig. s = spillets tilstand, view = hvad denne skærm skal vise.
  update(s, view) {
    if (!this.modelsLoaded) return; // modellerne er ikke indlæst endnu
    const sig = JSON.stringify([s.hexes, s.ports]);
    const fresh = sig !== this.boardSig;
    if (fresh) {
      this.boardSig = sig;
      this.sheep = [];
      this.smokers = [];
      this._buildBoard(s);
      this._fitRim();
      this.synced = false;
      this.lastRoll = null;
      this._introCamera();
    }
    const animate = this.synced;

    // Veje
    const roadKeys = new Set();
    for (const e in s.roads) {
      const key = e + ':' + s.roads[e];
      roadKeys.add(key);
      if (!this.roadMeshes.has(key)) {
        const m = this._makeRoad(+e, s.roads[e]);
        this.piecesGroup.add(m);
        this.roadMeshes.set(key, m);
        if (animate) { this._popIn(m, 0.5); this._sound('road'); }
      }
    }
    for (const [k, m] of this.roadMeshes) if (!roadKeys.has(k)) { this.piecesGroup.remove(m); this.roadMeshes.delete(k); }

    // Skibe
    this.shipMeshes = this.shipMeshes || new Map();
    if (fresh) this.shipMeshes.clear();
    const shipKeys = new Set();
    for (const e in s.ships || {}) {
      const key = e + ':' + s.ships[e];
      shipKeys.add(key);
      if (!this.shipMeshes.has(key)) {
        const m = this._makeShip(+e, s.ships[e]);
        this.piecesGroup.add(m);
        this.shipMeshes.set(key, m);
        if (animate) { this._popIn(m, 0.5); this._sound('road'); }
      }
    }
    for (const [k, m] of this.shipMeshes) if (!shipKeys.has(k)) { this.piecesGroup.remove(m); this.shipMeshes.delete(k); }
    // Riddere (barbarudvidelsen)
    this.guardMeshes = this.guardMeshes || new Map();
    if (fresh) this.guardMeshes.clear();
    const gKeys = new Set();
    for (const v in s.guards || {}) {
      const gd = s.guards[v], key = v + ':' + gd.owner + ':' + gd.active;
      gKeys.add(key);
      if (!this.guardMeshes.has(key)) {
        const m = this._makeGuard(+v, gd);
        this.piecesGroup.add(m);
        this.guardMeshes.set(key, m);
        if (animate) this._popIn(m, 0.4);
      }
    }
    for (const [k, m] of this.guardMeshes) if (!gKeys.has(k)) { this.piecesGroup.remove(m); this.guardMeshes.delete(k); }

    // Bygninger
    const bKeys = new Set();
    for (const v in s.buildings) {
      const b = s.buildings[v];
      const key = v + ':' + b.owner + ':' + b.type;
      bKeys.add(key);
      if (!this.buildingMeshes.has(key)) {
        const m = this._makeBuilding(+v, b);
        this.piecesGroup.add(m);
        this.buildingMeshes.set(key, m);
        if (animate) { this._popIn(m, 0.9); this._dust(m.position, b.type === 'city' ? 1.4 : 1); this._sound(b.type === 'city' ? 'city' : 'build'); }
      }
    }
    for (const [k, m] of this.buildingMeshes) if (!bKeys.has(k)) { this.piecesGroup.remove(m); this.buildingMeshes.delete(k); }

    // Røver
    if (s.robber !== this.robberHex) {
      const from = this.robber.position.clone(), to = this._robberPos(s.robber);
      this.robberHex = s.robber;
      if (animate) this._sound('robber');
      if (animate) this._anim(0.8, t => { const e = ease.inOutCubic(t); this.robber.position.lerpVectors(from, to, e); this.robber.position.y = to.y + Math.sin(t * Math.PI) * 1.4; }, () => this._dust(to, 0.7));
      else this.robber.position.copy(to);
    }
    this.tokens.forEach(tk => tk.sprite.material.color.set(tk.hex === s.robber ? '#6a6a6a' : '#ffffff'));

    // Terninger
    const rc = s.rollCount || 0;
    if (s.dice && rc !== this.lastRoll) {
      this.lastRoll = rc;
      this.pendingFlash = animate ? { n: s.dice[0] + s.dice[1], robber: s.robber, buildings: s.buildings, hexes: s.hexes } : null;
      this.setDice(s.dice, animate);
    }

    // Kort på bordet
    this.lastState = s; this.lastMe = view.me === undefined ? -1 : view.me;

    // Markeringer af lovlige felter
    const hlSig = JSON.stringify(view.highlights || {});
    if (hlSig !== this.hlSig || fresh) { this.hlSig = hlSig; this._buildMarkers(view.highlights || {}); }
    this.synced = true;
  }

  _buildMarkers(hl) {
    const g = this.markerGroup;
    g.clear();
    this.pickables = [];
    this.markers = [];
    const glow = new THREE.MeshBasicMaterial({ color: '#fff1b8', transparent: true, opacity: 0.9, depthWrite: false });
    const hidden = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const addPick = (mesh, kind, id) => { mesh.userData = { kind, id }; this.pickables.push(mesh); g.add(mesh); };
    (hl.settlement || []).forEach(v => {
      const p = this._vpos(v);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.035, 8, 28), glow);
      ring.rotation.x = -Math.PI / 2; ring.position.copy(p).setY(0.16);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow);
      dot.position.copy(p).setY(0.16);
      g.add(ring, dot);
      this.markers.push({ obj: ring, kind: 'settlement', id: v }, { obj: dot, kind: 'settlement', id: v });
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), hidden); hit.position.copy(p).setY(0.15);
      addPick(hit, 'settlement', v);
    });
    (hl.city || []).forEach(v => {
      const p = this._vpos(v);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.035, 8, 36), glow);
      ring.rotation.x = -Math.PI / 2; ring.position.copy(p).setY(0.12);
      g.add(ring);
      this.markers.push({ obj: ring, kind: 'city', id: v });
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.9, 10), hidden); hit.position.copy(p).setY(0.4);
      addPick(hit, 'city', v);
    });
    (hl.road || []).forEach(e => {
      const E = this.G.EDGES[e], a = this._vpos(E.a), b = this._vpos(E.b);
      const len = a.distanceTo(b) * 0.6;
      const bar = new THREE.Mesh(new RoundedBoxGeometry(len, 0.05, 0.1, 2, 0.02), glow);
      bar.position.copy(a).add(b).multiplyScalar(0.5).setY(0.1);
      bar.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      g.add(bar);
      this.markers.push({ obj: bar, kind: 'road', id: e });
      const hit = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 0.32), hidden);
      hit.position.copy(bar.position); hit.rotation.copy(bar.rotation);
      addPick(hit, 'road', e);
    });
    (hl.ship || []).forEach(e => {
      const E = this.G.EDGES[e], a = this._vpos(E.a), b = this._vpos(E.b);
      const len = a.distanceTo(b) * 0.6;
      const bar = new THREE.Mesh(new RoundedBoxGeometry(len, 0.05, 0.12, 2, 0.02), this._shipGlow || (this._shipGlow = new THREE.MeshBasicMaterial({ color: '#9fe3ff', transparent: true, opacity: 0.9, depthWrite: false })));
      bar.position.copy(a).add(b).multiplyScalar(0.5).setY(0.05);
      bar.rotation.y = -Math.atan2(b.z - a.z, b.x - a.x);
      g.add(bar);
      this.markers.push({ obj: bar, kind: 'ship', id: e });
      const hit = new THREE.Mesh(new THREE.BoxGeometry(len, 0.3, 0.32), hidden);
      hit.position.copy(bar.position); hit.rotation.copy(bar.rotation);
      addPick(hit, 'ship', e);
    });
    ['knight', 'activate'].forEach(kind => (hl[kind] || []).forEach(v => {
      const p = this._vpos(v);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(kind === 'knight' ? 0.17 : 0.27, 0.035, 8, 28), this._kGlow || (this._kGlow = new THREE.MeshBasicMaterial({ color: '#ffd28a', transparent: true, opacity: 0.95, depthWrite: false })));
      ring.rotation.x = -Math.PI / 2; ring.position.copy(p).setY(0.14);
      g.add(ring);
      this.markers.push({ obj: ring, kind, id: v });
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), hidden); hit.position.copy(p).setY(0.15);
      addPick(hit, kind, v);
    }));
    (hl.robber || []).forEach(i => {
      const h = this.hexInfo[i];
      const ring = new THREE.Mesh(new THREE.RingGeometry(K * 0.8, K * 0.97, 6, 1, Math.PI / 6), new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.95, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      ring.rotation.x = -Math.PI / 2; ring.position.set(h.x, 0.1, h.z);
      g.add(ring);
      this.markers.push({ obj: ring, kind: 'robber', id: i });
      const hit = new THREE.Mesh(new THREE.CylinderGeometry(K, K, 1.6, 6), hidden);
      hit.position.set(h.x, 0.7, h.z);
      addPick(hit, 'robber', i);
    });
  }

  _introCamera() {
    const c = this.camera;
    this.controls.enabled = false;
    c.zoom = 0.6; c.updateProjectionMatrix();
    this._anim(1.4, t => { c.zoom = 0.6 + 0.4 * ease.inOutCubic(t); c.updateProjectionMatrix(); }, () => { this.controls.enabled = true; });
  }

  _sound(kind) { Sound.play(kind); }

  // ------------------------------------------------------------ input og tegne-løkke
  _bindInput() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let down = null;
    const pick = ev => {
      const r = el.getBoundingClientRect();
      ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const hit = ray.intersectObjects(this.pickables, false)[0];
      return hit ? hit.object.userData : null;
    };
    el.addEventListener('pointerdown', ev => { down = { x: ev.clientX, y: ev.clientY, t: performance.now() }; });
    el.addEventListener('pointerup', ev => {
      if (!down) return;
      const moved = Math.hypot(ev.clientX - down.x, ev.clientY - down.y);
      const quick = performance.now() - down.t < 700;
      down = null;
      if (moved > 8 || !quick) return;
      const p = pick(ev);
      if (p) this.onPick(p.kind, p.id);
    });
    el.addEventListener('pointermove', ev => {
      if (ev.buttons) return;
      const p = pick(ev);
      this.hover = p;
      el.style.cursor = p ? 'pointer' : 'grab';
    });
  }

  // Gør havet og rammen kun så store, som øen (inkl. havne) kræver – så er der mindre vand.
  // Havet er en sekskant: for hver af dens 6 sider måler vi, hvor langt øen rækker ud mod den.
  _fitRim() {
    const pts = [];
    this.boardGroup.updateMatrixWorld(true);
    this.boardGroup.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      o.geometry.computeBoundingBox();
      const b = o.geometry.boundingBox;
      [[b.min.x, b.min.y, b.min.z], [b.max.x, b.max.y, b.max.z], [b.min.x, b.max.y, b.max.z], [b.max.x, b.min.y, b.min.z],
       [b.min.x, b.min.y, b.max.z], [b.max.x, b.max.y, b.min.z], [b.min.x, b.max.y, b.min.z], [b.max.x, b.min.y, b.max.z]]
        .forEach(([x, y, z]) => { const v = new THREE.Vector3(x, y, z).applyMatrix4(o.matrixWorld); pts.push(v); });
    });
    let need = 0;
    for (let k = 0; k < 6; k++) {
      const a = Math.PI / 6 + k * Math.PI / 3, nx = Math.cos(a), nz = Math.sin(a);   // sidernes retning
      pts.forEach(p => { need = Math.max(need, p.x * nx + p.z * nz); });
    }
    const inner = 7.48 * Math.cos(Math.PI / 6);            // havets oprindelige afstand til siderne
    this.rimScale = Math.min(1, (need + 0.25) / inner);
    const k = this.rimScale, [frame, trim, sea] = this.rim;
    frame.scale.set(k, 1, k);   // cylinder står op
    trim.scale.set(k, k, 1);    // torus og hav ligger ned (drejet om x-aksen)
    sea.scale.set(k, k, 1);
    this._resize();
  }

  _resize() {
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    // Kameraet viser rammen og lidt bord. ZOOM: mindre tal = tættere på brættet fra start.
    const ZOOM = 1.04, f = (this.rimScale || 1) * ZOOM;
    const narrow = w / h < 1, W = (narrow ? 7.7 : 7.85) * f, H = 6.75 * f;
    let hw, hh;
    if (w / h > W / H) { hh = H; hw = H * w / h; } else { hw = W; hh = W * h / w; }
    Object.assign(this.camera, { left: -hw, right: hw, top: hh, bottom: -hh });
    this.camera.updateProjectionMatrix();
    this.size = { w, h };
    if (this._placeDiceTray) this._placeDiceTray();
  }

  diceRect() {
    if (!this.size) return null;
    const { w, h } = this.size;
    const dw = Math.round(Math.min(180, Math.max(118, w * 0.16))), dh = Math.round(dw * 0.62);
    if (w / h < 1) return { x: w - dw - 8, y: 8, w: dw, h: dh, below: true };
    return { x: w - dw - 10, y: 10, w: dw, h: dh, below: true };
  }

  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;
    const now = performance.now();
    this.anims = this.anims.filter(a => {
      const t = Math.min(1, (now - a.t0) / a.dur);
      a.step(t);
      if (t >= 1) { a.done && a.done(); return false; }
      return true;
    });
    this.controls.update();
    if (this.seaUniforms) this.seaUniforms.uTime.value = time;
    if (this.flicker) this.flicker.forEach(f => { const n = Math.sin(time * 7.3 + f.ph) * 0.5 + Math.sin(time * 13.1 + f.ph * 2) * 0.3 + Math.sin(time * 2.1 + f.ph) * 0.2; f.l.intensity = f.base * (1 + n * f.amt); });
    if (this.smokers) this.smokers.forEach(sm => { sm.next -= dt; if (sm.next <= 0) { sm.next = 0.45 + Math.random() * 0.3; this._puff(sm); } });
    if (this.sheep) this.sheep.forEach(sh => { const p = sh.userData.phase + time; if (sh.userData.head) sh.userData.head.position.y = 0.13 - Math.max(0, Math.sin(p * 0.7)) * 0.07; });
    if (this.robber) this.robber.children[0] && (this.robber.position.y = this.anims.length ? this.robber.position.y : Math.abs(Math.sin(time * 2)) * 0.03);
    if (this.markers) {
      const pulse = 1 + Math.sin(time * 4) * 0.12;
      this.markers.forEach(m => {
        const hov = this.hover && this.hover.kind === m.kind && this.hover.id === m.id;
        const s = hov ? 1.35 : pulse;
        if (m.kind === 'robber') m.obj.material.opacity = hov ? 1 : 0.7 + Math.sin(time * 4) * 0.25;
        else m.obj.scale.set(s, s, s);
      });
    }

    const r = this.renderer;
    if (!this.size) return;
    r.setScissorTest(false);
    r.setViewport(0, 0, this.size.w, this.size.h);
    r.clear();
    r.render(this.scene, this.camera);
  }
}

// Bland metoderne fra de andre filer ind i Board3D
for (const Part of [TavernParts, TileParts, HarborParts, PieceParts, DiceParts, EffectParts]) {
  for (const name of Object.getOwnPropertyNames(Part.prototype)) {
    if (name !== 'constructor') Object.defineProperty(Board3D.prototype, name, Object.getOwnPropertyDescriptor(Part.prototype, name));
  }
}
