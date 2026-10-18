import type { Navigation } from '../navigation';
import { el } from './dom';

const NO_DATA = 'אין נתונים';

function card(title: string, body: Node[], extraClass = ''): HTMLElement {
  return el('section', { class: `card ${extraClass}`.trim() }, [el('h2', { class: 'card__title' }, [title]), ...body]);
}

function statRow(label: string, value: string): HTMLElement {
  return el('div', { class: 'stat-row' }, [
    el('dt', {}, [label]),
    el('dd', { dir: 'ltr' }, [value]),
  ]);
}

export function createAboutScreen(nav: Navigation): HTMLElement {
  const homeButton = el('button', { type: 'button', class: 'btn btn--secondary btn--small' }, ['בית']);
  homeButton.addEventListener('click', () => nav.navigate('home'));

  // RTL grid: empty cell on the right, home button on the left (per wireframe).
  const header = el('header', { class: 'topbar' }, [
    el('span', { 'aria-hidden': 'true' }),
    el('h1', { class: 'topbar__title', tabindex: '-1' }, ['אודות']),
    homeButton,
  ]);

  // Saved results arrive in Milestones 3–4; until then show empty states, not invented numbers.
  const cards = [
    card('על המשחק', [
      el('p', {}, ['משחק זיכרון קלאסי שבו עליך לחזור על רצף צבעים שהמשחק מציג. כל שלב מוסיף צבע נוסף לרצף.']),
    ]),
    card('הוראות משחק', [
      el('ol', { class: 'steps' }, [
        el('li', {}, ['לחץ על התחל.']),
        el('li', {}, ['צפה ברצף הצבעים.']),
        el('li', {}, ['חזור על הרצף באותו סדר.']),
        el('li', {}, ['התקדם בשלבים ונסה לשבור את השיא.']),
      ]),
    ]),
    card('שיא אישי', [el('p', { class: 'best__value' }, [NO_DATA])], 'card--best'),
    card('סטטיסטיקות', [
      el('dl', { class: 'stats' }, [
        statRow('משחקים שהסתיימו', '0'),
        statRow('ניצחונות', '0'),
        statRow('אחוז הצלחה', NO_DATA),
      ]),
    ]),
    card('היסטוריית משחקים', [el('p', { class: 'empty' }, ['עדיין אין משחקים שהסתיימו'])]),
  ];

  const resetButton = el('button', { type: 'button', class: 'btn btn--dark btn--block', disabled: true }, [
    'איפוס נתונים',
  ]);

  return el('section', { class: 'screen screen--about', 'data-screen': 'about' }, [
    header,
    el('main', { class: 'content content--about' }, [...cards, resetButton]),
  ]);
}
