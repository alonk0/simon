# תוכנית – Milestone 3: תוצאות, שיא אישי והיסטוריה מקומית

**מקורות:** `MILESTONES.md` (Milestone 3), `PRD.md` (FR-04, FR-05, Edge Cases, אילוצים), `ARCHITECTURE.md` (§2.2, §2.3 כלל 6–7, §2.4, §2.5, §2.10), `DESIGN.md` (§1.3, טבלת צבעים — `yellow` להדגשת ״שיא חדש!״), `wireframes.png` ו־`mockups.png` (חלונית סיום).

**מטרה:** כל משחק שהסתיים (ניצחון/הפסד) נרשם פעם אחת ב־`localStorage`; חלונית הסיום מציגה שיא אישי אמיתי ו״שיא חדש!״ רק בשיפור ממשי; נתונים חסומים/פגומים לא שוברים את המשחק. מסך ״אודות״ **לא** משתנה במילסטון זה (Milestone 4).

---

## 0. דרישות מקדימות

- אין תלויות חדשות, אין `.env`, חשבונות או שירותים חיצוניים.
- אין שינוי ב־`.gitignore`.

## 1. מבנה הקוד (קבצים חדשים ומשתנים)

```text
src/
  storage/
    resultsRepository.ts  // NEW – read/validate/append/clear on localStorage (key simon:results:v1)
  game/
    statistics.ts         // NEW – pure: personalBest, totalGames, wins, winRate
    gameController.ts     // CHANGED – onFinish hook called exactly once; summary in state
  ui/
    homeScreen.ts         // CHANGED – modal shows best, "שיא חדש!", "not saved" notice
  main.ts                 // CHANGED – wires repository + statistics into onFinish
  styles/components.css   // CHANGED – modal best line, new-record badge, notice
tests/
  resultsRepository.test.ts // NEW
  statistics.test.ts        // NEW
  gameController.test.ts    // CHANGED – onFinish once, not on cancel
e2e/
  results.spec.ts         // NEW – persistence, new record, blocked/corrupt storage
```

הפרדת שכבות לפי ARCHITECTURE §2.2: `statistics.ts` טהור; `resultsRepository.ts` היחיד שנוגע ב־`localStorage`; ה־Controller לא מכיר את האחסון (מקבל `onFinish` מבחוץ); `homeScreen.ts` רק מציג.

## 2. Data Model (לפי ARCHITECTURE §2.4, ללא שינוי)

```ts
type CompletedGame = { date: string; completedRounds: number; result: 'win' | 'loss' };
type SavedResults = { schemaVersion: 1; games: CompletedGame[] };
```

- מפתח יחיד: `simon:results:v1`. `date` = `new Date().toISOString()` (שעון מוזרק בבדיקות).
- שיא וסטטיסטיקות **לא** נשמרים — תמיד מחושבים מ־`games`.
- רשומות נוספות בסוף המערך (סדר הוספה = סדר כרונולוגי).

## 3. Results Repository – `src/storage/resultsRepository.ts`

```ts
type LoadResult =
  | { status: 'ok'; games: CompletedGame[] }   // includes "key missing" → []
  | { status: 'unavailable' }                  // localStorage blocked / throws
  | { status: 'invalid' };                     // bad JSON, wrong schemaVersion, bad record

type ResultsRepository = {
  load(): LoadResult;
  record(game: Omit<CompletedGame, 'date'>): { saved: boolean; games: CompletedGame[] | null };
  clear(): boolean;                            // removeItem(key) only – used in Milestone 4
};

createResultsRepository({ getStorage = () => window.localStorage, now = () => new Date() })
```

