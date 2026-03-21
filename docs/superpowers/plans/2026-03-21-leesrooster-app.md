# Leesrooster App Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA voor De Schuilplaats Enschede waarmee gemeenteleden het M'Cheyne leesrooster dagelijks kunnen volgen, afvinken en hun voortgang kunnen zien.

**Architecture:** React 18 + TypeScript + Vite PWA. Alle state in localStorage. Pure library functies voor schedule/progress/streak logica, getest met Vitest. Drie schermen (Vandaag, Kalender, Instellingen) via simpele React state navigatie.

**Tech Stack:** React 18, TypeScript, Vite, vite-plugin-pwa, Tailwind CSS, Vitest, @testing-library/react

---

## Chunk 1: Project Setup + Data + Core Libraries

### File Map

| File | Verantwoordelijkheid |
|------|---------------------|
| `vite.config.ts` | Vite + PWA plugin config |
| `tailwind.config.js` | Tailwind setup |
| `src/config.ts` | REFERENCE_YEAR en app-constanten |
| `src/data/readingPlan.ts` | Volledig M'Cheyne rooster (hardcoded) |
| `src/lib/schedule.ts` | Welke lezingen op welke dag, actief jaar/spoor |
| `src/lib/progress.ts` | localStorage lees/schrijf voor voortgang |
| `src/lib/settings.ts` | localStorage lees/schrijf voor instellingen |
| `tests/lib/settings.test.ts` | Tests voor settings |
| `src/lib/streak.ts` | Streak berekening |
| `src/lib/testUtils.ts` | Test helpers (localStorage mock) |
| `tests/lib/schedule.test.ts` | Tests voor schedule |
| `tests/lib/progress.test.ts` | Tests voor progress |
| `tests/lib/streak.test.ts` | Tests voor streak |

---

### Task 1: Project initialiseren

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/index.css`

- [ ] **Stap 1: Maak het project aan met Vite**

```bash
cd "/Users/ruben/Documents/De Schuilplaats App"
npm create vite@latest . -- --template react-ts
```

Kies "React" en "TypeScript" als gevraagd. Bevestig dat je de bestaande map wilt gebruiken.

- [ ] **Stap 2: Installeer dependencies**

```bash
npm install
npm install -D tailwindcss postcss autoprefixer
npm install -D vite-plugin-pwa workbox-window
npm install -D vitest @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event
npx tailwindcss init -p
```

- [ ] **Stap 3: Configureer Tailwind**

Vervang `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```

Vervang `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Stap 4: Configureer Vite + Vitest**

Vervang `vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'De Schuilplaats Leesrooster',
        short_name: 'Leesrooster',
        description: 'Dagelijks Bijbel leesrooster voor De Schuilplaats Enschede',
        theme_color: '#5c4a2a',
        background_color: '#f8f6f2',
        display: 'standalone',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
  },
})
```

- [ ] **Stap 5: Maak test setup aan**

Maak `tests/setup.ts`:
```ts
import '@testing-library/jest-dom'
```

Maak `tests/lib/` directory aan.

- [ ] **Stap 6: Verifieer dat de dev server werkt**

```bash
npm run dev
```

Verwacht: server draait op http://localhost:5173

- [ ] **Stap 7: Commit**

```bash
git init
git add .
git commit -m "chore: initialize Vite React TypeScript PWA project"
```

---

### Task 2: Config en types

**Files:**
- Create: `src/config.ts`, `src/types.ts`

- [ ] **Stap 1: Maak types aan**

Maak `src/types.ts`:
```ts
export type DayReadings = {
  family: [string, string]
  secret: [string, string]
}

export type ReadingPlan = {
  [month: string]: {
    [day: string]: DayReadings
  }
}

// Progress per dag: [timestamp lezing1 | null, timestamp lezing2 | null]
export type DayProgress = [string | null, string | null]

export type ProgressStore = {
  [year: string]: {
    [month: string]: {
      [day: string]: DayProgress
    }
  }
}

export type Settings = {
  notificationsEnabled: boolean
  notificationTime: string // "HH:MM"
}

export type ActiveTrack = 'family' | 'secret'

export type Screen = 'today' | 'calendar' | 'settings'
```

- [ ] **Stap 2: Maak config aan**

Maak `src/config.ts`:
```ts
// Het jaar waarin Jaar 1 (Familie lezingen) begon.
// 2025 = Jaar 1, 2026 = Jaar 2, 2027 = Jaar 1, etc.
export const REFERENCE_YEAR = 2025

export const STORAGE_KEYS = {
  progress: 'schuilplaats_progress',
  settings: 'schuilplaats_settings',
} as const

export const DEFAULT_SETTINGS = {
  notificationsEnabled: false,
  notificationTime: '08:00',
}
```

- [ ] **Stap 3: Commit**

```bash
git add src/config.ts src/types.ts
git commit -m "chore: add types and config"
```

---

### Task 3: Leesrooster data

**Files:**
- Create: `src/data/readingPlan.ts`

- [ ] **Stap 1: Maak de data directory en het bestand aan**

Maak `src/data/readingPlan.ts` met de volledige M'Cheyne dataset. Het bestand heeft deze structuur:

