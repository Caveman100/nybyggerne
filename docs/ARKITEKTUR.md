# Sådan er koden bygget op

Spillet er almindelig HTML, CSS og JavaScript uden byggetrin. Browseren indlæser filerne direkte, så man kan rette en fil, gemme den og genindlæse siden.

## Overblik

```
nybyggerne/
├── index.html            Siden: alle elementer på skærmen + hvilke filer der indlæses
├── css/                  Udseende (indlæses i denne rækkefølge)
│   ├── base.css            skrifttyper, farver, knapper, felter
│   ├── game.css            spilskærmen: hånd, modspillere, bannere, timer, byggeknapper
│   ├── rules.css           regelbogen
│   ├── start.css           startskærm og lobby
│   └── panels.css          vinduer: handel, spillere, krønike, indstillinger, dialoger
├── js/
│   ├── main.js           ▶ START: sætter alt i gang
│   ├── config.js           netværksindstillinger (rumkode-præfiks, PeerJS)
│   ├── assets.js           stier til alle billeder og modeller
│   ├── storage.js          gemmer i browseren (navn, indstillinger, spil i gang)
│   ├── session.js          spillets gang på denne skærm: send handling → ny tilstand
│   ├── sound.js            lydeffekter (laves med kode, ingen lydfiler)
│   ├── game/             SPILLOGIK – ren JavaScript, intet om skærmen
│   ├── render/           3D-BRÆTTET – Three.js
│   ├── ui/               ALT ANDET PÅ SKÆRMEN – HTML-knapper, vinduer, tekster
│   └── net/              ONLINE-SPIL – vært og gæst via PeerJS
├── assets/               billeder, 3D-modeller og skrifttyper
├── vendor/               færdige biblioteker (Three.js, PeerJS) – rør dem ikke
├── tests/simulate.js     automatisk test af reglerne
├── cloudflare/worker.js  relæet til online-spil på Cloudflare (se docs/CLOUDFLARE.md)
├── wrangler.jsonc        Cloudflare-opsætning
├── tools/                lokal webserver og valgfri "byg én fil"
└── docs/                 denne dokumentation
```

## Den vigtigste idé: tilstand ind → skærm ud

Hele spillet er **ét JavaScript-objekt**, *tilstanden* (`state`, ofte kaldet `s`). Den indeholder brættet, alle brikker, spillernes kort, hvis tur det er og loggen. Alt andet følger af det:

```
  spilleren klikker  ──►  handling, f.eks. { type: 'build-road', e: 42 }
                                │
                                ▼
                     G.act(tilstand, spiller, handling)      js/game/engine.js
                     tjekker reglerne og returnerer en NY tilstand
                     (eller en fejl, f.eks. "Du har ikke råd")
                                │
                                ▼
                     applyState(ny, gammel)                  js/session.js
                     gem · send til de andre (vært) · tegn skærmen
                                │
                                ▼
                     render()                                js/ui/render.js
                     ├─ board.update(tilstand)  → 3D-brættet  (js/render/)
                     ├─ renderHud()             → kort, modspillere (js/ui/hud.js)
                     └─ renderSide()            → status, knapper, vinduer
```

Reglerne ændrer aldrig skærmen direkte, og skærmen ændrer aldrig tilstanden direkte. Derfor kan reglerne testes uden en browser (`node tests/simulate.js`).

## js/game/ – spillogikken

| Fil | Indhold |
|---|---|
| `index.js` | Samler alt i objektet `G`, som resten af programmet bruger |
| `constants.js` | Råstoffer, **priser** (`COST`), antal brikker (`PIECES`), farver, kortnavne, begivenhedskort |
| `geometry.js` | Brættets net: `HEXES` (felter), `VERTS` (hjørner, hvor man bygger huse) og `EDGES` (kanter, hvor man bygger veje). Hvert element har et nummer, som resten af koden bruger. |
| `setup.js` | `newGame()`: blander felter og tal, placerer havne og laver starttilstanden |
| `placement.js` | Hvor må man bygge? (`canPlaceSettlement`, `validRoadSpots`, …) og havnenes bytteforhold |
| `actions.js` | Hver handling: opstart, slå, byg, handel, udviklingskort, røver … |
| `events.js` | Produktion efter terningslag, tyveri, begivenhedskort, barbarangreb |
| `scoring.js` | Længste vej, største hær, sejrspoint |
| `engine.js` | `act()` (sikker indgang til alle handlinger), `autoAction()` (når tiden løber ud), `actors()` (hvem må handle nu) |
| `bot.js` | Computerspilleren: `botAction(tilstand, spiller)` vælger bottens næste træk (se nedenfor) |
| `helpers.js` | Små hjælpere: betal, giv, bland, log |