- **גישה בטוחה:** גם הגישה ל־`window.localStorage` עצמה עטופה ב־`try/catch` (בחלק מהדפדפנים היא זורקת `SecurityError`).
- **אימות בקריאה:** אובייקט; `schemaVersion === 1`; `games` מערך; כל רשומה: `date` מחרוזת שמתפרשת לתאריך תקין, `completedRounds` מספר שלם; `result === 'win'` רק עם 10, `result === 'loss'` רק עם 0–9. כל חריגה → `invalid` לכל הקובץ.
- **כתיבה:** `load → append → JSON.stringify → setItem`, רק כש־`load` החזיר `ok`. אם הנתונים `invalid` — **לא דורסים** (ARCHITECTURE §2.4) ומחזירים `saved: false`. חריגה ב־`setItem` (`QuotaExceededError`/`SecurityError`) → `saved: false`. `saved: true` רק אחרי `setItem` שהצליח — אין דיווח כוזב.
- אין שימוש ב־`localStorage.clear()`.

## 4. Statistics – `src/game/statistics.ts`

```ts
computeStatistics(games) → { personalBest, totalGames, wins, winRate: number | null }
```

- `personalBest = max(completedRounds)` או 0 בהיסטוריה ריקה.
- `winRate = Math.round(wins / totalGames * 100)`; `null` כשאין משחקים (הממשק יציג ״אין נתונים״ ב־Milestone 4) — ללא חלוקה באפס.

## 5. Game Controller – שינויים

- אופציה חדשה: `onFinish?: (outcome: { result; completedRounds }) => FinishSummary`.
- `GameState` מקבל שדה `summary: FinishSummary | null` (מתאפס ב־`start`/`cancel`).
- ב־`finish()`: קודם `clearTimers`, אחר כך קריאה **אחת** ל־`onFinish` (עטופה ב־`try/catch` — תקלת אחסון לא עוצרת את הצגת התוצאה), ורק אז `update({ phase: 'finished', ... , summary })`. כך החלונית מוצגת כבר עם נתוני השיא.
- `finish` לא נקרא מ־`cancel` → משחק שננטש (מעבר ל״אודות״) לא נרשם. רענון מוחק את הזיכרון, ולכן גם הוא לא נרשם. ה־`gameToken` הקיים מבטיח שאין סיום כפול מטיימר ישן.

## 6. חיווט – `src/main.ts`

```ts
type FinishSummary = { saved: boolean; personalBest: number | null; isNewBest: boolean };
```

ב־`onFinish`:
1. `before = repo.load()`; `previousBest` = `computeStatistics(before.games).personalBest` אם `ok`.
2. `repo.record(outcome)`.
3. אם נשמר: `personalBest = computeStatistics(after.games).personalBest`; `isNewBest = completedRounds > previousBest` (שיפור ממשי בלבד; משחק ראשון עם 0 אינו ״שיא חדש״, משחק ראשון עם 1+ כן).
4. אם לא נשמר: `isNewBest = false`; `personalBest = previousBest` אם הקריאה הצליחה, אחרת `null` (לא מציגים שיא). התוצאה הנוכחית לא נכללת בשיא המוצג — כדי לא להציג שיא שלא נשמר.

## 7. ממשק – חלונית הסיום (`homeScreen.ts` + CSS)

לפי Wireframe/Mockup, מלמעלה למטה:
- כותרת ״ניצחת! 🎉״ / ״הפסדת״ (קיים).
- ״השלמת X שלבים״ (קיים).
- **חדש:** ״שיא אישי: N״ — מוסתר כש־`personalBest === null`.
- **חדש:** תג ״שיא חדש!״ ברקע צהוב עדין (צבע `yellow` מה־tokens, כמו כרטיס השיא ב־Mockup) — רק כש־`isNewBest`.
- **חדש:** כש־`saved === false` — שורה קטנה ״התוצאה לא נשמרה במכשיר״ (טקסט משני, לא מסתיר את התוצאה).
- כפתור ״שחק שוב״ (קיים).

אין שינוי בשאר מסך הבית ובמסך ״אודות״.

## 8. בדיקות