```ts
import type { ReadingPlan } from '../types'

export const readingPlan: ReadingPlan = {
  "1": { // Januari
    "1":  { family: ["Genesis 1",    "Matthew 1"],    secret: ["Ezra 1",       "Acts 1"]     },
    "2":  { family: ["Genesis 2",    "Matthew 2"],    secret: ["Ezra 2",       "Acts 2"]     },
    "3":  { family: ["Genesis 3",    "Matthew 3"],    secret: ["Ezra 3",       "Acts 3"]     },
    "4":  { family: ["Genesis 4",    "Matthew 4"],    secret: ["Ezra 4",       "Acts 4"]     },
    "5":  { family: ["Genesis 5",    "Matthew 5"],    secret: ["Ezra 5",       "Acts 5"]     },
    "6":  { family: ["Genesis 6",    "Matthew 6"],    secret: ["Ezra 6",       "Acts 6"]     },
    "7":  { family: ["Genesis 7",    "Matthew 7"],    secret: ["Ezra 7",       "Acts 7"]     },
    "8":  { family: ["Genesis 8",    "Matthew 8"],    secret: ["Ezra 8",       "Acts 8"]     },
    "9":  { family: ["Genesis 9-10", "Matthew 9"],    secret: ["Ezra 9",       "Acts 9"]     },
    "10": { family: ["Genesis 11",   "Matthew 10"],   secret: ["Ezra 10",      "Acts 10"]    },
    "11": { family: ["Genesis 12",   "Matthew 11"],   secret: ["Nehemiah 1",   "Acts 11"]    },
    "12": { family: ["Genesis 13",   "Matthew 12"],   secret: ["Nehemiah 2",   "Acts 12"]    },
    "13": { family: ["Genesis 14",   "Matthew 13"],   secret: ["Nehemiah 3",   "Acts 13"]    },
    "14": { family: ["Genesis 15",   "Matthew 14"],   secret: ["Nehemiah 4",   "Acts 14"]    },
    "15": { family: ["Genesis 16",   "Matthew 15"],   secret: ["Nehemiah 5",   "Acts 15"]    },
    "16": { family: ["Genesis 17",   "Matthew 16"],   secret: ["Nehemiah 6",   "Acts 16"]    },
    "17": { family: ["Genesis 18",   "Matthew 17"],   secret: ["Nehemiah 7",   "Acts 17"]    },
    "18": { family: ["Genesis 19",   "Matthew 18"],   secret: ["Nehemiah 8",   "Acts 18"]    },
    "19": { family: ["Genesis 20",   "Matthew 19"],   secret: ["Nehemiah 9",   "Acts 19"]    },
    "20": { family: ["Genesis 21",   "Matthew 20"],   secret: ["Nehemiah 10",  "Acts 20"]    },
    "21": { family: ["Genesis 22",   "Matthew 21"],   secret: ["Nehemiah 11",  "Acts 21"]    },
    "22": { family: ["Genesis 23",   "Matthew 22"],   secret: ["Nehemiah 12",  "Acts 22"]    },
    "23": { family: ["Genesis 24",   "Matthew 23"],   secret: ["Nehemiah 13",  "Acts 23"]    },
    "24": { family: ["Genesis 25",   "Matthew 24"],   secret: ["Esther 1",     "Acts 24"]    },
    "25": { family: ["Genesis 26",   "Matthew 25"],   secret: ["Esther 2",     "Acts 25"]    },
    "26": { family: ["Genesis 27",   "Matthew 26"],   secret: ["Esther 3",     "Acts 26"]    },
    "27": { family: ["Genesis 28",   "Matthew 27"],   secret: ["Esther 4",     "Acts 27"]    },
    "28": { family: ["Genesis 29",   "Matthew 28"],   secret: ["Esther 5",     "Acts 28"]    },
    "29": { family: ["Genesis 30",   "Mark 1"],       secret: ["Esther 6",     "Romans 1"]   },
    "30": { family: ["Genesis 31",   "Mark 2"],       secret: ["Esther 7",     "Romans 2"]   },
    "31": { family: ["Genesis 32",   "Mark 3"],       secret: ["Esther 8",     "Romans 3"]   },
  },
  "2": { // Februari
    "1":  { family: ["Genesis 33",   "Mark 4"],       secret: ["Esther 9-10",  "Romans 4"]   },
    "2":  { family: ["Genesis 34",   "Mark 5"],       secret: ["Job 1",        "Romans 5"]   },
    "3":  { family: ["Genesis 35-36","Mark 6"],       secret: ["Job 2",        "Romans 6"]   },
    "4":  { family: ["Genesis 37",   "Mark 7"],       secret: ["Job 3",        "Romans 7"]   },
    "5":  { family: ["Genesis 38",   "Mark 8"],       secret: ["Job 4",        "Romans 8"]   },
    "6":  { family: ["Genesis 39",   "Mark 9"],       secret: ["Job 5",        "Romans 9"]   },
    "7":  { family: ["Genesis 40",   "Mark 10"],      secret: ["Job 6",        "Romans 10"]  },
    "8":  { family: ["Genesis 41",   "Mark 11"],      secret: ["Job 7",        "Romans 11"]  },
    "9":  { family: ["Genesis 42",   "Mark 12"],      secret: ["Job 8",        "Romans 12"]  },
    "10": { family: ["Genesis 43",   "Mark 13"],      secret: ["Job 9",        "Romans 13"]  },
    "11": { family: ["Genesis 44",   "Mark 14"],      secret: ["Job 10",       "Romans 14"]  },
    "12": { family: ["Genesis 45",   "Mark 15"],      secret: ["Job 11",       "Romans 15"]  },
    "13": { family: ["Genesis 46",   "Mark 16"],      secret: ["Job 12",       "Romans 16"]  },
    "14": { family: ["Genesis 47",   "Luke 1:1-38"],  secret: ["Job 13",       "1 Corinthians 1"] },
    "15": { family: ["Genesis 48",   "Luke 1:39-80"], secret: ["Job 14",       "1 Corinthians 2"] },
    "16": { family: ["Genesis 49",   "Luke 2"],       secret: ["Job 15",       "1 Corinthians 3"] },
    "17": { family: ["Genesis 50",   "Luke 3"],       secret: ["Job 16-17",    "1 Corinthians 4"] },
    "18": { family: ["Exodus 1",     "Luke 4"],       secret: ["Job 18",       "1 Corinthians 5"] },
    "19": { family: ["Exodus 2",     "Luke 5"],       secret: ["Job 19",       "1 Corinthians 6"] },
    "20": { family: ["Exodus 3",     "Luke 6"],       secret: ["Job 20",       "1 Corinthians 7"] },
    "21": { family: ["Exodus 4",     "Luke 7"],       secret: ["Job 21",       "1 Corinthians 8"] },
    "22": { family: ["Exodus 5",     "Luke 8"],       secret: ["Job 22",       "1 Corinthians 9"] },
    "23": { family: ["Exodus 6",     "Luke 9"],       secret: ["Job 23",       "1 Corinthians 10"] },
    "24": { family: ["Exodus 7",     "Luke 10"],      secret: ["Job 24",       "1 Corinthians 11"] },
    "25": { family: ["Exodus 8",     "Luke 11"],      secret: ["Job 25-26",    "1 Corinthians 12"] },
    "26": { family: ["Exodus 9",     "Luke 12"],      secret: ["Job 27",       "1 Corinthians 13"] },
    "27": { family: ["Exodus 10",    "Luke 13"],      secret: ["Job 28",       "1 Corinthians 14"] },
    "28": { family: ["Exodus 11-12:21", "Luke 14"],  secret: ["Job 29",       "1 Corinthians 15"] },
  },
  "3": { // Maart
    "1":  { family: ["Exodus 12:22-51", "Luke 15"],  secret: ["Job 30",       "1 Corinthians 16"] },
    "2":  { family: ["Exodus 13",    "Luke 16"],      secret: ["Job 31",       "2 Corinthians 1"] },
    "3":  { family: ["Exodus 14",    "Luke 17"],      secret: ["Job 32",       "2 Corinthians 2"] },
    "4":  { family: ["Exodus 15",    "Luke 18"],      secret: ["Job 33",       "2 Corinthians 3"] },
    "5":  { family: ["Exodus 16",    "Luke 19"],      secret: ["Job 34",       "2 Corinthians 4"] },
    "6":  { family: ["Exodus 17",    "Luke 20"],      secret: ["Job 35",       "2 Corinthians 5"] },
    "7":  { family: ["Exodus 18",    "Luke 21"],      secret: ["Job 36",       "2 Corinthians 6"] },
    "8":  { family: ["Exodus 19",    "Luke 22"],      secret: ["Job 37",       "2 Corinthians 7"] },
    "9":  { family: ["Exodus 20",    "Luke 23"],      secret: ["Job 38",       "2 Corinthians 8"] },
    "10": { family: ["Exodus 21",    "Luke 24"],      secret: ["Job 39",       "2 Corinthians 9"] },
    "11": { family: ["Exodus 22",    "John 1"],       secret: ["Job 40",       "2 Corinthians 10"] },
    "12": { family: ["Exodus 23",    "John 2"],       secret: ["Job 41",       "2 Corinthians 11"] },
    "13": { family: ["Exodus 24",    "John 3"],       secret: ["Job 42",       "2 Corinthians 12"] },
    "14": { family: ["Exodus 25",    "John 4"],       secret: ["Proverbs 1",   "2 Corinthians 13"] },
    "15": { family: ["Exodus 26",    "John 5"],       secret: ["Proverbs 2",   "Galatians 1"] },
    "16": { family: ["Exodus 27",    "John 6"],       secret: ["Proverbs 3",   "Galatians 2"] },
    "17": { family: ["Exodus 28",    "John 7"],       secret: ["Proverbs 4",   "Galatians 3"] },
    "18": { family: ["Exodus 29",    "John 8"],       secret: ["Proverbs 5",   "Galatians 4"] },
    "19": { family: ["Exodus 30",    "John 9"],       secret: ["Proverbs 6",   "Galatians 5"] },
    "20": { family: ["Exodus 31",    "John 10"],      secret: ["Proverbs 7",   "Galatians 6"] },
    "21": { family: ["Exodus 32",    "John 11"],      secret: ["Proverbs 8",   "Ephesians 1"] },
    "22": { family: ["Exodus 33",    "John 12"],      secret: ["Proverbs 9",   "Ephesians 2"] },
    "23": { family: ["Exodus 34",    "John 13"],      secret: ["Proverbs 10",  "Ephesians 3"] },
    "24": { family: ["Exodus 35",    "John 14"],      secret: ["Proverbs 11",  "Ephesians 4"] },
    "25": { family: ["Exodus 36",    "John 15"],      secret: ["Proverbs 12",  "Ephesians 5"] },
    "26": { family: ["Exodus 37",    "John 16"],      secret: ["Proverbs 13",  "Ephesians 6"] },
    "27": { family: ["Exodus 38",    "John 17"],      secret: ["Proverbs 14",  "Philippians 1"] },
    "28": { family: ["Exodus 39",    "John 18"],      secret: ["Proverbs 15",  "Philippians 2"] },
    "29": { family: ["Exodus 40",    "John 19"],      secret: ["Proverbs 16",  "Philippians 3"] },
    "30": { family: ["Leviticus 1",  "John 20"],      secret: ["Proverbs 17",  "Philippians 4"] },
    "31": { family: ["Leviticus 2-3","John 21"],      secret: ["Proverbs 18",  "Colossians 1"] },
  },
  "4": { // April
    "1":  { family: ["Leviticus 4",  "Psalms 1-2"],   secret: ["Proverbs 19",  "Colossians 2"] },
    "2":  { family: ["Leviticus 5",  "Psalms 3-4"],   secret: ["Proverbs 20",  "Colossians 3"] },
    "3":  { family: ["Leviticus 6",  "Psalms 5-6"],   secret: ["Proverbs 21",  "Colossians 4"] },
    "4":  { family: ["Leviticus 7",  "Psalms 7-8"],   secret: ["Proverbs 22",  "1 Thessalonians 1"] },
    "5":  { family: ["Leviticus 8",  "Psalms 9"],     secret: ["Proverbs 23",  "1 Thessalonians 2"] },
    "6":  { family: ["Leviticus 9",  "Psalms 10"],    secret: ["Proverbs 24",  "1 Thessalonians 3"] },
    "7":  { family: ["Leviticus 10", "Psalms 11-12"], secret: ["Proverbs 25",  "1 Thessalonians 4"] },
    "8":  { family: ["Leviticus 11-12","Psalms 13-14"],secret: ["Proverbs 26",  "1 Thessalonians 5"] },
    "9":  { family: ["Leviticus 13", "Psalms 15-16"], secret: ["Proverbs 27",  "2 Thessalonians 1"] },
    "10": { family: ["Leviticus 14", "Psalms 17"],    secret: ["Proverbs 28",  "2 Thessalonians 2"] },
    "11": { family: ["Leviticus 15", "Psalms 18"],    secret: ["Proverbs 29",  "2 Thessalonians 3"] },
    "12": { family: ["Leviticus 16", "Psalms 19"],    secret: ["Proverbs 30",  "1 Timothy 1"] },
    "13": { family: ["Leviticus 17", "Psalms 20-21"], secret: ["Proverbs 31",  "1 Timothy 2"] },
    "14": { family: ["Leviticus 18", "Psalms 22"],    secret: ["Ecclesiastes 1","1 Timothy 3"] },
    "15": { family: ["Leviticus 19", "Psalms 23-24"], secret: ["Ecclesiastes 2","1 Timothy 4"] },
    "16": { family: ["Leviticus 20", "Psalms 25"],    secret: ["Ecclesiastes 3","1 Timothy 5"] },
    "17": { family: ["Leviticus 21", "Psalms 26-27"], secret: ["Ecclesiastes 4","1 Timothy 6"] },
    "18": { family: ["Leviticus 22", "Psalms 28-29"], secret: ["Ecclesiastes 5","2 Timothy 1"] },
    "19": { family: ["Leviticus 23", "Psalms 30"],    secret: ["Ecclesiastes 6","2 Timothy 2"] },
    "20": { family: ["Leviticus 24", "Psalms 31"],    secret: ["Ecclesiastes 7","2 Timothy 3"] },
    "21": { family: ["Leviticus 25", "Psalms 32"],    secret: ["Ecclesiastes 8","2 Timothy 4"] },
    "22": { family: ["Leviticus 26", "Psalms 33"],    secret: ["Ecclesiastes 9","Titus 1"] },
    "23": { family: ["Leviticus 27", "Psalms 34"],    secret: ["Ecclesiastes 10","Titus 2"] },
    "24": { family: ["Numbers 1",    "Psalms 35"],    secret: ["Ecclesiastes 11","Titus 3"] },
    "25": { family: ["Numbers 2",    "Psalms 36"],    secret: ["Ecclesiastes 12","Philemon 1"] },
    "26": { family: ["Numbers 3",    "Psalms 37"],    secret: ["Song of Solomon 1","Hebrews 1"] },
    "27": { family: ["Numbers 4",    "Psalms 38"],    secret: ["Song of Solomon 2","Hebrews 2"] },
    "28": { family: ["Numbers 5",    "Psalms 39"],    secret: ["Song of Solomon 3","Hebrews 3"] },
    "29": { family: ["Numbers 6",    "Psalms 40-41"], secret: ["Song of Solomon 4","Hebrews 4"] },
    "30": { family: ["Numbers 7",    "Psalms 42-43"], secret: ["Song of Solomon 5","Hebrews 5"] },
  },
  "5": { // Mei
    "1":  { family: ["Numbers 8",    "Psalms 44"],    secret: ["Song of Solomon 6","Hebrews 6"] },
    "2":  { family: ["Numbers 9",    "Psalms 45"],    secret: ["Song of Solomon 7","Hebrews 7"] },
    "3":  { family: ["Numbers 10",   "Psalms 46-47"], secret: ["Song of Solomon 8","Hebrews 8"] },
    "4":  { family: ["Numbers 11",   "Psalms 48"],    secret: ["Isaiah 1",     "Hebrews 9"] },
    "5":  { family: ["Numbers 12-13","Psalms 49"],    secret: ["Isaiah 2",     "Hebrews 10"] },
    "6":  { family: ["Numbers 14",   "Psalms 50"],    secret: ["Isaiah 3-4",   "Hebrews 11"] },
    "7":  { family: ["Numbers 15",   "Psalms 51"],    secret: ["Isaiah 5",     "Hebrews 12"] },
    "8":  { family: ["Numbers 16",   "Psalms 52-54"], secret: ["Isaiah 6",     "Hebrews 13"] },
    "9":  { family: ["Numbers 17-18","Psalms 55"],    secret: ["Isaiah 7",     "James 1"] },
    "10": { family: ["Numbers 19",   "Psalms 56-57"], secret: ["Isaiah 8-9:7", "James 2"] },
    "11": { family: ["Numbers 20",   "Psalms 58-59"], secret: ["Isaiah 9:7-10:4","James 3"] },
    "12": { family: ["Numbers 21",   "Psalms 60-61"], secret: ["Isaiah 10:5-34","James 4"] },
    "13": { family: ["Numbers 22",   "Psalms 62-63"], secret: ["Isaiah 11-12", "James 5"] },
    "14": { family: ["Numbers 23",   "Psalms 64-65"], secret: ["Isaiah 13",    "1 Peter 1"] },
    "15": { family: ["Numbers 24",   "Psalms 66-67"], secret: ["Isaiah 14",    "1 Peter 2"] },
    "16": { family: ["Numbers 25",   "Psalms 68"],    secret: ["Isaiah 15",    "1 Peter 3"] },
    "17": { family: ["Numbers 26",   "Psalms 69"],    secret: ["Isaiah 16",    "1 Peter 4"] },
    "18": { family: ["Numbers 27",   "Psalms 70-71"], secret: ["Isaiah 17-18", "1 Peter 5"] },
    "19": { family: ["Numbers 28",   "Psalms 72"],    secret: ["Isaiah 19-20", "2 Peter 1"] },
    "20": { family: ["Numbers 29",   "Psalms 73"],    secret: ["Isaiah 21",    "2 Peter 2"] },
    "21": { family: ["Numbers 30",   "Psalms 74"],    secret: ["Isaiah 22",    "2 Peter 3"] },
    "22": { family: ["Numbers 31",   "Psalms 75-76"], secret: ["Isaiah 23",    "1 John 1"] },
    "23": { family: ["Numbers 32",   "Psalms 77"],    secret: ["Isaiah 24",    "1 John 2"] },
    "24": { family: ["Numbers 33",   "Psalms 78:1-37"],secret: ["Isaiah 25",   "1 John 3"] },
    "25": { family: ["Numbers 34",   "Psalms 78:38-72"],secret: ["Isaiah 26",  "1 John 4"] },
    "26": { family: ["Numbers 35",   "Psalms 79"],    secret: ["Isaiah 27",    "1 John 5"] },
    "27": { family: ["Numbers 36",   "Psalms 80"],    secret: ["Isaiah 28",    "2 John 1"] },
    "28": { family: ["Deuteronomy 1","Psalms 81-82"], secret: ["Isaiah 29",    "3 John 1"] },
    "29": { family: ["Deuteronomy 2","Psalms 83-84"], secret: ["Isaiah 30",    "Jude 1"] },
    "30": { family: ["Deuteronomy 3","Psalms 85"],    secret: ["Isaiah 31",    "Revelation 1"] },
    "31": { family: ["Deuteronomy 4","Psalms 86-87"], secret: ["Isaiah 32",    "Revelation 2"] },
  },
  "6": { // Juni
    "1":  { family: ["Deuteronomy 5", "Psalms 88"],   secret: ["Isaiah 33",    "Revelation 3"] },
    "2":  { family: ["Deuteronomy 6", "Psalms 89"],   secret: ["Isaiah 34",    "Revelation 4"] },
    "3":  { family: ["Deuteronomy 7", "Psalms 90"],   secret: ["Isaiah 35",    "Revelation 5"] },
    "4":  { family: ["Deuteronomy 8", "Psalms 91"],   secret: ["Isaiah 36",    "Revelation 6"] },
    "5":  { family: ["Deuteronomy 9", "Psalms 92-93"],secret: ["Isaiah 37",    "Revelation 7"] },
    "6":  { family: ["Deuteronomy 10","Psalms 94"],   secret: ["Isaiah 38",    "Revelation 8"] },
    "7":  { family: ["Deuteronomy 11","Psalms 95-96"],secret: ["Isaiah 39",    "Revelation 9"] },
    "8":  { family: ["Deuteronomy 12","Psalms 97-98"],secret: ["Isaiah 40",    "Revelation 10"] },
    "9":  { family: ["Deuteronomy 13-14","Psalms 99-101"],secret: ["Isaiah 41","Revelation 11"] },
    "10": { family: ["Deuteronomy 15","Psalms 102"],  secret: ["Isaiah 42",    "Revelation 12"] },
    "11": { family: ["Deuteronomy 16","Psalms 103"],  secret: ["Isaiah 43",    "Revelation 13"] },
    "12": { family: ["Deuteronomy 17","Psalms 104"],  secret: ["Isaiah 44",    "Revelation 14"] },
    "13": { family: ["Deuteronomy 18","Psalms 105"],  secret: ["Isaiah 45",    "Revelation 15"] },
    "14": { family: ["Deuteronomy 19","Psalms 106"],  secret: ["Isaiah 46",    "Revelation 16"] },
    "15": { family: ["Deuteronomy 20","Psalms 107"],  secret: ["Isaiah 47",    "Revelation 17"] },
    "16": { family: ["Deuteronomy 21","Psalms 108-109"],secret: ["Isaiah 48",  "Revelation 18"] },
    "17": { family: ["Deuteronomy 22","Psalms 110-111"],secret: ["Isaiah 49",  "Revelation 19"] },
    "18": { family: ["Deuteronomy 23","Psalms 112-113"],secret: ["Isaiah 50",  "Revelation 20"] },
    "19": { family: ["Deuteronomy 24","Psalms 114-115"],secret: ["Isaiah 51",  "Revelation 21"] },
    "20": { family: ["Deuteronomy 25","Psalms 116"],  secret: ["Isaiah 52",    "Revelation 22"] },
    "21": { family: ["Deuteronomy 26","Psalms 117-118"],secret: ["Isaiah 53",  "Matthew 1"] },
    "22": { family: ["Deuteronomy 27-28:19","Psalms 119:1-24"],secret: ["Isaiah 54","Matthew 2"] },
    "23": { family: ["Deuteronomy 28:20-68","Psalms 119:25-48"],secret: ["Isaiah 55","Matthew 3"] },
    "24": { family: ["Deuteronomy 29","Psalms 119:49-72"],secret: ["Isaiah 56", "Matthew 4"] },
    "25": { family: ["Deuteronomy 30","Psalms 119:73-96"],secret: ["Isaiah 57", "Matthew 5"] },
    "26": { family: ["Deuteronomy 31","Psalms 119:97-120"],secret: ["Isaiah 58","Matthew 6"] },
    "27": { family: ["Deuteronomy 32","Psalms 119:121-144"],secret: ["Isaiah 59","Matthew 7"] },
    "28": { family: ["Deuteronomy 33-34","Psalms 119:145-176"],secret: ["Isaiah 60","Matthew 8"] },
    "29": { family: ["Joshua 1",     "Psalms 120-122"],secret: ["Isaiah 61",   "Matthew 9"] },
    "30": { family: ["Joshua 2",     "Psalms 123-125"],secret: ["Isaiah 62",   "Matthew 10"] },
  },
  "7": { // Juli
    "1":  { family: ["Joshua 3",     "Psalms 126-128"],secret: ["Isaiah 63",   "Matthew 11"] },
    "2":  { family: ["Joshua 4",     "Psalms 129-131"],secret: ["Isaiah 64",   "Matthew 12"] },
    "3":  { family: ["Joshua 5-6:5", "Psalms 132-134"],secret: ["Isaiah 65",   "Matthew 13"] },
    "4":  { family: ["Joshua 6:6-27","Psalms 135-136"],secret: ["Isaiah 66",   "Matthew 14"] },
    "5":  { family: ["Joshua 7",     "Psalms 137-138"],secret: ["Jeremiah 1",  "Matthew 15"] },
    "6":  { family: ["Joshua 8",     "Psalms 139"],   secret: ["Jeremiah 2",   "Matthew 16"] },
    "7":  { family: ["Joshua 9",     "Psalms 140-141"],secret: ["Jeremiah 3",  "Matthew 17"] },
    "8":  { family: ["Joshua 10",    "Psalms 142-143"],secret: ["Jeremiah 4",  "Matthew 18"] },
    "9":  { family: ["Joshua 11",    "Psalms 144"],   secret: ["Jeremiah 5",   "Matthew 19"] },
    "10": { family: ["Joshua 12-13", "Psalms 145"],   secret: ["Jeremiah 6",   "Matthew 20"] },
    "11": { family: ["Joshua 14-15", "Psalms 146-147"],secret: ["Jeremiah 7",  "Matthew 21"] },
    "12": { family: ["Joshua 16-17", "Psalms 148"],   secret: ["Jeremiah 8",   "Matthew 22"] },
    "13": { family: ["Joshua 18-19", "Psalms 149-150"],secret: ["Jeremiah 9",  "Matthew 23"] },
    "14": { family: ["Joshua 20-21", "Acts 1"],       secret: ["Jeremiah 10",  "Matthew 24"] },
    "15": { family: ["Joshua 22",    "Acts 2"],       secret: ["Jeremiah 11",  "Matthew 25"] },
    "16": { family: ["Joshua 23",    "Acts 3"],       secret: ["Jeremiah 12",  "Matthew 26"] },
    "17": { family: ["Joshua 24",    "Acts 4"],       secret: ["Jeremiah 13",  "Matthew 27"] },
    "18": { family: ["Judges 1",     "Acts 5"],       secret: ["Jeremiah 14",  "Matthew 28"] },
    "19": { family: ["Judges 2",     "Acts 6"],       secret: ["Jeremiah 15",  "Mark 1"] },
    "20": { family: ["Judges 3",     "Acts 7"],       secret: ["Jeremiah 16",  "Mark 2"] },
    "21": { family: ["Judges 4",     "Acts 8"],       secret: ["Jeremiah 17",  "Mark 3"] },
    "22": { family: ["Judges 5",     "Acts 9"],       secret: ["Jeremiah 18",  "Mark 4"] },
    "23": { family: ["Judges 6",     "Acts 10"],      secret: ["Jeremiah 19",  "Mark 5"] },
    "24": { family: ["Judges 7",     "Acts 11"],      secret: ["Jeremiah 20",  "Mark 6"] },
    "25": { family: ["Judges 8",     "Acts 12"],      secret: ["Jeremiah 21",  "Mark 7"] },
    "26": { family: ["Judges 9",     "Acts 13"],      secret: ["Jeremiah 22",  "Mark 8"] },
    "27": { family: ["Judges 10-11:11","Acts 14"],    secret: ["Jeremiah 23",  "Mark 9"] },
    "28": { family: ["Judges 11:12-40","Acts 15"],    secret: ["Jeremiah 24",  "Mark 10"] },
    "29": { family: ["Judges 12",    "Acts 16"],      secret: ["Jeremiah 25",  "Mark 11"] },
    "30": { family: ["Judges 13",    "Acts 17"],      secret: ["Jeremiah 26",  "Mark 12"] },
    "31": { family: ["Judges 14",    "Acts 18"],      secret: ["Jeremiah 27",  "Mark 13"] },
  },
  "8": { // Augustus
    "1":  { family: ["Judges 15",    "Acts 19"],      secret: ["Jeremiah 28",  "Mark 14"] },
    "2":  { family: ["Judges 16",    "Acts 20"],      secret: ["Jeremiah 29",  "Mark 15"] },
    "3":  { family: ["Judges 17",    "Acts 21"],      secret: ["Jeremiah 30-31","Mark 16"] },
    "4":  { family: ["Judges 18",    "Acts 22"],      secret: ["Jeremiah 32",  "Psalms 1-2"] },
    "5":  { family: ["Judges 19",    "Acts 23"],      secret: ["Jeremiah 33",  "Psalms 3-4"] },
    "6":  { family: ["Judges 20",    "Acts 24"],      secret: ["Jeremiah 34",  "Psalms 5-6"] },
    "7":  { family: ["Judges 21",    "Acts 25"],      secret: ["Jeremiah 35",  "Psalms 7-8"] },
    "8":  { family: ["Ruth 1",       "Acts 26"],      secret: ["Jeremiah 36-45","Psalms 9"] },
    "9":  { family: ["Ruth 2",       "Acts 27"],      secret: ["Jeremiah 37",  "Psalms 10"] },
    "10": { family: ["Ruth 3-4",     "Acts 28"],      secret: ["Jeremiah 38",  "Psalms 11-12"] },
    "11": { family: ["1 Samuel 1",   "Romans 1"],     secret: ["Jeremiah 39",  "Psalms 13-14"] },
    "12": { family: ["1 Samuel 2",   "Romans 2"],     secret: ["Jeremiah 40",  "Psalms 15-16"] },
    "13": { family: ["1 Samuel 3",   "Romans 3"],     secret: ["Jeremiah 41",  "Psalms 17"] },
    "14": { family: ["1 Samuel 4",   "Romans 4"],     secret: ["Jeremiah 42",  "Psalms 18"] },
    "15": { family: ["1 Samuel 5-6", "Romans 5"],     secret: ["Jeremiah 43",  "Psalms 19"] },
    "16": { family: ["1 Samuel 7-8", "Romans 6"],     secret: ["Jeremiah 44",  "Psalms 20-21"] },
    "17": { family: ["1 Samuel 9",   "Romans 7"],     secret: ["Jeremiah 46",  "Psalms 22"] },
    "18": { family: ["1 Samuel 10",  "Romans 8"],     secret: ["Jeremiah 47",  "Psalms 23-24"] },
    "19": { family: ["1 Samuel 11",  "Romans 9"],     secret: ["Jeremiah 48",  "Psalms 25"] },
    "20": { family: ["1 Samuel 12",  "Romans 10"],    secret: ["Jeremiah 49",  "Psalms 26-27"] },
    "21": { family: ["1 Samuel 13",  "Romans 11"],    secret: ["Jeremiah 50",  "Psalms 28-29"] },
    "22": { family: ["1 Samuel 14",  "Romans 12"],    secret: ["Jeremiah 51",  "Psalms 30"] },
    "23": { family: ["1 Samuel 15",  "Romans 13"],    secret: ["Jeremiah 52",  "Psalms 31"] },
    "24": { family: ["1 Samuel 16",  "Romans 14"],    secret: ["Lamentations 1","Psalms 32"] },
    "25": { family: ["1 Samuel 17",  "Romans 15"],    secret: ["Lamentations 2","Psalms 33"] },
    "26": { family: ["1 Samuel 18",  "Romans 16"],    secret: ["Lamentations 3","Psalms 34"] },
    "27": { family: ["1 Samuel 19",  "1 Corinthians 1"],secret: ["Lamentations 4","Psalms 35"] },
    "28": { family: ["1 Samuel 20",  "1 Corinthians 2"],secret: ["Lamentations 5","Psalms 36"] },
    "29": { family: ["1 Samuel 21-22","1 Corinthians 3"],secret: ["Ezekiel 1", "Psalms 37"] },
    "30": { family: ["1 Samuel 23",  "1 Corinthians 4"],secret: ["Ezekiel 2",  "Psalms 38"] },
    "31": { family: ["1 Samuel 24",  "1 Corinthians 5"],secret: ["Ezekiel 3",  "Psalms 39"] },
  },
  "9": { // September
    "1":  { family: ["1 Samuel 25",  "1 Corinthians 6"],secret: ["Ezekiel 4",  "Psalms 40-41"] },
    "2":  { family: ["1 Samuel 26",  "1 Corinthians 7"],secret: ["Ezekiel 5",  "Psalms 42-43"] },
    "3":  { family: ["1 Samuel 27",  "1 Corinthians 8"],secret: ["Ezekiel 6",  "Psalms 44"] },
    "4":  { family: ["1 Samuel 28",  "1 Corinthians 9"],secret: ["Ezekiel 7",  "Psalms 45"] },
    "5":  { family: ["1 Samuel 29-30","1 Corinthians 10"],secret: ["Ezekiel 8","Psalms 46-47"] },
    "6":  { family: ["1 Samuel 31",  "1 Corinthians 11"],secret: ["Ezekiel 9", "Psalms 48"] },
    "7":  { family: ["2 Samuel 1",   "1 Corinthians 12"],secret: ["Ezekiel 10","Psalms 49"] },
    "8":  { family: ["2 Samuel 2",   "1 Corinthians 13"],secret: ["Ezekiel 11","Psalms 50"] },
    "9":  { family: ["2 Samuel 3",   "1 Corinthians 14"],secret: ["Ezekiel 12","Psalms 51"] },
    "10": { family: ["2 Samuel 4-5", "1 Corinthians 15"],secret: ["Ezekiel 13","Psalms 52-54"] },
    "11": { family: ["2 Samuel 6",   "1 Corinthians 16"],secret: ["Ezekiel 14","Psalms 55"] },
    "12": { family: ["2 Samuel 7",   "2 Corinthians 1"],secret: ["Ezekiel 15", "Psalms 56-57"] },
    "13": { family: ["2 Samuel 8-9", "2 Corinthians 2"],secret: ["Ezekiel 16", "Psalms 58-59"] },
    "14": { family: ["2 Samuel 10",  "2 Corinthians 3"],secret: ["Ezekiel 17", "Psalms 60-61"] },
    "15": { family: ["2 Samuel 11",  "2 Corinthians 4"],secret: ["Ezekiel 18", "Psalms 62-63"] },
    "16": { family: ["2 Samuel 12",  "2 Corinthians 5"],secret: ["Ezekiel 19", "Psalms 64-65"] },
    "17": { family: ["2 Samuel 13",  "2 Corinthians 6"],secret: ["Ezekiel 20", "Psalms 66-67"] },
    "18": { family: ["2 Samuel 14",  "2 Corinthians 7"],secret: ["Ezekiel 21", "Psalms 68"] },
    "19": { family: ["2 Samuel 15",  "2 Corinthians 8"],secret: ["Ezekiel 22", "Psalms 69"] },
    "20": { family: ["2 Samuel 16",  "2 Corinthians 9"],secret: ["Ezekiel 23", "Psalms 70-71"] },
    "21": { family: ["2 Samuel 17",  "2 Corinthians 10"],secret: ["Ezekiel 24","Psalms 72"] },
    "22": { family: ["2 Samuel 18",  "2 Corinthians 11"],secret: ["Ezekiel 25","Psalms 73"] },
    "23": { family: ["2 Samuel 19",  "2 Corinthians 12"],secret: ["Ezekiel 26","Psalms 74"] },
    "24": { family: ["2 Samuel 20",  "2 Corinthians 13"],secret: ["Ezekiel 27","Psalms 75-76"] },
    "25": { family: ["2 Samuel 21",  "Galatians 1"],  secret: ["Ezekiel 28",   "Psalms 77"] },
    "26": { family: ["2 Samuel 22",  "Galatians 2"],  secret: ["Ezekiel 29",   "Psalms 78:1-37"] },
    "27": { family: ["2 Samuel 23",  "Galatians 3"],  secret: ["Ezekiel 30",   "Psalms 78:38-72"] },
    "28": { family: ["2 Samuel 24",  "Galatians 4"],  secret: ["Ezekiel 31",   "Psalms 79"] },
    "29": { family: ["1 Kings 1",    "Galatians 5"],  secret: ["Ezekiel 32",   "Psalms 80"] },
    "30": { family: ["1 Kings 2",    "Galatians 6"],  secret: ["Ezekiel 33",   "Psalms 81-82"] },
  },
  "10": { // Oktober
    "1":  { family: ["1 Kings 3",    "Ephesians 1"],  secret: ["Ezekiel 34",   "Psalms 83-84"] },
    "2":  { family: ["1 Kings 4-5",  "Ephesians 2"],  secret: ["Ezekiel 35",   "Psalms 85"] },
    "3":  { family: ["1 Kings 6",    "Ephesians 3"],  secret: ["Ezekiel 36",   "Psalms 86"] },
    "4":  { family: ["1 Kings 7",    "Ephesians 4"],  secret: ["Ezekiel 37",   "Psalms 87-88"] },
    "5":  { family: ["1 Kings 8",    "Ephesians 5"],  secret: ["Ezekiel 38",   "Psalms 89"] },
    "6":  { family: ["1 Kings 9",    "Ephesians 6"],  secret: ["Ezekiel 39",   "Psalms 90"] },
    "7":  { family: ["1 Kings 10",   "Philippians 1"],secret: ["Ezekiel 40",   "Psalms 91"] },
    "8":  { family: ["1 Kings 11",   "Philippians 2"],secret: ["Ezekiel 41",   "Psalms 92-93"] },
    "9":  { family: ["1 Kings 12",   "Philippians 3"],secret: ["Ezekiel 42",   "Psalms 94"] },
    "10": { family: ["1 Kings 13",   "Philippians 4"],secret: ["Ezekiel 43",   "Psalms 95-96"] },
    "11": { family: ["1 Kings 14",   "Colossians 1"], secret: ["Ezekiel 44",   "Psalms 97-98"] },
    "12": { family: ["1 Kings 15",   "Colossians 2"], secret: ["Ezekiel 45",   "Psalms 99-101"] },
    "13": { family: ["1 Kings 16",   "Colossians 3"], secret: ["Ezekiel 46",   "Psalms 102"] },
    "14": { family: ["1 Kings 17",   "Colossians 4"], secret: ["Ezekiel 47",   "Psalms 103"] },
    "15": { family: ["1 Kings 18",   "1 Thessalonians 1"],secret: ["Ezekiel 48","Psalms 104"] },
    "16": { family: ["1 Kings 19",   "1 Thessalonians 2"],secret: ["Daniel 1",  "Psalms 105"] },
    "17": { family: ["1 Kings 20",   "1 Thessalonians 3"],secret: ["Daniel 2",  "Psalms 106"] },
    "18": { family: ["1 Kings 21",   "1 Thessalonians 4"],secret: ["Daniel 3",  "Psalms 107"] },
    "19": { family: ["1 Kings 22",   "1 Thessalonians 5"],secret: ["Daniel 4",  "Psalms 108-109"] },
    "20": { family: ["2 Kings 1",    "2 Thessalonians 1"],secret: ["Daniel 5",  "Psalms 110-111"] },
    "21": { family: ["2 Kings 2",    "2 Thessalonians 2"],secret: ["Daniel 6",  "Psalms 112-113"] },
    "22": { family: ["2 Kings 3",    "2 Thessalonians 3"],secret: ["Daniel 7",  "Psalms 114-115"] },
    "23": { family: ["2 Kings 4",    "1 Timothy 1"],  secret: ["Daniel 8",     "Psalms 116"] },
    "24": { family: ["2 Kings 5",    "1 Timothy 2"],  secret: ["Daniel 9",     "Psalms 117-118"] },
    "25": { family: ["2 Kings 6",    "1 Timothy 3"],  secret: ["Daniel 10",    "Psalms 119:1-24"] },
    "26": { family: ["2 Kings 7",    "1 Timothy 4"],  secret: ["Daniel 11",    "Psalms 119:25-48"] },
    "27": { family: ["2 Kings 8",    "1 Timothy 5"],  secret: ["Daniel 12",    "Psalms 119:49-72"] },
    "28": { family: ["2 Kings 9",    "1 Timothy 6"],  secret: ["Hosea 1",      "Psalms 119:73-96"] },
    "29": { family: ["2 Kings 10",   "2 Timothy 1"],  secret: ["Hosea 2",      "Psalms 119:97-120"] },
    "30": { family: ["2 Kings 11-12","2 Timothy 2"],  secret: ["Hosea 3-4",    "Psalms 119:121-144"] },
    "31": { family: ["2 Kings 13",   "2 Timothy 3"],  secret: ["Hosea 5-6",    "Psalms 119:145-176"] },
  },
  "11": { // November
    "1":  { family: ["2 Kings 14",   "2 Timothy 4"],  secret: ["Hosea 7",      "Psalms 120-122"] },
    "2":  { family: ["2 Kings 15",   "Titus 1"],      secret: ["Hosea 8",      "Psalms 123-125"] },
    "3":  { family: ["2 Kings 16",   "Titus 2"],      secret: ["Hosea 9",      "Psalms 126-128"] },
    "4":  { family: ["2 Kings 17",   "Titus 3"],      secret: ["Hosea 10",     "Psalms 129-131"] },
    "5":  { family: ["2 Kings 18",   "Philemon 1"],   secret: ["Hosea 11",     "Psalms 132-134"] },
    "6":  { family: ["2 Kings 19",   "Hebrews 1"],    secret: ["Hosea 12",     "Psalms 135-136"] },
    "7":  { family: ["2 Kings 20",   "Hebrews 2"],    secret: ["Hosea 13",     "Psalms 137-138"] },
    "8":  { family: ["2 Kings 21",   "Hebrews 3"],    secret: ["Hosea 14",     "Psalms 139"] },
    "9":  { family: ["2 Kings 22",   "Hebrews 4"],    secret: ["Joel 1",       "Psalms 140-141"] },
    "10": { family: ["2 Kings 23",   "Hebrews 5"],    secret: ["Joel 2",       "Psalms 142"] },
    "11": { family: ["2 Kings 24",   "Hebrews 6"],    secret: ["Joel 3",       "Psalms 143"] },
    "12": { family: ["2 Kings 25",   "Hebrews 7"],    secret: ["Amos 1",       "Psalms 144"] },
    "13": { family: ["1 Chronicles 1-2","Hebrews 8"], secret: ["Amos 2",       "Psalms 145"] },
    "14": { family: ["1 Chronicles 3-4","Hebrews 9"], secret: ["Amos 3",       "Psalms 146-147"] },
    "15": { family: ["1 Chronicles 5-6","Hebrews 10"],secret: ["Amos 4",       "Psalms 148-150"] },
    "16": { family: ["1 Chronicles 7-8","Hebrews 11"],secret: ["Amos 5",       "Luke 1:1-38"] },
    "17": { family: ["1 Chronicles 9-10","Hebrews 12"],secret: ["Amos 6",      "Luke 1:39-80"] },
    "18": { family: ["1 Chronicles 11-12","Hebrews 13"],secret: ["Amos 7",     "Luke 2"] },
    "19": { family: ["1 Chronicles 13-14","James 1"], secret: ["Amos 8",       "Luke 3"] },
    "20": { family: ["1 Chronicles 15","James 2"],    secret: ["Amos 9",       "Luke 4"] },
    "21": { family: ["1 Chronicles 16","James 3"],    secret: ["Obadiah 1",    "Luke 5"] },
    "22": { family: ["1 Chronicles 17","James 4"],    secret: ["Jonah 1",      "Luke 6"] },
    "23": { family: ["1 Chronicles 18","James 5"],    secret: ["Jonah 2",      "Luke 7"] },
    "24": { family: ["1 Chronicles 19-20","1 Peter 1"],secret: ["Jonah 3",     "Luke 8"] },
    "25": { family: ["1 Chronicles 21","1 Peter 2"],  secret: ["Jonah 4",      "Luke 9"] },
    "26": { family: ["1 Chronicles 22","1 Peter 3"],  secret: ["Micah 1",      "Luke 10"] },
    "27": { family: ["1 Chronicles 23","1 Peter 4"],  secret: ["Micah 2",      "Luke 11"] },
    "28": { family: ["1 Chronicles 24-25","1 Peter 5"],secret: ["Micah 3",     "Luke 12"] },
    "29": { family: ["1 Chronicles 26-27","2 Peter 1"],secret: ["Micah 4",     "Luke 13"] },
    "30": { family: ["1 Chronicles 28","2 Peter 2"],  secret: ["Micah 5",      "Luke 14"] },
  },
  "12": { // December
    "1":  { family: ["1 Chronicles 29","2 Peter 3"],  secret: ["Micah 6",      "Luke 15"] },
    "2":  { family: ["2 Chronicles 1","1 John 1"],    secret: ["Micah 7",      "Luke 16"] },
    "3":  { family: ["2 Chronicles 2","1 John 2"],    secret: ["Nahum 1",      "Luke 17"] },
    "4":  { family: ["2 Chronicles 3-4","1 John 3"],  secret: ["Nahum 2",      "Luke 18"] },
    "5":  { family: ["2 Chronicles 5-6:11","1 John 4"],secret: ["Nahum 3",     "Luke 19"] },
    "6":  { family: ["2 Chronicles 6:12-42","1 John 5"],secret: ["Habakkuk 1", "Luke 20"] },
    "7":  { family: ["2 Chronicles 7","2 John 1"],    secret: ["Habakkuk 2",   "Luke 21"] },
    "8":  { family: ["2 Chronicles 8","3 John 1"],    secret: ["Habakkuk 3",   "Luke 22"] },
    "9":  { family: ["2 Chronicles 9","Jude 1"],      secret: ["Zephaniah 1",  "Luke 23"] },
    "10": { family: ["2 Chronicles 10","Revelation 1"],secret: ["Zephaniah 2", "Luke 24"] },
    "11": { family: ["2 Chronicles 11-12","Revelation 2"],secret: ["Zephaniah 3","John 1"] },
    "12": { family: ["2 Chronicles 13","Revelation 3"],secret: ["Haggai 1",    "John 2"] },
    "13": { family: ["2 Chronicles 14-15","Revelation 4"],secret: ["Haggai 2", "John 3"] },
    "14": { family: ["2 Chronicles 16","Revelation 5"],secret: ["Zechariah 1", "John 4"] },
    "15": { family: ["2 Chronicles 17","Revelation 6"],secret: ["Zechariah 2", "John 5"] },
    "16": { family: ["2 Chronicles 18","Revelation 7"],secret: ["Zechariah 3", "John 6"] },
    "17": { family: ["2 Chronicles 19-20","Revelation 8"],secret: ["Zechariah 4","John 7"] },
    "18": { family: ["2 Chronicles 21","Revelation 9"],secret: ["Zechariah 5", "John 8"] },
    "19": { family: ["2 Chronicles 22-23","Revelation 10"],secret: ["Zechariah 6","John 9"] },
    "20": { family: ["2 Chronicles 24","Revelation 11"],secret: ["Zechariah 7", "John 10"] },
    "21": { family: ["2 Chronicles 25","Revelation 12"],secret: ["Zechariah 8", "John 11"] },
    "22": { family: ["2 Chronicles 26","Revelation 13"],secret: ["Zechariah 9", "John 12"] },
    "23": { family: ["2 Chronicles 27-28","Revelation 14"],secret: ["Zechariah 10","John 13"] },
    "24": { family: ["2 Chronicles 29","Revelation 15"],secret: ["Zechariah 11","John 14"] },
    "25": { family: ["2 Chronicles 30","Revelation 16"],secret: ["Zechariah 12-13:1","John 15"] },
    "26": { family: ["2 Chronicles 31","Revelation 17"],secret: ["Zechariah 13:2-9","John 16"] },
    "27": { family: ["2 Chronicles 32","Revelation 18"],secret: ["Zechariah 14","John 17"] },
    "28": { family: ["2 Chronicles 33","Revelation 19"],secret: ["Malachi 1",   "John 18"] },
    "29": { family: ["2 Chronicles 34","Revelation 20"],secret: ["Malachi 2",   "John 19"] },
    "30": { family: ["2 Chronicles 35","Revelation 21"],secret: ["Malachi 3",   "John 20"] },
    "31": { family: ["2 Chronicles 36","Revelation 22"],secret: ["Malachi 4",   "John 21"] },
  },
}
```

