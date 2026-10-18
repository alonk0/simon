import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import './styles/tokens.css';
import './styles/base.css';
import './styles/components.css';

import { createNavigation, type Screen } from './navigation';
import { createAboutScreen } from './ui/aboutScreen';
import { createHomeScreen } from './ui/homeScreen';

const app = document.getElementById('app');
if (!app) throw new Error('Missing #app root');

const nav = createNavigation('home');
const screens: Record<Screen, HTMLElement> = {
  home: createHomeScreen(nav),
  about: createAboutScreen(nav),
};

function show(screen: Screen): void {
  for (const [name, node] of Object.entries(screens)) node.hidden = name !== screen;
}

nav.onNavigate((screen) => {
  show(screen);
  window.scrollTo(0, 0);
  screens[screen].querySelector<HTMLElement>('h1')?.focus({ preventScroll: true });
});

app.append(screens.home, screens.about);
show(nav.current());
