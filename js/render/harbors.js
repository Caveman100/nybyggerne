// Nybyggerne – 3D-brættet: Havne: billedet lægges fladt i forlængelse af kystkanten, og et skilt viser byttekursen.
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.
import * as THREE from 'three';
import { K } from './constants.js';
import { CARD_IMAGES, HARBOR_IMAGES, HARBOR_ASPECT, HARBOR_FOR } from '../assets.js';

// Råstoffernes farver (samme som --res-* i css/base.css)
const RES_COLOR = { wood: '#2e6b2c', brick: '#b5442a', sheep: '#7fb832', wheat: '#e0ac12', ore: '#6f7882', any: '#6b4a2a' };

export class HarborParts {
  _makePort(pt) {
    const G = this.G;
    const E = G.EDGES[pt.edge];
    const landHex = E.hexes.find(h => this.lastHexes ? this.lastHexes[h].terrain !== 'sea' : true);
    const H = G.HEXES[landHex];
    const a = this._vpos(E.a), b = this._vpos(E.b);
    const mx = (a.x + b.x) / 2, mz = (a.z + b.z) / 2;
    const d = new THREE.Vector2(mx - H.x * K, mz - H.y * K).normalize();
    const g = new THREE.Group();
    // Havnebilledet ligger fladt i forlængelse af kystkanten: den lige underkant følger kanten
    // mellem de to hjørner, der får havnen, og billedet peger ud i vandet.
    const img = this._portImg(pt);
    const PW = a.distanceTo(b);                  // præcis lige så bred som sekskantens side
    const PH = PW * HARBOR_ASPECT[img];
    const quay = new THREE.Group();
    quay.position.set(mx, -0.012, mz);
    quay.rotation.y = Math.atan2(-d.x, -d.y);     // lokal -z (billedets top) peger væk fra land
    const qtex = this._portTex(img);
    const mat = new THREE.MeshStandardMaterial({ map: qtex, transparent: true, alphaTest: 0.3, roughness: 0.95, emissive: '#ffffff', emissiveMap: qtex, emissiveIntensity: 0.28 });
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(0, 0, -(PH / 2 - 0.03));    // 3 cm gemmer sig under feltets kant
    plane.receiveShadow = true;
    plane.renderOrder = 3;
    quay.add(plane);
    g.add(quay);
    // Symbolet står altid oprejst nede ved kajen
    const dist = PH * 0.24;                        // nede over vandet/kajen, så motivet ses
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this._portBadge(pt.type), transparent: true, alphaTest: 0.05, toneMapped: false }));
    const ds = PW * 0.72;
    disc.scale.set(ds, ds, 1);
    disc.rotation.x = -Math.PI / 2;
    disc.position.set(mx + d.x * dist, 0.01, mz + d.y * dist);
    disc.renderOrder = 4;
    g.add(disc);
    return g;
  }

  // Fem havnemotiver: hver råvare har sit eget, og 3:1-havnene skiftes mellem dem
  _portImg(pt) {
    return pt.type === 'any' ? pt.edge % HARBOR_IMAGES.length : HARBOR_FOR[pt.type];
  }

  _portTex(i) {
    this._portTexs = this._portTexs || {};
    if (this._portTexs[i]) return this._portTexs[i];
    const tex = new THREE.TextureLoader().load(HARBOR_IMAGES[i]);
    tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return (this._portTexs[i] = tex);
  }

  // Rundt skilt: råvarens symbol (samme maleri som på sekskanterne) + bytteforhold
  _portBadge(type) {
    this._badges = this._badges || {};
    if (this._badges[type]) return this._badges[type];
    const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const x = cv.getContext('2d'), c = S / 2, R = S * 0.46;
    const draw = (img) => {
      x.clearRect(0, 0, S, S);
      x.save();
      x.shadowColor = 'rgba(0,0,0,.55)'; x.shadowBlur = 10; x.shadowOffsetY = 4;
      const gr = x.createRadialGradient(c, c - 20, 10, c, c, R);
      gr.addColorStop(0, '#f6e7c4'); gr.addColorStop(1, '#d6bd8a');
      x.fillStyle = gr; x.beginPath(); x.arc(c, c, R, 0, Math.PI * 2); x.fill();
      x.restore();
      // Tyk ring i råstoffets farve, så man kan se havnens råstof på lang afstand
      x.lineWidth = 22; x.strokeStyle = RES_COLOR[type]; x.beginPath(); x.arc(c, c, R - 11, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 4; x.strokeStyle = '#3a2210'; x.beginPath(); x.arc(c, c, R - 1, 0, Math.PI * 2); x.stroke();

      const txt = type === 'any' ? '3:1' : '2:1';
      x.textAlign = 'center'; x.textBaseline = 'middle';
      if (img) {
        const h = S * 0.52, w = h * img.width / img.height;
        x.drawImage(img, c - w / 2, c - h / 2 - 26, w, h);
        x.fillStyle = RES_COLOR[type]; x.fillRect(c - S * 0.22, c + S * 0.16, S * 0.44, S * 0.2);
        x.font = `700 ${Math.round(S * 0.17)}px Cinzel, Georgia, serif`;
        x.fillStyle = '#fff'; x.fillText(txt, c, c + S * 0.265);
      } else if (type === 'any') {
        x.font = `700 ${Math.round(S * 0.3)}px Cinzel, Georgia, serif`;
        x.fillStyle = '#3a2210'; x.fillText(txt, c, c - 8);
        x.font = `700 ${Math.round(S * 0.17)}px Cinzel, Georgia, serif`;
        x.fillText('?', c, c + S * 0.24);
      }
      tex.needsUpdate = true;
    };
    draw(null);
    if (type !== 'any') { const img = new Image(); img.onload = () => draw(img); img.src = CARD_IMAGES[type]; }
    return (this._badges[type] = tex);
  }
}