- [ ] **Stap 2: Verifieer het bestand compileert zonder fouten**

```bash
npx tsc --noEmit
```

Verwacht: geen fouten

- [ ] **Stap 3: Commit**

```bash
git add src/data/readingPlan.ts src/types.ts src/config.ts
git commit -m "feat: add M'Cheyne reading plan data and types"
```

---

### Task 4: schedule.ts met tests

**Files:**
- Create: `src/lib/schedule.ts`, `tests/lib/schedule.test.ts`

- [ ] **Stap 1: Schrijf de failing tests**

Maak `tests/lib/schedule.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { getActiveYear, getActiveTrack, getReadingsForDay } from '../../src/lib/schedule'

describe('getActiveYear', () => {
  it('returns 1 for the reference year', () => {
    expect(getActiveYear(2025, 2025)).toBe(1)
  })
  it('returns 2 for one year after reference', () => {
    expect(getActiveYear(2026, 2025)).toBe(2)
  })
  it('cycles back to 1 after year 2', () => {
    expect(getActiveYear(2027, 2025)).toBe(1)
  })
})

describe('getActiveTrack', () => {
  it('returns family for year 1', () => {
    expect(getActiveTrack(1)).toBe('family')
  })
  it('returns secret for year 2', () => {
    expect(getActiveTrack(2)).toBe('secret')
  })
})

describe('getReadingsForDay', () => {
  it('returns the correct readings for January 1 family track', () => {
    const result = getReadingsForDay(1, 1, 'family')
    expect(result).toEqual(['Genesis 1', 'Matthew 1'])
  })
  it('returns the correct readings for January 1 secret track', () => {
    const result = getReadingsForDay(1, 1, 'secret')
    expect(result).toEqual(['Ezra 1', 'Acts 1'])
  })
  it('returns null for an invalid date', () => {
    expect(getReadingsForDay(2, 30, 'family')).toBeNull()
  })
})
```

