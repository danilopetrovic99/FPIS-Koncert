# FRONTEND — Kompletno objašnjenje za odbranu

## Tehnološki stack

| Tehnologija | Uloga |
|---|---|
| React 19 | UI biblioteka — komponente, state, lifecycle |
| TypeScript | JavaScript sa tipovima — hvata greške pre pokretanja |
| Vite | Build tool — dev server + produkcijski build |
| React Router v7 | Rutiranje — navigacija između stranica bez reload-a |
| Axios | HTTP klijent — pozivanje backend API-ja |
| CSS (vanilla) | Stilovi — bez framework-a, custom CSS variables |

## Arhitektura projekta

```
src/
├── api/         ← sve što se tiče komunikacije sa backendom
│   ├── types.ts     TypeScript interfejsi (DTO-ovi)
│   ├── client.ts    Axios konfiguracija + error handling
│   └── endpoints.ts Funkcije za svaki API poziv
│
├── lib/         ← pomoćne funkcije bez UI-a
│   ├── format.ts    Formatiranje (RSD, datum)
│   └── pricing.ts   Izračun cene (ista logika kao backend)
│
├── components/  ← reusable UI gradivni blokovi
│   ├── Alert.tsx       Boks za poruke (error/success/info/warning)
│   ├── TicketCounter.tsx Broj karata (− / broj / +)
│   ├── ZoneCard.tsx    Kartica za zonu
│   ├── Header.tsx      Navigacioni header
│   └── Footer.tsx      Footer
│
├── pages/       ← cele stranice (routovane)
│   ├── Home.tsx           Početna — info o koncertu + zone
│   ├── Book.tsx           Forma za rezervaciju
│   ├── Confirmation.tsx   Potvrda rezervacije
│   └── MyReservation.tsx  Pregled/izmena/otkazivanje
│
├── main.tsx     ← ulazna tačka React aplikacije
├── App.tsx      ← router + layout shell
├── index.css    ← globalni CSS (boje, tipografija, reset)
└── App.css      ← stilovi za sve komponente i stranice
```

## Tok korisničke sesije

```
/ (Home)
  → vidi info o koncertu i zone
  → klikne "Izaberi zonu" ili "Rezerviši kartu"
  ↓
/book (Book)
  → popunjava formu (zona, karte, podaci)
  → vidi live preview cene u sidebar-u
  → klikne "Potvrdi rezervaciju"
  ↓
/confirmation (Confirmation)
  → vidi token i promo kod (može da kopira)
  → može otići na "Moja rezervacija"
  ↓
/my (MyReservation)
  → unosi email + token
  → vidi detalje, može promeniti broj karata ili otkazati
```

---

## Redosled fajlova

