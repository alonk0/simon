# תוכנית – Milestone 1: בסיס אפליקציה וממשק הבית

**מקורות:** `MILESTONES.md` (Milestone 1), `PRD.md`, `ARCHITECTURE.md`, `DESIGN.md`, `wireframes.png`, `mockups.png`, `style-guide.png`.

**מטרה:** פרויקט Vite + Vanilla TypeScript שרץ מקומית ומציג את שני המסכים (״בית״ במצב התחלתי ו״אודות״ במצב ריק), עם ניווט ביניהם, בעיצוב לפי ה־Style Guide. המשחק עצמו עדיין לא פועל.

---

## 0. דרישות מקדימות

- **Node.js אינו מותקן במחשב** (`node`/`npm` לא נמצאו). לפני הבנייה צריך להתקין Node.js LTS. ההצעה: `brew install node` (Homebrew כבר מותקן). ההתקנה תיעשה רק באישור המשתמש בתחילת שלב הבנייה.
- ה־repo המקומי כבר מחובר ל־`https://github.com/alonk0/simon.git`. הדחיפה ל־GitHub (סעיף אחרון ב־DoD) תתבצע רק בשלב ״דחיפה״, לפי בקשת המשתמש.
- אין צורך ב־`.env` במילסטון זה (אין מפתחות או שירותים חיצוניים).

## 1. הקמת הפרויקט

קבצים בשורש הפרויקט:

| קובץ | תוכן |
|---|---|
| `package.json` | `name: "simon"`, `type: "module"`, סקריפטים: `dev` (vite), `build` (`tsc --noEmit && vite build`), `preview` (vite preview), `test` (`vitest run`) |
| `package-lock.json` | נוצר אוטומטית ע״י npm |
| `tsconfig.json` | `strict: true`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `lib: [ES2022, DOM, DOM.Iterable]`, `noEmit: true` |
| `vite.config.ts` | תצורה מינימלית. **`base` לא מוגדר עכשיו** (נקבע ל־`'/simon/'` ב־Milestone 5 יחד עם ה־PWA והפריסה) |
| `index.html` | `<html lang="he" dir="rtl">`, `meta viewport` (`width=device-width, initial-scale=1, viewport-fit=cover`), `meta theme-color`, `<title>משחק סיימון</title>`, `<div id="app">` ו־`<script type="module" src="/src/main.ts">` |

תלויות:
- `dependencies`: `@fontsource/rubik`
- `devDependencies`: `vite`, `typescript`, `vitest`

לא מתקינים עכשיו `vite-plugin-pwa` (Milestone 5) ו־Playwright (Milestone 2). `.gitignore` הקיים כבר מכסה `node_modules/` ו־`dist/` — אין צורך לשנות אותו.

## 2. מבנה הקוד

```text
src/
  main.ts                 // entry: imports fonts + CSS, creates the app, renders the home screen
  styles/
    tokens.css            // CSS variables: colors, spacing, radii, shadows, typography
    base.css              // reset, body, font-family, RTL, layout shell
    components.css        // top bar, buttons, status box, board/tiles, cards
  ui/
    homeScreen.ts         // builds the home screen DOM (idle state only)
    aboutScreen.ts        // builds the About screen DOM (empty-data state)
    dom.ts                // small helper: el(tag, attrs, children) using textContent only
    icons.ts              // inline SVG for the speaker / muted icon
  navigation.ts           // Screen = 'home' | 'about'; navigate(screen) swaps the visible screen
  game/
    colors.ts             // Color union ('blue'|'red'|'yellow'|'green'), BOARD_LAYOUT, Hebrew labels
tests/
  navigation.test.ts
  colors.test.ts
```

**הפרדת שכבות (בסיס להמשך):**
- `game/` — לוגיקה טהורה בלבד, בלי DOM. במילסטון זה רק הגדרת הצבעים והסדר שלהם בלוח. ה־Sequence Engine וה־Game Controller יתווספו ב־Milestone 2.
- `navigation.ts` — מחזיק את המסך הפעיל ומאפשר להירשם לשינוי (`onNavigate`). כך ב־Milestone 2 ה־Controller יוכל לבטל משחק פעיל ביציאה ל״אודות״.
- `ui/` — יוצר DOM ומחבר אירועים; לא מכיל לוגיקה עסקית.
- מצב השתקה (`muted`) נשמר כמשתנה בזיכרון. במילסטון זה הכפתור רק מחליף את האייקון ואת ה־`aria-label`/`aria-pressed` (אין עדיין צלילים).

**ניווט:** שני ה־`<section>` של המסכים נוצרים פעם אחת; המעבר מסתיר אחד ומציג את השני (מאפיין `hidden`), גולל לראש העמוד ומעביר focus לכותרת המסך. אין Router, אין שינוי URL ואין מסך שלישי. כפתור ״אודות״ ← מסך אודות; כפתור ״בית״ ← מסך הבית במצב התחלתי.

