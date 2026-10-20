# Milestone 5 – PWA, Offline, בדיקות קבלה ו־Deployment

**מקורות:** `MILESTONES.md` (Milestone 5), `ARCHITECTURE.md` §1, §1.2, §2.7–2.10, `DESIGN.md` §2.3 (App Icon), `PRD.md` FR-08 ומגבלת אייפון במצב שקט.
**מצב נוכחי:** Milestones 1–4 ✅. ה־Repository `alonk0/simon` ציבורי ומחובר כ־`origin`; GitHub Pages עדיין לא מופעל. `vite.config.ts` עדיין ללא `base` ו־PWA (הערה שם מפנה ל־Milestone הזה).

## 1. עקרונות

- אין שינוי בהתנהגות המשחק, במסכים או בנתונים — רק אייקון, Manifest, Service Worker, נתיב פריסה, CI ובדיקות.
- אין Backend, סודות או שירות ענן נוסף מעבר ל־GitHub Pages / Actions.
- הפריסה דורשת Push: בסיום הבנייה המקומית יש לעצור ולבקש את אישור המשתמש ל־Push (ראה §8).

## 2. אייקון האפליקציה

**קבצים חדשים:**
- `public/icon.svg` — מקור וקטורי: רקע `charcoal` `#111318` מלא (ריבוע, ללא פינות שקופות), ובתוכו 2×2 ריבועים מעוגלים: למעלה־שמאל כחול `#2EA8FF`, למעלה־ימין אדום `#FF3B30`, למטה־שמאל צהוב `#FFD60A`, למטה־ימין ירוק `#34D058`. מרווחים כהים אחידים ביניהם. ללא טקסט.
- `public/icon-maskable.svg` (מקור עזר) — אותו ציור עם הריבועים מוקטנים לתוך ״אזור בטוח״ (כ־80% המרכזיים), כדי שחיתוך עגול/מעוגל במערכת לא יחתוך צבע.
- PNG מופקים (נשמרים ב־Repository, לא נוצרים ב־CI):
  - `public/pwa-192x192.png`, `public/pwa-512x512.png` (`purpose: any`)
  - `public/maskable-512x512.png` (`purpose: maskable`)
  - `public/apple-touch-icon.png` (180×180) — נדרש כדי שהאייקון יוצג במסך הבית באייפון (iOS אינו משתמש באייקוני ה־Manifest). זהו פרט מימוש של תנאי ה־DoD ״האייקון מוצג על מסך הבית״, לא פיצ'ר חדש.
  - `public/favicon.svg` = עותק/קישור ל־`icon.svg` לשונית הדפדפן.
- `scripts/generate-icons.mjs` — סקריפט חד־פעמי שמרנדר את ה־SVG ל־PNG בגדלים הנ״ל באמצעות Chromium של Playwright (כבר מותקן — **ללא תלות חדשה**). פקודה: `npm run icons`.

## 3. PWA (`vite-plugin-pwa`)

**תלות חדשה (devDependency):** `vite-plugin-pwa@^2` (תומך ב־Vite 8). ה־`workbox-*` נמשכים כתלויות שלו.

**`vite.config.ts`:**
- `base: '/simon/'` (לפי ARCHITECTURE §2.9).
- `VitePWA({...})`:
  - `strategies: 'generateSW'`, `injectRegister: 'auto'`, `registerType: 'prompt'` (ללא תיבת עדכון — ראה ADR-5 למטה).
  - `includeAssets: ['favicon.svg', 'apple-touch-icon.png']`.
  - `workbox.globPatterns: ['**/*.{js,css,html,svg,png,woff2}']` — כולל קובצי Rubik. `cleanupOutdatedCaches: true`, `navigateFallback: 'index.html'`.
  - `manifest`:
    - `name: 'משחק סיימון'`, `short_name: 'סיימון'`, `description` קצר בעברית, `lang: 'he'`, `dir: 'rtl'`
    - `display: 'standalone'`, `orientation: 'portrait'`
    - `start_url: './'`, `scope: './'` (יחסיים ל־`base` → `/simon/`)
    - `background_color` ו־`theme_color`: `#F4F5F7` (תואם ל־`theme-color` הקיים ב־`index.html`)
    - `icons`: שלושת קובצי ה־PNG מ־§2 עם `purpose` מתאים.
  - `devOptions.enabled: false` — Service Worker רק ב־Build (בדיקת Offline נעשית מול `vite preview`).
- להשאיר את בלוק `test` הקיים (Vitest) כמו שהוא; להסיר את ההערה ״added in Milestone 5״.

