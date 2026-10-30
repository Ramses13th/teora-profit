# TEORA — unelte pentru ideile tale

Hub responsive de unelte, în română. Prima unealtă calculează costurile și profitul huselor de brichetă și planifică producția. Fără cont, server de aplicație sau pachete externe pentru calcule. Parametrii se salvează local în browser.

Interfața dark goth arată un singur pas de formular odată. Pe telefon vezi rezultatul compact deasupra câmpurilor; pe desktop rămâne lângă ele. Cifrele sunt reprezentate printr-un inel cost/câștig, bare de producție, grafice și traseul banilor în patru pași. Fundalurile, personajele și accentele au animații în buclă. Butonul Animații le oprește, iar preferința dispozitivului pentru mișcare redusă este respectată.

## Folosire

- **Unelte:** pagina de pornire și alegerea unei unelte. Husele sunt prima unealtă funcțională; spațiul este pregătit pentru altele.
- **Huse:** trei pași — Prețuri, Finisaje, Lotul tău. Prețuri rapide de vânzare 30, 45, 50 și 60 lei, fiecare cu câștigul estimat. Restul valorilor se poate edita direct.
- **Spray/lac:** alege „Îl cumpăr acum” sau „Îl am deja”. Pentru ce ai deja, introdu câte huse mai poți acoperi. La epuizare se cumpără automat doar recipientele necesare.
- **Plan:** patru răspunsuri, apoi „Arată-mi planul”. Setările dispar din fața rezultatului; „Schimbă planul” le aduce înapoi. Graficele și tabelul detaliat se deschid separat.
- **Distribuie:** generează un link care include toate valorile și opțiunile, inclusiv stocul deja avut. Linkul este o fotografie a calculului la acel moment; modificările ulterioare cer un link nou. Pe telefon poate deschide distribuirea nativă. Oricine are linkul poate vedea parametrii.
- **Meniul cu trei puncte:** export și import JSON, tipărire/PDF, explicații și resetare. CSV-ul se descarcă din detaliile planului.

## Linkuri cu calcule

Parametrii sunt codificați în fragmentul URL (`#calculator?calc=…` sau `#scalare?calc=…`). Deschiderea linkului validează toate datele și recalculează rezultatele. Linkul are prioritate față de setările locale. Un link invalid nu înlocuiește datele. După editarea unui calcul primit, fragmentul vechi se elimină pentru ca reîncărcarea să nu anuleze modificările.

`share.js` emite formatul v2 cu toate cele 30 de valori, într-o ordine stabilă, și acceptă vechile linkuri v1. Preferința pentru animații nu este transmisă. Linkurile nu sunt criptate și nu necesită un server de stocare.

Valorile spray/lac/ambalaj/comisioane sunt exemple editabile, nu cotații comerciale. Toate valorile sunt în RON. Costul unei huse fără opționale: `70 / 9 + 6,50 = 14,277777…`. La prețul de 45 RON, profitul unitar este `30,722222…` și marja este `68,271604…%`. Pentru 9 produse, achiziția este 128,50 RON, venitul 405 RON și profitul 276,50 RON.

## Rulare locală

Necesită Node.js 20 sau mai nou. Nu trebuie instalate dependențe.

```sh
npm start
```

Deschide adresa afișată: `http://127.0.0.1:4173`. Fișierele folosesc module JavaScript, deci deschide aplicația prin server HTTP, nu prin dublu clic pe HTML. Pentru alt port, setează variabila `PORT`.

```sh
npm test
```

## Convenții de calcul

