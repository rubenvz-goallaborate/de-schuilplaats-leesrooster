# De Schuilplaats Leesrooster App — Design Spec

**Datum**: 2026-03-21
**Status**: Goedgekeurd
**Project**: De Schuilplaats Enschede — Bijbel leesrooster PWA

---

## Samenvatting

Een Progressive Web App (PWA) waarmee gemeenteleden van De Schuilplaats Enschede dagelijks het Robert Murray M'Cheyne leesrooster kunnen volgen. De app geeft dagelijkse push notificaties, laat lezingen afvinken, stapelt gemiste lezingen op als ophaallijst, en toont voortgang via een kalenderoverzicht. Geen accounts, geen backend — alles draait lokaal op het apparaat.

---

## Doelgroep & context

- Gemeenteleden van De Schuilplaats Enschede, breed qua leeftijd (inclusief ouderen)
- Iedereen volgt hetzelfde leesrooster op hetzelfde moment — gemeenschappelijk ritme is een kernwaarde
- Distributie via QR-code in de kerk → PWA-installatie op homescreen (Android + iOS)
- Instructievideo beschikbaar voor installatie-uitleg

---

## Scope MVP

**Inbegrepen:**
- Dagelijkse lezingen tonen op basis van datum
- Lezingen afvinken (per lezing individueel)
- Gemiste lezingen ophalen (stapelen in "Vandaag"-scherm)
- Dagelijkse lokale push notificatie met instelbare tijd
- Maandkalender met voortgangsvisualisatie
- Streak-teller (dagen op rij volledig gelezen)
- Automatische jaar-bepaling (Jaar 1 vs Jaar 2) op basis van configuratie

**Buiten scope (fase 2):**
- Gebruikersaccounts / authenticatie
- Buddy-groepen en sociale functies
- Chat / reflecties delen
- App Store / Play Store publicatie
- Admin-panel voor het leesrooster

---

## Leesrooster: Robert Murray M'Cheyne

Het M'Cheyne leesrooster beslaat de hele Bijbel in één jaar met 4 lezingen per dag, opgesplitst in twee sporen:

- **Familie-lezingen** (kolom 1 & 2): 2 hoofdstukken per dag
- **Geheime lezingen** (kolom 3 & 4): 2 hoofdstukken per dag

De gemeente leest:
- **Jaar 1**: Familie-lezingen (2 hoofdstukken per dag)
- **Jaar 2**: Geheime lezingen (2 hoofdstukken per dag)

Het rooster loopt altijd van 1 januari t/m 31 december. Het actieve jaar wordt bepaald door een hardcoded referentiejaar in de app-configuratie (bijv. `REFERENCE_YEAR = 2025` → 2025 = Jaar 1, 2026 = Jaar 2, 2027 = Jaar 1, etc.).

Het volledige rooster (alle 365 dagen × 4 lezingen) wordt als statische JSON hardcoded in de app — beide sporen (family én secret) zijn inbegrepen zodat het actieve spoor op runtime bepaald kan worden via `REFERENCE_YEAR`. De JSON is klein genoeg (~50 KB) dat dit geen probleem vormt.

---

## Architectuur

### Tech stack

| Onderdeel | Keuze | Reden |
|-----------|-------|-------|
| Framework | React 18 + TypeScript | Vertrouwd ecosysteem, goede tooling |
| Build tool | Vite | Snel, modern, goede PWA-plugin |
| PWA | `vite-plugin-pwa` + Workbox | Service worker, installeerbaar, offline |
| Styling | Tailwind CSS | Utility-first, snel te werken mee, geen CSS-bestand chaos |
| Opslag | `localStorage` | Geen backend nodig, persistent per apparaat |
| Notificaties | Web Notifications API + Service Worker | Lokaal gepland, geen server vereist |

### Dataopslag (`localStorage`)

Elke dag slaat per lezing op of die is afgevinkt én wanneer — zodat de streak correct berekend kan worden:

