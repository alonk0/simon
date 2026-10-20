import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { createSound } from './audio/sound';
import { createGameController, type FinishSummary, type GameOutcome } from './game/gameController';
import { computeStatistics } from './game/statistics';
import { createNavigation, type Screen } from './navigation';
import { createAboutScreen } from './ui/aboutScreen';
import { createHomeScreen, type HomeScreen } from './ui/homeScreen';
import { createResultsRepository } from './storage/resultsRepository';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root');

const nav = createNavigation('home');
const sound = createSound();
const results = createResultsRepository();

// Records a finished game and derives the personal best shown in the end-of-game modal.
function recordFinishedGame(outcome: GameOutcome): FinishSummary {
  const before = results.load();
  const previousBest = before.status === 'ok' ? computeStatistics(before.games).personalBest : null;
  const recorded = results.record(outcome);
  if (recorded.saved) {
    return {
      saved: true,
      personalBest: computeStatistics(recorded.games).personalBest,
      isNewBest: outcome.completedRounds > (previousBest ?? 0),
    };
  }
  // Not saved: show only the stored best, never one that includes the unsaved result.
  return { saved: false, personalBest: previousBest, isNewBest: false };
}

let home: HomeScreen | undefined;
const controller = createGameController({
  playTone: (color, durationMs) => sound.play(color, durationMs),
  onChange: (state) => home?.render(state),
  onFinish: recordFinishedGame,
});
home = createHomeScreen(nav, controller, sound);
const about = createAboutScreen(nav, results);

const screens: Record<Screen, HTMLElement> = {
  home: home.element,
  about: about.element,
};

function show(screen: Screen): void {
  for (const [name, node] of Object.entries(screens)) node.hidden = name !== screen;
}

nav.onNavigate((screen, previous) => {
  // Leaving home cancels the active game without saving anything.
  if (previous === 'home') controller.cancel();
  // Re-read saved results on every visit so About always matches storage.
  if (screen === 'about') about.render();
  else about.closeDialog();
  show(screen);
  window.scrollTo(0, 0);
  screens[screen].querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
});

app.append(screens.home, screens.about);
show(nav.current());
