// Nybyggerne – regelbogen. Teksterne er almindelig HTML og kan rettes direkte her.

import G from '../game/index.js';

import { send } from '../session.js';
import { app } from './state.js';
import { $ } from './util.js';
// ---------- Regelbog ----------
export const RULES = {
  base: { name: 'Grundspillet', html: `
    <p class="lead">Byg bosættelser, byer og veje på øen. Den første spiller, der når pointmålet i sin egen tur, vinder (10 point uden udvidelser).</p>
    <h3>Opstart</h3>
    <p>Hver spiller placerer en bosættelse og en vej, og derefter i omvendt rækkefølge en bosættelse og en vej mere. Den anden bosættelse giver straks ét råstof fra hvert felt, den rører ved.</p>
    <h3>Din tur</h3>
    <ul><li><b>Kast terningerne.</b> Alle felter med det slåede tal giver råstoffer: 1 kort pr. bosættelse og 2 pr. by på feltets hjørner. Feltet med røveren giver intet.</li>
    <li><b>Byg og handl</b> i den rækkefølge du vil.</li><li><b>Afslut turen.</b></li></ul>
    <h3>Slår man 7</h3>
    <p>Ingen får råstoffer. Alle med mere end 7 kort smider halvdelen (rundet ned). Den aktive spiller flytter røveren til et nyt felt og stjæler et tilfældigt kort fra en spiller med en bygning ved feltet.</p>
    <h3>Byggeri</h3>
    <table><tr><th>Bygning</th><th>Pris</th><th>Regel</th></tr>
      <tr><td>Vej</td><td>Træ + ler</td><td>Skal hænge sammen med dine veje eller bygninger. Maks. 15.</td></tr>
      <tr><td>Bosættelse</td><td>Træ + ler + uld + korn</td><td>1 point. Skal ligge ved din vej og mindst to kanter fra alle andre bygninger. Maks. 5.</td></tr>
      <tr><td>By</td><td>2 korn + 3 malm</td><td>Erstatter en af dine bosættelser. 2 point og dobbelt høst. Maks. 4.</td></tr>
      <tr><td>Udviklingskort</td><td>Uld + korn + malm</td><td>Trækkes fra bunken.</td></tr></table>
    <h3>Handel</h3>
    <ul><li>Med banken: 4 ens for 1 valgfrit.</li><li>Havne: en bygning ved en 3:1-havn giver 3:1 i alt, en bygning ved en 2:1-havn giver 2:1 for det viste råstof.</li>
    <li>Med spillerne (kun i din tur): send et tilbud – de andre accepterer eller afslår, og du vælger hvem du bytter med.</li></ul>
    <h3>Udviklingskort</h3>
    <p>Du må spille ét kort pr. tur (også før du kaster), men ikke et kort du har købt i samme tur. Sejrspointkort tæller automatisk og holdes skjult.</p>
    <ul><li><b>Ridderkort:</b> flyt røveren og stjæl et kort.</li><li><b>Vejbygning:</b> byg 2 veje gratis.</li><li><b>Overflodsår:</b> tag 2 valgfrie råstoffer.</li><li><b>Monopol:</b> alle andre giver dig alle deres kort af én slags.</li><li><b>Sejrspoint:</b> 1 point.</li></ul>
    <h3>Bonuspoint</h3>
    <ul><li><b>Længste vej (+2):</b> den første med en sammenhængende vej på mindst 5. Overtages kun, hvis en anden får en længere.</li>
    <li><b>Største hær (+2):</b> den første med mindst 3 spillede ridderkort. Overtages kun, hvis en anden får flere.</li></ul>
    <h3>Tidsgrænse</h3>
    <p>Hvis værten har valgt en tid pr. tur og tiden løber ud, handler spillet automatisk: det kaster, afslutter turen, smider tilfældige kort eller flytter røveren.</p>` },
  events: { name: 'Begivenhedskort', html: `
    <p class="lead">Terningerne erstattes af en bunke kort. Tallene fordeler sig jævnt, og der sker uventede ting på øen.</p>
    <h3>Kortbunken</h3>
    <p>Bunken indeholder alle 36 kombinationer af to terninger – præcis som i virkeligheden, bare uden held med fordelingen. I stedet for at kaste trækker man det øverste kort. Når der kun er 5 kort tilbage, blandes en ny bunke. Antallet af kort tilbage står ved terningebakken.</p>
    <h3>Begivenheder</h3>
    <p>Otte af kortene (aldrig et 7-kort) har en begivenhed. Den sker, før råstofferne uddeles.</p>
    <table><tr><th>Begivenhed</th><th>Virkning</th></tr>
      <tr><td>Høstfest</td><td>Alle spillere får 1 korn.</td></tr>
      <tr><td>Pest blandt fårene</td><td>Alle spillere mister 1 uld (hvis de har).</td></tr>
      <tr><td>Markedsdag</td><td>Resten af turen kan alle bytte 3:1 med banken.</td></tr>
      <tr><td>Turnering</td><td>Spilleren/spillerne med flest spillede ridderkort får 1 tilfældigt råstof.</td></tr>
      <tr><td>Velgørenhed</td><td>Spilleren med færrest point får 1 tilfældigt råstof (ingen ved lighed).</td></tr>
      <tr><td>Rig malmåre</td><td>Alle med en bygning ved et bjerg får 1 malm.</td></tr>
      <tr><td>Tømmerflod</td><td>Alle med en bygning ved en skov får 1 træ.</td></tr>
      <tr><td>Storm</td><td>I denne tur kan ingen bygge veje eller skibe.</td></tr></table>
    <p>Et 7-kort virker som en 7'er: røveren skal flyttes, og spillere med over 7 kort smider halvdelen.</p>` },
  barbarians: { name: 'Riddere og barbarer', html: `
    <p class="lead">Et barbarskib sejler mod øen. Kun riddere kan forsvare byerne. Pointmålet hæves med 1.</p>
    <h3>Barbarskibet</h3>
    <p>Efter hvert kast rykker skibet ét felt frem med 50 % chance. Når det når øen (7 felter), angriber barbarerne. Sporet ses øverst til venstre.</p>
    <h3>Riddere</h3>
    <ul><li><b>Byg en ridder:</b> uld + malm. Ridderen stilles på et ledigt hjørne ved en af dine veje (eller skibe). Maks. 6.</li>
    <li>Et hjørne med en ridder kan ikke bebygges. Riddere tæller ikke med i afstandsreglen.</li>
    <li>En ny ridder er straks <b>aktiv</b> (farvet skjold). Efter et angreb hviler alle riddere (gråt skjold).</li>
    <li><b>Aktivér en ridder:</b> 1 korn gør en hvilende ridder klar igen.</li></ul>
    <h3>Angrebet</h3>
    <div class="box"><b>Barbarernes styrke</b> = antal byer på øen (alle spillere).<br><b>Øens forsvar</b> = antal aktive riddere (alle spillere).</div>
    <ul><li><b>Forsvaret holder</b> (forsvar ≥ styrke): spilleren med flest aktive riddere bliver <b>Øens forsvarer</b> og får +1 point. Står flere lige, får de alle et point.</li>
    <li><b>Forsvaret svigter</b>: blandt spillere med mindst én by mister den/de med færrest aktive riddere en by – den bliver til en bosættelse igen.</li>
    <li>Er der ingen byer, sejler barbarerne hjem uden at gøre noget.</li></ul>
    <p>Efter angrebet starter skibet forfra, og alle riddere hviler.</p>
    <h3>Ridderkort og riddere</h3>
    <p>Udviklingskortet <b>Ridderkort</b> er noget andet end ridderbrikkerne: det flytter røveren og tæller til Største hær, men forsvarer ikke mod barbarerne.</p>` },
  seafarers: { name: 'Søfarere', html: `
    <p class="lead">Øen er mindre, men ude i havet ligger nye øer med guld. Byg skibe og kolonisér dem. Pointmålet hæves med 2.</p>
    <h3>Brættet</h3>
    <p>Hovedøen ligger mod vest. Mod øst ligger tre små øer, adskilt fra hovedøen af et stræde. To af felterne på øerne er <b>guldfelter</b>, som giver et tilfældigt råstof (2 for en by).</p>
    <h3>Opstart</h3>
    <p>Startbosættelserne skal ligge på hovedøen. Den anden brik i hver opstartsrunde må være en vej eller et skib.</p>
    <h3>Skibe</h3>
    <ul><li><b>Pris:</b> træ + uld. Maks. 15.</li>
    <li>Skibe sejler på vandkanterne – både ude på havet og langs kysten. En kant kan ikke have både vej og skib.</li>
    <li>Et skib skal hænge sammen med dine andre skibe eller en af dine bygninger.</li>
    <li>Man kan kun skifte mellem vej og skib ved en af sine egne bygninger.</li>
    <li>Du må bygge en bosættelse ved enden af et skib, ligesom ved en vej.</li></ul>
    <h3>Kolonisering</h3>
    <p>Første gang du bygger en bosættelse på en ny ø (ikke hovedøen), får du <b>+2 point</b>. Det gælder for hver ø, og alle spillere kan få bonussen for samme ø.</p>
    <h3>Længste handelsrute</h3>
    <p>Veje og skibe tæller sammen til Længste vej, men ruten må kun skifte mellem vej og skib ved din egen bygning. Kortet Vejbygning kan også bruges til skibe.</p>
    <h3>Røveren</h3>
    <p>Røveren kan kun stå på land.</p>` },
};
export function openRules(tab) {
  const el = $('rules');
  if (!tab && !el.hidden) { el.hidden = true; return; }
  const s = app.state;
  tab = tab || (s && s.exp && Object.keys(G.EXP_DA).find(k => s.exp[k])) || 'base';
  app.ui.rulesTab = tab;
  $('rulesTabs').innerHTML = Object.keys(RULES).map(k => `<button class="${k === tab ? 'on' : ''}" data-cmd="rulesTab" data-arg="${k}">${RULES[k].name}${s && s.exp && s.exp[k] ? ' ✓' : ''}</button>`).join('');
  $('rulesPage').innerHTML = RULES[tab].html;
  $('rulesPage').scrollTop = 0;
  el.hidden = false;
}
