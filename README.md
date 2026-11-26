# 🏰 Nybyggerne

Et middelalderligt brætspil om at bygge på en ø, inspireret af Catan. Det spilles i browseren med venner, enten online med en rumkode eller ved samme skærm.

- Grundspil for 2–4 spillere, med handel, udviklingskort, røveren, længste vej og største hær
- Tre udvidelser: **Begivenhedskort**, **Riddere og barbarer** og **Søfarere**
- Botter (computerspillere) i både online- og lokale spil
- Indbygget regelbog, tidsgrænse pr. tur og lydeffekter
- Online via Cloudflare (gratis), som virker bag skole- og firma-firewalls, eller direkte via PeerJS

## Spil det

Når spillet ligger på Cloudflare, spiller man på
`https://nybyggerne.<dit-navn>.workers.dev/` (eller GitHub Pages-adressen, hvis du kun bruger den).

1. Én spiller trykker **Opret spil** og får en kode på fire bogstaver.
2. De andre åbner samme link, skriver koden og trykker **Deltag**.
3. Værten trykker **Start spillet**.

Man kan også sende et direkte link med koden: `…/?kode=ABCD`.

Vil I være flere, kan værten trykke **🤖 Tilføj bot** i lobbyen og vælge sværhedsgrad (Let, Normal eller Svær). I et lokalt spil vælger man antal botter og sværhedsgrad på startskærmen.

## Læg det online

1. Læg filerne på GitHub: **[docs/GITHUB-PAGES.md](docs/GITHUB-PAGES.md)**. Det tager ca. 5 minutter og kræver ikke Git.
2. Forbind repositoriet til Cloudflare: **[docs/CLOUDFLARE.md](docs/CLOUDFLARE.md)**. Det er gratis og tager ca. 5 minutter.
   Så virker online-spil også bag firewalls, og Cloudflare opdaterer spillet, hver gang du ændrer noget på GitHub.

Med kun GitHub Pages virker spillet også, men online-forbindelsen kan blive blokeret på nogle netværk.

## Prøv det på din egen computer

Spillet kan **ikke** åbnes ved at dobbeltklikke på `index.html`, fordi browseren blokerer moduler fra filer. Start i stedet en lille webserver i mappen:

```bash
node tools/serve.js            # kræver Node.js
# eller
python -m http.server 8000     # kræver Python
```

Åbn derefter http://localhost:8000.

## Find rundt i koden

| Vil du ændre … | Se i |
|---|---|
| Priser, antal brikker, danske navne | `js/game/constants.js` |
| Spillets regler | `js/game/` (se [docs/ARKITEKTUR.md](docs/ARKITEKTUR.md)) |
| Teksterne i regelbogen | `js/ui/rules.js` |
| Billeder | `assets/images/` + stierne i `js/assets.js` |
| Farver og layout | `css/` (farverne står øverst i `css/base.css`) |
| Hvad en knap gør | `js/ui/commands.js` |
| Lyde | `js/sound.js` |
| Bottens strategi | `js/game/bot.js` |

Den fulde gennemgang står i **[docs/ARKITEKTUR.md](docs/ARKITEKTUR.md)**. Opskrifter på typiske ændringer står i **[docs/RET-SELV.md](docs/RET-SELV.md)**.

## Test

```bash
node tests/simulate.js    # spiller 320 tilfældige spil med alle udvidelser og tjekker reglerne
node tests/bots.js        # lader botter spille 200 spil og tjekker, at de kun laver lovlige træk
```

## Rettigheder

Se [CREDITS.md](CREDITS.md). Spillet bruger Three.js (MIT), PeerJS (MIT), KayKit-modeller (CC0) og skrifttyperne Cinzel og IM Fell English (OFL). Malerierne er lavet til projektet.
