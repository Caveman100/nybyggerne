# Læg spillet på GitHub Pages

Med GitHub Pages får du et gratis link, som dine venner kan spille på. Du behøver ikke installere noget eller kunne Git.

## 1. Opret et repository

1. Log ind på [github.com](https://github.com). Opret en gratis konto, hvis du ikke har en.
2. Klik på **+** øverst til højre og vælg **New repository**.
3. Giv det et navn, f.eks. `nybyggerne`.
4. Vælg **Public**. GitHub Pages er gratis for offentlige repositories.
5. Klik **Create repository**.

## 2. Upload filerne

1. Pak zip-filen ud på din computer.
2. På siden for dit nye repository klikker du på linket **uploading an existing file**.
3. Åbn den udpakkede mappe `nybyggerne`. Markér **alt indholdet** (mapperne `assets`, `css`, `js` osv. og filerne `index.html`, `README.md` osv.) og træk det ind i browservinduet.
   - Det er indholdet af mappen, der skal trækkes ind, ikke selve mappen. `index.html` skal ligge øverst i repositoriet.
   - Filerne `.nojekyll` og `.gitignore` er skjulte på nogle computere. Det gør ikke noget, hvis de ikke kommer med.
4. Klik **Commit changes** nederst.

## 3. Slå GitHub Pages til

1. Gå til **Settings** (fanen øverst i repositoriet) og derefter **Pages** i menuen til venstre.
2. Under **Build and deployment** → **Source** vælger du **Deploy from a branch**.
3. Under **Branch** vælger du `main` og mappen `/ (root)`. Klik **Save**.
4. Vent 1–2 minutter og genindlæs siden. Øverst står der nu:
   *Your site is live at* `https://<dit-brugernavn>.github.io/nybyggerne/`

Det er linket, du deler med dine venner.

## Opdatér spillet senere

- **En enkelt fil:** Klik på filen på GitHub, så på blyanten ✏️, ret og **Commit changes**.
- **Mange filer:** **Add file** → **Upload files**, og træk de nye filer ind. Filer med samme navn bliver erstattet.

Siden opdateres efter et minut eller to. Kan du ikke se ændringen, så genindlæs med **Ctrl+F5**, eller **Cmd+Shift+R** på Mac.

> **Vigtigt ved større ændringer:** Hvis du ændrer reglerne, så værten og gæsterne ikke længere forstår hinanden, så skift `PREFIX` i `js/config.js`, f.eks. til `nybyggerne-v2-`. Så kan gamle og nye udgaver ikke ved et uheld havne i samme spil.

## Hvis noget ikke virker

| Problem | Løsning |
|---|---|
| Siden viser "404" | Vent et par minutter mere. Tjek at `index.html` ligger øverst i repositoriet og ikke inde i en undermappe. |
| Siden står fast på "Bygger øen…" | Åbn browserens konsol (F12) og se fejlen. Ofte mangler en fil eller en mappe i uploadet. |
| Vennerne kan ikke forbinde | Begge skal bruge samme link. Nogle skole- og firmanetværk blokerer direkte forbindelser. Løsningen er Cloudflare, se [CLOUDFLARE.md](CLOUDFLARE.md). |