1. Husele brute și produsele finite pornesc de la zero. Spray-ul și lacul pot porni din stocul existent introdus de utilizator. Capitalul inițial este numerar; valoarea acestor materiale se adaugă separat ca aport inițial în natură.
2. Materialele deja avute intră în costul produselor când sunt consumate, la prețul/randamentul introdus, dar nu se plătesc din nou. Husele se cumpără în pachete întregi; spray-ul și lacul în recipiente întregi. Resturile se transferă și se consumă înaintea altor achiziții. Brichetele se cumpără exact pentru producția ciclului.
3. Într-un ciclu: achiziții → producție → vânzări → retrageri. Nu se folosesc încasări viitoare pentru a finanța achizițiile curente. O căutare binară găsește cantitatea maximă accesibilă în numerar, ținând cont de salturile de preț la pachete/recipiente.
4. Strategia după cerere produce diferența dintre cerere și stocul finit, în limita capacității. Strategia după capacitate poate acumula produse finite.
5. Implicit estimarea vânzărilor rămâne constantă (evoluție 0%). Cererea se rotunjește în jos și evoluează procentual. Este plafonată la 100.000 produse/ciclu. Un ciclu nu presupune automat o lună sau altă durată.
6. Costul materialelor consumate este cost de producție. Produsele nevândute sunt inventar la cost; costul lor se recunoaște la vânzare, FIFO. Transportul de aprovizionare este cheltuială integrală în ciclul achiziției, nu se capitalizează în stoc.
7. Ambalajul, livrarea client și comisioanele se plătesc doar pentru produsele vândute. Dacă aceste cheltuieli depășesc încasarea, vânzările sunt limitate suplimentar de numerarul rămas.
8. Retragerea cumulată țintită este `max(0, profit cumulat) × (1 − reinvestire/100)`. Se retrage doar diferența pozitivă față de retragerile deja efectuate și doar în limita numerarului. Pierderile trebuie recuperate înaintea unor noi retrageri; nu se anulează retragerile deja plătite. Capitalul recuperat din vânzări rămâne disponibil, independent de procentul de reinvestire.
9. Necesarul viitor este achiziția integrală pentru ținta următoare, după folosirea stocurilor. Finanțarea lipsă este `max(0, necesar − numerar)`.
10. Invarianta fiecărui ciclu: `numerar + stoc la cost + retras cumulat = capital inițial în numerar + valoare materiale avute deja + profit cumulat`.

Calculele păstrează precizia internă; interfața rotunjește la doi zecimali, CSV-ul la șase. Nu sunt incluse taxe, TVA, muncă, rebuturi, retururi, depreciere, inflație sau decalaje de plată. Nu există credite implicite sau lichidarea automată a stocului.

## Date și confidențialitate

Setările sunt stocate în `localStorage` sub cheia `teora-profit:scenario:v1`. Nu există analiză de trafic sau stocare a scenariilor pe un server. Un link trimis cuiva conține parametrii aleși de utilizator. Fonturile Google sunt opționale; dacă nu sunt accesibile, aplicația folosește fonturile sistemului. Exporturile apar doar la cererea utilizatorului. Importul validează tipurile, limitele și strategia; cheile necunoscute sunt ignorate.

## Publicare pe GitHub Pages

Publică acest director la rădăcina unui repository nou. În **Settings → Pages → Build and deployment**, selectează **Deploy from a branch**, ramura **main**, directorul **/(root)** și **Save**. Fișierul `.nojekyll` permite servirea directă. Nu există proces de build sau chei secrete. Referințele relative funcționează și sub calea repository-ului.

Documentație oficială: [Configurarea sursei GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Fișiere

- `index.html`, `style.css`, `focus.css`, `sprites.css`, `favicon.svg`: interfață responsive și stiluri de tipar.
- `app.js`: interacțiuni, salvare locală, import/export și grafice SVG accesibile.
- `model.js`: calcule independente de browser.
- `tests/model.test.mjs`, `tests/share.test.mjs`: 50 teste financiare și de distribuire, inclusiv 500 scenarii deterministe × 12 cicluri.
- `share.js`: distribuirea prin URL, fără backend.
- `assets/kitty/`: opt ilustrații transparente și manifestul cu descrieri.
- `assets/sprites/`: cinci atlase transparente 4×4. Fiecare rând are patru cadre: 20 de micro-animații, 80 de cadre în total. Personaje goth, stele, iconițe, lumânare, brichetă, monedă cu aripi, portal, corb, clepsidră, fantomă și cufăr. CSS animează cadrele cu `steps(4)`; nu se modifică valorile financiare.
- `server.mjs`: server local pentru previzualizare.
