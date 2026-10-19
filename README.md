# Pasport technologií

Aplikace pro pasportizaci technologií v budovách (facility management).
Technik v terénu na mobilu zakládá místnosti a zařízení, fotí typové štítky
a umisťuje zařízení do půdorysu. Na PC se spravují výkresy, kategorie a exporty.

Aplikace je PWA (instaluje se z prohlížeče přes „Přidat na plochu“)
a data ukládá přímo v zařízení.

> **Stav:** fáze V0 – přenos prototypu mimo claude.ai.
> Data se zatím drží jen v paměti a po zavření stránky se ztratí.

## Spuštění pro vývoj

Potřeba: [Node.js](https://nodejs.org/) 20 nebo novější.

```bash
npm install
npm run dev
```

Aplikace poběží na adrese, kterou příkaz vypíše (obvykle http://localhost:5173).

**Test na mobilu ve stejné Wi-Fi síti:** spusťte `npm run dev:mobil`
a v telefonu otevřete adresu z řádku `Network:`. Windows se může zeptat
na povolení ve firewallu – povolte pro soukromé sítě.

## Další příkazy

| Příkaz | Co dělá |
|---|---|
| `npm run build` | zkontroluje kód a sestaví hotovou aplikaci do složky `dist/` |
| `npm run preview` | spustí sestavenou aplikaci z `dist/` pro kontrolu |
| `npm run test` | spustí automatické testy v prohlížeči (Playwright, jako PC i jako telefon) |

Před prvním spuštěním testů je potřeba jednou stáhnout testovací prohlížeč: `npx playwright install chromium`.

V PowerShellu se zakázanými skripty místo `npm` / `npx` použijte `npm.cmd` / `npx.cmd`.

## Struktura

| Cesta | Obsah |
|---|---|
| `index.html` | kostra stránky |
| `src/main.ts` | vstupní bod |
| `src/app.js` | kód aplikace převzatý z prototypu (čistý JavaScript) |
| `src/styles.css` | vzhled |
| `src/cap/` | úložiště dat, obrázků a stahování (náhrada prostředí claude.ai) |
| `tests/` | automatické testy (Playwright) |
| `prototyp/pasport-v7.html` | původní prototyp z claude.ai, jen pro srovnání |

Pravidla a plán vývoje jsou v [CLAUDE.md](CLAUDE.md).
