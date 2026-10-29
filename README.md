# TEORA — Atelier de profit

Aplicație web responsive, în română, pentru costurile și profitul huselor de brichetă și planificarea producției. Fără cont, server de aplicație sau pachete externe pentru calcule. Parametrii se salvează local în browser.

Interfața TEORA are o temă dark goth, navigare adaptată telefonului și animații care respectă preferința de reducere a mișcării. „O luăm pe rând” explică fiecare ciclu în patru pași, cu redare, cursor și butoane înainte/înapoi. Un cursor separat împarte vizual câștigul între producție și bani pentru tine.

## Folosire

- **Costuri & câștig:** preț pachet și număr huse, brichetă, preț vânzare, spray cromat și lac cu preț/recipient și randament. Ambalaj, transport (aprovizionare și livrare) și comisioane sunt opționale.
- **Creștere:** capital inițial, reinvestire, cicluri, capacitate, cerere și evoluția cererii. Producție după cerere sau pentru stoc, grafice, tabel și detalii pe ciclu.
- **Descarcă:** JSON cu setări și rezultate, CSV cu rezultate per ciclu. Import JSON prin meniul cu trei puncte; rezultatele sunt recalculate. Același meniu oferă tipărire/PDF și resetare.

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

1. Toate stocurile pornesc de la zero. Capitalul inițial este numerar, nu include materiale preexistente.
2. Husele se cumpără în pachete întregi; spray-ul și lacul în recipiente întregi. Resturile se transferă și se consumă înaintea altor achiziții. Brichetele se cumpără exact pentru producția ciclului.
3. Într-un ciclu: achiziții → producție → vânzări → retrageri. Nu se folosesc încasări viitoare pentru a finanța achizițiile curente. O căutare binară găsește cantitatea maximă accesibilă în numerar, ținând cont de salturile de preț la pachete/recipiente.
4. Strategia după cerere produce diferența dintre cerere și stocul finit, în limita capacității. Strategia după capacitate poate acumula produse finite.
5. Implicit estimarea vânzărilor rămâne constantă (evoluție 0%). Cererea se rotunjește în jos și evoluează procentual. Este plafonată la 100.000 produse/ciclu. Un ciclu nu presupune automat o lună sau altă durată.
6. Costul materialelor consumate este cost de producție. Produsele nevândute sunt inventar la cost; costul lor se recunoaște la vânzare, FIFO. Transportul de aprovizionare este cheltuială integrală în ciclul achiziției, nu se capitalizează în stoc.
7. Ambalajul, livrarea client și comisioanele se plătesc doar pentru produsele vândute. Dacă aceste cheltuieli depășesc încasarea, vânzările sunt limitate suplimentar de numerarul rămas.
8. Retragerea cumulată țintită este `max(0, profit cumulat) × (1 − reinvestire/100)`. Se retrage doar diferența pozitivă față de retragerile deja efectuate și doar în limita numerarului. Pierderile trebuie recuperate înaintea unor noi retrageri; nu se anulează retragerile deja plătite. Capitalul recuperat din vânzări rămâne disponibil, independent de procentul de reinvestire.
9. Necesarul viitor este achiziția integrală pentru ținta următoare, după folosirea stocurilor. Finanțarea lipsă este `max(0, necesar − numerar)`.
10. Invarianta fiecărui ciclu: `numerar + stoc la cost + retras cumulat = capital inițial + profit cumulat`.

Calculele păstrează precizia internă; interfața rotunjește la doi zecimali, CSV-ul la șase. Nu sunt incluse taxe, TVA, muncă, rebuturi, retururi, depreciere, inflație sau decalaje de plată. Nu există credite implicite sau lichidarea automată a stocului.

## Date și confidențialitate

Setările sunt stocate în `localStorage` sub cheia `teora-profit:scenario:v1`. Nu există analiză de trafic sau transmitere a scenariilor către un server. Fonturile Google sunt opționale; dacă nu sunt accesibile, aplicația folosește fonturile sistemului. Exporturile apar doar la cererea utilizatorului. Importul validează tipurile, limitele și strategia; cheile necunoscute sunt ignorate.

## Publicare pe GitHub Pages

Publică acest director la rădăcina unui repository nou. În **Settings → Pages → Build and deployment**, selectează **Deploy from a branch**, ramura **main**, directorul **/(root)** și **Save**. Fișierul `.nojekyll` permite servirea directă. Nu există proces de build sau chei secrete. Referințele relative funcționează și sub calea repository-ului.

Documentație oficială: [Configurarea sursei GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## Fișiere

- `index.html`, `style.css`, `favicon.svg`: interfață responsive și stiluri de tipar.
- `app.js`: interacțiuni, salvare locală, import/export și grafice SVG accesibile.
- `model.js`: calcule independente de browser.
- `tests/model.test.mjs`: 20 teste, inclusiv verificarea a 500 scenarii deterministe × 12 cicluri.
- `server.mjs`: server local pentru previzualizare.
