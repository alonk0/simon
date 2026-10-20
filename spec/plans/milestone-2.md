# תוכנית – Milestone 2: משחק Simon מלא עם אור וצליל

**מקורות:** `MILESTONES.md` (Milestone 2), `PRD.md` (FR-01–FR-04, FR-07, Edge Cases), `ARCHITECTURE.md` (§2.2, §2.3, §2.5, §2.6, §2.10), `DESIGN.md` (§1.2, §1.3, §2.3), `wireframes.png`, `mockups.png`.

**מטרה:** מסך הבית הופך למשחק עובד: ״התחל״ → הצגת רצף באור וצליל → תור השחקן → מעבר שלב אוטומטי → ניצחון/הפסד בחלונית סיום → ״שחק שוב״. ללא שמירת נתונים (Milestone 3).

---

## 0. דרישות מקדימות

- תלות חדשה ב־`devDependencies`: `@playwright/test`. בנוסף צריך להוריד את דפדפן הבדיקה של Playwright (`npx playwright install chromium`) — הורדה חד־פעמית למחשב, תתבצע בתחילת הבנייה.
- אין צורך ב־`.env`, חשבונות או שירותים חיצוניים.
- `.gitignore` כבר מכיל `playwright-report/` ו־`test-results/` — אין צורך לשנות.

## 1. מבנה הקוד (קבצים חדשים ומשתנים)

```text
src/
  game/
    colors.ts             // (exists) + COLOR_TONES: frequency per color
    sequence.ts           // NEW – pure Sequence Engine
    gameController.ts     // NEW – state machine, timers, gameToken
    timing.ts             // NEW – fixed timing constants
  audio/
    sound.ts              // NEW – Web Audio tones + mute
  ui/
    homeScreen.ts         // CHANGED – renders controller state, tile input, result modal
    aboutScreen.ts        // unchanged
  main.ts                 // CHANGED – wires controller, sound, navigation (cancel on leaving home)
  styles/components.css   // CHANGED – status variants, modal/overlay styles
tests/
  sequence.test.ts        // NEW
  gameController.test.ts  // NEW
e2e/
  game.spec.ts            // NEW – Playwright mobile flow
playwright.config.ts      // NEW
vite.config.ts            // CHANGED – Vitest include only tests/** (so e2e/ is not run by Vitest)
package.json              // CHANGED – @playwright/test, script "test:e2e"
```

הפרדת השכבות לפי ARCHITECTURE §2.2: `sequence.ts` טהור (בלי DOM/שמע/טיימרים); `gameController.ts` בלי DOM (מקבל פונקציית צליל ומקור אקראיות מבחוץ); `homeScreen.ts` רק מצייר מצב ומעביר לחיצות; `sound.ts` רק שמע.

## 2. Sequence Engine – `src/game/sequence.ts`

```ts
export type Random = () => number;           // returns [0, 1), defaults to Math.random
export const MAX_ROUNDS = 10;
export function randomColor(random: Random): Color   // BOARD_LAYOUT[Math.floor(random() * 4)]
export function extendSequence(seq: readonly Color[], random: Random): Color[]  // returns a NEW array: [...seq, randomColor()]
export function isCorrectPress(seq: readonly Color[], index: number, color: Color): boolean
```

- הסתברות שווה לארבעת הצבעים; חזרה על צבע מותרת; הרצף הקודם לא משתנה (מחזירים מערך חדש).
- `Math.random()` במוצר; בבדיקות מזריקים `random` נשלט.

## 3. קבועי זמן – `src/game/timing.ts`

ערכים קבועים לכל 10 השלבים (אין האצה, אין מגבלת זמן לשחקן):

| קבוע | ערך | שימוש |
|---|---|---|
| `LEAD_IN_MS` | 600 | השהיה מתחילת השלב ועד הצבע הראשון |
| `FLASH_MS` | 500 | משך הדלקה + צליל של כל צבע ברצף |
| `GAP_MS` | 250 | הפסקה בין צבעים ברצף |
| `PRESS_FLASH_MS` | 250 | הדלקה + צליל של לחיצת שחקן |
| `BETWEEN_ROUNDS_MS` | 800 | השהיה אחרי הצלחת שלב 1–9 |

