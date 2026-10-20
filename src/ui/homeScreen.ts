import type { Sound } from '../audio/sound';
import { BOARD_LAYOUT, COLOR_LABELS, type Color } from '../game/colors';
import type { GameController, GameState } from '../game/gameController';
import { roundsLabel } from '../game/history';
import { MAX_ROUNDS } from '../game/sequence';
import type { Navigation } from '../navigation';
import { el } from './dom';
import { soundOffIcon, soundOnIcon } from './icons';

export type HomeScreen = {
  element: HTMLElement;
  render(state: GameState): void;
};

function completedText(rounds: number): string {
  return `השלמת ${roundsLabel(rounds)}`;
}

export function createHomeScreen(nav: Navigation, controller: GameController, sound: Sound): HomeScreen {
  const muteButton = el('button', {
    type: 'button',
    class: 'btn btn--secondary btn--icon',
    'aria-pressed': 'false',
    'aria-label': 'השתק צלילים',
  });
  const renderMute = () => {
    const muted = sound.isMuted();
    muteButton.replaceChildren(muted ? soundOffIcon() : soundOnIcon());
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? 'הפעל צלילים' : 'השתק צלילים');
  };
  muteButton.addEventListener('click', () => {
    sound.setMuted(!sound.isMuted());
    renderMute();
  });
  renderMute();

  const aboutButton = el('button', { type: 'button', class: 'btn btn--secondary btn--small' }, ['אודות']);
  aboutButton.addEventListener('click', () => nav.navigate('about'));

  // RTL grid: first child sits on the right.
  const header = el('header', { class: 'topbar' }, [
    aboutButton,
    el('h1', { class: 'topbar__title', tabindex: '-1' }, ['משחק סיימון']),
    muteButton,
  ]);

  const roundLine = el('p', { class: 'status__round' });
  const messageLine = el('p', { class: 'status__message' });
  const status = el('div', { class: 'status', 'aria-live': 'polite' }, [roundLine, messageLine]);

  const tiles = new Map<Color, HTMLButtonElement>();
  const board = el(
    'div',
    { class: 'board', role: 'group', 'aria-label': 'לוח המשחק' },
    BOARD_LAYOUT.map((color) => {
      const tile = el('button', { type: 'button', class: `tile tile--${color}`, 'data-color': color, disabled: true }, [
        COLOR_LABELS[color],
      ]);
      tile.addEventListener('click', () => controller.press(color));
      tiles.set(color, tile);
      return tile;
    }),
  );

  const startGame = () => {
    sound.unlock();
    controller.start();
  };

  const startButton = el('button', { type: 'button', class: 'btn btn--primary btn--block' }, ['התחל']);
  startButton.addEventListener('click', startGame);

  // End-of-game modal (an overlay inside the home screen, not a separate screen).
  const resultTitle = el('h2', { class: 'modal__title', id: 'result-title' });
  const resultRounds = el('p', { class: 'modal__text' });
  const resultBest = el('p', { class: 'modal__text' });
  const newBestBadge = el('p', { class: 'modal__badge' }, ['שיא חדש!']);
  const notSavedNote = el('p', { class: 'modal__note' }, ['התוצאה לא נשמרה במכשיר']);
  const playAgainButton = el('button', { type: 'button', class: 'btn btn--primary btn--block' }, ['שחק שוב']);
  playAgainButton.addEventListener('click', startGame);
  const modal = el('div', { class: 'overlay', hidden: true }, [
    el('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'result-title' }, [
      resultTitle,
      resultRounds,
      resultBest,
      newBestBadge,
      notSavedNote,
      playAgainButton,
    ]),
  ]);

  const element = el('section', { class: 'screen screen--home', 'data-screen': 'home' }, [
    header,
    el('main', { class: 'content content--home' }, [status, board, startButton]),
    modal,
  ]);

  function render(state: GameState): void {
    const { phase } = state;
    const inGame = phase !== 'idle';

    roundLine.hidden = !inGame;
    roundLine.textContent = inGame ? `שלב ${state.round} מתוך ${MAX_ROUNDS}` : '';
    const message =
      phase === 'idle'
        ? 'לחץ על התחל'
        : phase === 'showing-sequence'
          ? 'צפה ברצף'
          : phase === 'awaiting-input'
            ? 'תורך!'
            : '';
    if (messageLine.textContent !== message) messageLine.textContent = message;
    status.classList.toggle('status--watch', phase === 'showing-sequence');
    status.classList.toggle('status--turn', phase === 'awaiting-input');

    for (const [color, tile] of tiles) {
      tile.disabled = phase !== 'awaiting-input';
      tile.classList.toggle('tile--lit', state.litColor === color);
    }

    startButton.hidden = inGame;

    const showModal = phase === 'finished';
    if (showModal && modal.hidden) {
      resultTitle.textContent = state.result === 'win' ? 'ניצחת! 🎉' : 'הפסדת';
      resultRounds.textContent = completedText(state.completedRounds);
      const best = state.summary?.personalBest ?? null;
      resultBest.hidden = best === null;
      resultBest.textContent = best === null ? '' : `שיא אישי: ${best}`;
      newBestBadge.hidden = !state.summary?.isNewBest;
      notSavedNote.hidden = state.summary?.saved !== false;
      modal.hidden = false;
      playAgainButton.focus();
    } else if (!showModal) {
      modal.hidden = true;
    }
  }

  render(controller.getState());
  return { element, render };
}
