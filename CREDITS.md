# Rettigheder og tak

| Del | Licens | Hvor |
|---|---|---|
| [Three.js](https://threejs.org) r170 – 3D-grafik | MIT | `vendor/three/` (se `vendor/three/LICENSE`) |
| [PeerJS](https://peerjs.com) 1.5.5 – direkte forbindelser mellem browsere | MIT | `vendor/peerjs.min.js` |
| [KayKit Medieval Hexagon Pack](https://kaylousberg.itch.io/kaykit-medieval-hexagon) af Kay Lousberg – huse og borge | CC0 | `assets/models/` |
| [Cinzel](https://fonts.google.com/specimen/Cinzel) – overskrifter | SIL OFL 1.1 | `assets/fonts/` |
| [IM Fell English](https://fonts.google.com/specimen/IM+Fell+English) – brødtekst | SIL OFL 1.1 | `assets/fonts/` |
| Malerier af felter, kort, hav, røver og havne | Lavet til projektet | `assets/images/` |

Nybyggerne er et hobbyprojekt inspireret af brætspillet *Catan*. Det er ikke forbundet med eller godkendt af Catan GmbH.

Online-spil går via jeres egen Cloudflare-worker (`cloudflare/worker.js`), når spillet ligger på Cloudflare. Ellers bruges PeerJS' gratis offentlige server til at finde hinanden, og spillet sendes direkte mellem browserne.
