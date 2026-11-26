// Nybyggerne – 3D-brættet: malede tekstur-billeder, der tegnes med kode på et <canvas>.
// Bordpladen, en reserve-eng og guldfeltet (bjergmaleriet tonet i guld) laves her.
import * as THREE from 'three';

// Malet eng (indtil der kommer et rigtigt maleri af græsmarken)
export function paintPasture() {
  const W = 512, H = 560, c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d');
  let seed = 42; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const sky = x.createLinearGradient(0, 0, 0, H * 0.3); sky.addColorStop(0, '#8fb6e2'); sky.addColorStop(1, '#f2e2c2');
  x.fillStyle = sky; x.fillRect(0, 0, W, H * 0.32);
  for (let k = 0; k < 5; k++) { x.fillStyle = 'rgba(255,255,255,.55)'; const cx = R() * W, cy = 40 + R() * 70; for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(cx + j * 18 - 36, cy + (j % 2) * 6, 16 + R() * 10, 0, 7); x.fill(); } }
  x.fillStyle = '#8aa7a0'; x.beginPath(); x.moveTo(0, H * 0.27); for (let i = 0; i <= 10; i++) x.lineTo(i * W / 10, H * 0.24 - Math.sin(i * 1.3) * 18 - R() * 12); x.lineTo(W, H * 0.34); x.lineTo(0, H * 0.34); x.fill();
  x.fillStyle = '#86a95a'; x.beginPath(); x.moveTo(0, H * 0.31); for (let i = 0; i <= 8; i++) x.lineTo(i * W / 8, H * 0.29 + Math.sin(i * 0.9) * 10); x.lineTo(W, H * 0.4); x.lineTo(0, H * 0.4); x.fill();
  for (let k = 0; k < 9; k++) { const tx = R() * W, ty = H * 0.29 + R() * 20; x.fillStyle = '#3f6b3a'; x.beginPath(); x.moveTo(tx, ty - 34 - R() * 10); x.lineTo(tx + 9, ty); x.lineTo(tx - 9, ty); x.fill(); }
  const g = x.createLinearGradient(0, H * 0.33, 0, H); g.addColorStop(0, '#a9c766'); g.addColorStop(0.5, '#8db64f'); g.addColorStop(1, '#6e9a3a');
  x.fillStyle = g; x.fillRect(0, H * 0.33, W, H);
  for (let k = 0; k < 2600; k++) { const px = R() * W, py = H * 0.34 + R() * H * 0.66, l = 4 + (py / H) * 12; x.strokeStyle = `hsla(${78 + R() * 30},${40 + R() * 25}%,${28 + R() * 30}%,.55)`; x.lineWidth = 1 + (py / H) * 1.4; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (R() - 0.5) * 4, py - l); x.stroke(); }
  for (let k = 0; k < 140; k++) { const px = R() * W, py = H * 0.4 + R() * H * 0.6; x.fillStyle = ['#fff7e6', '#f6d04d', '#e98bb0', '#ffffff'][Math.floor(R() * 4)]; x.beginPath(); x.arc(px, py, 1.5 + (py / H) * 2.5, 0, 7); x.fill(); }
  // hegn
  x.strokeStyle = '#6b4a2a'; x.lineWidth = 5; x.lineCap = 'round';
  for (let i = 0; i < 6; i++) { const fx = W * 0.55 + i * 40, fy = H * 0.5 + i * 18; x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx, fy - 38); x.stroke(); }
  x.lineWidth = 4; [[-30], [-14]].forEach(([dy]) => { x.beginPath(); x.moveTo(W * 0.55, H * 0.5 + dy); x.lineTo(W * 0.55 + 200, H * 0.5 + 90 + dy); x.stroke(); });
  // får
  const sheep = (sx, sy, s) => {
    x.fillStyle = 'rgba(40,50,20,.25)'; x.beginPath(); x.ellipse(sx, sy + 20 * s, 34 * s, 8 * s, 0, 0, 7); x.fill();
    x.fillStyle = '#2f2622'; [[-16, 0], [-6, 2], [8, 2], [18, 0]].forEach(([lx]) => x.fillRect(sx + lx * s, sy + 4 * s, 4 * s, 16 * s));
    x.fillStyle = '#f7f2e6'; for (let j = 0; j < 9; j++) { x.beginPath(); x.arc(sx + (R() - 0.5) * 40 * s, sy - 4 * s + (R() - 0.5) * 16 * s, 12 * s, 0, 7); x.fill(); }
    x.fillStyle = '#e6dccb'; x.beginPath(); x.arc(sx + 6 * s, sy + 2 * s, 12 * s, 0, 7); x.fill();
    x.fillStyle = '#2f2622'; x.beginPath(); x.ellipse(sx - 26 * s, sy - 6 * s, 8 * s, 10 * s, 0.4, 0, 7); x.fill();
  };
  [[150, 300, 0.9], [270, 360, 1.1], [120, 430, 1.25], [330, 455, 1.35], [235, 250, 0.7]].forEach(([a, b, s]) => sheep(a, b, s));
  // gylden kant som på de andre malerier
  x.strokeStyle = '#d9c99a'; x.lineWidth = 8; x.beginPath();
  [[W / 2, 4], [W - 4, H * 0.25], [W - 4, H * 0.75], [W / 2, H - 4], [4, H * 0.75], [4, H * 0.25]].forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b)));
  x.closePath(); x.stroke();
  return c;
}

