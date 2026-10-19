# CLAUDE.md – Pasport technologií

Pravidla a kontext projektu pro Claude Code. Platí pro každou práci v tomto repozitáři.

## O projektu

**Pasport** je aplikace pro pasportizaci technologií v budovách (facility management). Technik v terénu na mobilu zakládá místnosti a zařízení, fotí typové štítky a umisťuje zařízení do půdorysu. Na PC se pak spravují výkresy, kategorie a exporty.

- **Autor:** Ing. Michael Sýkora, facility manager. Není profesionální programátor, staví s pomocí Claude.
- **Kapacita:** vedlejší projekt, cca 5–10 h týdně.
- **Cílové objekty:** administrativní a podobné budovy, ne průmyslové provozy.
- **Výhled:** placený produkt pro FM firmy a správce budov, nejdřív v Česku.
- **Testovací objekt:** testovací administrativní budova.

## Jak se mnou pracovat

1. **Komunikuj česky.** Technické pojmy vysvětluj srozumitelně, autor je technik, ne programátor.
2. **Malé kroky.** Jedna ohraničená změna → popis, co se změnilo a proč → jak to otestovat (na mobilu i PC) → commit. Žádné velké přepisy naslepo.
3. **Před větší změnou** (nový modul, změna datového modelu, nová knihovna) nejdřív navrhni postup a počkej na souhlas.
4. **Kód piš čitelně.** Krátké funkce, srozumitelné názvy, komentáře česky u netriviální logiky. Autor musí kódu rozumět aspoň na úrovni čtení.
5. **Commity:** malé, česky psané zprávy („Přidán export zálohy ZIP“). Bez řádku `Co-Authored-By` a bez jakéhokoli podpisu Claude, platí i pro popisy pull requestů.
6. **Data uživatele jsou svatá.** Žádná změna nesmí smazat nebo poškodit uložená data. Změna struktury dat = migrace s verzí schématu + záloha před migrací.
7. **Hlídej rozsah.** Pokud požadavek patří do pozdější fáze (viz níže), upozorni na to.
8. **Vývoj jen na osobním počítači autora**, ne na firemním zařízení. Kód se zálohuje a nasazuje přes GitHub: na začátku každé session nejdřív stáhni poslední verzi (`git pull`), na konci práce vše commitni a pushni a připomeň to autorovi, pokud zůstaly neodeslané změny.
9. **Produktová rozhodnutí** (co aplikace dělá, pro koho, cena, nové velké funkce) se dělají v chatu na claude.ai v projektu „Pasport aplikace“. Když narazíš na takovou otázku, nerozhoduj ji sám: popiš možnosti a doporuč autorovi probrat to tam.
10. **Testování ve třech vrstvách.**
    - **Automatické testy:** ke každé nové funkci napiš automatický test v prohlížeči (Playwright). Testy spusť po každé změně, před commitem musí procházet. GitHub Actions je spustí i před nasazením na GitHub Pages a při selhání nasazení zastaví.
    - **Kontrola v prohlížeči:** po každém nasazení nové verze otevři zveřejněnou aplikaci a projdi testovací scénář (`docs/testovaci-scenar.md`): hlavní cesty + vše, co se ve verzi změnilo. Hodnoť i vzhled, srozumitelnost textů a složitost postupu. Výsledek zapiš do `docs/testovaci-protokol.md` (datum, verze, co prošlo, co ne, nalezené problémy).
    - **Test autora na telefonu:** na konci autorovi vypiš, co má otestovat sám – vše, co v prohlížeči ověřit nejde (kamera a fotky, skenování QR, instalace na plochu, offline, dotykové ovládání, použitelnost v terénu).
    - **Testovací data** jen ukázková (ukázkový objekt, vzorové PDF výkresy, vzorové fotky štítků) ve složce `testdata/`. Nikdy reálná data z budov.
11. **Adresy pro mobil vždy i jako QR kód.** Kdykoli autorovi dáváš adresu k otevření na telefonu (vývojový server, GitHub Pages…), vygeneruj k ní rovnou QR kód jako obrázek. QR vznikne mimo projekt, bez přidání knihovny do repozitáře.

## Prostředí autora