**אבטחה:** כל הטקסטים נכתבים עם `textContent`; אין `innerHTML` עם תוכן דינמי (האייקונים הם SVG קבוע בקוד).

## 3. עיצוב (לפי DESIGN.md וה־Style Guide)

**Tokens (`tokens.css`):**
- צבעים: `--blue #2EA8FF`, `--action-blue #0A6FC2`, `--red #FF3B30`, `--yellow #FFD60A`, `--green #34D058`, `--charcoal #111318`, `--light-gray #F4F5F7`, `--white #FFFFFF`; גוון צהוב עדין לכרטיס השיא (נגזר מ־`--yellow` בשקיפות נמוכה, כמו ב־Mockup).
- מרווחים: `--space-1: 8px`, `--space-2: 16px`, `--space-3: 24px`, `--space-4: 32px`.
- פינות: `--radius-tile: 20px` (בטווח 16–24px), `--radius-card: 16px`, `--radius-button: 12px`.
- טיפוגרפיה: H1 32px/700, H2 24px/700, Body 16px/400, Caption 14px/400, Button 16px/500.
- Font family: `'Rubik', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif`.

**גופן:** ייבוא ב־`main.ts` של `@fontsource/rubik/400.css`, `500.css`, `700.css` בלבד. Vite אורז את קובצי ה־`woff2` מתוך `node_modules` — ללא Google Fonts וללא CDN.

**מסך בית – מצב התחלתי (לפי Wireframe ״בית – התחלה״ ו־Mockup):**
- **סרגל עליון:** `<header>` עם 3 עמודות: כפתור השתקה (אייקון רמקול, Secondary קטן) — כותרת ״משחק סיימון״ (H2, ממורכזת) — כפתור ״אודות״ (Secondary קטן). מיקום לפי ה־Wireframe: ״אודות״ בצד ימין והשמע בצד שמאל (בסדר DOM רגיל ב־RTL: ״אודות״ ראשון, כותרת, ואז השמע). קו הפרדה דק מתחת לסרגל.
- **אזור סטטוס:** קופסה אפורה בהירה ממורכזת עם הטקסט ״לחץ על התחל״ (מבנה שיכיל בהמשך גם ״שלב X מתוך 10״ ו״צפה ברצף״/״תורך!״, עם `aria-live="polite"`).
- **לוח 2×2:** CSS Grid עם 2 עמודות שוות ומרווח 16px. כדי שהסדר יהיה **כחול משמאל ואדום מימין** בלי תלות בכיווניות RTL, ללוח מוגדר `direction: ltr` וסדר ה־DOM הוא: כחול, אדום, צהוב, ירוק (הטקסט בכל אריח נשאר בעברית). כל אריח הוא `<button>` עם תווית הצבע בעברית (״כחול״, ״אדום״, ״צהוב״, ״ירוק״), צבע מלא, מסגרת כהה 2px ב־`--charcoal`, פינות מעוגלות וצל קצר. האריחים ריבועיים (`aspect-ratio: 1`) ומתאימים את גודלם לרוחב המסך. טקסט התווית כהה (charcoal) כמו ב־Mockup.
- **במצב התחלתי האריחים מושבתים** (`disabled`) — אין עדיין רצף, ולחיצה עליהם לא עושה דבר. יוגדר כבר עכשיו class של ״מואר״ (`.tile--lit`: הארה + מסגרת פנימית בהירה, כמו האריח האדום ב־Mockup) לשימוש ב־Milestone 2, אך לא יופעל.
- **כפתור ״התחל״:** Primary Button ברוחב מלא — רקע `--action-blue`, טקסט לבן 16px/500, פינות מעוגלות, צל קל. במילסטון זה הלחיצה עליו לא מפעילה משחק (אין לו התנהגות עדיין).
- מצבי כפתור: Active/Pressed (בהיר יותר), Disabled (אפור), focus נראה לעין (`:focus-visible` עם outline).

**מסך אודות – מצב ריק (לפי Wireframe ״אודות״):**
- **סרגל עליון:** כפתור ״בית״ (Secondary קטן, בצד ימין) וכותרת ״אודות״ ממורכזת.
- **כרטיסים בעמודה אחת, טקסט מיושר לימין:**
  1. **על המשחק** — ״משחק זיכרון קלאסי שבו עליך לחזור על רצף צבעים שהמשחק מציג. כל שלב מוסיף צבע נוסף לרצף.״
  2. **הוראות משחק** — רשימה ממוספרת: ״לחץ על התחל.״, ״צפה ברצף הצבעים.״, ״חזור על הרצף באותו סדר.״, ״התקדם בשלבים ונסה לשבור את השיא.״
  3. **שיא אישי** — כרטיס בגוון צהוב עדין, כותרת ממורכזת וערך בולט. כרגע ״אין נתונים״ (לא מספר מומצא).
  4. **סטטיסטיקות** — שלוש שורות: ״משחקים שהסתיימו״, ״ניצחונות״, ״אחוז הצלחה״. כרגע: ״0״, ״0״, ״אין נתונים״.
  5. **היסטוריית משחקים** — הודעת מצב ריק: ״עדיין אין משחקים שהסתיימו״.