1. [package.json](#1-packagejson)
2. [vite.config.ts](#2-viteconfigts)
3. [tsconfig.json + tsconfig.app.json](#3-tsconfigjson--tsconfigappjson)
4. [eslint.config.js](#4-eslintconfigjs)
5. [index.html](#5-indexhtml)
6. [src/index.css](#6-srcindexcss)
7. [src/App.css](#7-srcappcss)
8. [src/main.tsx](#8-srcmaintsx)
9. [src/App.tsx](#9-srcapptsx)
10. [src/api/types.ts](#10-srcapitypests)
11. [src/api/client.ts](#11-srcapiclientts)
12. [src/api/endpoints.ts](#12-srcapiendpointsts)
13. [src/lib/format.ts](#13-srclibformatts)
14. [src/lib/pricing.ts](#14-srclibpricingts)
15. [src/components/Alert.tsx](#15-srccomponentsalerttsx)
16. [Napomena: Field.tsx je uklonjen](#16-napomena-fieldtsx-je-uklonjen)
17. [src/components/TicketCounter.tsx](#17-srccomponentsticketcountertsx)
18. [src/components/ZoneCard.tsx](#18-srccomponentszonecardtsx)
19. [src/components/Header.tsx](#19-srccomponentsheadertsx)
20. [src/components/Footer.tsx](#20-srccomponentsfootertsx)
21. [src/pages/Home.tsx](#21-srcpageshometsx)
22. [src/pages/Book.tsx](#22-srcpagesbooktsx)
23. [src/pages/Confirmation.tsx](#23-srcpagesconfirmationtsx)
24. [src/pages/MyReservation.tsx](#24-srcpagesmyreservationtsx)

---

## 1. `package.json`

**Šta je:** Konfiguracioni fajl Node.js projekta — definiše ime, verziju, skripte i zavisnosti. Ekvivalent `.csproj` iz .NET sveta.

**Zašto postoji:** npm (Node Package Manager) čita ovaj fajl da zna koje pakete da instalira i koje komande da pokrene.

```json
{
  "name": "koncert-app",
  "private": true,
  // private=true: ne može se slučajno objaviti na npm registry

  "version": "0.0.0",
  "type": "module",
  // type=module: svi .js fajlovi koriste ES module sintaksu (import/export)
  // ne CommonJS (require/module.exports)

  "scripts": {
    "dev": "vite",
    // npm run dev → startuje Vite dev server na http://localhost:5173
    // hot module replacement (HMR) — promene se vide odmah bez reload-a

    "build": "tsc -b && vite build",
    // npm run build → prvo TypeScript provjera tipova (tsc -b)
    // zatim Vite pakuje sve u optimizovane fajlove u /dist folder

    "lint": "eslint .",
    // npm run lint → ESLint proverava sve .ts/.tsx fajlove

    "preview": "vite preview"
    // npm run preview → servira /dist folder lokalno
    // testira produkcijski build pre deploy-a
  },

  "dependencies": {
    // paketi koji idu u produkcijski build (bundluju se sa aplikacijom)

    "axios": "^1.14.0",
    // HTTP klijent — šalje zahteve ka backend API-ju
    // bolji od fetch: automatski JSON parsiranje, interceptori, error handling

    "react": "^19.2.4",
    // React biblioteka — virtualni DOM, komponente, hooks

    "react-dom": "^19.2.4",
    // renderuje React komponente u browser DOM
    // odvojen od react paketa jer React može da se koristi i bez browser-a (React Native)

    "react-router-dom": "^7.13.2"
    // rutiranje unutar browser-a
    // menja URL bez server zahteva (SPA navigation)
  },

  "devDependencies": {
    // paketi samo za razvoj — ne idu u produkciju

    "typescript": "~5.9.3",
    // TypeScript kompajler — prevodi TS u JS

    "vite": "^8.0.1",
    // build tool — dev server, bundler, optimizer

    "@vitejs/plugin-react": "^6.0.1",
    // Vite plugin koji dodaje React podršku (JSX transformacija, Fast Refresh)

    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    // TypeScript definicije za React — daju tipove za React API-je

    "eslint": "^9.39.4",
    "eslint-plugin-react-hooks": "^7.0.1",
    "eslint-plugin-react-refresh": "^0.5.2",
    "typescript-eslint": "^8.57.0"
    // linting alati — proveravaju ispravnu upotrebu React hook-ova,
    // TypeScript pravila, i pravila za Vite HMR kompatibilnost
  }
}
```

**Verzije:**
- `^1.14.0` — prihvata patch i minor update (1.14.x, 1.15.x, ali ne 2.x.x)
- `~5.9.3` — prihvata samo patch update (5.9.x, ali ne 5.10.x)

---

## 2. `vite.config.ts`

**Šta je:** Konfiguracioni fajl za Vite build tool.

**Šta je Vite:** Moderni build tool koji zamenjuje webpack. U development modu ne bundluje fajlove — servira ih direktno kao ES module. Zato je pokretanje i HMR ekstremno brz.

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // jedini plugin — dodaje:
  // 1. JSX transformaciju (prevodi JSX u JavaScript pozive)
  // 2. React Fast Refresh (HMR koji čuva state pri izmeni koda)
})

// Vite automatski:
// - čita index.html kao entry point
// - servira /public folder statički
// - radi na http://localhost:5173 (dev)
// - build output ide u /dist
```

---

## 3. `tsconfig.json` + `tsconfig.app.json`

**Šta je:** Konfiguracija TypeScript kompajlera — govori mu kako da proverava tipove i koji JavaScript da generiše.

**`tsconfig.json`** — root fajl, samo delegira:
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },   // za src/ kod (komponente, stranice)
    { "path": "./tsconfig.node.json" }   // za vite.config.ts (Node.js okruženje)
  ]
}
// Project References: TypeScript kompajlira svaki sub-projekat nezavisno — brže
```

**`tsconfig.app.json`** — opcije za aplikacijski kod:
```json
{
  "compilerOptions": {
    "target": "ES2023",
    // generiši kod koji koristi moderne JS feature (async/await nativno, ne polyfill)

    "lib": ["ES2023", "DOM", "DOM.Iterable"],
    // TypeScript zna za:
    // ES2023 — Promise, Map, Set, Array.at()...
    // DOM — window, document, Element, HTMLInputElement...
    // DOM.Iterable — NodeList.forEach(), HTMLCollection iteracija...

    "module": "ESNext",
    // koristi najnoviji ES module format (import/export)

    "jsx": "react-jsx",
    // <div> → React.createElement() transformacija
    // react-jsx = novi transform (ne treba import React na vrhu svakog fajla)

    "strict": true,
    // uključuje sve stroge provjere:
    // strictNullChecks: null i undefined nisu automatski kompatibilni sa string/number
    // noImplicitAny: svaki parametar mora imati tip
    // strictFunctionTypes: stroga provjera tipova funkcija

    "noUnusedLocals": true,
    // greška ako deklarišeš varijablu a ne koristiš je
    // sprečava nakupljanje mrtavog koda

    "noUnusedParameters": true,
    // greška ako parametar funkcije nije korišćen

    "noEmit": true,
    // TypeScript SAMO proverava tipove, ne generiše .js fajlove
    // Vite je zadužen za kompajliranje — brže jer rade paralelno

    "moduleResolution": "bundler",
    // Vite-ov mod za rezoluciju modula — dozvoljava import bez ekstenzije
    // import { getConcert } from './api/endpoints' (bez .ts)

    "skipLibCheck": true
    // ne proverava tipove unutar node_modules — brže kompajliranje
  },
  "include": ["src"]
  // proverava samo fajlove unutar src/ foldera
}
```

---

## 4. `eslint.config.js`

**Šta je:** Konfiguracija ESLint linter-a — alata koji automatski pronalazi probleme u kodu bez pokretanja.

**Zašto postoji:** Hvata greške kao što su pogrešna upotreba hook-ova, unused varijable, potencijalni bugovi — pre nego što ih vidiš u browser-u.

```js
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  // ignoriši /dist folder — to je build output, ne naš kod

  {
    files: ['**/*.{ts,tsx}'],
    // proverava samo TypeScript fajlove (ne JSON, ne CSS)

    extends: [
      js.configs.recommended,
      // standardna JavaScript pravila: no-unused-vars, no-console, no-debugger...

      tseslint.configs.recommended,
      // TypeScript specifična pravila:
      // no-explicit-any, prefer-const, no-non-null-assertion...

      reactHooks.configs.flat.recommended,
      // React Hooks pravila — najvažnija:
      // rules-of-hooks: hook-ovi mogu biti samo na top nivou komponente
      // exhaustive-deps: useEffect mora navesti sve zavisnosti u [] arrayu

      reactRefresh.configs.vite,
      // upozorava ako komponenta nije eksportovana na način kompatibilan sa HMR
    ],

    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      // TypeScript zna za browser globale: window, document, navigator, setTimeout...
    },
  },
])
```

**Primer greške koju hvata:**
```tsx
useEffect(() => {
  fetchData(userId);  // koristi userId ali nije u dependency arrayu
}, []);              // ESLint: exhaustive-deps warning!
```

---

## 5. `index.html`

**Šta je:** Jedini HTML fajl u aplikaciji. React SPA se sve renderuje unutar njega — server nikad ne šalje drugi HTML.

**Zašto samo jedan fajl:** SPA (Single Page Application) princip — browser učita ovaj HTML jednom, a React dinamički menja sadržaj pri navigaciji bez server zahteva.

```html
<!doctype html>
<html lang="sr">
<!-- lang="sr" → čitači ekrana znaju da je srpski jezik -->

<head>
  <meta charset="UTF-8" />
  <!-- UTF-8: podržava srpska slova (č, ć, š, ž, đ) i sve Unicode karaktere -->

  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <!-- viewport meta: bez ovoga mobilni browser-i zoomuju stranicu
       width=device-width: širina viewport-a = širina ekrana
       initial-scale=1.0: ne zoomuje pri učitavanju -->

  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <!-- preconnect: browser uspostavlja TCP konekciju sa Google Fonts serverom
       unapred (pre nego što parsira link tag) → brže učitavanje fontova -->

  <link href="https://fonts.googleapis.com/css2?
    family=Barlow+Condensed:wght@600;700
    &family=DM+Sans:wght@400;500;600;700
    &display=swap" rel="stylesheet" />
  <!-- učitava dva Google fonta:
       Barlow Condensed: kompresovan display font za naslove (h1, h2, h3)
       DM Sans: čist body font za tekst
       display=swap: prikazuje system font dok se Google font ne učita (ne blank) -->

  <title>KoncertApp · Eros Ramazzotti – Battito Infinito World Tour</title>
</head>

<body>
  <div id="root"></div>
  <!-- prazan div — React ubacuje ceo UI ovde
       main.tsx: createRoot(document.getElementById('root')!).render(<App />) -->

  <script type="module" src="/src/main.tsx"></script>
  <!-- type="module": učitava kao ES module (omogućava import/export)
       Vite interceptuje ovaj request i servira transpajliran TypeScript
       u produkciji: Vite zamenjuje ovo sa bundle-ovanim JS fajlom -->
</body>
</html>
```

---

## 6. `src/index.css`

**Šta je:** Globalni CSS fajl koji se učitava jednom i važi za celu aplikaciju. Definiše design sistem kroz CSS Custom Properties (varijable).

**Zašto postoji:** Centralizovana definicija boja, fontova i globalnih stilova — promeni jednu varijablu i cela aplikacija se ažurira.

```css
:root {
  /* ===== PALETA BOJA — dark theme ===== */

  /* Pozadine — od najtamnije ka svetlijoj */
  --bg-0: #0c0c0c;  /* pozadina cele stranice — gotovo crna */
  --bg-1: #141414;  /* kartice, paneli */
  --bg-2: #1c1c1c;  /* input polja, sekundarni površi */
  --bg-3: #242424;  /* hover stanja, tercijarne površi */

  /* Površi sa providnošću */
  --surface: rgba(255, 255, 255, 0.03);   /* lagani overlay */
  --surface-2: rgba(255, 255, 255, 0.05); /* nešto vidljiviji overlay */

  /* Ivice */
  --border: #2e2e2e;        /* standardna ivica između elemenata */
  --border-strong: #404040; /* naglašena ivica za focus stanja */

  /* Tekst */
  --text: #cecece;        /* glavni tekst — svetlo siva (ne bijela da ne umara oči) */
  --text-muted: #7a7a7a;  /* sekundarni tekst (labele, opisi) */
  --text-dim: #4a4a4a;    /* jedva vidljiv tekst (hint-ovi, dimno) */

  /* Semantičke boje */
  --primary: #d42020;   /* crvena — brend boja, dugmad, naglasci */
  --accent: #16a07a;    /* teal zelena — promo, info, success akcenti */
  --warning: #b87a28;   /* narandžasta — upozorenja, "malo mesta" */
  --danger: #d42020;    /* crvena — greške (ista kao primary) */
  --success: #2e9850;   /* zelena — uspešne operacije */

  /* Fontovi */
  --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
  /* DM Sans za čitljiv tekst, system-ui kao fallback */
  --font-display: 'Barlow Condensed', 'DM Sans', system-ui, sans-serif;
  /* Barlow Condensed za naslove — kompresovan, jak vizuelni impact */

  /* Globalni stilovi */
  color-scheme: dark;       /* hint browser-u za dark mode (scrollbar, form elementi) */
  color: var(--text);       /* default boja teksta za celu stranicu */
  background: var(--bg-0);  /* pozadina cele stranice */
  font-family: var(--font-body);
  font-size: 16px;          /* base size — rem se računa od ovoga */
  line-height: 1.55;        /* 55% veće od font-size — dobra čitljivost */
  -webkit-font-smoothing: antialiased; /* glatki fontovi na macOS/iOS */
}

* {
  box-sizing: border-box;
  /* svaki element računa padding i border u ukupnu širinu
     bez ovoga: element 200px + padding 20px = 220px ukupno (iznenađenje!)
     sa ovime: element 200px uključuje padding — predvidivo */
}

html, body, #root {
  margin: 0;
  padding: 0;
  min-height: 100vh;  /* cela visina viewport-a */
}

#root {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* flex kolona: Header + Main (flex:1) + Footer
     Footer uvek na dnu čak i na kratkim stranicama */
}

/* Tipografija */
h1 { font-size: clamp(2.4rem, 6vw, 4rem); ... }
/* clamp(minimum, preferred, maximum):
   minimum = 2.4rem (na malim ekranima)
   preferred = 6vw (6% širine viewport-a — responsivno)
   maximum = 4rem (ne raste iznad ovoga na velikim ekranima) */

h1, h2, h3, h4 {
  font-family: var(--font-display);  /* Barlow Condensed za naslove */
  text-transform: uppercase;         /* sva slova velika */
  letter-spacing: 0.01em;           /* malo razmaka između slova */
}

::selection {
  background: var(--primary);  /* crvena pozadina pri selekciji teksta */
  color: #fff;
}

/* Custom scrollbar (webkit browser-i) */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-0); }
::-webkit-scrollbar-thumb { background: var(--border-strong); }
```

---

## 7. `src/App.css`

**Šta je:** CSS za sve reusable komponente i layout klase. Organizovan po sekcijama sa komentarima.

### Layout sekcija

```css
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  /* vertikalna kolona: Header, Main (raste), Footer */
}

.container {
  width: 100%;
  max-width: 1180px; /* max širina sadržaja */
  margin: 0 auto;    /* centriranje horizontalno */
  padding: 0 24px;   /* unutrašnji padding sa strana */
}

.main {
  flex: 1 1 auto;
  /* flex-grow: 1 → raste i popunjava prostor između Header-a i Footer-a
     flex-shrink: 1 → može da se smanji
     flex-basis: auto → prirodna veličina */
  padding: 40px 0 80px;
}
```

### Header sekcija

```css
.header {
  position: sticky;   /* ostaje na vrhu pri scroll-u */
  top: 0;
  z-index: 50;        /* iznad ostalog sadržaja */
  background: var(--bg-0);
  border-bottom: 1px solid var(--border);
}

.nav a.active {
  color: #fff;
  border-bottom: 2px solid var(--primary);
  /* NavLink dodaje "active" klasu — crvena linija ispod aktivnog linka */
}
```

### Buttons sekcija

```css
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 11px 24px;
  font-weight: 700;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  border: 2px solid transparent;
  transition: background 0.12s, border-color 0.12s, color 0.12s, opacity 0.12s;
  /* transition: animira promene — hover efekti su glatki */
}

.btn:disabled { opacity: 0.38; cursor: not-allowed; }
/* disabled dugme: zamućeno i ne pokazuje pointer cursor */

.btn--primary { background: var(--primary); color: #fff; }
/* crveno puno dugme */

.btn--ghost { background: transparent; color: var(--text); border-color: var(--border-strong); }
/* providno dugme sa ivicom */

.btn--danger { color: var(--danger); border-color: var(--danger); opacity: 0.65; }
/* crveno providno dugme za destruktivne akcije — smanjen opacity da deluje "opasno" */

.btn--block { width: 100%; }
/* dugme punom širinom roditelja */
```

### Zone Card sekcija

```css
.zone-card {
  background: var(--bg-1);
  border: 1px solid var(--border);
  padding: 20px;
  transition: border-color 0.12s;
}
.zone-card:hover { border-color: var(--border-strong); }
/* hover: naglašena ivica — vizuelni feedback */

.zone-card--soldout { opacity: 0.45; }
/* rasprodato: zamućeno da odvrati pažnju */

.zone-card__bar {
  height: 3px;
  background: var(--bg-3);
}
.zone-card__bar > span {
  display: block;
  height: 100%;
  background: var(--primary);
  transition: width 0.3s;
  /* animirani progress bar popunjenosti zone */
}
```

### Forms sekcija

```css
.form__grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  /* dva polja u redu */
  gap: 16px;
}

.form__field--full { grid-column: 1 / -1; }
/* full polje zauzima oba stupca */

.form__input:focus { border-color: var(--primary); }
/* crvena ivica pri fokusiranju inputa */

.form__select {
  appearance: none;
  /* uklanja browser-ov default stilizaciju select elementa */
  background-image: url("data:image/svg+xml,...");
  /* custom SVG strelica desno — zato što smo uklonili default */
}
```

### Booking Layout sekcija

```css
.booking-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  /* forma: fleksibilna širina (minimalno 0, maksimalno sav slobodan prostor)
     sidebar: fiksno 340px */
  gap: 24px;
  align-items: start; /* sidebar se ne razvlači do dna forme */
}

@media (max-width: 960px) {
  .booking-layout { grid-template-columns: 1fr; }
  /* na mobilnom: ide u jednu kolonu (sidebar ispod forme) */
}

.summary {
  position: sticky;
  top: 80px;
  /* sidebar ostaje vidljiv pri scroll-u (80px = visina header-a) */
}
```

### Utilities sekcija

```css
.stack { display: flex; flex-direction: column; gap: 16px; }
/* vertikalni niz elemenata sa razmakom */

.row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
/* horizontalni niz, prelama se na novi red */

.between { display: flex; justify-content: space-between; }
/* dva elementa — jedan levo, jedan desno */

.muted { color: var(--text-muted); }
.dim   { color: var(--text-dim); }
.mono  { font-family: ui-monospace, Consolas, monospace; }
/* utility klase — primenjuju se direktno u JSX */

.skeleton {
  background: var(--bg-2);
  animation: skeleton-pulse 1.6s ease-in-out infinite;
}
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.4; }
  50%       { opacity: 0.75; }
}
/* pulsira između 40% i 75% opacity — loading placeholder efekat */
```

---

## 8. `src/main.tsx`

**Šta je:** Ulazna tačka React aplikacije — fajl koji se prvi pokreće, montira React u DOM.

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!)
// document.getElementById('root') → pronalazi <div id="root"> iz index.html
// ! (non-null assertion) → "ja garantujem da ovaj element postoji" (kompajler ne prijavljuje null grešku)
// createRoot → kreira React root za Concurrent Mode rendering

.render(
  <StrictMode>
  // StrictMode je razvojni alat — u produkciji nema efekta
  // U development modu:
  // → pokreće svaku komponentu dvaput pri mount-u (otkriva side-effects)
  // → upozorava na deprecated API-je
  // → provjerava unexpected propstrene mutacije

    <BrowserRouter>
    // omogućava rutiranje — prati URL u browser-u i prikazuje odgovarajuću stranicu
    // koristi History API (pushState) — URL se menja bez server zahteva
    // svi link-ovi unutar aplikacije ne reload-uju stranicu

      <App />

    </BrowserRouter>
  </StrictMode>,
);
```

---

## 9. `src/App.tsx`

**Šta je:** Root komponenta koja definiše strukturu stranice i rutiranje. Uvek vidljiv layout (Header, Footer) + dinamičan sadržaj (Routes).

```tsx
import { Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Book from './pages/Book';
import Confirmation from './pages/Confirmation';
import MyReservation from './pages/MyReservation';
import './App.css';

export default function App() {
  return (
    <div className="app-shell">
    {/* flex kolona koja zauzima ceo viewport */}

      <Header />
      {/* uvek vidljiv, sticky pozicija */}

      <main className="main">
        <div className="container">
        {/* kontejner ograničava širinu na 1180px i centrira */}

          <Routes>
          {/* Routes: prikazuje SAMO prvu Route koja odgovara trenutnom URL-u */}

            <Route path="/"             element={<Home />} />
            {/* tačno "/" — početna stranica */}

            <Route path="/book"         element={<Book />} />
            {/* forma za rezervaciju */}

            <Route path="/confirmation" element={<Confirmation />} />
            {/* stranica potvrde — samo posle uspešne rezervacije */}

            <Route path="/my"           element={<MyReservation />} />
            {/* upravljanje rezervacijom */}

            <Route path="*"             element={<Home />} />
            {/* catch-all: svaki nepoznati URL → Home
                npr. /nepostoji → Home (ne 404 stranica) */}
          </Routes>
        </div>
      </main>

      <Footer />
      {/* uvek vidljiv na dnu */}
    </div>
  );
}
```

---

## 10. `src/api/types.ts`

**Šta je:** TypeScript interfejsi koji opisuju strukturu podataka koji se razmenjuju sa backendom. Ekvivalent DTO klasa iz C# backenda.

**Zašto postoji:** Type safety — TypeScript zna tačno koje polje postoji i kog je tipa. Greška pri tipkanju se hvata u editoru, ne u browser-u.

```ts
export interface ZoneInfo {
  id: number;
  name: string;
  capacity: number;
  availableSeats: number;   // computed na backendu: Capacity - zauzeto
  pricePerTicket: number;
}

export interface ConcertInfo {
  id: number;
  name: string;
  city: string;
  location: string;
  concertDates: string;
  additionalInfo: string | null;  // string | null = može biti null (nullable string)
  earlyBirdDeadline: string;      // ISO 8601 string: "2026-05-10T12:00:00Z"
  isEarlyBirdActive: boolean;     // computed na backendu
  zones: ZoneInfo[];              // niz zona
}

export interface CreateReservationRequest {
  zoneId: number;
  ticketCount: number;
  firstName: string;
  lastName: string;
  company?: string | null;   // ? = opcionalan prop (ne mora biti u objektu)
  address1: string;
  address2?: string | null;  // opciono i nullable
  postalCode: string;
  city: string;
  country: string;
  email: string;
  promoCode?: string | null;
}

export interface UpdateReservationRequest {
  token: string;
  email: string;
  ticketCount: number;
}

export interface CancelReservationRequest {
  token: string;
  email: string;
}

export interface ReservationResponse {
  id: number;
  token: string;             // 32-char hex string
  status: string;            // "Active" ili "Cancelled"
  zoneId: number;
  zoneName: string;
  ticketCount: number;
  totalPrice: number;
  isEarlyBird: boolean;
  generatedPromoCode: string; // promo kod koji je dobio za prijatelja
  createdAt: string;          // ISO datum

  // Podaci o kupcu:
  firstName: string;
  lastName: string;
  email: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  postalCode: string;
  city: string;
  country: string;
}
```

**Poređenje sa backendom:**
- `ConcertInfo` ↔ `ConcertInfoDto`
- `CreateReservationRequest` ↔ `CreateReservationDto`
- `ReservationResponse` ↔ `ReservationResponseDto`

---

## 11. `src/api/client.ts`

**Šta je:** Centralna konfiguracija axios HTTP klijenta i helper za error handling.

**Zašto centralizovano:** Sve API funkcije koriste isti `api` objekat — connection string je na jednom mestu, lako se menja.

```ts
import axios, { AxiosError } from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:5225';
// import.meta.env — Vite-ov način čitanja environment varijabli
// VITE_API_URL: može se setovati u .env fajlu (npr. za produkciju: https://api.mojaapp.com)
// ?? 'http://localhost:5225' — nullish coalescing: ako env varijabla nije setovana, koristi default

export const api = axios.create({
  baseURL: `${BASE_URL}/api`,
  // sve rute konfigurišu se relativno: '/concert' → 'http://localhost:5225/api/concert'
  headers: { 'Content-Type': 'application/json' },
  // svaki zahtev automatski šalje ovaj header — backend zna da prima JSON
});

export function extractErrorMessage(err: unknown, fallback = 'Došlo je do greške.'): string {
// err: unknown je TypeScript best practice — ne pretpostavljamo tip greške

  if (axios.isAxiosError(err)) {
  // proverava da li je AxiosError (HTTP greška) a ne obična JS greška

    const e = err as AxiosError<{ message?: string }>;
    // castujemo u typed AxiosError — backend šalje { message: string } u error body-ju

    const apiMsg = e.response?.data?.message;
    // e.response → HTTP response (null ako nema mreže)
    // e.response.data → parsiran JSON body { "message": "Zona nije pronađena." }
    // ?. (optional chaining) — ne pada ako response ili data ne postoji

    if (apiMsg) return apiMsg;
    // prikazujemo backend-ovu poruku (srpski tekst)

    if (e.code === 'ERR_NETWORK')
      return 'Ne mogu da se povežem na server. Proveri da li API radi.';
    // network error: API nije pokrenut, Docker nije pokrenut...

    return e.message ?? fallback;
    // axios-ov generički error message ili fallback
  }

  if (err instanceof Error) return err.message;
  // standardna JS greška (TypeError, RangeError...)

  return fallback;
  // unknown tip greške — generička poruka
}
```

---

## 12. `src/api/endpoints.ts`

**Šta je:** Sve API funkcije — svaka funkcija odgovara jednom backend endpoint-u.

**Zašto odvojeno od client.ts:** Separation of concerns — `client.ts` konfiguriše HTTP klijent, `endpoints.ts` definiše operacije.

```ts
import { api } from './client';
import type { ConcertInfo, CreateReservationRequest, ... } from './types';

export async function getConcert(): Promise<ConcertInfo> {
  const { data } = await api.get<ConcertInfo>('/concert');
  // api.get<ConcertInfo> → TypeScript zna da response.data je ConcertInfo tip
  // destrukturišemo: { data } iz { data, status, headers, ... }
  return data;
  // GET http://localhost:5225/api/concert
}

export async function createReservation(body: CreateReservationRequest): Promise<ReservationResponse> {
  const { data } = await api.post<ReservationResponse>('/reservation', body);
  // body se automatski serijalizuje u JSON (Content-Type: application/json)
  return data;
  // POST http://localhost:5225/api/reservation
  // Request body: { "zoneId": 2, "ticketCount": 3, ... }
}

export async function getReservation(email: string, token: string): Promise<ReservationResponse> {
  const { data } = await api.get<ReservationResponse>('/reservation', {
    params: { email, token },
    // params se dodaju kao query string: /reservation?email=...&token=...
    // axios automatski URL-encoduje specijalne karaktere
  });
  return data;
}

export async function updateReservation(body: UpdateReservationRequest): Promise<ReservationResponse> {
  const { data } = await api.put<ReservationResponse>('/reservation', body);
  return data;
  // PUT http://localhost:5225/api/reservation
}

export async function cancelReservation(body: CancelReservationRequest): Promise<void> {
  await api.delete('/reservation', { data: body });
  // DELETE sa body-jem — axios zahteva { data: body } sintaksu za DELETE
  // nema return vrednosti (void) jer backend vraća 204 No Content
}
```

---

## 13. `src/lib/format.ts`

**Šta je:** Čiste helper funkcije za formatiranje vrednosti za prikazivanje korisniku.

**Zašto u posebnom fajlu:** Reusable bez UI — iste funkcije koriste Book, Confirmation i MyReservation stranice.

```ts
const RSD = new Intl.NumberFormat('sr-RS', {
  style: 'currency',
  currency: 'RSD',
  maximumFractionDigits: 0,
});
// Intl.NumberFormat je web standard API za lokalizovano formatiranje
// 'sr-RS' = srpski, Srbija — koristi tačku za hiljade, zarez za decimale
// style: 'currency' → dodaje valutu
// maximumFractionDigits: 0 → bez decimala (12.000 RSD, ne 12.000,00 RSD)

export const formatRsd = (value: number): string => RSD.format(value);
// formatRsd(7500)   → "7.500 RSD"
// formatRsd(12000)  → "12.000 RSD"
// formatRsd(3900)   → "3.900 RSD"

export const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('sr-RS', {
      day: '2-digit',   // "12" (uvek 2 cifre)
      month: 'long',    // "jul" (pun naziv meseca)
      year: 'numeric',  // "2026"
    });
    // new Date("2026-07-12T00:00:00Z") → "12. jul 2026."
  } catch {
    return iso;
    // ako parsiranje ne uspe (loš format) → vrati originalni string
  }
};
```

---

## 14. `src/lib/pricing.ts`

**Šta je:** Frontend reimplementacija iste logike cena koja postoji na backendu. Koristi se za **live preview** cene dok korisnik menja formu.

**Zašto duplikacija:** UX razlog — prikazujemo cenu odmah pri svakoj promeni (bez čekanja API-ja). Backend ponovo računa pri submitu — frontend preview je samo za prikazivanje.

```ts
const EARLY_BIRD = 0.10;    // 10% early bird popust
const FIFTH_DISCOUNT = 0.50; // 50% svaka 5. karta
const PROMO = 0.05;          // 5% promo kod popust

export interface PricingBreakdown {
  unitPrice: number;           // cena po karti posle early bird
  subtotalBeforePromo: number; // suma svih karata
  earlyBirdSavings: number;    // koliko je uštedio early bird-om
  fifthTicketSavings: number;  // koliko je uštedio svakom 5. kartom
  promoSavings: number;        // koliko je uštedio promo kodom
  total: number;               // konačna cena
}
// PricingBreakdown vraća sve detalje — sidebar pokazuje svaku uštedu posebno

export function calculatePricing(
  basePrice: number,
  ticketCount: number,
  isEarlyBird: boolean,
  hasPromo: boolean,
): PricingBreakdown {

  const unitPrice = isEarlyBird ? basePrice * (1 - EARLY_BIRD) : basePrice;
  // early bird: 10% na svaku kartu

  let subtotal = 0;
  let fifthSavings = 0;

  for (let i = 1; i <= ticketCount; i++) {
    if (i % 5 === 0) {
      // i = 5, 10, 15, 20... → 5. karta dobija 50% popusta
      const discounted = unitPrice * (1 - FIFTH_DISCOUNT);  // 50% cene
      subtotal += discounted;
      fifthSavings += unitPrice - discounted;  // uštedina = razlika
    } else {
      subtotal += unitPrice;
    }
  }

  const earlyBirdSavings = isEarlyBird ? basePrice * EARLY_BIRD * ticketCount : 0;
  // ukupna early bird uštedina: 10% * osnovna_cena * broj_karata

  const promoSavings = hasPromo ? subtotal * PROMO : 0;
  // 5% na ukupan iznos (posle ostalih popusta)

  const total = subtotal - promoSavings;

  return {
    unitPrice: round2(unitPrice),
    subtotalBeforePromo: round2(subtotal),
    earlyBirdSavings: round2(earlyBirdSavings),
    fifthTicketSavings: round2(fifthSavings),
    promoSavings: round2(promoSavings),
    total: round2(total),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;
// zaokružuje na 2 decimale koristeći integer aritmetiku
// Math.round(7500.555 * 100) / 100 = Math.round(750055.5) / 100 = 750056 / 100 = 7500.56
// sprečava floating point greške: 0.1 + 0.2 = 0.30000000000000004 u JavaScript-u
```

---

## 15. `src/components/Alert.tsx`

**Šta je:** Reusable komponenta za prikazivanje poruka korisniku — greška, uspeh, info, upozorenje.

```tsx
import type { ReactNode } from 'react';

type Variant = 'error' | 'success' | 'info' | 'warning';
// union type — Variant može biti samo jedna od ove četiri vrednosti
// TypeScript će javiti grešku za: <Alert variant="nesto_trece" />

interface Props {
  variant: Variant;
  children: ReactNode;
  // ReactNode = bilo šta što React može renderovati: string, JSX, komponente...
}

const ICON: Record<Variant, string> = {
  error: '⚠',
  success: '✓',
  info: 'ℹ',
  warning: '!',
};
// Record<K, V> = TypeScript tip za objekat gde su svi ključevi tipa K a vrednosti V
// garantuje da za svaki Variant postoji ikona (TypeScript bi prijavio grešku ako nedostaje)

export default function Alert({ variant, children }: Props) {
  return (
    <div className={`alert alert--${variant}`} role="alert">
    {/* role="alert" → ARIA atribut za pristupačnost
        čitači ekrana automatski objavljuju sadržaj bez fokusiranja
        korisno za osobe sa oštećenjem vida */}
      <span className="alert__icon">{ICON[variant]}</span>
      <div>{children}</div>
    </div>
  );
}

// Upotreba:
// <Alert variant="error">Zona nije pronađena.</Alert>
// <Alert variant="success">Rezervacija je ažurirana.</Alert>
// <Alert variant="info"><p>Tekst poruke <strong>bold</strong></p></Alert>
```

---

## 16. Napomena: `Field.tsx` je uklonjen

**Šta je bilo:** Ranije je postojala apstraktna `Field` komponenta — input wrapper koji je
preko `InputHTMLAttributes<HTMLInputElement>`, spread operatora (`{...rest}`) i generičkih
props automatski pravio labelu, hint i prikaz greške.

**Zašto je uklonjena:** Ta komponenta je sakrivala šta se zapravo dešava (jedan `<Field />`
se „raspakovao" u label + input + hint kroz spread). Da bi kod bio jasniji i čitljiviji,
zamenjena je **direktnim `<label>` + `<input>`** u svakoj formi.

Umesto:
```tsx
<Field label="Email" required type="email" value={form.email}
       onChange={(e) => update('email', e.target.value)} maxLength={200} />
```

sada se u stranicama piše eksplicitno (vidi `Book.tsx` i `MyReservation.tsx`):
```tsx
<div className="form__field form__field--full">
  <label className="form__label">Email <span>*</span></label>
  <input
    className="form__input"
    type="email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    maxLength={200}
  />
</div>
```

CSS klase (`form__field`, `form__label`, `form__input`) su ostale iste — promenjeno je samo
to što se sada vidi ceo input na licu mesta, bez apstrakcije.

---

## 17. `src/components/TicketCounter.tsx`

**Šta je:** Kontrola za biranje broja karata — minus dugme, input broj, plus dugme. Sprečava izlazak van dozvoljenog opsega.

```tsx
interface Props {
  value: number;
  onChange: (v: number) => void;  // callback — roditeljska komponenta ažurira state
  min?: number;    // minimum (default 1)
  max: number;     // maximum (slobodna mesta u zoni)
}

export default function TicketCounter({ value, onChange, min = 1, max }: Props) {
  // min = 1: default vrednost ako prop nije prosleđen

  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  // clamp: sprečava vrednosti van opsega
  // Math.max(min, n) → ne ispod minimuma
  // Math.min(max, ...) → ne iznad maximuma
  // clamp(0) → 1 (min=1)
  // clamp(100) → max

  return (
    <div className="form__counter" role="group" aria-label="Broj karata">
    {/* role="group" + aria-label: grupiše kontrole za čitače ekrana */}

      <button
        type="button"
        // type="button" → sprečava submit forme pri kliku!
        // bez ovoga: dugme unutar <form> submituje formu

        aria-label="Smanji"   // za čitače ekrana
        onClick={() => onChange(clamp(value - 1))}
        // smanjuje za 1, ali ne ispod min
        disabled={value <= min}
        // disabled kad je na minimumu — ne može dalje da se smanjuje
      >
        −
      </button>

      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10);
          // parseInt: pretvara string u integer (10 = decimal base)
          onChange(Number.isFinite(n) ? clamp(n) : min);
          // Number.isFinite: proverava da nije NaN ili Infinity
          // ako korisnik obriše sadržaj (NaN) → vraća se na min
        }}
      />

      <button
        type="button"
        aria-label="Povećaj"
        onClick={() => onChange(clamp(value + 1))}
        disabled={value >= max}
      >
        +
      </button>
    </div>
  );
}
```

---

## 18. `src/components/ZoneCard.tsx`

**Šta je:** Kartica za prikazivanje jedne zone sa svim relevantnim informacijama i dugmetom za odabir.

```tsx
import type { ZoneInfo } from '../api/types';
import { formatRsd } from '../lib/format';

interface Props {
  zone: ZoneInfo;
  onSelect?: (zone: ZoneInfo) => void;  // ? = opcionalan — na Book stranici nema dugmeta
  compact?: boolean;  // compact=true → bez dugmeta (Book forma ima samo dropdown)
}

export default function ZoneCard({ zone, onSelect, compact }: Props) {

  const soldOut = zone.availableSeats <= 0;
  // rasprodato: nema slobodnih mesta

  const low = !soldOut && zone.availableSeats / zone.capacity < 0.15;
  // "malo mesta": ostalo manje od 15% kapaciteta (i nije rasprodato)
  // npr. zona od 800: 800 * 0.15 = 120 → ispod 120 slobodnih = "Poslednja mesta"

  const popunjenost = ((zone.capacity - zone.availableSeats) / zone.capacity) * 100;
  // procenat popunjenosti: (zauzeto / ukupno) * 100
  // koristi se za širinu progress bara (jasno ime umesto ranijeg "filled")

  return (
    <div className={`zone-card ${soldOut ? 'zone-card--soldout' : ''}`}>
    {/* zone-card--soldout: opacity 0.45 — vizuelno odvraća pažnju od rasprodatih zona */}

      <div className="zone-card__head">
        <div className="zone-card__name">{zone.name}</div>
        {soldOut ? (
          <span className="zone-card__tag zone-card__tag--soldout">Rasprodato</span>
        ) : low ? (
          <span className="zone-card__tag zone-card__tag--low">Poslednja mesta</span>
        ) : (
          <span className="zone-card__tag">Dostupno</span>
        )}
        {/* terni/terni operator (ternary): uslov ? vrednostAko : vrednostInak */}
      </div>

      <div className="zone-card__price">
        <strong>{formatRsd(zone.pricePerTicket)}</strong>
        <small>/ karta</small>
      </div>

      <div>
        <div className="zone-card__bar" aria-hidden>
        {/* aria-hidden: čitači ekrana preskaču ovaj vizuelni element */}
          <span style={{ width: `${Math.min(100, Math.max(3, popunjenost))}%` }} />
          {/* min 3%: progress bar je uvek makar malo vidljiv
              max 100%: ne prelazi okvir */}
        </div>
        <div className="zone-card__avail">
          <span>{zone.availableSeats} slobodnih mesta</span>
          <span className="dim">/ {zone.capacity}</span>
        </div>
      </div>

      {!compact && onSelect && (
      // dugme se prikazuje samo kad: compact=false I onSelect je prosleđen
      // Home stranica: compact=false, onSelect=goBook → dugme vidljivo
      // Book stranica: compact=true → dugme sakriveno
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={soldOut}
          onClick={() => onSelect(zone)}
          // prosleđuje ceo zone objekat roditelju (Home stranici)
        >
          {soldOut ? 'Nema više karata' : 'Izaberi zonu'}
        </button>
      )}
    </div>
  );
}
```

---

## 19. `src/components/Header.tsx`

**Šta je:** Navigacioni header koji se prikazuje na svim stranicama. Sticky — ostaje na vrhu pri scroll-u.

```tsx
import { NavLink, Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="header">
      <div className="container header__inner">

        <Link to="/" className="brand">
        {/* Link = React Router link koji ne reload-uje stranicu
            href="/": browser reload → Link to="/": React Router navigacija */}
          <span className="brand__dot">K</span>
          {/* crveni kvadrat sa "K" slom */}
          <span className="brand__name">
            KoncertApp <small>· Eros Ramazzotti</small>
          </span>
        </Link>

        <nav className="nav">
          <NavLink to="/" end>
          {/* NavLink = Link koji automatski dobija "active" CSS klasu kad je ruta aktivna
              end prop: active klasa samo na TAČNOM "/" — bez end bi bio aktivan i na "/book"
              jer "/book" počinje sa "/" */}
            Koncert
          </NavLink>

          <NavLink to="/book">Rezerviši</NavLink>
          {/* active na "/book" i svim podrutama "/book/*" */}

          <NavLink to="/my">Moja rezervacija</NavLink>
        </nav>

      </div>
    </header>
  );
}
```

---

## 20. `src/components/Footer.tsx`

**Šta je:** Footer — statički sadržaj koji se prikazuje na dnu svake stranice.

```tsx
export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        © 2026 KoncertApp · Projektni zadatak FPIS / MAS
      </div>
    </footer>
  );
}
// Najjednostavnija komponenta — bez state-a, bez props-a, bez logike
// Ostaje na dnu zahvaljujući flex: 1 1 auto na .main klasi
```

---

## 21. `src/pages/Home.tsx`

**Šta je:** Početna stranica aplikacije. Dohvata podatke o koncertu sa API-ja i prikazuje hero sekciju, zone i info o popustima.

```tsx
export default function Home() {
  const navigate = useNavigate();
  // hook za programatsku navigaciju (navigate('/book'))

  const [concert, setConcert] = useState<ConcertInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // useState: state koji se čuva između rendera
  // pri promeni state-a → React ponovo renderuje komponentu

  useEffect(() => {
  // useEffect: pokreće side-effect (API poziv) posle prvog rendera
  // komponenta se renderuje sa loading=true, prikazuje skeleton
  // posle API odgovora → setConcert → novi render sa podacima

    getConcert()
      .then((c) => setConcert(c))        // uspeh → sačuvaj koncert
      .catch((e) => setError(extractErrorMessage(e)))  // greška → poruka
      .finally(() => setLoading(false)); // u oba slučaja → skloni skeleton
  }, []);
  // [] = dependency array: pokreće se SAMO jednom (pri montiranju)
  // bez [] → pokretalo bi se na svakom renderu (beskonačna petlja!)

  const goBook = (zone?: ZoneInfo) => {
    navigate('/book', zone ? { state: { zoneId: zone.id } } : undefined);
    // navigira na /book stranicu
    // state: { zoneId } → Book stranica čita ovo i pre-selektuje zonu
    // state se ne vidi u URL-u — prosljeđuje se interno kroz React Router
  };

  // === LOADING STATE ===
  if (loading) {
    return (
      <div className="stack" aria-busy>
      {/* aria-busy: govori čitačima ekrana da se sadržaj učitava */}
        <div className="skeleton" style={{ height: 280 }} />
        {/* sivi pulsajući placeholder za hero sekciju */}
        <div className="zones-grid">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: 220 }} />
            // 4 placeholder kartice za zone
          ))}
        </div>
      </div>
    );
  }

  // === ERROR STATE ===
  if (error || !concert) {
    return <Alert variant="error">{error ?? 'Nije moguće učitati podatke o koncertu.'}</Alert>;
  }

  // === SUCCESS STATE ===
  const minPrice = concert.zones.reduce(
    (min, z) => (z.pricePerTicket < min ? z.pricePerTicket : min),
    concert.zones[0]?.pricePerTicket ?? 0,
  );
  // reduce: prolazi kroz sve zone i traži minimum
  // acc = akumulator (počinje od cene prve zone)
  // na kraju: najjeftinija karta od svih zona

  return (
    <div className="stack" style={{ gap: 32 }}>

      {/* HERO SEKCIJA */}
      <section className="hero">
        {concert.isEarlyBirdActive && (
          <span className="hero__badge">
            Early Bird aktivan — do {formatDate(concert.earlyBirdDeadline)}
          </span>
          // prikazuje se samo ako je early bird aktivan (backend računica)
        )}
        <h1>{concert.name}</h1>
        <p>{concert.additionalInfo ?? 'Nezaboravno veče...'}</p>
        {/* ?? operator: ako additionalInfo je null, koristi default tekst */}

        <div className="hero__meta">
          {/* Datum, Lokacija, Cena od */}
        </div>

        <div className="hero__cta">
          <button onClick={() => goBook()}>Rezerviši kartu</button>
          <button onClick={() => document.getElementById('zones')?.scrollIntoView({ behavior: 'smooth' })}>
            Pogledaj zone
          </button>
          {/* scrollIntoView: smooth scroll do zones sekcije bez navigacije */}
        </div>
      </section>

      {/* ZONES SEKCIJA */}
      <section id="zones">
        <div className="zones-grid">
          {concert.zones.map((z) => (
            <ZoneCard key={z.id} zone={z} onSelect={goBook} />
            // key={z.id}: React koristi key za efikasno ažuriranje liste
            // onSelect={goBook}: klik na "Izaberi zonu" → navigira na /book sa zoneId
          ))}
        </div>
      </section>

      {/* INFO O POPUSTIMA */}
      <section>
        <div className="zones-grid">
          <div className="panel">Early Bird −10%</div>
          <div className="panel">Svaka 5. karta −50%</div>
          <div className="panel">Promo kod −5%</div>
        </div>
      </section>

    </div>
  );
}
```

---

## 22. `src/pages/Book.tsx`

**Šta je:** Najkompleksnija stranica — forma za kreiranje rezervacije sa live preračunavanjem cene.

```tsx
export default function Book() {
  const navigate = useNavigate();
  const location = useLocation();
  const preselected = (location.state as any)?.zoneId;
  // čita zoneId koji je Home prosleđao pri navigaciji
  // (location.state as any) → jednostavan cast, ne pravimo poseban tip za ovo

  // JEDNO useState za svako polje forme (umesto jednog FormState objekta)
  // ovako je jasno šta je svako polje, bez generičke "update" helper funkcije
  const [zoneId, setZoneId] = useState<number | ''>('');  // '' = ništa izabrano
  const [ticketCount, setTicketCount] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [company, setCompany] = useState('');
  const [address1, setAddress1] = useState('');
  const [address2, setAddress2] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('Srbija');  // pre-popunjeno
  const [email, setEmail] = useState('');
  const [promoCode, setPromoCode] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getConcert()
      .then((c) => {
        setConcert(c);
        if (preselected && c.zones.some((z) => z.id === preselected)) {
          // .some() = proverava da li ijedna zona ima taj id
          setZoneId(preselected);  // postavi izabranu zonu direktno
        }
      })
      .catch((e) => setLoadError(extractErrorMessage(e)))
      .finally(() => setLoading(false));
  }, [preselected]);  // dependency: re-pokreni ako se preselected promeni

  // izabrana zona — obična varijabla, računa se u renderu (bez useMemo)
  const selectedZone =
    zoneId === '' || !concert
      ? undefined
      : concert.zones.find((z) => z.id === zoneId);

  const maxTickets = selectedZone ? Math.min(50, selectedZone.availableSeats) : 1;
  // maximum karata = min od (50, slobodnih mesta); ako zona nije izabrana → 1

  // cena se računa direktno u renderu (bez useMemo) — obična promenljiva + if
  // svaki put kad se promeni zona/broj/promo, komponenta se re-renderuje i ovo se preračuna
  let pricing = null;
  if (selectedZone && concert) {
    pricing = calculatePricing(
      selectedZone.pricePerTicket,
      ticketCount,
      concert.isEarlyBirdActive,
      promoCode.trim().length > 0,  // ima promo kod? (trim = ignoriše razmake)
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // sprečava browser-ov default ponašanje (reload stranice) pri submit-u forme

    if (!selectedZone) {
      setSubmitError('Izaberi zonu pre slanja.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createReservation({
        zoneId: selectedZone.id,
        ticketCount: ticketCount,
        firstName: firstName.trim(),  // .trim() uklanja početne i krajnje razmake
        company: company.trim() || null,
        // || null: ako je prazan string ('') → pošalji null (backend prihvata null za opciona polja)
        promoCode: promoCode.trim() || null,
        // ... ostala polja (lastName, address1, postalCode, city, country, email)
      });
      navigate('/confirmation', { state: { reservation: result, pricing } });
      // prosleđujemo I rezervaciju I pricing (razradu popusta) Confirmation stranici
      // pricing je tu da Confirmation može da prikaže KOLIKO je svaki popust uštedeo
      // ne stavljamo u URL — token je osetljiv podatak
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
      // prikazuje grešku iz backenda (npr. "Nema dovoljno slobodnih mesta")
    } finally {
      setSubmitting(false);
      // uvek se izvršava (i posle uspeha i posle greške)
    }
  };

  // SIDEBAR — live preview cene (čita iz "pricing" promenljive):
  // Zona: VIP Parter
  // Cena po karti: 12.000 RSD
  // Broj karata: 3
  // Early bird −10%: −3.600 RSD  (ako je aktivan)
  // Svaka 5. karta −50%: −0 RSD  (ako je < 5 karata)
  // Promo kod −5%: −0 RSD         (ako nije unet)
  // ─────────────────────────────
  // Ukupno: 32.400 RSD
}
```

---

## 23. `src/pages/Confirmation.tsx`

**Šta je:** Stranica potvrde koja se prikazuje posle uspešne rezervacije. Prikazuje token i promo kod sa mogućnošću kopiranja, kao i **razradu popusta** (koliko je svaki popust uštedeo).

> Napomena: ranije je stranica prikazivala samo „Early bird: da/ne", ali ne i konkretne
> iznose ušteda, jer ih `ReservationResponse` ne sadrži. Zato `Book.tsx` sada prosleđuje i
> `pricing` objekat kroz `location.state`, pa Confirmation može da prikaže svaki popust posebno.

```tsx
export default function Confirmation() {
  const { state } = useLocation();
  // iz Book.tsx dobijamo I rezervaciju I pricing (razradu popusta)
  const reservation = (state as any)?.reservation;
  const pricing = (state as any)?.pricing;

  if (!reservation) return <Navigate to="/" replace />;
  // GUARD: ako korisnik direktno otvori /confirmation bez state-a
  // (refresh stranice, direktan URL) → redirect na Home
  // replace: ne dodaje /confirmation u history (back dugme ne vraća ovde)

  return (
    <div>
      <div className="confirmation__check">✓</div>
      {/* zeleni kvadrat sa check-markom */}

      <h1>Rezervacija potvrđena</h1>
      <p>{reservation.firstName}, tvoje karte su sigurne. Sačuvaj token...</p>

      <CredentialRow label="Token za rezervaciju" value={reservation.token} />
      <CredentialRow label="Tvoj promo kod (−5% za prijatelja)" value={reservation.generatedPromoCode} />
      {/* CredentialRow prikazuje vrednost sa "Kopiraj" dugmetom */}

      {/* Detalji rezervacije: zona, broj karata, pa iznosi popusta iz pricing-a */}
      <Row label="Zona" value={reservation.zoneName} />
      <Row label="Broj karata" value={reservation.ticketCount.toString()} />

      {/* iznosi popusta — prikazuju se samo ako pricing postoji i ako je ušteda > 0 */}
      {pricing && pricing.earlyBirdSavings > 0 && (
        <Row label="Early bird −10%" value={`−${formatRsd(pricing.earlyBirdSavings)}`} />
      )}
      {pricing && pricing.fifthTicketSavings > 0 && (
        <Row label="Svaka 5. karta −50%" value={`−${formatRsd(pricing.fifthTicketSavings)}`} />
      )}
      {pricing && pricing.promoSavings > 0 && (
        <Row label="Promo kod −5%" value={`−${formatRsd(pricing.promoSavings)}`} />
      )}

      {/* ako nema pricing-a (npr. direktan ulazak), prikaži bar da li je early bird primenjen */}
      {!pricing && (
        <Row label="Early bird"
             value={reservation.isEarlyBird ? 'Primenjen −10%' : 'Nije primenjen'} />
      )}

      <Row label="Ukupno" value={formatRsd(reservation.totalPrice)} bold />
      <Row label="Email" value={reservation.email} />

      <Link to="/my" state={{ email: reservation.email, token: reservation.token }}>
        Otvori moju rezervaciju
      </Link>
      {/* prosleđuje email i token MyReservation stranici
          korisnik ne mora da ih ponovo ukuca */}
    </div>
  );
}

function CredentialRow({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  // state za "Kopirano ✓" prikaz

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      // navigator.clipboard.writeText: Web API za kopiranje u clipboard
      // async jer zahteva korisnikovu dozvolu (browser prompt)
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
      // setTimeout: vraća na "Kopiraj" posle 1.4 sekunde
    } catch {
      // silently ignore: browser može blokirati clipboard pristup
    }
  };

  return (
    <div className="credential-card">
      <div>
        <div className="credential-card__label">{label}</div>
        <div className="credential-card__value">{value}</div>
      </div>
      <button type="button" onClick={handleCopy}>
        {copied ? 'Kopirano ✓' : 'Kopiraj'}
        {/* ternary: menja tekst dugmeta na 1.4 sekunde */}
      </button>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="summary__row">
      <span className="summary__label">{label}</span>
      <span className="summary__value" style={bold ? { fontWeight: 700 } : undefined}>
        {value}
      </span>
    </div>
  );
}
// Inline helper komponente — definiše se unutar istog fajla jer se koriste samo ovde
```

---

## 24. `src/pages/MyReservation.tsx`

**Šta je:** Stranica za upravljanje postojećom rezervacijom — pregled, izmena broja karata, otkazivanje.

```tsx
export default function MyReservation() {
  const { state } = useLocation();
  const initial = state as any;  // email i token mogu doći sa strane potvrde

  const [email, setEmail] = useState(initial?.email ?? '');
  const [token, setToken] = useState(initial?.token ?? '');
  // ako je korisnik stigao sa Confirmation stranice → pre-popunjena polja
  // ako je direktno otvorio /my → prazna polja

  const [reservation, setReservation] = useState<ReservationResponse | null>(null);
  const [concert, setConcert] = useState<ConcertInfo | null>(null);
  // concert je potreban za računanje maxTickets (slobodna mesta u zoni)

  const [editTickets, setEditTickets] = useState<number | null>(null);
  // broj karata koji korisnik edituje (null = nije počeo editovanje)

  const [confirmCancel, setConfirmCancel] = useState(false);
  // two-step confirm za otkazivanje — sprečava slučajne klikove

  useEffect(() => {
    if (initial?.email && initial?.token) {
      handleFind(initial.email, initial.token);
      // automatski traži rezervaciju ako su email i token prosleđeni sa potvrde
    }
  }, []);  // samo pri mountovanju

  const handleFind = async (e?: string, t?: string) => {
    const eMail = (e ?? email).trim();
    const tkn = (t ?? token).trim();
    // e ?? email: ako je prosleđen parametar, koristi njega; inače koristi state

    if (!eMail || !tkn) {
      setError('Email i token su obavezni.');
      return;
    }

    // ucitavamo rezervaciju pa koncert — jedno po jedno (dva await poziva)
    const r = await getReservation(eMail, tkn);
    const c = await getConcert();
    setReservation(r);
    setConcert(c);
    setEditTickets(r.ticketCount);  // inicijalizuje na trenutni broj
  };

  // Računanje maksimuma karata za update — obična promenljiva + if (bez IIFE)
  const zone = concert?.zones.find((z) => z.id === reservation?.zoneId);
  let maxTickets = 50;
  if (zone && reservation) {
    const othersOccupied = (zone.capacity - zone.availableSeats) - reservation.ticketCount;
    // zone.availableSeats = slobodna mesta; minus moja ticketCount = mesta koja drugi drže
    maxTickets = Math.min(50, zone.capacity - othersOccupied);
    // ja mogu imati: ukupan kapacitet - mesta koja drže drugi
  }

  const handleUpdate = async () => {
    if (editTickets === reservation.ticketCount) return;
    // nema promene — ne šalji zahtev
    const updated = await updateReservation({ email, token, ticketCount: editTickets });
    setReservation(updated);           // odmah ažurira UI sa novim podacima
    setNotice('Rezervacija je ažurirana.');
    const fresh = await getConcert();  // osvežava dostupnost zona (slobodna mesta)
    setConcert(fresh);
  };

  const handleCancel = async () => {
    await cancelReservation({ email: reservation.email, token: reservation.token });
    setReservation(null);              // uklanja rezervaciju iz UI
    setConfirmCancel(false);
    setNotice('Rezervacija je otkazana. Token više nije važeći.');
  };

  // JSX struktura:
  // 1. Forma za unos email + token
  // 2. Alert za greške/obaveštenja
  // 3. Ako postoji rezervacija:
  //    a. Panel sa detaljima (zona, karte, cena, adresa, promo kod)
  //    b. Panel za izmenu broja karata sa TicketCounter-om
  //    c. Panel za otkazivanje (two-step: "Otkaži" → "Siguran? Da/Ne")
}
```

**Two-step confirm:**
```tsx
{!confirmCancel ? (
  <button onClick={() => setConfirmCancel(true)}>
    Otkaži rezervaciju
  </button>
) : (
  <>
    <span>Siguran/na si?</span>
    <button onClick={handleCancel}>Da, otkaži</button>
    <button onClick={() => setConfirmCancel(false)}>Odustani</button>
  </>
)}
// Prvo klik → confirmCancel = true → prikaz potvrde
// Da → handleCancel → brisanje
// Odustani → confirmCancel = false → povratak na početak
// Sprečava slučajno otkazivanje jednim klikom
```

---

## Tok podataka — kompletna slika

```
main.tsx
  └─ montira <App> u <div id="root">

App.tsx
  ├─ uvek: <Header> + <Footer>
  └─ Routes po URL-u:

  "/" → Home.tsx
    ├─ useEffect → getConcert() → GET /api/concert
    ├─ prikazuje: hero, zone, popusti
    └─ klik "Izaberi" → navigate('/book', { state: { zoneId } })

  "/book" → Book.tsx
    ├─ useEffect → getConcert() (ponovo — sveže stanje)
    ├─ useState za svako polje forme (zoneId, ticketCount, firstName, ...)
    ├─ pricing = calculatePricing() direktno u renderu → live preview cene
    └─ handleSubmit → createReservation() → POST /api/reservation
       └─ navigate('/confirmation', { state: { reservation, pricing } })

  "/confirmation" → Confirmation.tsx
    ├─ location.state.reservation + location.state.pricing (nema API poziva)
    ├─ prikazuje token + promo kod + kopiraj dugme + razradu popusta
    └─ Link to="/my" state={{ email, token }}

  "/my" → MyReservation.tsx
    ├─ useEffect → handleFind() → await getReservation(); await getConcert()
    ├─ handleUpdate → updateReservation() → PUT /api/reservation
    └─ handleCancel → cancelReservation() → DELETE /api/reservation
```

---

## Ključni React koncepti korišćeni u projektu

| Koncept | Gde se koristi | Šta radi |
|---|---|---|
| `useState` | Sve stranice | Čuva state između rendera (po jedno za svako polje forme) |
| `useEffect` | Home, Book, MyReservation | API pozivi pri montiranju |
| `useNavigate` | Home, Book | Programatska navigacija |
| `useLocation` | Book, Confirmation, MyReservation | Čita location.state |
| `NavLink` | Header | Link sa active CSS klasom |
| `Navigate` | Confirmation | Deklarativni redirect |
| `Props interface` | Sve komponente | TypeScript tip za props |
| `children` | Alert | Prosledjivanje JSX sadržaja |
| `async/await` | Book, MyReservation | API pozivi jedan za drugim |
| `location.state` | Book → Confirmation → MyReservation | Prenos podataka između stranica |