- [ ] **Stap 2: Run tests — verwacht FAIL**

```bash
npx vitest run tests/lib/schedule.test.ts
```

Verwacht: FAIL — "getActiveYear is not a function"

- [ ] **Stap 3: Implementeer schedule.ts**

Maak `src/lib/schedule.ts`:
```ts
import { readingPlan } from '../data/readingPlan'
import type { ActiveTrack } from '../types'

export function getActiveYear(currentYear: number, referenceYear: number): 1 | 2 {
  return ((currentYear - referenceYear) % 2 === 0) ? 1 : 2
}

export function getActiveTrack(activeYear: 1 | 2): ActiveTrack {
  return activeYear === 1 ? 'family' : 'secret'
}

export function getReadingsForDay(
  month: number,
  day: number,
  track: ActiveTrack
): [string, string] | null {
  const dayData = readingPlan[String(month)]?.[String(day)]
  if (!dayData) return null
  return dayData[track]
}

export function getTodayReadings(referenceYear: number): [string, string] | null {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const day = now.getDate()
  const activeYear = getActiveYear(year, referenceYear)
  const track = getActiveTrack(activeYear)
  return getReadingsForDay(month, day, track)
}
```

- [ ] **Stap 4: Run tests — verwacht PASS**

```bash
npx vitest run tests/lib/schedule.test.ts
```