**`index.html`:** להוסיף `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` ו־`<link rel="apple-touch-icon" href="/apple-touch-icon.png">` (Vite מתרגם ל־`/simon/...` בזכות `base`), ו־`<meta name="apple-mobile-web-app-title" content="סיימון">`. לא לשנות את השאר.

**`tsconfig.json`:** אם נדרש לטיפוסים — להוסיף `vite-plugin-pwa/client` (רק אם משתמשים במודול וירטואלי; עם `injectRegister: 'auto'` כנראה לא נדרש).

**`.gitignore`:** להוסיף `dev-dist/` (תיקייה ש־vite-plugin-pwa עשוי ליצור).

## 4. Playwright מול Build אמיתי

**`playwright.config.ts`:**
- `webServer.command: 'npm run build && npm run preview -- --port 4173 --strictPort'`, `url: 'http://localhost:4173/simon/'`, `timeout` מוגדל (~120s) בשביל ה־Build.
- `use.baseURL: 'http://localhost:4173/simon/'`.
- כך כל בדיקות הממשק רצות על אותו Build שיפורסם (כולל `base` ו־Service Worker).

**התאמת בדיקות קיימות:** ב־`e2e/*.spec.ts` להחליף `page.goto('/')` ב־`page.goto('./')` כדי לכבד את נתיב `/simon/` (עם `/` Playwright היה פונה לשורש הדומיין). אין שינוי לוגי בבדיקות.

**בדיקה חדשה — `e2e/pwa.spec.ts`:**
1. **Manifest ואייקונים:** `link[rel=manifest]` קיים; ה־Manifest נטען, `start_url`/`scope` מתורגמים ל־`/simon/`, קיימים אייקונים 192 ו־512 ו־maskable, וכל קובץ אייקון מחזיר 200.
2. **נתיבים תחת `/simon/`:** כל בקשות הרשת של הדף (JS, CSS, woff2, אייקונים) הן תחת `/simon/` ומחזירות 200; אין בקשה לשרת חיצוני (fonts.googleapis/gstatic או CDN).
3. **Offline מלא:** טעינה ראשונה ברשת → המתנה ל־`navigator.serviceWorker.ready` ולשליטת ה־SW בדף (טעינה חוזרת אחת) → `context.setOffline(true)` → `page.reload()` → הדף נטען, Rubik מוצג (`document.fonts.check`), משחק קצר עם `Math.random` נשלט עד הפסד (כמו בבדיקות הקיימות), חלונית הסיום מופיעה, מעבר ל״אודות״ מציג את התוצאה בהיסטוריה.
   - השמע עצמו לא נבדק אוטומטית (מגבלת Playwright); המשוב החזותי כן.

## 5. GitHub Actions — `.github/workflows/deploy.yml`

- `on: push` ל־`main` + `workflow_dispatch` (הפעלה ידנית לפי צורך).
- `permissions: contents: read, pages: write, id-token: write` (מינימליות, לפי ARCHITECTURE §2.9).
- `concurrency: group: pages, cancel-in-progress: false`.
- **Job `build`:** `actions/checkout` → `actions/setup-node` (`node-version: lts/*`, `cache: npm`) → `npm ci` → `npm test` (Vitest) → `npx playwright install --with-deps chromium` → `npm run test:e2e` (בונה ובודק את ה־Build) → `actions/configure-pages` → `actions/upload-pages-artifact` עם `path: dist`.
- **Job `deploy`:** `needs: build`, `environment: github-pages` עם `url` מה־output → `actions/deploy-pages`.
- כל כישלון בבדיקות או ב־Build עוצר לפני `upload` → גרסה פגומה לא מתפרסמת.
- להשתמש בגרסאות הראשיות העדכניות של ה־Actions הרשמיים (לבדוק בזמן הבנייה).

## 6. תיעוד

- **`README.md`** (חדש, קצר, בעברית): מה המשחק, כתובת האתר `https://alonk0.github.io/simon/`, פקודות הרצה ובדיקה, ואיך מתקינים:
  - **Android / Chrome:** תפריט ⋮ ← ״התקנת אפליקציה״/״הוספה למסך הבית״ (ייתכן גם באנר התקנה אוטומטי).
  - **iPhone / Safari:** כפתור שיתוף ← ״הוספה למסך הבית״; אין כפתור התקנה אוטומטי.
  - מגבלות ידועות: באייפון במצב שקט (מתג צד) ייתכן שלא יישמעו צלילים — המשחק ממשיך עם משוב חזותי; Offline עובד רק אחרי טעינה מלאה אחת עם אינטרנט; ניקוי נתוני אתר מוחק היסטוריה; עדכון גרסה נכנס לתוקף בפתיחה הבאה.
  - טבלת תוצאות בדיקת המכשיר (תמולא אחרי בדיקת המשתמש בטלפון).
