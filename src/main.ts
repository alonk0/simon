import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { createSound } from './audio/sound';
import { createGameController } from './game/gameController';
import { createNavigation, type Screen } from './navigation';
import { createAboutScreen } from './ui/aboutScreen';
import { createHomeScreen, type HomeScreen } from './ui/homeScreen';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root');

const nav = createNavigation('home');
const sound = createSound();
let home: HomeScreen | undefined;
const controller = createGameController({
  playTone: (color, durationMs) => sound.play(color, durationMs),
  onChange: (state) => home?.render(state),
});
home = createHomeScreen(nav, controller, sound);

const screens: Record<Screen, HTMLElement> = {
  home: home.element,
  about: createAboutScreen(nav),
};

function show(screen: Screen): void {
  for (const [name, node] of Object.entries(screens)) node.hidden = name !== screen;
}

nav.onNavigate((screen, previous) => {
  // Leaving home cancels the active game without saving anything.
  if (previous === 'home') controller.cancel();
  show(screen);
  window.scrollTo(0, 0);
  screens[screen].querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
});

app.append(screens.home, screens.about);
show(nav.current());