**Vitest:**
- `resultsRepository.test.ts` (Storage מזויף בזיכרון + `now` קבוע):
  - מפתח חסר → `ok` עם `[]`; `record` → נשמר JSON עם `schemaVersion: 1`, תאריך ותוצאה; שתי קריאות → שתי רשומות לפי הסדר.
  - JSON שבור / `schemaVersion: 2` / רשומה לא תקינה (ניצחון עם 7, הפסד עם 10, 11, מספר לא שלם, תאריך לא תקין) → `invalid`; `record` לא דורס את הערך המקורי ומחזיר `saved: false`.
  - `setItem` זורק → `saved: false`; `getStorage` זורק → `unavailable`, ללא קריסה.
  - `clear` מוחק רק את המפתח שלנו (מפתח אחר באותו Storage נשאר).
- `statistics.test.ts`: אפס משחקים (שיא 0, `winRate` `null`); אפס ניצחונות (0%); רק ניקוד 0; עיגול (למשל 3/8 → 38).
- `gameController.test.ts`: `onFinish` נקרא בדיוק פעם אחת בהפסד ובניצחון עם הערכים הנכונים; לא נקרא ב־`cancel` באמצע משחק; לחיצות נוספות אחרי הסיום לא קוראות לו שוב; `summary` מגיע ל־state; `onFinish` שזורק לא מונע `finished`.

**Playwright** (`e2e/results.spec.ts`, אותה תצורה ו־`Math.random = () => 0` כמו ב־M2):
- הפסד ב־0 → בלי ״שיא חדש!״, ״שיא אישי: 0״; רענון; הפסד ב־1 → ״שיא חדש!״ ו״שיא אישי: 1״; שוב 1 → ״שיא אישי: 1״ בלי ״שיא חדש!״. בכל שלב בודקים ב־`localStorage` שנוספה רשומה אחת בדיוק.
- נטישה: התחלה → ״אודות״ → בית; וגם התחלה → רענון → אין רשומה חדשה.
- אחסון חסום (`addInitScript` שגורם ל־`Storage.prototype.setItem` לזרוק): המשחק מסתיים, מוצגת ״התוצאה לא נשמרה במכשיר״, אין ״שיא חדש!״, ״שחק שוב״ עובד.
- נתונים פגומים מראש במפתח: המשחק פועל, הערך הפגום לא נדרס.

## 9. ADR לתיעוד ב־ARCHITECTURE.md בזמן הבנייה

- **ADR-3: חיבור התוצאות לסיום המשחק** — ה־Controller מקבל `onFinish` ולא תלוי באחסון; השיא מחושב לפני ואחרי הרישום; כשהשמירה נכשלת מוצג השיא השמור בלבד, בלי ״שיא חדש!״, עם הודעה שהתוצאה לא נשמרה; נתונים לא תקינים לא נדרסים.

## 10. מיפוי ל־Definition of Done

| תנאי DoD | איך נבדק |
|---|---|
| ניצחון/הפסד נרשם פעם אחת עם תאריך, תוצאה ושלבים; נטישה/רענון לא נרשמים | Vitest (Controller + Repository) + Playwright |
| ״שיא חדש״ רק בשיפור ממשי; אותו שיא אינו שיא חדש | Vitest + Playwright |
| אחרי רענון משחק פעיל לא משוחזר, אבל התוצאות והשיא נשמרים | Playwright |
| סטטיסטיקות עומדות במקרי קצה (אפס משחקים/ניצחונות, ניקוד 0) | Vitest על `statistics.ts` |
| אחסון חסום או נתון פגום לא שוברים את הממשק; אין דיווח כוזב על שמירה | Vitest + Playwright |
| Vitest לשמירה, שיא, נתונים פגומים ורישום חד־פעמי עוברות | `npm test` (וגם `npm run test:e2e`) |

## 11. מחוץ להיקף במילסטון זה

הצגת שיא, סטטיסטיקות והיסטוריה במסך ״אודות״, וכפתור ״איפוס נתונים״ עם Dialog (Milestone 4 — ה־Repository כבר כולל `clear` לשימוש שם); PWA ופריסה (Milestone 5).