export function wrap(x, text, cx, y, maxW, lh) {
  const words = text.split(' '); let line = '';
  words.forEach(w => { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { x.fillText(line, cx, y); y += lh; line = w; } else line = t; });
  if (line) x.fillText(line, cx, y);
}

// Bordplade af gamle egeplanker (tegnet i koden)
export function paintTable() {
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d');
  let seed = 7; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const planks = 5, ph = S / planks;
  for (let i = 0; i < planks; i++) {
    const y0 = i * ph, hue = 24 + R() * 6, light = 22 + R() * 7;
    x.fillStyle = `hsl(${hue},${45 + R() * 10}%,${light}%)`; x.fillRect(0, y0, S, ph);
    for (let k = 0; k < 140; k++) {
      const yy = y0 + R() * ph, amp = 2 + R() * 6, f = 0.004 + R() * 0.01, off = R() * 100;
      x.strokeStyle = `hsla(${hue},40%,${light + (R() - 0.6) * 14}%,${0.25 + R() * 0.35})`; x.lineWidth = 0.6 + R() * 1.8;
      x.beginPath(); for (let xx = 0; xx <= S; xx += 16) { const v = yy + Math.sin(xx * f + off) * amp + Math.sin(xx * f * 3.1 + off) * amp * 0.3; xx ? x.lineTo(xx, v) : x.moveTo(xx, v); } x.stroke();
    }
    for (let k = 0; k < 2; k++) {
      const kx = R() * S, ky = y0 + ph * (0.25 + R() * 0.5);
      for (let r = 26; r > 2; r -= 4) { x.strokeStyle = `hsla(${hue},45%,${12 + r * 0.25}%,.55)`; x.lineWidth = 2; x.beginPath(); x.ellipse(kx, ky, r * 1.9, r * 0.7, 0, 0, 7); x.stroke(); }
      x.fillStyle = 'hsla(20,45%,9%,.8)'; x.beginPath(); x.ellipse(kx, ky, 7, 3, 0, 0, 7); x.fill();
    }
    x.fillStyle = 'rgba(10,5,2,.85)'; x.fillRect(0, y0, S, 3);
    x.fillStyle = 'rgba(255,220,170,.06)'; x.fillRect(0, y0 + 3, S, 2);
    const nailX = [40, S - 40];
    nailX.forEach(nx => [ph * 0.3, ph * 0.7].forEach(dy => { x.fillStyle = '#1b130d'; x.beginPath(); x.arc(nx, y0 + dy, 5, 0, 7); x.fill(); x.fillStyle = 'rgba(200,170,120,.25)'; x.beginPath(); x.arc(nx - 1.5, y0 + dy - 1.5, 2, 0, 7); x.fill(); }));
  }
  for (let k = 0; k < 90; k++) { x.strokeStyle = `rgba(255,230,190,${0.03 + R() * 0.05})`; x.lineWidth = 1; const sx = R() * S, sy = R() * S; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (R() - 0.5) * 120, sy + (R() - 0.5) * 30); x.stroke(); }
  for (let k = 0; k < 6; k++) { const g = x.createRadialGradient(R() * S, R() * S, 5, R() * S, R() * S, 60 + R() * 60); g.addColorStop(0, 'rgba(15,8,3,.18)'); g.addColorStop(1, 'rgba(15,8,3,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S); }
  return c;
}

// Guldfelt: brugerens bjergmaleri tonet i guld med glimt
export function paintGold(src) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 560;
  const tex = new THREE.CanvasTexture(c);
  const img = new Image();
  img.onload = () => {
    const x = c.getContext('2d');
    x.drawImage(img, 0, 0, 512, 560);
    x.globalCompositeOperation = 'color'; x.fillStyle = '#d8a520'; x.fillRect(0, 0, 512, 560);
    x.globalCompositeOperation = 'soft-light'; x.fillStyle = '#ffd25a'; x.fillRect(0, 0, 512, 560);
    x.globalCompositeOperation = 'source-over';
    let seed = 11; const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let k = 0; k < 70; k++) {
      const px = R() * 512, py = 180 + R() * 360, r = 2 + R() * 5;
      const g = x.createRadialGradient(px, py, 0, px, py, r * 3); g.addColorStop(0, 'rgba(255,250,210,.95)'); g.addColorStop(1, 'rgba(255,220,120,0)');
      x.fillStyle = g; x.beginPath(); x.arc(px, py, r * 3, 0, 7); x.fill();
    }
    x.fillStyle = 'rgba(70,40,5,.85)'; x.font = '700 46px Cinzel, Georgia, serif'; x.textAlign = 'center';
    x.strokeStyle = 'rgba(255,240,190,.9)'; x.lineWidth = 6; x.strokeText('GULD', 256, 520); x.fillText('GULD', 256, 520);
    tex.needsUpdate = true;
  };
  img.src = src;
  return tex;
}
