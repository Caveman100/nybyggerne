// Nybyggerne – 3D-brættet: Kroen omkring brættet: træbord, stearinlys, ildskær og det malede hav.
// Metoderne blandes ind i Board3D (se board3d.js), så `this` er selve brættet.
import * as THREE from 'three';
import { TABLE_Y } from './constants.js';
import { SEA_IMAGE, TABLE_IMAGE } from '../assets.js';

export class TavernParts {
  _buildTavern() {
    const scene = this.scene;
    // Varmt, dæmpet rumlys + "pejselys" fra siden + en lampe over bordet
    scene.add(new THREE.HemisphereLight('#ffd7a3', '#2b170b', 0.55));
    const lamp = (this.sun = new THREE.DirectionalLight('#ffc98a', 2.1));
    lamp.position.set(-6, 16, 6);
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(2048, 2048);
    Object.assign(lamp.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 1, far: 50 });
    lamp.shadow.bias = -0.0004; lamp.shadow.normalBias = 0.025;
    scene.add(lamp);
    const fire = new THREE.PointLight('#ff7a2e', 120, 40, 1.6);
    fire.position.set(-17, 4, 3);
    scene.add(fire);
    this.flicker = [{ l: lamp, base: 2.1, amt: 0.12, ph: 0 }, { l: fire, base: 120, amt: 0.35, ph: 3 }];

    // Bordplade af gamle planker
    // Bordpladen: malet billede (assets/images/table.webp), gentaget hen over bordet
    const tex = new THREE.TextureLoader().load(TABLE_IMAGE);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(6, 6);
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.0, color: '#b8977a' }));
    table.rotation.x = -Math.PI / 2; table.position.y = TABLE_Y; table.receiveShadow = true;
    scene.add(table);

    // Spillebrættets ramme og hav
    const frame = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.8, 0.34, 6), new THREE.MeshStandardMaterial({ color: '#4a2e17', roughness: 0.55 }));
    frame.rotation.y = Math.PI / 6; frame.position.y = TABLE_Y + 0.17; frame.castShadow = frame.receiveShadow = true;
    scene.add(frame);
    const trim = new THREE.Mesh(new THREE.TorusGeometry(7.43, 0.06, 6, 6), new THREE.MeshStandardMaterial({ color: '#b08a3e', roughness: 0.35, metalness: 0.6 }));
    trim.rotation.x = -Math.PI / 2; trim.position.y = TABLE_Y + 0.35;
    scene.add(trim);
    this._buildSea();

    // Stearinlys på bordet
    this.candles = [];
    [[-8.3, 6.0, 1.1], [8.4, -5.9, 0.9], [-8.6, -6.2, 0.75]].forEach(([x, z, h]) => this._candle(x, z, h));
  }

  _candle(x, z, h) {
    const g = new THREE.Group();
    const brass = new THREE.MeshStandardMaterial({ color: '#a8823c', roughness: 0.35, metalness: 0.7 });
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.06, 20), brass); plate.position.y = 0.03;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.14, 16), brass); cup.position.y = 0.12;
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.135, h, 16), new THREE.MeshStandardMaterial({ color: '#efe3c6', roughness: 0.6, emissive: '#ffb060', emissiveIntensity: 0.12 }));
    wax.position.y = 0.19 + h / 2;
    const drip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), wax.material); drip.position.set(0.12, 0.19 + h * 0.8, 0.02); drip.scale.set(0.6, 1.6, 0.6);
    [plate, cup, wax, drip].forEach(m => { m.castShadow = m.receiveShadow = true; g.add(m); });
    const flameTex = this._flameTex();
    const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, color: '#ffd28a', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    flame.scale.set(0.22, 0.42, 1); flame.position.y = 0.19 + h + 0.2;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this._softTex(), color: '#ff9a3c', blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
    halo.scale.set(1.6, 1.6, 1); halo.position.y = flame.position.y;
    g.add(flame, halo);
    const light = new THREE.PointLight('#ffa255', 7, 9, 1.8);
    light.position.y = flame.position.y + 0.1;
    g.add(light);
    g.position.set(x, TABLE_Y, z);
    this.scene.add(g);
    this.candles.push({ flame, halo, light, ph: Math.random() * 10 });
    this.flicker.push({ l: light, base: 7, amt: 0.3, ph: Math.random() * 10 });
  }

  _flameTex() {
    if (this._flameT) return this._flameT;
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const x = c.getContext('2d');
    const g = x.createRadialGradient(32, 84, 2, 32, 74, 50);
    g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.25, 'rgba(255,210,120,.95)'); g.addColorStop(0.6, 'rgba(255,120,30,.45)'); g.addColorStop(1, 'rgba(255,80,0,0)');
    x.fillStyle = g; x.beginPath(); x.moveTo(32, 4); x.bezierCurveTo(58, 60, 54, 122, 32, 122); x.bezierCurveTo(10, 122, 6, 60, 32, 4); x.fill();
    return (this._flameT = new THREE.CanvasTexture(c));
  }

  _softTex() {
    if (this._soft) return this._soft;
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 2, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    return (this._soft = new THREE.CanvasTexture(c));
  }

  _buildSea() {
    // Malet hav (fra brugerens maleri) – to lag der driver langsomt hver sin vej
    const tex = new THREE.TextureLoader().load(SEA_IMAGE);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.MirroredRepeatWrapping;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    this.seaUniforms = { uTime: { value: 0 }, uTex: { value: tex } };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.seaUniforms,
      vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
      fragmentShader: `
        uniform float uTime; uniform sampler2D uTex;
        varying vec3 vW;
        void main(){
          vec2 p = vW.xz; float t = uTime;
          vec2 wob = vec2(sin(p.y * 1.3 + t * 0.7), cos(p.x * 1.1 + t * 0.6)) * 0.006;
          vec3 a = texture2D(uTex, p * vec2(0.105, 0.19) + vec2(t * 0.006, t * 0.0025) + wob).rgb;
          vec3 b = texture2D(uTex, p * vec2(-0.085, 0.155) + vec2(0.37 - t * 0.0045, 0.21 + t * 0.0035) - wob).rgb;
          vec3 col = mix(a, b, 0.3);
          float r = length(p);
          float shallow = 1.0 - smoothstep(4.6, 6.8, r);
          col = mix(col, col * vec3(0.92, 1.08, 1.06) + vec3(0.0, 0.025, 0.03), shallow * 0.4);
          float lum = dot(col, vec3(0.299, 0.587, 0.114));
          col = mix(vec3(lum), col, 0.78) * vec3(0.78, 0.86, 0.95);
          col *= 0.52 * mix(1.0, 0.75, smoothstep(5.4, 7.4, r));
          gl_FragColor = vec4(col, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const sea = new THREE.Mesh(new THREE.CircleGeometry(7.48, 6), mat);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.2;
    this.scene.add(sea);
  }
}
