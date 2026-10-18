import { BOARD_LAYOUT, COLOR_LABELS } from '../game/colors';
import type { Navigation } from '../navigation';
import { el } from './dom';
import { soundOffIcon, soundOnIcon } from './icons';

export function createHomeScreen(nav: Navigation): HTMLElement {
  let muted = false;

  const muteButton = el('button', {
    type: 'button',
    class: 'btn btn--secondary btn--icon',
    'aria-pressed': 'false',
    'aria-label': 'השתק צלילים',
  });
  const renderMute = () => {
    muteButton.replaceChildren(muted ? soundOffIcon() : soundOnIcon());
    muteButton.setAttribute('aria-pressed', String(muted));
    muteButton.setAttribute('aria-label', muted ? 'הפעל צלילים' : 'השתק צלילים');
  };
  muteButton.addEventListener('click', () => {
    muted = !muted;
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

  const status = el('div', { class: 'status', 'aria-live': 'polite' }, [
    el('p', { class: 'status__message' }, ['לחץ על התחל']),
  ]);

  // Tiles stay disabled until the game logic exists (Milestone 2).
  const board = el(
    'div',
    { class: 'board', role: 'group', 'aria-label': 'לוח המשחק' },
    BOARD_LAYOUT.map((color) =>
      el('button', { type: 'button', class: `tile tile--${color}`, 'data-color': color, disabled: true }, [
        COLOR_LABELS[color],
      ]),
    ),
  );

  const startButton = el('button', { type: 'button', class: 'btn btn--primary btn--block' }, ['התחל']);

  return el('section', { class: 'screen screen--home', 'data-screen': 'home' }, [
    header,
    el('main', { class: 'content content--home' }, [status, board, startButton]),
  ]);
}