Verwacht: alle tests PASS

- [ ] **Stap 5: Commit**

```bash
git add src/lib/schedule.ts tests/lib/schedule.test.ts
git commit -m "feat: add schedule library with tests"
```

---

### Task 5: progress.ts met tests

**Files:**
- Create: `src/lib/progress.ts`, `src/lib/testUtils.ts`, `tests/lib/progress.test.ts`

- [ ] **Stap 1: Maak testUtils aan**

Maak `src/lib/testUtils.ts`:
```ts
// localStorage mock helper voor tests
export function mockLocalStorage() {
  const store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach(k => delete store[k]) },
  }
}
```

- [ ] **Stap 2: Schrijf failing tests**

Maak `tests/lib/progress.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getProgress, setReadingComplete, isDayComplete, isDayPartial, isDayCompleteOnTime } from '../../src/lib/progress'
import { mockLocalStorage } from '../../src/lib/testUtils'

beforeEach(() => {
  const mock = mockLocalStorage()
  vi.stubGlobal('localStorage', mock)
})

describe('getProgress', () => {
  it('returns empty object when no progress stored', () => {
    expect(getProgress()).toEqual({})
  })
})

describe('setReadingComplete', () => {
  it('stores a timestamp for reading 0', () => {
    setReadingComplete(2026, 3, 21, 0)
    const progress = getProgress()
    expect(progress['2026']['3']['21'][0]).toBeTruthy()
    expect(progress['2026']['3']['21'][1]).toBeNull()
  })

  it('does not overwrite an already completed reading', () => {
    setReadingComplete(2026, 3, 21, 0)
    const first = getProgress()['2026']['3']['21'][0]
    setReadingComplete(2026, 3, 21, 0)
    const second = getProgress()['2026']['3']['21'][0]
    expect(first).toBe(second)
  })
})

describe('isDayComplete', () => {
  it('returns false when no readings done', () => {
    expect(isDayComplete(2026, 3, 21)).toBe(false)
  })
  it('returns false when only one reading done', () => {
    setReadingComplete(2026, 3, 21, 0)
    expect(isDayComplete(2026, 3, 21)).toBe(false)
  })
  it('returns true when both readings done', () => {
    setReadingComplete(2026, 3, 21, 0)
    setReadingComplete(2026, 3, 21, 1)
    expect(isDayComplete(2026, 3, 21)).toBe(true)
  })
})

describe('isDayPartial', () => {
  it('returns false when no readings done', () => {
    expect(isDayPartial(2026, 3, 21)).toBe(false)
  })
  it('returns true when exactly one reading done', () => {
    setReadingComplete(2026, 3, 21, 0)
    expect(isDayPartial(2026, 3, 21)).toBe(true)
  })
})

describe('isDayCompleteOnTime', () => {
  it('returns false when nothing done', () => {
    expect(isDayCompleteOnTime(2026, 3, 21)).toBe(false)
  })
  it('returns true when both readings done on the correct day', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 21, 9, 0, 0))
    setReadingComplete(2026, 3, 21, 0)
    setReadingComplete(2026, 3, 21, 1)
    vi.useRealTimers()
    expect(isDayCompleteOnTime(2026, 3, 21)).toBe(true)
  })
  it('returns false when readings were done on a different day (late catchup)', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 22, 9, 0, 0)) // 22 maart, maar gepland voor 21
    setReadingComplete(2026, 3, 21, 0)
    setReadingComplete(2026, 3, 21, 1)
    vi.useRealTimers()
    expect(isDayCompleteOnTime(2026, 3, 21)).toBe(false)
  })
})
```

