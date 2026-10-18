export type Screen = 'home' | 'about';

type Listener = (screen: Screen, previous: Screen) => void;

export type Navigation = {
  current(): Screen;
  navigate(screen: Screen): void;
  onNavigate(listener: Listener): void;
};

export function createNavigation(initial: Screen = 'home'): Navigation {
  let current: Screen = initial;
  const listeners: Listener[] = [];

  return {
    current: () => current,
    navigate(screen) {
      if (screen === current) return;
      const previous = current;
      current = screen;
      for (const listener of listeners) listener(screen, previous);
    },
    onNavigate(listener) {
      listeners.push(listener);
    },
  };
}