- **כפתור ״איפוס נתונים״** — כפתור כהה (`--charcoal`, טקסט לבן) ברוחב מלא בתחתית. במילסטון זה הוא מוצג אך לא פעיל (`disabled`), כי אין נתונים ואין Dialog עדיין (Dialog האישור ב־Milestone 4).
- **גלילה:** המסך גולל אנכית כשהתוכן ארוך; אין גלילה אופקית (`overflow-x: hidden` על המעטפת, `max-width: 100%` לרכיבים, `min-width: 0` בתאי grid).

**פריסה כללית:** עמודה אחת, `max-width` של כ־480px וממורכזת (כדי שגם בדסקטופ זה ייראה כטלפון), ריפוד צד 16px, רקע `--light-gray`, ושימוש ב־`env(safe-area-inset-*)` לאייפון. שימוש ב־CSS logical properties (`padding-inline`, `margin-block` וכו').

**נגישות:** `aria-label` לכפתור השמע (״השתק צלילים״ / ״הפעל צלילים״) ו־`aria-pressed`; כותרות `h1`/`h2` לפי היררכיה; גודל מינימלי 44×44px לכל כפתור.

## 4. בדיקות

**Vitest (`npm test`) – בדיקות בסיסיות:**
- `colors.test.ts`: יש בדיוק 4 צבעים; סדר הלוח הוא `blue, red, yellow, green`; לכל צבע תווית עברית נכונה.
- `navigation.test.ts`: מצב התחלתי `home`; `navigate('about')` ו־`navigate('home')` מחליפים את המסך ומודיעים למאזינים; אין אפשרות למסך שלישי (בדיקת טיפוס + ריצה).

(בדיקות Playwright יוקמו ב־Milestone 2, כפי שנדרש שם ב־DoD.)

**בדיקה ידנית/אוטומטית שאני מריץ בבנייה (בדפדפן המובנה, בגודל מובייל 375×812):**
1. `npm install`, `npm run dev`, `npm run build` — מסתיימים בלי שגיאות.
2. מסך הבית: כותרת, כפתורי ״אודות״ והשמע, ״לחץ על התחל״, 4 אריחים בסדר הנכון (בדיקת מיקום בפועל של כל אריח מימין/משמאל), כפתור ״התחל״.
3. ניווט בית ← אודות ← בית עובד; אין מסך שלישי.
4. אין גלילה אופקית בשני המסכים (`document.documentElement.scrollWidth <= clientWidth`); מסך אודות נגלל אנכית.
5. הגופן Rubik נטען מהשרת המקומי בלבד: בדיקת בקשות הרשת — אין אף בקשה לדומיין חיצוני, וקובצי ה־`woff2` מגיעים מ־localhost; ו־`document.fonts.check('16px Rubik')` מחזיר true.
6. השוואה חזותית (צילום מסך) מול `wireframes.png`, `mockups.png` ו־`style-guide.png`.
7. `npm test` עובר.

בסיום הבדיקות השרת נסגר.

## 5. עדכוני מסמכים בסיום הבנייה

- `CLAUDE.md` → סעיף ״פקודות הרצה״: הרצה `npm run dev`, בדיקות `npm test`.
- `MILESTONES.md` → סימון 🟡 ליד כותרת Milestone 1.
- אין צורך ב־ADR חדש (כל הבחירות כבר מתועדות ב־ARCHITECTURE.md). אם תתקבל החלטה טכנית משמעותית במהלך הבנייה — תתועד כ־ADR.

## 6. מחוץ להיקף במילסטון זה

לוגיקת משחק, רצף, אורות וצלילים בפועל (M2); חלונית סיום (M2); שמירה ב־localStorage ונתונים אמיתיים באודות (M3–M4); Dialog איפוס (M4); PWA, אייקון אפליקציה, `base: '/simon/'`, GitHub Actions ופריסה (M5).

## 7. מיפוי ל־Definition of Done

| תנאי | איך מתקיים |
|---|---|
| `npm install`, dev ו־build מצליחים | סעיפים 1 ו־4 |
| ניווט בית ↔ אודות, אין מסך שלישי | `navigation.ts` + בדיקות |
| 4 אריחים 2×2 בסדר הנכון | Grid עם `direction: ltr` + בדיקת מיקום |
| עברית, RTL, ללא גלילה אופקית, אודות נגלל | `index.html` + CSS + בדיקה בגודל מובייל |
| Rubik מקומי בלי שרתי גופנים חיצוניים | `@fontsource/rubik` + בדיקת רשת |
| התאמה ל־Wireframes / Style Guide / Mockups | השוואת צילומי מסך |
| קוד ב־GitHub, בלי Backend/שירות חיצוני | ה־repo כבר מחובר; ה־push יבוצע בשלב ״דחיפה״ לאחר אישור המשתמש |
