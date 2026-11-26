// Nybyggerne – 3D-brættet: Terningerne i bakken øverst til højre (egen lille scene og kamera).
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { ease } from './constants.js';

export class DiceParts {
  _buildDice() {
    const ds = (this.diceScene = new THREE.Scene());
    this.diceCam = new THREE.OrthographicCamera(-2.45, 2.45, 1.62, -1.62, 0.1, 50);
    this.diceCam.position.set(0, 10, 0.001);
    this.diceCam.lookAt(0, 0, 0);
    ds.add(new THREE.HemisphereLight('#fff4e0', '#5a4630', 1.4));
    const l = new THREE.DirectionalLight('#ffe6c0', 2.4);
    l.position.set(-3, 7, 4); l.castShadow = true;
    l.shadow.mapSize.set(512, 512);
    Object.assign(l.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4 });
    ds.add(l);
    // Bakke i træ med filt
    const wood = new THREE.MeshStandardMaterial({ color: '#6b4325', roughness: 0.75 });
    const felt = new THREE.MeshStandardMaterial({ color: '#2f5a3a', roughness: 1 });
    const W = 4.2, D = 2.6;
    const floor = new THREE.Mesh(new RoundedBoxGeometry(W, 0.2, D, 2, 0.08), felt);
    floor.position.y = -0.1; floor.receiveShadow = true; ds.add(floor);
    const rim = (w, d, x, z) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, 0.45, d, 2, 0.08), wood); m.position.set(x, 0.05, z); m.castShadow = m.receiveShadow = true; ds.add(m); };
    rim(W + 0.4, 0.22, 0, -D / 2 - 0.1); rim(W + 0.4, 0.22, 0, D / 2 + 0.1);
    rim(0.22, D, -W / 2 - 0.1, 0); rim(0.22, D, W / 2 + 0.1, 0);

    const faceTex = n => {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const x = c.getContext('2d');
      x.fillStyle = '#f4ead4'; x.fillRect(0, 0, 128, 128);
      const gr = x.createRadialGradient(64, 64, 20, 64, 64, 90); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(160,130,90,.35)');
      x.fillStyle = gr; x.fillRect(0, 0, 128, 128);
      const P = { 1: [[64, 64]], 2: [[36, 36], [92, 92]], 3: [[34, 34], [64, 64], [94, 94]], 4: [[36, 36], [92, 36], [36, 92], [92, 92]], 5: [[34, 34], [94, 34], [64, 64], [34, 94], [94, 94]], 6: [[36, 30], [92, 30], [36, 64], [92, 64], [36, 98], [92, 98]] }[n];
      x.fillStyle = n === 1 ? '#9b1c1c' : '#2a1d14';
      P.forEach(([px, py]) => { x.beginPath(); x.arc(px, py, n === 1 ? 15 : 11, 0, Math.PI * 2); x.fill(); });
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    // BoxGeometry-rækkefølge: +x, -x, +y, -y, +z, -z
    const order = [3, 4, 1, 6, 2, 5];
    const mats = order.map(n => new THREE.MeshStandardMaterial({ map: faceTex(n), roughness: 0.45 }));
    const geo = new RoundedBoxGeometry(0.62, 0.62, 0.62, 4, 0.1);
    this.dice = [0, 1].map(i => {
      const m = new THREE.Mesh(geo, mats);
      m.castShadow = true;
      m.position.set(i ? 0.55 : -0.55, 0.31, 0.1);
      ds.add(m);
      return m;
    });
    const X = new THREE.Vector3(1, 0, 0), Z = new THREE.Vector3(0, 0, 1);
    this.faceQ = {
      1: new THREE.Quaternion(),
      6: new THREE.Quaternion().setFromAxisAngle(X, Math.PI),
      2: new THREE.Quaternion().setFromAxisAngle(X, -Math.PI / 2),
      5: new THREE.Quaternion().setFromAxisAngle(X, Math.PI / 2),
      3: new THREE.Quaternion().setFromAxisAngle(Z, Math.PI / 2),
      4: new THREE.Quaternion().setFromAxisAngle(Z, -Math.PI / 2),
    };
    this.setDice([3, 4], false);
  }

  setDice(vals, animate) {
    const Y = new THREE.Vector3(0, 1, 0);
    const R = Math.random;
    this.dice.forEach((m, i) => {
      const finalQ = new THREE.Quaternion().setFromAxisAngle(Y, (R() - 0.5) * 0.9).multiply(this.faceQ[vals[i]]);
      const endPos = new THREE.Vector3(i ? 0.6 + R() * 0.3 : -0.6 - R() * 0.3, 0.31, (R() - 0.5) * 0.6);
      if (!animate) { m.quaternion.copy(finalQ); m.position.copy(endPos); return; }
      const startPos = new THREE.Vector3(-2.4 + i * 0.4, 2.6, 1.6 - i * 0.5);
      const axis = new THREE.Vector3(R() - 0.5, R() - 0.5, R() - 0.5).normalize();
      const spin = (3 + R() * 2) * Math.PI * 2;
      const tmp = new THREE.Quaternion();
      this._anim(1.35 + i * 0.12, t => {
        const e = ease.outCubic(t);
        m.position.x = THREE.MathUtils.lerp(startPos.x, endPos.x, e);
        m.position.z = THREE.MathUtils.lerp(startPos.z, endPos.z, e);
        m.position.y = endPos.y + (startPos.y - endPos.y) * Math.abs(Math.cos(t * Math.PI * 2.5)) * Math.pow(1 - t, 2);
        tmp.setFromAxisAngle(axis, spin * Math.pow(1 - t, 2.2));
        m.quaternion.copy(finalQ).multiply(tmp);
      }, () => { if (i === 1) this._diceLanded(vals); });
    });
    if (animate) this._sound('dice'); else this.onDiceDone(vals);
  }

  _diceLanded(vals) {
    const f = this.pendingFlash; this.pendingFlash = null;
    if (f && f.n !== 7) this.flashProduction(f);
    this.onDiceDone(vals);
  }
}
