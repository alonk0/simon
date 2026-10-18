import { describe, expect, it, vi } from 'vitest';
import { createNavigation } from '../src/navigation';

describe('navigation', () => {
  it('starts on the home screen', () => {
    expect(createNavigation().current()).toBe('home');
  });

  it('switches between home and about and notifies listeners', () => {
    const nav = createNavigation();
    const listener = vi.fn();
    nav.onNavigate(listener);

    nav.navigate('about');
    expect(nav.current()).toBe('about');
    expect(listener).toHaveBeenLastCalledWith('about', 'home');

    nav.navigate('home');
    expect(nav.current()).toBe('home');
    expect(listener).toHaveBeenLastCalledWith('home', 'about');
  });

  it('does not notify when navigating to the current screen', () => {
    const nav = createNavigation();
    const listener = vi.fn();
    nav.onNavigate(listener);
    nav.navigate('home');
    expect(listener).not.toHaveBeenCalled();
  });
});
