import { toHistoryItems } from '../game/history';
import { computeStatistics } from '../game/statistics';
import type { Navigation } from '../navigation';
import type { ResultsRepository } from '../storage/resultsRepository';
import { el } from './dom';

const NO_DATA = 'אין נתונים';

export type AboutScreen = {
  element: HTMLElement;
  render(): void;
  closeDialog(): void;
};

function card(title: string, body: Node[], extraClass = ''): HTMLElement {
  return el('section', { class: `card ${extraClass}`.trim() }, [el('h2', { class: 'card__title' }, [title]), ...body]);
}

function statRow(label: string, value: HTMLElement): HTMLElement {
  return el('div', { class: 'stat-row' }, [el('dt', {}, [label]), value]);
}

export function createAboutScreen(nav: Navigation, results: ResultsRepository): AboutScreen {
  const homeButton = el('button', { type: 'button', class: 'btn btn--secondary btn--small' }, ['בית']);
  homeButton.addEventListener('click', () => nav.navigate('home'));

  // RTL grid: empty cell on the right, home button on the left (per wireframe).
  const header = el('header', { class: 'topbar' }, [
    el('span', { 'aria-hidden': 'true' }),
    el('h1', { class: 'topbar__title', tabindex: '-1' }, ['אודות']),
    homeButton,
  ]);

  const bestValue = el('p', { class: 'best__value', 'data-testid': 'best' });
  const totalValue = el('dd', { dir: 'ltr', 'data-testid': 'total' });
  const winsValue = el('dd', { dir: 'ltr', 'data-testid': 'wins' });
  const rateValue = el('dd', { dir: 'ltr', 'data-testid': 'rate' });
  const dataNotice = el('p', { class: 'notice', role: 'status' });
  const emptyHistory = el('p', { class: 'empty' }, ['עדיין אין משחקים שהסתיימו']);
  const historyList = el('ol', { class: 'history', 'aria-label': 'משחקים מהחדש לישן' });

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
    card('שיא אישי', [bestValue], 'card--best'),
    card('סטטיסטיקות', [
      el('dl', { class: 'stats' }, [
        statRow('משחקים שהסתיימו', totalValue),
        statRow('ניצחונות', winsValue),
        statRow('אחוז הצלחה', rateValue),
      ]),
    ]),
    card('היסטוריית משחקים', [dataNotice, emptyHistory, historyList]),
  ];

  const resetButton = el('button', { type: 'button', class: 'btn btn--dark btn--block' }, ['איפוס נתונים']);

  // Confirmation layer inside the About screen (not a separate screen).
  const cancelButton = el('button', { type: 'button', class: 'btn btn--secondary' }, ['ביטול']);
  const confirmButton = el('button', { type: 'button', class: 'btn btn--danger' }, ['איפוס']);
  const dialog = el('dialog', { class: 'confirm', 'aria-labelledby': 'reset-title', 'aria-describedby': 'reset-text' }, [
    el('span', { class: 'confirm__icon', 'aria-hidden': 'true' }, ['!']),
    el('h2', { class: 'confirm__title', id: 'reset-title' }, ['איפוס נתונים']),
    el('p', { class: 'confirm__text', id: 'reset-text' }, ['האם אתה בטוח שברצונך לאפס את כל הנתונים?']),
    el('div', { class: 'confirm__actions' }, [cancelButton, confirmButton]),
  ]);

  let resetFailed = false;

  function render(): void {
    const loaded = results.load();
    const games = loaded.status === 'ok' ? loaded.games : [];
    const stats = computeStatistics(games);
    const hasGames = stats.totalGames > 0;

    bestValue.textContent = hasGames ? String(stats.personalBest) : NO_DATA;
    totalValue.textContent = String(stats.totalGames);
    winsValue.textContent = String(stats.wins);
    rateValue.textContent = stats.winRate === null ? NO_DATA : `${stats.winRate}%`;

    historyList.replaceChildren(
      ...toHistoryItems(games).map((item) =>
        el('li', { class: 'history__item' }, [
          el('span', { class: 'history__result' }, [item.resultText]),
          el('span', { class: 'history__rounds' }, [item.roundsText]),
          el('span', { class: 'history__date', dir: 'ltr' }, [item.date]),
        ]),
      ),
    );
    historyList.hidden = !hasGames;
    emptyHistory.hidden = hasGames;

    const notice = resetFailed
      ? 'איפוס הנתונים נכשל'
      : loaded.status === 'unavailable'
        ? 'לא ניתן לקרוא נתונים שמורים במכשיר זה'
        : loaded.status === 'invalid'
          ? 'הנתונים השמורים אינם תקינים. ניתן לאפס אותם.'
          : '';
    dataNotice.textContent = notice;
    dataNotice.hidden = notice === '';
  }

  function closeDialog(): void {
    if (dialog.open) dialog.close();
  }

  resetButton.addEventListener('click', () => {
    dialog.showModal();
    cancelButton.focus();
  });
  cancelButton.addEventListener('click', () => dialog.close());
  confirmButton.addEventListener('click', () => {
    resetFailed = !results.clear();
    dialog.close();
    render();
  });
  // Escape (native cancel) and every close return focus to the reset button.
  dialog.addEventListener('close', () => resetButton.focus({ preventScroll: true }));

  const element = el('section', { class: 'screen screen--about', 'data-screen': 'about' }, [
    header,
    el('main', { class: 'content content--about' }, [...cards, resetButton]),
    dialog,
  ]);

  render();
  return {
    element,
    render() {
      resetFailed = false;
      render();
    },
    closeDialog,
  };
}