- [ ] **Stap 3: Run tests — verwacht FAIL**

```bash
npx vitest run tests/lib/progress.test.ts
```

- [ ] **Stap 4: Implementeer progress.ts**

Maak `src/lib/progress.ts`:
```ts
import { STORAGE_KEYS } from '../config'
import type { ProgressStore, DayProgress } from '../types'

export function getProgress(): ProgressStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.progress)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveProgress(progress: ProgressStore): void {
  localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(progress))
}

export function getDayProgress(year: number, month: number, day: number): DayProgress {
  const progress = getProgress()
  return progress[year]?.[month]?.[day] ?? [null, null]
}

export function setReadingComplete(year: number, month: number, day: number, index: 0 | 1): void {
  const progress = getProgress()
  if (!progress[year]) progress[year] = {}
  if (!progress[year][month]) progress[year][month] = {}
  if (!progress[year][month][day]) progress[year][month][day] = [null, null]

  // Niet overschrijven als al afgevinkt
  if (progress[year][month][day][index] === null) {
    progress[year][month][day][index] = new Date().toISOString()
  }
  saveProgress(progress)
}

export function isDayComplete(year: number, month: number, day: number): boolean {
  const [r1, r2] = getDayProgress(year, month, day)
  return r1 !== null && r2 !== null
}

export function isDayPartial(year: number, month: number, day: number): boolean {
  const [r1, r2] = getDayProgress(year, month, day)
  const count = (r1 !== null ? 1 : 0) + (r2 !== null ? 1 : 0)
  return count === 1
}

// Geeft true als een lezing on-time was (timestamp van dezelfde kalenderdag als gepland)
export function isReadingOnTime(
  timestamp: string,
  year: number,
  month: number,
  day: number
): boolean {
  const d = new Date(timestamp)
  return (
    d.getFullYear() === year &&
    d.getMonth() + 1 === month &&
    d.getDate() === day
  )
}

export function isDayCompleteOnTime(year: number, month: number, day: number): boolean {
  const [r1, r2] = getDayProgress(year, month, day)
  if (r1 === null || r2 === null) return false
  return (
    isReadingOnTime(r1, year, month, day) &&
    isReadingOnTime(r2, year, month, day)
  )
}
```

- [ ] **Stap 5: Run tests — verwacht PASS**

```bash
npx vitest run tests/lib/progress.test.ts
```

- [ ] **Stap 6: Commit**

```bash
git add src/lib/progress.ts src/lib/testUtils.ts tests/lib/progress.test.ts
git commit -m "feat: add progress library with localStorage and tests"
```

---

### Task 6: settings.ts

**Files:**
- Create: `src/lib/settings.ts`

- [ ] **Stap 1: Implementeer settings.ts**

Maak `src/lib/settings.ts`:
```ts
import { STORAGE_KEYS, DEFAULT_SETTINGS } from '../config'
import type { Settings } from '../types'

export function getSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.settings)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings))
}
```

- [ ] **Stap 2: Schrijf tests voor settings**

Maak `tests/lib/settings.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getSettings, saveSettings } from '../../src/lib/settings'
import { mockLocalStorage } from '../../src/lib/testUtils'

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage())
})

describe('getSettings', () => {
  it('returns defaults when nothing stored', () => {
    const s = getSettings()
    expect(s.notificationsEnabled).toBe(false)
    expect(s.notificationTime).toBe('08:00')
  })

  it('merges stored partial settings with defaults', () => {
    saveSettings({ notificationsEnabled: true, notificationTime: '07:30' })
    const s = getSettings()
    expect(s.notificationsEnabled).toBe(true)
    expect(s.notificationTime).toBe('07:30')
  })

  it('returns defaults when stored JSON is corrupt', () => {
    localStorage.setItem('schuilplaats_settings', 'invalid-json')
    const s = getSettings()
    expect(s.notificationsEnabled).toBe(false)
  })
})
```

- [ ] **Stap 3: Run tests — verwacht PASS**

```bash
npx vitest run tests/lib/settings.test.ts
```

- [ ] **Stap 4: Commit**

```bash
git add src/lib/settings.ts tests/lib/settings.test.ts
git commit -m "feat: add settings library with tests"
```

---

### Task 7: streak.ts met tests

**Files:**
- Create: `src/lib/streak.ts`, `tests/lib/streak.test.ts`

- [ ] **Stap 1: Schrijf failing tests**

Maak `tests/lib/streak.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { calculateStreak } from '../../src/lib/streak'
import { setReadingComplete } from '../../src/lib/progress'
import { mockLocalStorage } from '../../src/lib/testUtils'

beforeEach(() => {
  vi.stubGlobal('localStorage', mockLocalStorage())
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

// Helper: voltooi beide lezingen op een specifieke dag (simuleert on-time afvinken)
function completeDayOnTime(year: number, month: number, day: number) {
  vi.setSystemTime(new Date(year, month - 1, day, 9, 0, 0))
  setReadingComplete(year, month, day, 0)
  setReadingComplete(year, month, day, 1)
}

describe('calculateStreak', () => {
  it('returns 0 with no progress', () => {
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(0)
  })

  it('returns 1 when only today is complete on time', () => {
    completeDayOnTime(2026, 3, 21)
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(1)
  })

  it('returns 0 when today is not complete but yesterday was', () => {
    completeDayOnTime(2026, 3, 20)
    // Vandaag (21 maart) is niet gedaan
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(0)
  })

  it('returns correct streak for multiple consecutive days', () => {
    for (let day = 18; day <= 21; day++) {
      completeDayOnTime(2026, 3, day)
    }
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(4)
  })

  it('streak starts from most recent consecutive run, ignores earlier missed days', () => {
    // Dag 15-17 gemist, dag 18-21 op tijd
    for (let day = 18; day <= 21; day++) {
      completeDayOnTime(2026, 3, day)
    }
    expect(calculateStreak(new Date(2026, 2, 21))).toBe(4)
  })
})
```

- [ ] **Stap 2: Run tests — verwacht FAIL**

```bash
npx vitest run tests/lib/streak.test.ts
```

- [ ] **Stap 3: Implementeer streak.ts**

Maak `src/lib/streak.ts`:
```ts
import { isDayCompleteOnTime } from './progress'

export function calculateStreak(today: Date): number {
  let streak = 0
  const current = new Date(today)

  while (true) {
    const year = current.getFullYear()
    const month = current.getMonth() + 1
    const day = current.getDate()

    if (isDayCompleteOnTime(year, month, day)) {
      streak++
      current.setDate(current.getDate() - 1)
    } else {
      break
    }

    // Veiligheidsgrens: max 366 dagen terug
    if (streak > 366) break
  }

  return streak
}
```

- [ ] **Stap 4: Run tests — verwacht PASS**

```bash
npx vitest run tests/lib/streak.test.ts
```

- [ ] **Stap 5: Run alle tests**

```bash
npx vitest run
```

Verwacht: alle tests PASS

- [ ] **Stap 6: Commit**

```bash
git add src/lib/streak.ts tests/lib/streak.test.ts
git commit -m "feat: add streak calculation with tests"
```

---