```
progress: {
  "2026": {
    "3": {             // maand (1-12)
      "21": [
        "2026-03-21T09:14:00",  // lezing1: ISO timestamp van afvinken, of null
        null                     // lezing2: nog niet afgevinkt
      ]
    }
  }
}

settings: {
  notificationsEnabled: true,
  notificationTime: "08:00"   // "HH:MM" formaat
}
```

**localStorage sleutelnames**: `schuilplaats_progress` en `schuilplaats_settings` (prefix voorkomt conflicten).

Een lezing is **afgevinkt** als de waarde een timestamp is (niet null). Een lezing is **op tijd** als de datum in de timestamp overeenkomt met de geplande dag.

De teller "Te lezen (N)" telt alle `null`-waarden op over alle openstaande dagen (vandaag + gemiste dagen). Voorbeeld: gisteren 2 gemist + vandaag 2 nog open = teller toont 4.

### Leesrooster data (hardcoded JSON)

```
readingPlan: {
  "1": {   // maand (1-12)
    "1": { // dag (1-31)
      family: ["Genesis 1", "Matthew 1"],
      secret: ["Ezra 1", "Acts 1"]
    }
  }
}
```

Op runtime bepaalt de app op basis van `REFERENCE_YEAR` welk spoor actief is en toont alleen de relevante 2 lezingen per dag.

---

## Schermen

### 1. Vandaag (hoofdscherm)

**Doel**: Overzicht van alles wat nog gelezen moet worden.

**Inhoud**:
- Header met datum en actief jaar (bijv. "Zaterdag 21 maart · Jaar 1 · Familie")
- Teller: "Te lezen (N)" — badge met totaal aantal nog niet afgevinkte lezingen (vandaag + gemiste dagen gecombineerd)
- **Ophaallijst** (rood): gemiste lezingen van vorige dagen, gegroepeerd per dag met datum-label, bovenaan
- **Vandaag** (normaal): lezingen van de huidige dag
- Elke lezing: afvinkvakje + Bijbelboek + hoofdstuk
- Streak-banner onderaan: "🔥 12 dagen op rij gelezen"
- **Eerste gebruik** (lege staat): teller toont 0, geen ophaallijst, alleen de lezingen van vandaag

**Logica**:
- Scant alle dagen van 1 januari van het huidige jaar t/m gisteren op `false`-waarden in `progress`
- Dagen vóór de app-installatie (geen entry in `progress`) worden **niet** als gemist beschouwd — alleen dagen met een gedeeltelijke entry (`[true, false]` of `[false, false]`) tellen als gemist
- Afvinken werkt voor zowel ophaaltaken als de dag zelf; wijzigt direct de `progress` store

### 2. Kalender

**Doel**: Voortgang in één oogopslag per maand.

**Inhoud**:
- Maandkalender-grid
- Kleurcodering per dag (verleden én vandaag):
  - **Donkerbruin** = beide lezingen afgevinkt (`[true, true]`)
  - **Lichtbruin** = één lezing afgevinkt (`[true, false]` of `[false, true]`), geldt voor zowel verleden als vandaag
  - **Rood** = dag verstreken (voor vandaag), entry bestaat met `[false, false]` of geen entry (maar app was al geïnstalleerd op die dag — zie logica hieronder)
  - **Omlijnd** = vandaag (kleur combineert met bovenstaande staat)
  - **Grijs/leeg** = toekomstige dag
- Een dag in het verleden is **rood** als er een `progress`-entry bestaat voor die specifieke dag (`progress[jaar][maand][dag]` aanwezig) maar niet volledig afgevinkt. Dezelfde logica als de Vandaag-ophaallijst: alleen dagen met een bestaande entry tellen als gemist. Dagen zonder entry (vóór installatie) zijn grijs/leeg.
- Navigatie: vorige/volgende maand

### 3. Instellingen

**Doel**: Notificaties configureren.

