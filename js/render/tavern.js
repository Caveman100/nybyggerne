// Nybyggerne – 3D-brættet: Kroen omkring brættet: træbord, ildskær og det malede hav.
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
    this.rim = [frame, trim, this.seaMesh]; // skaleres efter øens størrelse (se _fitRim)

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
    this.seaMesh = sea;
  }
}
