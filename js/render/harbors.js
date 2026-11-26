// Nybyggerne – 3D-brættet: havne.
// En havn er en kaj, der folder sig om et hjørne af landfeltet (langs to af dets sider), med et
// malet billede af en kaj med skilt (råstof + byttekurs) stående oprejst ude ved hjørnet.
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.
import * as THREE from 'three';
import { K } from './constants.js';
import { HARBOR_IMAGES, HARBOR_ASPECT } from '../assets.js';

const HARBOR_WIDTH = 1.3;    // billedets bredde (en sekskants side er ca. 1.15)
const HARBOR_OUT = 0.55;     // hvor langt ud fra hjørnet billedets midte står
const QUAY_W = 0.2;          // bredden af kajen langs felternes sider

export class HarborParts {
  _makePort(pt) {
    const G = this.G, E = G.EDGES[pt.edge];
    const landHex = E.hexes.find(h => (this.lastHexes ? this.lastHexes[h].terrain !== 'sea' : true));
    const H = G.HEXES[landHex];
    const C = new THREE.Vector3(H.x * K, 0, H.y * K);                       // landfeltets midte
    const isSea = h => !this.lastHexes || this.lastHexes[h].terrain === 'sea';
    // Vælg det hjørne af havnekanten, hvor også nabokanten vender ud mod vandet
    const other = v => H.edges.find(e => e !== pt.edge && (G.EDGES[e].a === v || G.EDGES[e].b === v));
    const coastal = e => e !== undefined && G.EDGES[e].hexes.filter(h => h !== landHex).every(isSea);
    const v = coastal(other(E.b)) && !coastal(other(E.a)) ? E.b : E.a;
    const edges = [pt.edge, other(v)].filter(e => e !== undefined);
    const V = this._vpos(v), out = V.clone().sub(C).setY(0).normalize();
    const g = new THREE.Group();

    // Kaj af planker med stenkant langs begge sider omkring hjørnet
    const wood = this._quayWood || (this._quayWood = new THREE.MeshStandardMaterial({ color: '#9a6a3a', roughness: 0.9 }));
    const stone = this._quayStone || (this._quayStone = new THREE.MeshStandardMaterial({ color: '#cdbb93', roughness: 1 }));
    edges.forEach(e => {
      const A = this._vpos(G.EDGES[e].a), B = this._vpos(G.EDGES[e].b);
      const mid = A.clone().add(B).multiplyScalar(0.5), n = mid.clone().sub(C).setY(0).normalize();
      const len = A.distanceTo(B), ang = -Math.atan2(B.z - A.z, B.x - A.x);
      const deck = new THREE.Mesh(new THREE.BoxGeometry(len, 0.05, QUAY_W), wood);
      deck.position.copy(mid).addScaledVector(n, QUAY_W / 2).setY(-0.03); deck.rotation.y = ang; deck.receiveShadow = true;
      const curb = new THREE.Mesh(new THREE.BoxGeometry(len + 0.08, 0.09, 0.07), stone);
      curb.position.copy(mid).addScaledVector(n, QUAY_W).setY(-0.01); curb.rotation.y = ang; curb.castShadow = true;
      g.add(deck, curb);
    });
    const corner = new THREE.Mesh(new THREE.CylinderGeometry(QUAY_W * 1.05, QUAY_W * 1.05, 0.06, 6), wood);
    corner.position.copy(V).addScaledVector(out, QUAY_W * 0.55).setY(-0.03);
    g.add(corner);

    // Kajen med skilt (billedet) står oprejst ude ved hjørnet
    const tex = this._portTex(pt.type);
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.25, roughness: 0.95, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.3 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(HARBOR_WIDTH, HARBOR_WIDTH * HARBOR_ASPECT), mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.copy(V).addScaledVector(out, HARBOR_OUT).setY(0.02);
    plane.renderOrder = 3;
    g.add(plane);
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
