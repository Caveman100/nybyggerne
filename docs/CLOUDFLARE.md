# Online-spil via Cloudflare (virker bag firewalls)

## Hvorfor?

Uden Cloudflare forbinder spillet browserne **direkte** med hinanden (WebRTC via PeerJS). Skoler, firmaer, hoteller og nogle mobilnet blokerer ofte den slags forbindelser. Så kan vennerne ikke komme ind i spillet.

Med Cloudflare går alle beskeder i stedet gennem en lille **worker** hos Cloudflare. Den bruger samme slags forbindelse som en almindelig hjemmeside (HTTPS på port 443), og den bliver næsten aldrig blokeret.

Workeren viser **også** selve spillet. Du får altså ét link, og Cloudflare opdaterer det automatisk, hver gang du ændrer noget på GitHub.

**Pris:** Cloudflares gratis plan er rigeligt til en vennegruppe. Workers og Durable Objects er gratis op til 100.000 forespørgsler om dagen, og WebSocket-beskeder tæller kun med 1/20.

## Opsætning (ca. 5 minutter, ingen kommandolinje)

Forudsætning: Spillet ligger i et repository på GitHub (se [GITHUB-PAGES.md](GITHUB-PAGES.md), trin 1–2). Filerne `wrangler.jsonc` og `cloudflare/worker.js` skal ligge i repositoriet.

1. Opret en gratis konto på [dash.cloudflare.com](https://dash.cloudflare.com/sign-up).
2. Gå til **Compute (Workers)** → **Workers & Pages** i menuen til venstre og klik **Create application**.
3. Vælg **Import a repository** og klik **Get started**.
4. Forbind din GitHub-konto, når du bliver spurgt, og vælg dit `nybyggerne`-repository.
5. Lad indstillingerne stå som de er (projektnavn `nybyggerne`, deploy command `npx wrangler deploy`). Klik **Create and deploy** (knappen kan også hedde **Save and Deploy**).
6. Vent et minut. Når der står *Success*, finder du adressen under **Settings → Domains & Routes**:
   `https://nybyggerne.<dit-navn>.workers.dev`

Det er linket, du deler. Når spillet starter, finder det selv relæet ved siden af sig.

> Navnene på knapperne i Cloudflare ændrer sig en gang imellem. Står der noget lidt andet, så led efter "Workers", "Import a repository" og "Deploy".

### Opdateringer

Hver gang du ændrer en fil på GitHub, bygger og udgiver Cloudflare automatisk spillet igen. Det tager ca. et minut. Du kan følge med under **Deployments** for din worker.

## Hvis du vil beholde GitHub Pages-linket

Du kan godt blive ved med at spille på GitHub Pages og kun bruge Cloudflare til forbindelsen:

1. Lav Cloudflare-opsætningen ovenfor.
2. Åbn `js/config.js` og skriv din worker-adresse:
   ```js
   export const RELAY_URL = 'https://nybyggerne.dit-navn.workers.dev';
   ```
3. Gem ændringen på GitHub.

Det er dog nemmest bare at bruge Cloudflare-linket.

## Tjek at det virker

- Åbn `https://nybyggerne.<dit-navn>.workers.dev/relay/ping`. Der skal stå `nybyggerne-relay`.
- Åbn spillet, tryk **F12** og se i fanen *Console*. Der skal stå `Nybyggerne forbinder via relay`.

## Fejlfinding

| Problem | Løsning |
|---|---|
| Deploy fejler med en fejl om "Durable Objects" | Tjek at `wrangler.jsonc` ligger øverst i repositoriet. Første gang skal du måske acceptere Workers' gratis plan i dashboardet. |
| `/relay/ping` giver 404 | Workeren kører ikke. Se seneste deploy under **Deployments**. |
| Konsollen siger `via peerjs` på Cloudflare-linket | Genindlæs med Ctrl+F5. Tjek derefter `/relay/ping` som ovenfor. |
| Spillet virker, men nogle filer mangler | `.assetsignore` styrer, hvad der *ikke* udgives. Tjek at den nye fil ikke står der. |

## Sådan virker det teknisk

Se `cloudflare/worker.js`. Hvert spil er et rum (et *Durable Object*), som værten og gæsterne forbinder til med en WebSocket. Rummet sender bare beskederne videre: værten kører stadig spillets regler, ligesom med PeerJS. Klientdelen ligger i `js/net/relay.js` og `js/net/transport.js`.

Prøv det lokalt med Cloudflares eget testmiljø:

```bash
npm install
npm run dev      # → http://localhost:8787 med relæ
```