**Handlinger** er små objekter med en `type`, f.eks. `roll`, `build-road`, `build-settlement`, `build-city`, `build-ship`, `build-knight`, `activate-knight`, `buy-dev`, `play-dev`, `move-robber`, `steal`, `discard`, `bank-trade`, `offer-trade`, `accept-trade`, `confirm-trade`, `cancel-trade` og `end-turn`.

**Tilstanden** har bl.a. disse felter:

| Felt | Betydning |
|---|---|
| `hexes` | Felterne: `{ terrain, number, island }` |
| `buildings` | Huse og byer pr. hjørne: `{ 17: { owner: 0, type: 'city' } }` |
| `roads`, `ships` | Veje og skibe pr. kant: `{ 42: 1 }` (ejerens nummer) |
| `guards` | Riddere (udvidelse) pr. hjørne |
| `players` | Navn, farve, `res` (råstoffer), `dev` (udviklingskort) … |
| `turn`, `phase` | Hvis tur, og hvad der sker nu: `setup`, `roll`, `main`, `robber`, `steal`, `discard`, `gameover` |
| `log` | Krøniken. `[[2]]` i en tekst bliver til spiller 2's navn i farve. |
| `seq` | Tæller én op ved hver ændring |

## js/render/ – 3D-brættet

`Board3D` er én klasse, men den er delt i filer efter emne. Hver fil indeholder en "del" (f.eks. `TileParts`), hvis metoder blandes ind i `Board3D` nederst i `board3d.js`. Inde i alle filerne er `this` derfor selve brættet.

| Fil | Indhold |
|---|---|
| `board3d.js` | Opsætning (kamera, lys, indlæsning), `update()` som synkroniserer brikkerne med tilstanden, klik og tegne-løkken |
| `tavern.js` | Træbordet, stearinlys, ildskær og det malede hav |
| `tiles.js` | Sekskantfelterne med malerier og nummerbrikkerne |
| `harbors.js` | Havnene og deres skilte (2:1 / 3:1) |
| `pieces.js` | Veje, skibe, huse, byer, riddere og røveren |
| `dice.js` | Terningerne i bakken øverst til højre |
| `effects.js` | Animationer, støv og kort der flyver hen til spillerne |
| `textures.js` | Billeder tegnet med kode (bordplade, guldfelt) |
| `constants.js` | Fælles mål (`K` = omregning fra spillogik til 3D) |

Kameraet ser lige ned ovenfra uden perspektiv (`OrthographicCamera`). Felterne er flade sekskanter med malerierne som tekstur. Kun huse og borge er rigtige 3D-modeller.

## js/ui/ – skærmen udenom brættet

| Fil | Indhold |
|---|---|
| `state.js` | `app`: programmets fælles tilstand (mode, din spiller, valgt byggeknap, åbent vindue …) |
| `render.js` | `render()`, statusteksten, byggeknapperne og markeringer af hvor man kan bygge |
| `hud.js` | Dine kort, modspillernes kort, barbarer, "Din tur"-banner, "Du fik …", timer og lyde ved hændelser |
| `panels.js` | Vinduerne bag knapperne til højre (handel, spillere, krønike, indstillinger) og dialoger |
| `commands.js` | **Hvad knapperne gør.** Alle knapper i HTML har `data-cmd="…"`, og her står hvad der sker. |
| `lobby.js` | Startskærm og lobby |
| `rules.js` | Regelbogens tekster (HTML) |
| `board-view.js` | Starter 3D-brættet og sender klik på brættet videre som handlinger |
| `util.js` | `$()`, `esc()`, `toast()`, ikoner |

## js/net/ – online-spil

Den spiller, der opretter spillet, er **vært** og kører reglerne. De andre er **gæster**. Beskederne er de samme, uanset hvordan de sendes:

```
  gæst                                 vært
   │  { t: 'hello', name, cid }  ──►    │  tilføjes til lobbyen
   │  ◄──  { t: 'lobby', players }      │
   │  { t: 'act', a: handling }  ──►    │  G.act(...) → ny tilstand
   │  ◄──  { t: 'state', s, you }       │  sendes til alle
   │  ◄──  { t: 'err', m }              │  hvis handlingen var ulovlig
```

