# Ret selv – opskrifter

Prøv altid en ændring lokalt først (`node tools/serve.js`, åbn http://localhost:8000) og genindlæs med **Ctrl+F5**. Kommer der en fejl, så tryk **F12** og se i fanen *Console*.

Har du ændret i `js/game/`, så kør også `node tests/simulate.js`. Den spiller 320 spil og stopper med en fejl, hvis en regel er brudt.

---

### Ændre prisen på noget
`js/game/constants.js` → `COST`. En by koster f.eks. `city: { wheat: 2, ore: 3 }`.
Byggeknapperne og regelbogens oversigt opdaterer sig selv.

### Ændre antal brikker
`js/game/constants.js` → `PIECES`, f.eks. `road: 15`.

### Ændre pointmålet
`js/game/setup.js` → `winVP: 10 + …`. Udvidelserne lægger point oveni.

### Ændre en dansk tekst
- Råstoffer, kort og udvidelser: `js/game/constants.js` (`RES_DA`, `DEV_DA`, `DEV_DESC`, `EXP_DA`, `EVENTS`)
- Statusteksten ("Din tur – …"): `js/ui/render.js` → `statusText()`
- Krøniken: `log(s, '…')` i `js/game/` (`[[1]]` bliver til spiller 1's navn)
- Regelbogen: `js/ui/rules.js` (almindelig HTML)
- Startskærmen: `index.html`

### Tilføje eller ændre et begivenhedskort
1. Tilføj kortet i `EVENTS` i `js/game/constants.js` (navn og tekst).
2. Læg det i bunken i `makeEventDeck()` i `js/game/setup.js`.
3. Skriv, hvad det gør, i `applyEvent()` i `js/game/events.js`.

### Skifte et billede
Læg den nye fil i `assets/images/…`. Brug enten samme navn som den gamle, eller ret stien i `js/assets.js`.
- Felter: helst kvadratiske billeder på ca. 512 px. Sekskanten skæres ud af midten.
- Havne: den lige underkant skal være kysten. Ret også `HARBOR_ASPECT` (højde ÷ bredde).
- WebP fylder mindst, men PNG og JPG virker også.

### Ændre farver
Farverne til knapper, pergament og tekst står øverst i `css/base.css` under `:root`.
Spillerfarverne står i `COLORS` i `js/game/constants.js`. Husene er 3D-modeller i fire farver (`assets/models/`), så nye spillerfarver kræver også nye modeller.

### Ændre hvad en knap gør
Find knappens `data-cmd="…"` i `index.html` eller i den JavaScript, der laver den. Søg derefter efter `case '…'` i `js/ui/commands.js`.

### Ændre en lyd
`js/sound.js`. Hver lyd er en lille funktion, der laver toner og støj med Web Audio. Lydens navn (f.eks. `'build'`) bruges med `Sound.play('build')`.

### Ændre zoom og kamera
`js/render/board3d.js`:
- `minZoom` og `maxZoom` bestemmer, hvor langt man kan zoome.
- `_resize()` bestemmer, hvor meget af bordet man ser fra start.

### Gøre botten klogere eller dummere
`js/game/bot.js`:
- `DEV_RUSH_VP`: hvornår den kun køber udviklingskort.
- `OFFER_WAIT_MS`: hvor længe den venter på svar på et byttetilbud.
- `1.6` i `roadTarget()`: hvor meget en lang vej trækker ned.
- `goals()`: rækkefølgen af det, den vil bygge.
- Svær: `resWeights()` (hvor meget et manglende råstof er værd), `hardVertexValue()` (havne og nye råstoffer) og `gain`-tallene i `hardGoals()`.

Kør `node tests/bots.js` bagefter.
Tempoet ændres med `BOT_DELAY_MS` i `js/bots.js`.

### Lave en ny version, som ikke skal kunne spille med den gamle
Skift `PREFIX` i `js/config.js`, f.eks. til `'nybyggerne-v2-'`.

---

## Gode vaner

- **Én ændring ad gangen.** Genindlæs og se, at det virker, før du går videre.
- **Spillogik og skærm holdes adskilt.** Regler hører til i `js/game/`. Den mappe må aldrig bruge `document`, `window` eller Three.js.
- **Tilstanden skal kunne sendes over nettet.** Brug kun almindelige tal, tekster, lister og objekter i den. Den bliver lavet om til JSON.
- Hver fil starter med en kommentar om, hvad den indeholder. Opdatér den, hvis du flytter rundt på tingene.