- Windows 11, PowerShell. Spouštění skriptů je v PowerShellu zakázané, proto se v autorově terminálu volá **`npm.cmd`** (a `npx.cmd`) místo `npm`. Nastavení zabezpečení neměnit.
- Test na telefonu: `npm.cmd run dev:mobil` spustí vývojový server viditelný ve Wi-Fi síti; adresa je na řádku `Network:` (IP počítače se může změnit).
- `dev:mobil` běží záměrně na **HTTP** (rozhodnuto 19. 10. 2026). Kamera funguje i tak (výběr souboru s `capture`). Co vyžaduje HTTPS (instalace na plochu, offline, service worker), se testuje na **GitHub Pages**, kam se aplikace nasazuje automaticky od kroku 2. Self-signed certifikát ani vlastní certifikační autoritu (mkcert) nepoužívat. Pro rychlý lokální test instalace lze případně použít přesměrování `localhost` přes USB (chrome://inspect).

## Rozhodnutí (stav 19. 10. 2026)

| # | Rozhodnutí |
|---|---|
| 1 | Vývoj v Claude Code, produktová rozhodnutí v chatu na claude.ai. |
| 2 | Aplikace je **PWA** (instalace „Přidat na plochu“), hosting **GitHub Pages**. Bez APK. APK přes Capacitor až ve V3, pokud bude potřeba. |
| 3 | **Local-first:** data se ukládají do zařízení (IndexedDB), aplikace funguje offline. Cloud slouží jako záloha a most mobil ↔ PC. |
| 4 | Cloud: **Supabase** v EU. Tarif Free při vývoji (V1), Pro od ostrého používání (V2). |
| 5 | **AI čtení štítků** a dohledání typu na webu přes server (Supabase Edge Function). Poskytovatel AI **vyměnitelný** (Claude / Gemini). Výchozí se zvolí testem na cca 20 reálných štítcích. API klíč nikdy v kódu aplikace. |
| 6 | **Půdorys je volitelný.** Místnost může být jen název/číslo bez tvaru, technologie může být přímo na patře bez místnosti, pin na půdorysu je nepovinná poloha. Patro bez výkresu se zobrazí jako seznam. Půdorys jde doplnit později a existující data na něj umístit. |
| 7 | Bez vlastního 3D skenování. 2D půdorysy ze skenovacích aplikací (Polycam, magicplan…) se nahrávají jako běžná vrstva. |
| 8 | Podklady: **primárně PDF** (cíl: vektorové čtení PDF pro detekci místností). DXF doplňkově (knihovna dxf-viewer, MPL 2.0). DWG jen přes převod na DXF (ručně v ODA File Converter, později automaticky na serveru). **Nepoužívat LibreDWG** ani nic pod GPL – aplikace bude placená. |
| 9 | **Učení detekce místností** postupně: od V0 se ukládají opravy (co navrhla detekce vs. co uživatel opravil), ve V2 zapamatování nastavení výkresu + AI s příklady, vlastní model nejdřív ve V3+ a jen se souhlasem zákazníků. |
| 10 | **Zpětná vazba v aplikaci** od V0: menu „Něco nefunguje / Podnět“ (typ chyba / podnět / dotaz, popis, volitelně snímek obrazovky) s automaticky přiloženou diagnostikou a kontaktem v sekci „O aplikaci“. Jde o zpětnou vazbu k aplikaci, ne o hlášení závad v budově. |
| 11 | **Testování ve třech vrstvách:** automatické testy (Playwright, GitHub Actions blokuje nasazení při chybě), kontrola Claude v prohlížeči po každé verzi s testovacím protokolem, finální test autora na telefonu. Jen ukázková testovací data. |
| 12 | **Detekce místností z rastru – první úkol V2:** (1) „Klepni na stěnu“: pipeta změří barvu a tloušťku stěny a nastaví detekci sama (posuvníky jen pod „Pokročilé“, odhad šířky dveří z tloušťky stěny); (2) nástroj „Zavřít otvor“: tahem přes dveře nakreslit čáru, kterou detekce bere jako stěnu, uložená k výkresu; (3) při detekci vždy náhled, co aplikace bere jako stěny. Zůstává potřeba i po vektorovém PDF (naskenované výkresy). Nastavení a zavřené otvory se ukládají jako opravy pro učení (rozhodnutí 9). |
| 13 | **Označení technologií – dva identifikátory:** (a) **označení** čitelné pro lidi ve tvaru `KÓD-pořadí` (např. `PHP-012`, `FCU-104`), kde KÓD je krátký kód kategorie (1–4 písmena, nastavitelný u kategorie) a pořadí se číslují v rámci objektu a kategorie; **bez patra**, aby se označení neměnilo při přesunu zařízení nebo přejmenování patra a nemuselo se kvůli jedné změně přetiskovat více štítků; (b) **kód QR štítku** – náhodný, 6 znaků bez zaměnitelných znaků (0/O, 1/I), trvalý a neměnný. Na štítku velké označení + QR + malý kód. Obsah QR (odkaz na vlastní doménu) se rozhodne před prvním ostrým tiskem. Nahrazuje pořadová čísla `T-0001` z prototypu. |
| 14 | **Přílohy (dokumenty):** technický list, manuál, revizní zpráva apod. lze připojit k **typu zařízení** (sdílí všechny kusy stejného modelu) nebo ke **konkrétnímu kusu**. Ve V0 jen v datovém modelu, nahrávání ve V1/V2, čtení údajů z dokumentu přes AI ve V2. |
| 15 | **V0+ – rychlé opravy hned po V0** (před V1), ze zpětné vazby z testu 19. 10. 2026: (1) přejmenování kategorií; (2) ikony místo „x ks“ (ikona místnosti, ikona technologie); (3) menší přiblížení u „Ukázat na půdorysu“ a stejné tlačítko u technologie; (4) „+ Nová místnost“ přímo ve formuláři technologie, bez zavírání formuláře; (5) párování výkresů na mobilu: bod jde po vytvoření chytit a posunout prstem, při tažení se ukáže lupa se zvětšeným okolím, každý bod se potvrdí a teprve pak se výkresy spárují. |

Pozn.: starší podklad projektu uvádí React Native + Expo. To je **nahrazeno** rozhodnutím o PWA (bod 2).

## Fáze vývoje

| Fáze | Obsah | Supabase |
|---|---|---|
| **V0 – Přenos** (aktuální) | viz zadání níže | ne |
| **V0+ – Rychlé opravy** | viz rozhodnutí 15 | ne |
| **V1 – Synchronizace** | přihlášení (jen autor), Supabase EU, sync mobil ↔ PC, fotky a výkresy v cloudu, AI čtení štítků a dohledání na webu přes Edge Function, vlastní katalog typů, hlášení ze „Něco nefunguje“ do Supabase (offline fronta, e-mailové upozornění, záznam pádů) | Free |
| **V2 – Ladění funkcí** | jako první vylepšení detekce místností z rastru (rozhodnutí 12), ostrý provoz v testovací administrativní budově, test AI na reálných štítcích, vektorové čtení PDF, DXF, import půdorysů ze skenovacích aplikací, učení detekce, exporty, rychlost zadávání, přehled hlášení se stavem, „Co je nového“, více vrstev najednou s průhledností + export aktuálního pohledu do PDF, náhled půdorysu ve formuláři technologie, vyhledávání (číslo místnosti, výrobní číslo, označení, název, neodborné výrazy z hlášení závad), import kategorií a místností z Excelu s návodem a vzorovým souborem, seznam technologií podle kategorie přes patra jako podklad pro revizi + hromadný export (kategorie, patra, vrstvy, průhlednosti → PDF a tabulka), čtení názvů místností z výkresu, filtr „Nenakreslené místnosti“; na konci V2 nebo ve V3 rozpoznávání technologií z výkresu (volba v „Najít všechny“: místnosti / technologie / konkrétní typ) | Pro |
| **V3 – Komerční vrstva** | firmy a oddělení dat, role (správce / technik / klient jen čtení), revize a lhůty VTZ, platby, automatický převod DWG → DXF, podpora zákazníků (nápověda, e-mail podpory na vlastní doméně, souhlas s diagnostikou), případně APK a Google Play | Pro |

## Výchozí stav: prototyp

`prototyp/pasport-v7.html` je funkční prototyp (verze 7) postavený jako artifact na claude.ai. Jeden soubor, cca 1 360 řádků, **čistý JavaScript bez frameworku**.

Umí:
- objekt › patro › vrstvy výkresů (stavební + profese), 2bodové zarovnání vrstvy na podklad, přepínání vrstev;
- nahrání PDF (přes pdf.js, rastrování stránek) nebo obrázku jako výkresu;
- místnosti: hromadné vložení, místnosti bez tvaru, detail, export CSV; rozpoznání místností klepnutím i „najít všechny“ (z rastru, s nastavením tloušťky čar, odstínu stěn, mezer);
- technologie: fotky celku a štítku, AI čtení štítku, našeptávání, doplnění podle známého typu, kopírování na další kus, rychlý režim;
- kategorie libovolné hloubky, filtr podle kategorií;
- QR štítky k tisku, skenování QR z fotky, export CSV.

Závislosti na prostředí claude.ai, které je nutné nahradit:

| Volání v prototypu | Účel | Náhrada |
|---|---|---|
| `window.claude.use(...)` | načtení schopností | odstranit |
| `CAP.db.collection(...)` | databáze (kolekce sites, floors, layers, rooms, cats, items, plans) | IndexedDB (V0), sync se Supabase (V1) |
| `CAP.assets.upload / delete` | fotky a výkresy | IndexedDB jako Blob (V0), Supabase Storage (V1) |
| `CAP.sample.json(...)`, `CAP.sample.limits()` | AI čtení štítků (ř. ~945) a názvů místností (ř. ~795–803) | ve V0 vypnout a fotku označit „čeká na rozpoznání“; ve V1 Edge Function |
| `CAP.downloads.save(...)` | stažení exportů | běžné stažení souboru v prohlížeči |

Knihovny z CDN v prototypu: pdf.js 3.11.174, jsQR 1.4.0, qrcode-generator 1.4.4. Ve V0 je nainstalovat přes npm, aby aplikace fungovala offline.

## Aktuální stav kódu (po kroku 1)

- `index.html` – kostra stránky; `src/main.ts` – vstupní bod; `src/styles.css` – vzhled.
- `src/app.js` – kód prototypu (čistý JavaScript) téměř beze změny. Místo `window.claude.use` volá `createCap()` ze `src/cap/`.
- `src/cap/` (TypeScript) – náhrada schopností claude.ai se **stejným rozhraním jako `CAP`**: `memory-db.ts` (databáze v paměti, `collection/doc/set/update/delete/onSnapshot`), `assets.ts` (obrázky jako blob: URL), `downloads.ts` (stažení souboru). `sample` je `null`, takže AI tlačítka jsou skrytá. Výměnou těchto modulů (IndexedDB v kroku 3) se zbytek aplikace nemění.
- Data se zatím ztratí po zavření stránky; aplikace to ukazuje proužkem „Vývojová verze“.
- pdf.js, jsQR, qrcode-generator a písma se zatím načítají z internetu (offline až s PWA).
- ID nových záznamů přes `newId()` ze `src/cap/uuid.ts`, ne přímo `crypto.randomUUID()` – to na telefonu přes HTTP (dev:mobil) chybí.
- Automatické testy: Playwright, `tests/`, `npm run test` (projekty „pc“ a „mobil“). Zbytek kroku 2 (testdata, GitHub Actions, scénář a protokol) zatím chybí.
- `prototyp/pasport-v7.html` zůstává beze změny jako reference.

## Data z prototypu

`data/` obsahuje export dat z prototypu: `data/db/<kolekce>/<id>.json` a `data/assets/<id>.png` (výkresy vrstev; pole `img.a` ve vrstvě odkazuje na id souboru). Jsou to jen testovací data (1 objekt, 2 patra, 1 místnost, výchozí kategorie, žádné technologie). Import stačí jako ověření, že přenos funguje.

**Složka `data/` se necommituje** (patří do `.gitignore`): výkresy jsou reálné podklady budovy a repozitář může být veřejný. Import proběhne lokálně, nahráním souborů v běžící aplikaci.

## Zadání fáze V0 – Přenos

Cíl: aplikace běží samostatně mimo claude.ai, offline, s daty uloženými v zařízení a se zálohou.

**Technika (výchozí volba, lze navrhnout jinou s odůvodněním):**
- Vite + TypeScript. Prototyp zůstává čistý JavaScript; do TypeScriptu převádět postupně po modulech.
- UI framework zatím ne. Rozhodnutí React ano/ne navrhni autorovi po rozdělení kódu do modulů.
- IndexedDB přes knihovnu Dexie.
- PWA přes vite-plugin-pwa (offline cache, manifest, ikona).
- Nasazení na GitHub Pages přes GitHub Actions.

**Kroky (každý zvlášť, s testem a commitem):**
1. ✅ Kostra projektu (Vite, TypeScript, Git, README) a prototyp spuštěný beze změn funkcí, jen s datovou vrstvou v paměti. *Hotovo 19. 10. 2026, otestováno autorem na mobilu a PC; zpětná vazba z testu zpracována v rozhodnutích 12–15.*
2. Testovací základ: ukázková data v `testdata/` (ukázkový objekt, vzorové PDF, vzorové fotky štítků), Playwright s prvním testem kostry, GitHub Actions (testy → nasazení jen při úspěchu), šablony `docs/testovaci-scenar.md` a `docs/testovaci-protokol.md`.
3. Datová vrstva nad IndexedDB místo `CAP.db`; obrázky jako Blob místo `CAP.assets`.
4. Datový model připravený na synchronizaci:
   - jednoznačná ID (UUID),
   - `createdAt`, `updatedAt` u každého záznamu,
   - mazání označením (`deletedAt`), ne fyzicky,
   - verze schématu a migrace,
   - fotky a výkresy jako samostatné záznamy odkazované z dat,
   - kód kategorie (1–4 písmena) a označení technologie `KÓD-pořadí` podle rozhodnutí 13,
   - evidence štítků: kód štítku, stav (nepřiřazený / přiřazený / vyřazený), vazba na technologii nebo místnost,
   - typ zařízení (výrobce + model) jako samostatný záznam, na který odkazují kusy,
   - přílohy podle rozhodnutí 14 (soubor, druh dokumentu, vazba na typ nebo kus).
5. Volitelný půdorys podle rozhodnutí 6: technologie může mít `roomId` prázdné (patří přímo patru), `x/y` nepovinné; seznamový režim pro patro bez výkresu.
6. Záznam oprav detekce místností: u místnosti uložit původní návrh detekce (tvar, parametry detekce) a konečnou podobu po úpravě uživatelem.
7. Zmenšování fotek před uložením (cca 1600 px, JPEG ~0,8; štítek musí zůstat čitelný).
8. Fotky štítků se stavem „čeká na rozpoznání“ (AI se doplní ve V1).
9. Export a import zálohy jako ZIP (JSON + fotky + výkresy).
10. Import dat z `data/` (jednorázově).
11. PWA: manifest, ikona, offline režim, instalace na plochu. Nasazení na GitHub Pages.
12. Zpětná vazba „Něco nefunguje / Podnět“:
    - lokální záznam chyb aplikace (posledních cca 50, bez osobních dat),
    - formulář: typ (chyba / podnět / dotaz), popis, volitelně snímek obrazovky,
    - k hlášení se automaticky přiloží diagnostika (verze aplikace, zařízení, prohlížeč, poslední chyby),
    - odeslání předvyplněným e-mailem (adresu doplní autor), případně uložení hlášení do souboru,
    - sekce „O aplikaci“ s verzí a kontaktem.
13. Test na reálném Android telefonu (Chrome) a na PC.

**Hotovo, když:** automatické testy procházejí, aplikace jde nainstalovat na mobil i PC z GitHub Pages, funguje bez internetu, data přežijí zavření prohlížeče a záloha ZIP jde vyexportovat a znovu naimportovat beze ztráty.

## Bezpečnost a soukromí

- Žádné API klíče, hesla ani tokeny v repozitáři. Tajné hodnoty jen v nastavení Supabase / GitHub Secrets.
- Výkresy budov mohou být citlivé. Do repozitáře nikdy nepatří reálné výkresy, fotky ani data z budov; uživatelská data žijí jen v zařízení (a od V1 v Supabase), ne v kódu.
- Fotky a výkresy neposílat třetím stranám mimo rozhodnuté služby (Supabase, AI poskytovatel přes Edge Function).