## Chunk 2: UI Components

### File Map

| File | Verantwoordelijkheid |
|------|---------------------|
| `src/App.tsx` | Root component, navigatie state, screen routing |
| `src/components/BottomNav.tsx` | Tab balk onderaan (Vandaag / Kalender / Instellingen) |
| `src/components/ReadingItem.tsx` | Enkelvoudige lezing rij met checkbox |
| `src/components/TodayScreen.tsx` | Vandaag scherm: ophaallijst + dagelijkse lezingen + streak |
| `src/components/CalendarScreen.tsx` | Maandkalender met voortgangs-kleurcodering |
| `src/components/SettingsScreen.tsx` | Instellingen scherm |

---

### Task 8: App shell en navigatie

**Files:**
- Modify: `src/App.tsx`, `src/main.tsx`, `index.html`

- [ ] **Stap 1: Pas index.html aan**

Vervang de `<title>` in `index.html`:
```html
<title>De Schuilplaats Leesrooster</title>
```

- [ ] **Stap 2: Pas main.tsx aan**

Vervang `src/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Stap 3: Maak App.tsx aan**

Vervang `src/App.tsx`:
```tsx
import { useState } from 'react'
import type { Screen } from './types'
import BottomNav from './components/BottomNav'
import TodayScreen from './components/TodayScreen'
import CalendarScreen from './components/CalendarScreen'
import SettingsScreen from './components/SettingsScreen'

export default function App() {
  const [screen, setScreen] = useState<Screen>('today')

  return (
    <div className="flex flex-col h-screen bg-[#f8f6f2] max-w-md mx-auto">
      <main className="flex-1 overflow-y-auto">
        {screen === 'today' && <TodayScreen />}
        {screen === 'calendar' && <CalendarScreen />}
        {screen === 'settings' && <SettingsScreen />}
      </main>
      <BottomNav active={screen} onChange={setScreen} />
    </div>
  )
}
```

- [ ] **Stap 4: Commit**

```bash
git add src/App.tsx src/main.tsx index.html
git commit -m "feat: add app shell with screen routing"
```

---

### Task 9: BottomNav component

**Files:**
- Create: `src/components/BottomNav.tsx`

- [ ] **Stap 1: Maak BottomNav aan**

Maak `src/components/BottomNav.tsx`:
```tsx
import type { Screen } from '../types'

type Props = {
  active: Screen
  onChange: (screen: Screen) => void
}

const tabs: { id: Screen; label: string; icon: string }[] = [
  { id: 'today',    label: 'Vandaag',      icon: '📖' },
  { id: 'calendar', label: 'Kalender',     icon: '📅' },
  { id: 'settings', label: 'Instellingen', icon: '⚙️' },
]

export default function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="flex border-t border-stone-200 bg-white">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
            active === tab.id
              ? 'text-[#5c4a2a] font-semibold'
              : 'text-stone-400'
          }`}
        >
          <span className="text-xl">{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/BottomNav.tsx
git commit -m "feat: add BottomNav component"
```

---

### Task 10: ReadingItem component

**Files:**
- Create: `src/components/ReadingItem.tsx`

- [ ] **Stap 1: Maak ReadingItem aan**

Maak `src/components/ReadingItem.tsx`:
```tsx
type Props = {
  reading: string
  index: number
  isComplete: boolean
  isCatchup: boolean
  onToggle: (index: number) => void
}

export default function ReadingItem({ reading, index, isComplete, isCatchup, onToggle }: Props) {
  return (
    <button
      onClick={() => !isComplete && onToggle(index)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-opacity ${
        isCatchup
          ? 'bg-red-50 border border-red-200'
          : 'bg-[#f0ebe1]'
      } ${isComplete ? 'opacity-60' : ''}`}
    >
      <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 ${
        isComplete
          ? 'bg-[#5c4a2a] border-[#5c4a2a]'
          : isCatchup
          ? 'border-red-400'
          : 'border-[#5c4a2a]'
      }`}>
        {isComplete && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className={`font-medium ${isComplete ? 'line-through text-stone-400' : 'text-stone-800'}`}>
        {reading}
      </span>
    </button>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/ReadingItem.tsx
git commit -m "feat: add ReadingItem component"
```

---

### Task 11: TodayScreen

**Files:**
- Create: `src/components/TodayScreen.tsx`

- [ ] **Stap 1: Maak TodayScreen aan**

Maak `src/components/TodayScreen.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react'
import { REFERENCE_YEAR } from '../config'
import { getActiveYear, getActiveTrack, getReadingsForDay } from '../lib/schedule'
import { getDayProgress, setReadingComplete } from '../lib/progress'
import { calculateStreak } from '../lib/streak'
import ReadingItem from './ReadingItem'

type PendingDay = {
  year: number
  month: number
  day: number
  readings: [string, string]
  progress: [string | null, string | null]
  isCatchup: boolean
}

const MONTH_NAMES = ['jan','feb','mrt','apr','mei','jun','jul','aug','sep','okt','nov','dec']
const DAY_NAMES = ['zondag','maandag','dinsdag','woensdag','donderdag','vrijdag','zaterdag']

export default function TodayScreen() {
  const [pendingDays, setPendingDays] = useState<PendingDay[]>([])
  const [streak, setStreak] = useState(0)
  const today = new Date()

  const buildPendingList = useCallback(() => {
    const year = today.getFullYear()
    const activeYear = getActiveYear(year, REFERENCE_YEAR)
    const track = getActiveTrack(activeYear)
    const days: PendingDay[] = []

    // Ophaallijst: 1 jan t/m gisteren, alleen als er een entry bestaat maar niet compleet
    const startOfYear = new Date(year, 0, 1)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)

    const current = new Date(startOfYear)
    while (current <= yesterday) {
      const m = current.getMonth() + 1
      const d = current.getDate()
      const prog = getDayProgress(year, m, d)
      if (prog[0] !== null || prog[1] !== null) {
        // Entry bestaat — check of volledig
        if (prog[0] === null || prog[1] === null) {
          const readings = getReadingsForDay(m, d, track)
          if (readings) {
            days.push({ year, month: m, day: d, readings, progress: prog, isCatchup: true })
          }
        }
      }
      current.setDate(current.getDate() + 1)
    }

    // Vandaag
    const todayMonth = today.getMonth() + 1
    const todayDay = today.getDate()
    const todayReadings = getReadingsForDay(todayMonth, todayDay, track)
    const todayProgress = getDayProgress(year, todayMonth, todayDay)
    if (todayReadings && (todayProgress[0] === null || todayProgress[1] === null)) {
      days.push({
        year,
        month: todayMonth,
        day: todayDay,
        readings: todayReadings,
        progress: todayProgress,
        isCatchup: false,
      })
    }

    setPendingDays(days)
    setStreak(calculateStreak(today))
  }, [])

  useEffect(() => { buildPendingList() }, [buildPendingList])

  function handleToggle(dayIndex: number, readingIndex: 0 | 1) {
    const d = pendingDays[dayIndex]
    setReadingComplete(d.year, d.month, d.day, readingIndex)
    buildPendingList()
  }

  const totalPending = pendingDays.reduce((sum, d) => {
    return sum + (d.progress[0] === null ? 1 : 0) + (d.progress[1] === null ? 1 : 0)
  }, 0)

  const year = today.getFullYear()
  const activeYear = getActiveYear(year, REFERENCE_YEAR)
  const track = getActiveTrack(activeYear)
  const trackLabel = track === 'family' ? 'Familie' : 'Geheim'

  return (
    <div className="p-4">
      <div className="mb-4">
        <p className="text-xs text-stone-400 uppercase tracking-wide">
          {DAY_NAMES[today.getDay()]} {today.getDate()} {MONTH_NAMES[today.getMonth()]} · Jaar {activeYear} · {trackLabel}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <h1 className="text-2xl font-bold text-stone-800">Vandaag</h1>
          {totalPending > 0 && (
            <span className="bg-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
              {totalPending}
            </span>
          )}
        </div>
      </div>

      {pendingDays.length === 0 ? (
        <div className="text-center py-12 text-stone-400">
          <div className="text-4xl mb-2">✅</div>
          <p className="font-medium">Alles gelezen voor vandaag!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingDays.map((d, dayIndex) => (
            <div key={`${d.month}-${d.day}`}>
              {d.isCatchup && (
                <p className="text-xs font-bold text-red-500 uppercase tracking-wide mb-2">
                  Inhalen — {d.day} {MONTH_NAMES[d.month - 1]}
                </p>
              )}
              {!d.isCatchup && (
                <p className="text-xs font-bold text-[#5c4a2a] uppercase tracking-wide mb-2">
                  Vandaag — {d.day} {MONTH_NAMES[d.month - 1]}
                </p>
              )}
              <div className="space-y-2">
                {d.readings.map((reading, readingIndex) => (
                  d.progress[readingIndex as 0 | 1] === null && (
                    <ReadingItem
                      key={readingIndex}
                      reading={reading}
                      index={readingIndex}
                      isComplete={false}
                      isCatchup={d.isCatchup}
                      onToggle={(i) => handleToggle(dayIndex, i as 0 | 1)}
                    />
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {streak > 0 && (
        <div className="mt-6 bg-green-50 rounded-lg p-3 text-center">
          <p className="text-sm font-semibold text-green-700">🔥 {streak} {streak === 1 ? 'dag' : 'dagen'} op rij gelezen</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Stap 2: Verifieer in browser**

```bash
npm run dev
```

Open http://localhost:5173 — de Vandaag pagina moet zichtbaar zijn.

- [ ] **Stap 3: Commit**

```bash
git add src/components/TodayScreen.tsx
git commit -m "feat: add TodayScreen with catchup list and streak"
```

---

### Task 12: CalendarScreen

**Files:**
- Create: `src/components/CalendarScreen.tsx`

- [ ] **Stap 1: Maak CalendarScreen aan**

Maak `src/components/CalendarScreen.tsx`:
```tsx
import { useState } from 'react'
import { getProgress, isDayComplete, isDayPartial } from '../lib/progress'

const MONTH_NAMES = ['Januari','Februari','Maart','April','Mei','Juni',
                     'Juli','Augustus','September','Oktober','November','December']

function getDayStatus(year: number, month: number, day: number, today: Date): 'complete' | 'partial' | 'missed' | 'today' | 'future' | 'empty' {
  const date = new Date(year, month - 1, day)
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  if (date > todayMidnight) return 'future'

  const progress = getProgress()
  const hasEntry = progress[year]?.[month]?.[day] !== undefined

  if (date.getTime() === todayMidnight.getTime()) {
    if (isDayComplete(year, month, day)) return 'complete'
    if (isDayPartial(year, month, day)) return 'partial'
    return 'today'
  }

  // Verleden dag
  if (!hasEntry) return 'empty'
  if (isDayComplete(year, month, day)) return 'complete'
  if (isDayPartial(year, month, day)) return 'partial'
  return 'missed'
}

const STATUS_CLASSES: Record<string, string> = {
  complete: 'bg-[#5c4a2a] text-white',
  partial:  'bg-[#a0845c] text-white',
  missed:   'bg-red-500 text-white',
  today:    'border-2 border-[#5c4a2a] text-[#5c4a2a] font-bold',
  future:   'text-stone-300',
  empty:    'text-stone-300',
}