Der er to måder at sende dem på. `transport.js` vælger automatisk:

| | Cloudflare-relæ (`relay.js` + `cloudflare/worker.js`) | PeerJS (`vendor/peerjs.min.js`) |
|---|---|---|
| Hvordan | WebSocket over HTTPS til et lille rum hos Cloudflare, som sender beskederne videre | Direkte mellem browserne (WebRTC) |
| Firewalls | Går igennem næsten alle, fordi det ligner en almindelig hjemmeside (port 443) | Blokeres ofte på skole- og firmanet |
| Bruges når | Spillet ligger på Cloudflare, eller `RELAY_URL` er sat i `config.js` | Ellers (f.eks. kun GitHub Pages) |

`RelayPeer` i `relay.js` har samme metoder som PeerJS (`on`, `connect`, `send` …). Derfor er `host.js` og `client.js` ens for begge.

- Rummets navn er `PREFIX + kode` (se `js/config.js`).
- Værten gemmer spillet i browseren, så det kan genoptages ("Genoptag"). Gæster genforbinder automatisk.
- Test: `?peerjs=1` tvinger PeerJS. `?relay=https://…` bruger et bestemt relæ. `?peerhost=127.0.0.1&peerport=9000` bruger en lokal PeerJS-server.

## Botter

- **Strategien** ligger i `js/game/bot.js`. Den er ren spillogik, ligesom resten af `js/game/`. Botten laver kun almindelige handlinger gennem `G.act()`, så den kan ikke snyde.
- **Botterne kører** i `js/bots.js` hos værten (eller på skærmen i et lokalt spil). Hvert 150. ms tjekker den, om en bot skal handle, og laver højst ét træk pr. 0,9 sekund.
- Gæster ser bare botten som en almindelig spiller. Den er markeret med `bot: true` i `players` og med 🤖 i navnet.

Der er tre sværhedsgrader (`players[i].bot` = `'easy'`, `'normal'` eller `'hard'`):

| | Let | Normal | Svær |
|---|---|---|---|
| Byggested | Tilfældigt blandt de gode | Flest prikker | Vægter de råstoffer, den **mangler**. Bonus for et nyt råstof og for **havne** (2:1-havne for det, den producerer meget af) |
| Hvad bygges | Første det har råd til | Fast rækkefølge (se nedenfor) | Det mål, der giver mest pr. ventetid. Ventetiden regnes ud fra dens produktion. |
| Handel | Siger ja tilfældigt | 1:1-tilbud, bank og havne | Som normal, men hjælper ikke den, der er tæt på at vinde |
| Røveren | Som normal | Hvor modspillerne mister mest | Rammer især den førende |

I testen vandt Svær 71 % af spillene med én bot af hver slags (300 spil), og 69 % af spillene mod Normal én mod én (200 spil).

Normal bots regler, i prioriteret rækkefølge:
1. Mangler den højst 3 sejrspoint: køb udviklingskort, når den kan.
2. By på det hus, der giver flest ressourcer.
3. Hus på det lovlige hjørne med størst samlet chance (sum af prikker på talbrikkerne).
4. Ellers vej mod det nærmeste gode byggested (chance minus 1,6 pr. vej, der skal bygges).
5. Udviklingskort, hvis den har mindst 7 kort eller intet andet at bygge.
6. Mangler den præcis 1 kort til mål nr. 1: tilbyd de andre 1:1 og vent op til 15 sekunder på svar.
7. Byt overskud i banken eller på havne.

Derudover spiller den udviklingskort (riddere, overflodsår, vejbygning og monopol). Røveren sætter den, hvor modspillerne mister mest. Den stjæler fra den med flest kort, smider de kort den har flest af, og siger kun ja til et byttetilbud, der bringer den tættere på sit mål.

## Andet

- **Lokalt spil** (alle ved samme skærm) bruger samme kode, men uden netværk. Man skifter mellem spillerne med "Du styrer".
- **Tidsgrænse**: værten (eller den lokale skærm) udfører `G.autoAction()`, når tiden løber ud (`js/session.js`).
- **Én-fils-udgave**: `npm run build:single` samler alt i `dist/nybyggerne.html`. Billederne slås op via `inline()` i `js/assets.js`.