- **ADR חדש ב־`ARCHITECTURE.md`:**
  - **ADR-5: עדכון Service Worker ו־Playwright מול Build** — `registerType: 'prompt'` ללא UI: גרסה חדשה ממתינה ונכנסת לתוקף בפתיחה הבאה, כך שקבצים לא מתחלפים באמצע משחק (ARCHITECTURE §2.7), ואין צורך בהודעת עדכון. בדיקות Playwright רצות על `vite preview` של ה־Build כדי לבדוק `base`, Manifest ו־Offline כפי שיפורסמו. האייקונים מופקים מקומית ונשמרים ב־Repository; `apple-touch-icon` נוסף לתמיכה ב־iOS.
- **`CLAUDE.md` → פקודות הרצה:** ה־dev נפתח מעכשיו ב־`http://localhost:5173/simon/`; להוסיף `npm run test:e2e` ובדיקת Build מקומית `npm run build && npm run preview` (`http://localhost:4173/simon/`).

## 7. בדיקה עצמית בזמן הבנייה (מקומית)

1. `npm install`, `npm test`, `npm run build` — עוברים; ב־`dist/` יש `manifest.webmanifest`, `sw.js`, אייקונים, ו־woff2 בתוך רשימת ה־precache.
2. `npm run test:e2e` — כל הבדיקות הקיימות + `pwa.spec.ts` עוברות.
3. בדיקה ידנית בדפדפן המובנה מול `vite preview`: הדף נטען תחת `/simon/`, Manifest/SW תקינים, מצב Offline עובד, תצוגת מובייל (375px) — לוח, ניווט, Modal ו־Dialog קריאים.
4. סגירת השרתים בסיום.

## 8. פריסה (דורשת את המשתמש)

1. **המשתמש** מגדיר ב־GitHub: Repository `alonk0/simon` ← Settings ← Pages ← Source: **GitHub Actions** (אדריך צעד־אחר־צעד).
2. **עצירה לאישור Push** — עם אישור: commit + push ל־`main` (ה־Milestone נשאר 🟡 עד אישור סופי).
3. מעקב אחרי ה־Workflow ב־GitHub (`gh run watch`): בדיקות → Build → Deploy עוברים.
4. אימות `https://alonk0.github.io/simon/` בדפדפן המובנה: HTTPS, נכסים מ־`/simon/`, Manifest ו־SW פעילים, Offline אחרי טעינה.
5. **בדיקת מכשיר אמיתי (המשתמש):** התקנה למסך הבית ב־Android ו/או iPhone, האייקון מוצג, פתיחה עצמאית, משחק עם צליל, מצב טיסה ← פתיחה ומשחק ← תוצאה ב״אודות״, ובאייפון גם מצב שקט. את הממצאים מתעדים ב־README.

## 9. מיפוי ל־Definition of Done

| תנאי | איפה מטופל |
|---|---|
| Push ל־`main` מפעיל בדיקה, Build ופרסום; כישלון חוסם | §5 |
| זמין ב־HTTPS, נכסים מנתיבים נכונים תחת `/simon/` | §3 (`base`), §4 בדיקה 2, §8.4 |
| Manifest ו־SW תקינים; Offline: פתיחה, משחק, שמירה, ״אודות״ | §3, §4 בדיקה 3, §8.4 |
| התקנה בטלפון, אייקון במסך הבית, תיעוד iOS/Android ומצב שקט | §2, §6 README, §8.5 |
| כל בדיקות Vitest ו־Playwright עוברות; בדיקת מובייל ידנית | §4, §7, §8.5 |
| אין Backend/DB/Auth/AI/סודות/ענן נוסף | §1, §5 (ללא Secrets) |

## 10. קבצים — סיכום

**חדשים:** `public/icon.svg`, `public/icon-maskable.svg`, `public/favicon.svg`, `public/pwa-192x192.png`, `public/pwa-512x512.png`, `public/maskable-512x512.png`, `public/apple-touch-icon.png`, `scripts/generate-icons.mjs`, `e2e/pwa.spec.ts`, `.github/workflows/deploy.yml`, `README.md`.
**משתנים:** `package.json` (+`vite-plugin-pwa`, סקריפט `icons`), `package-lock.json`, `vite.config.ts`, `index.html`, `playwright.config.ts`, `e2e/about.spec.ts`, `e2e/game.spec.ts`, `e2e/results.spec.ts` (נתיב `goto` בלבד), `.gitignore` (+`dev-dist/`), `spec/ARCHITECTURE.md` (ADR-5), `CLAUDE.md` (פקודות הרצה), `spec/MILESTONES.md` (🟡 בסיום).