export default function CalendarScreen() {
  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1)

  function prevMonth() {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const firstDay = new Date(viewYear, viewMonth - 1, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth, 0).getDate()
  // Zet zondag (0) naar het einde (6 = zondag in EU-indeling)
  const startOffset = firstDay === 0 ? 6 : firstDay - 1

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 text-stone-600">‹</button>
        <h2 className="text-lg font-bold text-stone-800">
          {MONTH_NAMES[viewMonth - 1]} {viewYear}
        </h2>
        <button onClick={nextMonth} className="p-2 text-stone-600">›</button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {['Ma','Di','Wo','Do','Vr','Za','Zo'].map(d => (
          <div key={d} className="text-xs text-stone-400 py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
          const status = getDayStatus(viewYear, viewMonth, day, now)
          return (
            <div
              key={day}
              className={`aspect-square flex items-center justify-center rounded text-sm ${STATUS_CLASSES[status]}`}
            >
              {day}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-stone-500">
        <span><span className="inline-block w-3 h-3 rounded bg-[#5c4a2a] mr-1" />Volledig</span>
        <span><span className="inline-block w-3 h-3 rounded bg-[#a0845c] mr-1" />Half</span>
        <span><span className="inline-block w-3 h-3 rounded bg-red-500 mr-1" />Gemist</span>
      </div>
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/CalendarScreen.tsx
git commit -m "feat: add CalendarScreen with color-coded progress"
```

---

### Task 13: SettingsScreen

**Files:**
- Create: `src/components/SettingsScreen.tsx`

- [ ] **Stap 1: Maak SettingsScreen aan**

Maak `src/components/SettingsScreen.tsx`:
```tsx
import { useState, useEffect } from 'react'
import { REFERENCE_YEAR } from '../config'
import { getActiveYear, getActiveTrack } from '../lib/schedule'
import { getSettings, saveSettings } from '../lib/settings'
import { scheduleNextNotification, cancelNotifications } from '../lib/notifications'

export default function SettingsScreen() {
  const [settings, setSettings] = useState(getSettings)

  const year = new Date().getFullYear()
  const activeYear = getActiveYear(year, REFERENCE_YEAR)
  const track = getActiveTrack(activeYear)
  const trackLabel = track === 'family' ? 'Familie lezingen' : 'Geheime lezingen'

  useEffect(() => {
    saveSettings(settings)
    if (settings.notificationsEnabled) {
      scheduleNextNotification(settings.notificationTime)
    } else {
      cancelNotifications()
    }
  }, [settings])

  async function handleNotificationToggle() {
    if (!settings.notificationsEnabled) {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') return
    }
    setSettings(s => ({ ...s, notificationsEnabled: !s.notificationsEnabled }))
  }

  function handleTimeChange(time: string) {
    setSettings(s => ({ ...s, notificationTime: time }))
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-stone-800 mb-4">Instellingen</h1>

      <div className="bg-[#f0ebe1] rounded-lg p-4 mb-4">
        <p className="text-xs text-stone-400 uppercase tracking-wide mb-1">Huidig leesrooster</p>
        <p className="font-bold text-[#5c4a2a]">Jaar {activeYear} · {trackLabel}</p>
        <p className="text-xs text-stone-400 mt-1">Gestart 1 jan {REFERENCE_YEAR} · samen met de gemeente</p>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-stone-400 uppercase tracking-wide">Dagelijkse herinnering</p>

        <div className="bg-white rounded-lg border border-stone-200 divide-y divide-stone-100">
          <div className="flex items-center justify-between p-4">
            <span className="text-stone-800">Melding aan</span>
            <button
              onClick={handleNotificationToggle}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                settings.notificationsEnabled ? 'bg-[#5c4a2a]' : 'bg-stone-200'
              }`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                settings.notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {settings.notificationsEnabled && (
            <div className="flex items-center justify-between p-4">
              <span className="text-stone-800">Tijd</span>
              <input
                type="time"
                value={settings.notificationTime}
                onChange={e => handleTimeChange(e.target.value)}
                className="text-[#5c4a2a] font-bold bg-transparent"
              />
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-stone-300 mt-8">De Schuilplaats Enschede · v1.0</p>
    </div>
  )
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/components/SettingsScreen.tsx
git commit -m "feat: add SettingsScreen"
```

---

## Chunk 3: Notificaties + PWA Setup

### File Map

| File | Verantwoordelijkheid |
|------|---------------------|
| `src/lib/notifications.ts` | Notificatie planning via service worker |
| `public/icons/icon-192.png` | App icon 192×192 |
| `public/icons/icon-512.png` | App icon 512×512 |
| `public/sw-custom.js` | Custom service worker logica (notificaties) |

---

### Task 14: Notificatie logica

**Files:**
- Create: `src/lib/notifications.ts`

- [ ] **Stap 1: Maak notifications.ts aan**

Maak `src/lib/notifications.ts`:
```ts
import { getReadingsForDay } from './schedule'
import { getActiveYear, getActiveTrack } from './schedule'
import { REFERENCE_YEAR } from '../config'

export async function scheduleNextNotification(time: string): Promise<void> {
  if (!('serviceWorker' in navigator) || !('Notification' in window)) return
  if (Notification.permission !== 'granted') return

  const registration = await navigator.serviceWorker.ready
  if (!registration.active) return

  const [hours, minutes] = time.split(':').map(Number)
  const now = new Date()
  const next = new Date(now)
  next.setHours(hours, minutes, 0, 0)

  // Als het tijdstip vandaag al voorbij is, plan voor morgen
  if (next <= now) {
    next.setDate(next.getDate() + 1)
  }

  const delay = next.getTime() - now.getTime()

  // Bereken de lezingen voor de geplande dag
  const year = next.getFullYear()
  const month = next.getMonth() + 1
  const day = next.getDate()
  const activeYear = getActiveYear(year, REFERENCE_YEAR)
  const track = getActiveTrack(activeYear)
  const readings = getReadingsForDay(month, day, track)

  registration.active.postMessage({
    type: 'SCHEDULE_NOTIFICATION',
    delay,
    title: 'De Schuilplaats Leesrooster 📖',
    body: readings
      ? `Vandaag: ${readings[0]} & ${readings[1]}`
      : 'Tijd om te lezen!',
  })
}

export async function cancelNotifications(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const registration = await navigator.serviceWorker.ready
  registration.active?.postMessage({ type: 'CANCEL_NOTIFICATION' })
}
```

- [ ] **Stap 2: Commit**

```bash
git add src/lib/notifications.ts
git commit -m "feat: add notification scheduling helper"
```

---

### Task 15: Custom service worker

**Files:**
- Create: `public/sw-custom.js`
- Modify: `vite.config.ts`

- [ ] **Stap 1: Maak custom service worker aan**

Maak `public/sw-custom.js`:
```js
let notificationTimer = null

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    if (notificationTimer) clearTimeout(notificationTimer)
    const { delay, title, body } = event.data
    notificationTimer = setTimeout(() => {
      self.registration.showNotification(title, {
        body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-192.png',
      })
      notificationTimer = null
    }, delay)
  }

  if (event.data?.type === 'CANCEL_NOTIFICATION') {
    if (notificationTimer) {
      clearTimeout(notificationTimer)
      notificationTimer = null
    }
  }
})
```

- [ ] **Stap 2: Update vite.config.ts voor custom SW**

Pas `vite.config.ts` aan — voeg `additionalManifestEntries` en `importScripts` toe aan de PWA config:

```ts
VitePWA({
  registerType: 'autoUpdate',
  includeAssets: ['icons/*.png', 'sw-custom.js'],
  manifest: {
    // Behoud het bestaande manifest-blok volledig uit Task 1 — voeg alleen workbox toe
    name: 'De Schuilplaats Leesrooster',
    short_name: 'Leesrooster',
    description: 'Dagelijks Bijbel leesrooster voor De Schuilplaats Enschede',
    theme_color: '#5c4a2a',
    background_color: '#f8f6f2',
    display: 'standalone',
    icons: [
      { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  workbox: {
    additionalManifestEntries: [{ url: '/sw-custom.js', revision: null }],
    importScripts: ['/sw-custom.js'],
  },
})
```

- [ ] **Stap 3: Commit**

```bash
git add public/sw-custom.js vite.config.ts
git commit -m "feat: add custom service worker for local notifications"
```

---

### Task 16: App icons

**Files:**
- Create: `public/icons/icon-192.png`, `public/icons/icon-512.png`

- [ ] **Stap 1: Genereer eenvoudige placeholder icons**

Voor het prototype maken we bruine placeholder icons via een simpel script:

```bash
# Maak de directory aan
mkdir -p public/icons

# Gebruik canvas via Node om eenvoudige icons te genereren
node -e "
const { createCanvas } = require('canvas');
[192, 512].forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#5c4a2a';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = 'white';
  ctx.font = \`bold \${size * 0.4}px serif\`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📖', size/2, size/2);
  require('fs').writeFileSync(\`public/icons/icon-\${size}.png\`, canvas.toBuffer('image/png'));
});
" 2>/dev/null || echo "canvas package not available, maak handmatig icons aan"
```

Als `canvas` niet beschikbaar is, maak dan handmatig twee PNG-bestanden aan (elk een vierkant met bruine achtergrond) of download tijdelijk een placeholder icon en hernoem naar `icon-192.png` en `icon-512.png`.

- [ ] **Stap 2: Commit**

```bash
git add public/icons/
git commit -m "chore: add app icons"
```

---

### Task 17: Wire notificaties in app + finale build

**Files:**
- Modify: `src/App.tsx`

- [ ] **Stap 1: Plan notificatie bij app-open**

Voeg toe aan `src/App.tsx` — importeer en roep `scheduleNextNotification` aan bij mount:

```tsx
import { useEffect, useState } from 'react'
import { getSettings } from './lib/settings'
import { scheduleNextNotification } from './lib/notifications'

// In de App component, voeg toe:
useEffect(() => {
  const s = getSettings()
  if (s.notificationsEnabled) {
    scheduleNextNotification(s.notificationTime)
  }
}, [])
```

- [ ] **Stap 2: Run alle tests**

```bash
npx vitest run
```

Verwacht: alle tests PASS

- [ ] **Stap 3: Build de app**

```bash
npm run build
```

Verwacht: build succesvol in `dist/`

- [ ] **Stap 4: Preview de PWA build**

```bash
npm run preview
```

Open http://localhost:4173 — verifieer:
- App laadt correct
- Navigatie tussen schermen werkt
- Lezingen worden getoond
- Afvinken werkt
- Kalender toont huidige maand

- [ ] **Stap 5: Finale commit**

```bash
git add src/ public/ vite.config.ts
git commit -m "feat: complete MVP - De Schuilplaats leesrooster PWA"
```

---

## Deployment (optioneel na prototype-review)

Na goedkeuring van de voorganger:

1. Maak een GitHub repository aan
2. Push de code: `git remote add origin <url> && git push -u origin main`
3. Verbind de repo met Netlify of Vercel (gratis tier)
4. Stel een custom domein in (bijv. `leesrooster.deschuilplaats.nl`)
5. Deel de QR-code in de kerk die naar de URL wijst