**Inhoud**:
- Info-blok: huidig leesrooster (bijv. "Jaar 1 · Familie lezingen · Gestart 1 jan 2026")
- Toggle: dagelijkse melding aan/uit
- Tijdkiezer: notificatietijd (standaard 08:00)
- Versienummer

---

## Notificaties

- **Type**: lokale Web Push Notification via Service Worker — geen backend server vereist
- **Inhoud**: bijv. "📖 Vandaag: Lukas 23 & Johannes 3 — open de app om af te vinken"
- **Planning**: de service worker plant altijd één notificatie: de eerstvolgende dag waarop het ingestelde tijdstip nog niet verstreken is
  - Voorbeeld: gebruiker opent app om 09:00, notificatietijd is 08:00 → volgende notificatie is morgen 08:00
  - Voorbeeld: gebruiker opent app om 07:00, notificatietijd is 08:00 → notificatie staat vandaag nog gepland (tenzij al gepland), anders morgen
- **Herplanning**: elke keer dat de app wordt geopend, of de notificatietijd wordt gewijzigd, wordt de planning opnieuw berekend en overschreven. Er is altijd maximaal één openstaande notificatie.
- **Permissie**: bij eerste gebruik vraagt de app notificatie-toestemming (alleen wanneer de gebruiker de toggle aanzet)

**Beperking**: lokale notificaties werken het betrouwbaarst op Android. Op iOS (Safari PWA) is de Web Push API beschikbaar vanaf iOS 16.4, maar vereist dat de app als PWA geïnstalleerd is op het homescreen.

---

## Streak-berekening

De streak telt het aantal aaneengesloten dagen waarop beide lezingen **op diezelfde kalenderdag** zijn afgevinkt. Ophalen via een latere dag telt nooit mee.

**Definitie**: een dag telt voor de streak als beide timestamps in `progress` bestaan én de datum in die timestamps overeenkomt met de geplande dag (bijv. timestamp `2026-03-21T...` voor dag 21 maart).

**Berekening**:
1. Begin bij vandaag en tel terug
2. Als vandaag beide lezingen op tijd zijn afgevinkt → telt mee, ga naar gisteren
3. Zodra een dag niet aan de voorwaarde voldoet (gemist, te laat afgevinkt, of niet ingevuld) → stop, dat is de streak

**Voorbeelden**:
- Dag 1 t/m 10 (vandaag) allemaal op tijd voltooid → streak = 10
- Dag 1 t/m 9 op tijd, vandaag nog niet gedaan → streak = 0 (vandaag is de keten gebroken)
- Dag 1 t/m 4 gemist, dag 5 t/m 10 op tijd voltooid → streak = 5 (telt terug t/m dag 5)

**1 januari**: geen vorige dag, streak begint op 0 en groeit zodra dag 1 januari volledig op tijd is afgevinkt.

**Reset**: de streak wordt herberekend op basis van `progress`-data elke keer dat de app wordt geopend — geen aparte reset-logica nodig.

---

## Installatie & distributie

- QR-code in de kerk → opent de URL in de browser
- Instructievideo (30 sec): "Open Safari → tik op deelknop → 'Zet op beginscherm'"
- App werkt offline na eerste bezoek (service worker cached alles)
- Hosting: statische hosting via Netlify of Vercel — gratis tier, custom domein mogelijk

---

## Voortgang & opslag

- Alle voortgang opgeslagen in `localStorage` — per apparaat, niet gesynchroniseerd
- Geen account = geen sync tussen apparaten (bewust gekozen voor MVP)
- Voortgang gaat verloren bij het wissen van browserdata (acceptabel voor MVP)
- Geen migratielogica voor MVP; bij toekomstige schema-wijzigingen wordt een versieveld toegevoegd aan `schuilplaats_settings`

---

## Fase 2 (buiten scope, voor referentie)

- Gebruikersaccounts + backend (bijv. Supabase)
- Buddy-groepen van 3 personen
- Voortgang delen / bemoedigingen sturen
- Reflecties schrijven en delen binnen buddy-groep
- App Store / Play Store publicatie (via Capacitor of Expo)
