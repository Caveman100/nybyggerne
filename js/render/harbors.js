// Nybyggerne – 3D-brættet: havne.
// Hver havn er et malet billede af en kaj med skilt (råstof + byttekurs), som står oprejst ude i
// vandet ved den kystkant, havnen hører til. To små planker viser, hvilke to hjørner der får havnen.
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.
import * as THREE from 'three';
import { K } from './constants.js';
import { HARBOR_IMAGES, HARBOR_ASPECT } from '../assets.js';

const HARBOR_WIDTH = 1.45;   // billedets bredde (en sekskants side er ca. 1.15)
const HARBOR_OUT = 0.78;     // hvor langt ud i vandet billedets midte står

export class HarborParts {
  _makePort(pt) {
    const G = this.G, E = G.EDGES[pt.edge];
    const landHex = E.hexes.find(h => (this.lastHexes ? this.lastHexes[h].terrain !== 'sea' : true));
    const H = G.HEXES[landHex];
    const a = this._vpos(E.a), b = this._vpos(E.b);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const d = new THREE.Vector2(mx - H.x * K, mz - H.y * K).normalize();   // retning ud i vandet
    const g = new THREE.Group();

    const tex = this._portTex(pt.type);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.25, roughness: 0.95, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.3 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(HARBOR_WIDTH, HARBOR_WIDTH * HARBOR_ASPECT), mat);
    plane.rotation.x = -Math.PI / 2;                                        // ligger fladt, men vender "op" på skærmen
    plane.position.set(mx + d.x * HARBOR_OUT, 0.02, mz + d.y * HARBOR_OUT);
    plane.renderOrder = 3;
    g.add(plane);

    // Planker fra de to hjørner ud mod kajen
    const plankMat = this._plankMat || (this._plankMat = new THREE.MeshStandardMaterial({ color: '#8a5f35', roughness: 0.9 }));
    const target = new THREE.Vector3(mx + d.x * (HARBOR_OUT - 0.2), 0, mz + d.y * (HARBOR_OUT - 0.2));
    [a, b].forEach(v => {
      const from = new THREE.Vector3(v.x, 0, v.z), len = from.distanceTo(target);
      const plank = new THREE.Mesh(new THREE.BoxGeometry(len, 0.03, 0.09), plankMat);
      plank.position.copy(from).add(target).multiplyScalar(0.5).setY(-0.02);
      plank.rotation.y = -Math.atan2(target.z - from.z, target.x - from.x);
      g.add(plank);
    });
    return g;
  }

  _portTex(type) {
    this._portTexs = this._portTexs || {};
    if (this._portTexs[type]) return this._portTexs[type];
    const tex = new THREE.TextureLoader().load(HARBOR_IMAGES[type] || HARBOR_IMAGES.any);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return (this._portTexs[type] = tex);
  }
}