(ההחלטה תתועד כ־ADR ב־ARCHITECTURE.md בזמן הבנייה.)

## 4. Game Controller – `src/game/gameController.ts`

```ts
type Phase = 'idle' | 'showing-sequence' | 'awaiting-input' | 'between-rounds' | 'finished';

type GameState = {
  phase: Phase;
  round: number;              // 1–10 (0 in idle)
  completedRounds: number;    // 0–10
  litColor: Color | null;     // tile currently highlighted (playback or player press)
  result: 'win' | 'loss' | null;
};

createGameController({
  random?: Random,                        // default Math.random
  playTone: (color, durationMs) => void,  // sound module; never throws into the game
  onChange: (state: GameState) => void,
}) => { start(), press(color), cancel(), getState() }
```

**כללי מעבר (ARCHITECTURE §2.3):**
1. `start()` (גם ל״שחק שוב״): מנקה טיימרים קודמים, מגדיל `gameToken`, `sequence = [randomColor()]`, `round = 1`, `completedRounds = 0` → `showing-sequence`.
2. **הצגת רצף:** אחרי `LEAD_IN_MS`, לכל צבע: `litColor = color` + `playTone(color, FLASH_MS)` → אחרי `FLASH_MS` כיבוי → אחרי `GAP_MS` הצבע הבא. בסוף → `awaiting-input`, `inputIndex = 0`.
3. `press(color)` מתקבל **רק** ב־`awaiting-input`; בכל מצב אחר מתעלמים. כל לחיצה: הדלקה קצרה + צליל (`PRESS_FLASH_MS`).
   - נכון ולא סוף הרצף → `inputIndex++`.
   - נכון וסוף הרצף, `round < 10` → `completedRounds = round` → **מיד** `between-rounds` (חוסם לחיצות כפולות) → אחרי `BETWEEN_ROUNDS_MS`: `extendSequence`, `round++` → `showing-sequence`.
   - נכון וסוף הרצף בשלב 10 → `completedRounds = 10`, `result = 'win'` → `finished`.
   - שגוי → `result = 'loss'` (הניקוד נשאר `completedRounds`) → `finished` מיד.
4. `cancel()` (יציאה ל״אודות״): מנקה טיימרים, מגדיל `gameToken`, חוזר ל־`idle`. לא נשמר דבר.
5. **ביטול פעולות מושהות:** כל הטיימרים נרשמים ברשימה אחת ומנוקים ב־`start`/`cancel`; בנוסף כל callback בודק שה־`gameToken` שלו עדיין הנוכחי — כך שום הבהוב/צליל/מעבר שלב ממשחק ישן לא קורה.
6. אין טיימר על תשובת השחקן. השתקה לא מגיעה ל־Controller בכלל (היא רק בתוך `sound.ts`), ולכן לא משפיעה על אורות/קלט/ניקוד.
7. אין שום כתיבה ל־`localStorage` במילסטון זה.

## 5. שמע – `src/audio/sound.ts`

- `createSound()` → `{ unlock(), play(color, durationMs), setMuted(b), isMuted() }`.
- `unlock()` נקרא בתוך לחיצת ״התחל״/״שחק שוב״ (מחווה של המשתמש): יוצר `AudioContext` בפעם הראשונה ו־`resume()` (מדיניות Autoplay).
- `play`: `OscillatorNode` (`triangle`) + `GainNode` עם עלייה/דעיכה קצרה (מונע ״קליקים״). תדרים ייחודיים לכל צבע (קלאסי Simon): ירוק 415Hz, אדום 310Hz, צהוב 252Hz, כחול 209Hz — ב־`COLOR_TONES` ב־`colors.ts`.
- כשמושתק — `play` לא עושה דבר. אם אין `AudioContext` או שיש שגיאה — הכל עטוף ב־`try/catch` ונבלע בשקט; המשחק ממשיך עם אור בלבד.
- מצב ההשתקה בזיכרון בלבד (לא נשמר בין הפעלות, לפי PRD).

## 6. ממשק – `src/ui/homeScreen.ts`

`createHomeScreen(nav, controller, sound)` + פונקציית `render(state)` שנקראת מ־`onChange`.

| מצב | אזור הסטטוס | אריחים | ״התחל״ | חלונית |
|---|---|---|---|---|
| `idle` | ״לחץ על התחל״ | חסומים (`disabled`) | מוצג | — |
| `showing-sequence` | ״שלב X מתוך 10״ + ״צפה ברצף״ | חסומים | מוסתר | — |
| `awaiting-input` | ״שלב X מתוך 10״ + ״תורך!״ | פעילים | מוסתר | — |
| `between-rounds` | ״שלב X מתוך 10״ (השלב שהושלם) ללא שורת הוראה | חסומים | מוסתר | — |
| `finished` | ללא שינוי | חסומים | מוסתר | מוצגת |

- **אזור הסטטוס:** שתי שורות (שלב / הודעה), ממורכז. במצב ״צפה ברצף״ רקע תכלת עדין ומסגרת כחולה עם הודעה בכחול, כמו ב־Mockup; ״תורך!״ בולט. `aria-live="polite"` נשאר רק על אזור הסטטוס (ההבהובים לא מוכרזים).
- **הדלקת אריח:** הוספה/הסרה של המחלקה הקיימת `tile--lit` לפי `state.litColor` — בלי להזיז או לשנות גודל.
- **קלט:** אירוע `click` על כל אריח → `controller.press(color)`. ה־`disabled` האמיתי + הבדיקה בתוך ה־Controller חוסמים לחיצות בזמן הצגה.
- **השתקה:** הכפתור הקיים קורא ל־`sound.setMuted()`; עובד בכל מצב.
- **״התחל״:** `sound.unlock()` ואז `controller.start()`.
- **חלונית סיום (Modal):** שכבת Overlay כהה חצי־שקופה מעל מסך הבית ובמרכזה כרטיס לבן עם מסגרת כהה דקה ופינות מעוגלות (DESIGN §1.3, §2.3):
  - כותרת: ״ניצחת! 🎉״ או ״הפסדת״ (H1).
  - ״השלמת X שלבים״ (ובמקרה של 1: ״השלמת שלב אחד״; ב־0: ״השלמת 0 שלבים״).
  - **בלי שורת ״שיא אישי״ ובלי ״שיא חדש!״** — יתווספו ב־Milestone 3 (לא מציגים נתון בדוי).
  - כפתור ראשי ״שחק שוב״ (`action-blue`) → סוגר את החלונית, `sound.unlock()`, `controller.start()`.
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby` לכותרת; פוקוס עובר ל״שחק שוב״ בפתיחה.

## 7. ניווט – `src/main.ts`

- יוצר `sound` ו־`controller` אחד לאפליקציה, ומחבר `onChange` ל־`homeScreen.render`.
- ב־`nav.onNavigate`: ביציאה מ״בית״ → `controller.cancel()` (משחק לא נשמר; חזרה לבית מציגה `idle` עם ״התחל״).
- רענון הדף מתחיל מאפס באופן טבעי (שום מצב משחק לא נשמר).

## 8. בדיקות

**Vitest** (`tests/`, עם `vi.useFakeTimers()` ו־`random` מוזרק):
- `sequence.test.ts`: צבע תמיד אחד מארבעה; `random` נמוך/גבוה ממופה נכון; `extendSequence` מוסיף בדיוק צבע אחד ולא משנה את המקור; חזרה על אותו צבע אפשרית; `isCorrectPress`.
- `gameController.test.ts`:
  - `start` → `showing-sequence`, רצף באורך 1; לחיצה בזמן הצגה מתעלמת.
  - אחרי הזמן המתאים → `awaiting-input`; `playTone` נקרא לכל צבע ברצף.
  - הרצף גדל באחד בכל שלב ושומר את הצבעים הקודמים.
  - טעות בשלב 1 → `loss` עם 0; טעות בשלב 7 → `loss` עם 6; השלמת שלב 10 → `win` עם 10.
  - לחיצה כפולה מהירה אחרי סוף הרצף לא נספרת פעמיים.
  - `cancel` באמצע הצגה → `idle`, ואין יותר `onChange`/`playTone` מהמשחק הישן גם אחרי שהזמן עובר.
  - `start` חוזר (״שחק שוב״) באמצע טיימרים → אין דליפה מהמשחק הקודם.
  - קצב קבוע: משך ההצגה בשלב N = `LEAD_IN + N·FLASH + (N−1)·GAP` בכל השלבים.

**Playwright** (`e2e/game.spec.ts`, מכשיר מדומה `Pixel 7`, `hasTouch`, שרת `npm run dev` דרך `webServer` ב־`playwright.config.ts`):
- דטרמיניזם: `page.addInitScript` שמחליף את `Math.random` בפונקציה צפויה (בלי שינוי בקוד המוצר).
- תרחישים: ״התחל״ מוסתר אחרי הלחיצה ומופיעים ״שלב 1 מתוך 10״ + ״צפה ברצף״; האריחים `disabled` בזמן ההצגה; מופיע ״תורך!״; לחיצה נכונה (tap) → ״שלב 2 מתוך 10״; לחיצה שגויה → חלונית ״הפסדת״ עם ״השלמת 1 שלבים/שלב אחד״; ״שחק שוב״ מתחיל משלב 1; השתקה באמצע משחק לא משנה את ההתקדמות; מעבר ל״אודות״ באמצע משחק וחזרה → ״לחץ על התחל״ + ״התחל״ מוצג; רענון באמצע משחק → מצב התחלתי.
- את מסלול הניצחון המלא (10 שלבים, ~55 שניות) בודקים ב־Vitest עם fake timers ולא ב־Playwright.
- סקריפטים: `npm test` (Vitest, כמו היום) ו־`npm run test:e2e` (Playwright). `vite.config.ts` יגביל את Vitest ל־`tests/**`.

## 9. ADRs לתיעוד ב־ARCHITECTURE.md בזמן הבנייה

- **ADR-1: קבועי זמן להצגת הרצף** — הערכים בטבלה בסעיף 3.
- **ADR-2: אקראיות דטרמיניסטית בבדיקות** — Vitest מזריק `random`; Playwright מחליף `Math.random` דרך `addInitScript`; המוצר משתמש ב־`Math.random`.

## 10. מיפוי ל־Definition of Done

| תנאי DoD | איך נבדק |
|---|---|
| ״התחל״ מציג רצף באור וצליל; לחיצות חסומות בהצגה; אחריה ״תורך!״ | Vitest (מצבים, `playTone`) + Playwright (`disabled`, הודעות) + האזנה ידנית |
| הרצף גדל בצבע אחד ושומר קודמים; אקראי עם חזרות | Vitest על `sequence.ts` ו־Controller |
| מעבר אוטומטי בשלבים 1–9 בקצב קבוע; אין מגבלת זמן | Vitest עם fake timers |
| טעות בשלב 1 → 0; בשלב 7 → 6; שלב 10 → ניצחון עם 10 | Vitest |
| ״שחק שוב״ בלי טיימרים/צלילים ישנים | Vitest (`gameToken`) + Playwright |
| השתקה פועלת במשחק בלי להשפיע על אור/קלט/ניקוד | Playwright + בדיקה ידנית |
| מעבר ל״אודות״ ורענון מחזירים למצב התחלתי | Playwright |
| Vitest ו־Playwright עוברים | `npm test`, `npm run test:e2e` |

## 11. מחוץ להיקף במילסטון זה

שמירה ב־`localStorage`, שיא אישי ו״שיא חדש!״ (Milestone 3); נתוני ״אודות״ ואיפוס (Milestone 4); PWA ופריסה (Milestone 5).
