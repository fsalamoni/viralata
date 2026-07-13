/**
 * @fileoverview Tests do useFeedPreferences (TASK-401).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
// Mock do renderHook para jsdom
import { createRoot } from 'react-dom/client';
import React from 'react';
import { act } from 'react';
function renderHook(hookFn) {
  const result = { current: null };
  function TestComponent() {
    result.current = hookFn();
    return null;
  }
  const container = document.createElement('div');
  const root = createRoot(container);
  act(() => { root.render(React.createElement(TestComponent)); });
  return { result, rerender: () => act(() => root.render(React.createElement(TestComponent))), unmount: () => root.unmount() };
}

// Mock Firebase
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ _path: 'users/test-uid' })),
  setDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
}));

vi.mock('@/core/config/firebase', () => ({ db: {} }));
vi.mock('@/core/lib/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

// Mock do useAuth
const mockUser = { uid: 'test-uid', feed_preferences: null };
const mockUpdateUserProfile = vi.fn();
vi.mock('@/core/lib/FirebaseAuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    updateUserProfile: mockUpdateUserProfile,
  }),
}));

import { useFeedPreferences } from './useFeedPreferences';

beforeEach(() => {
  localStorage.clear();
  mockUser.uid = 'test-uid';
  mockUser.feed_preferences = null;
  vi.clearAllMocks();
});

describe('useFeedPreferences — defaults', () => {
  it('retorna defaults seguros (LGPD privacy by default)', () => {
    const { result } = renderHook(() => useFeedPreferences());
    const [prefs] = result.current;
    expect(prefs.showOwnPets).toBe(true);
    expect(prefs.species).toBe('all');
    expect(prefs.size).toBe('all');
    expect(prefs.city).toBe('');
  });
});

describe('useFeedPreferences — localStorage', () => {
  it('hidrata de localStorage se existir', () => {
    localStorage.setItem(
      'viralata:feed_prefs',
      JSON.stringify({ showOwnPets: false, species: 'dog' })
    );
    const { result } = renderHook(() => useFeedPreferences());
    const [prefs] = result.current;
    expect(prefs.showOwnPets).toBe(false);
    expect(prefs.species).toBe('dog');
  });
});

describe('useFeedPreferences — update', () => {
  it('setPrefs atualiza estado local imediatamente', () => {
    const { result } = renderHook(() => useFeedPreferences());
    const [, setPrefs] = result.current;
    act(() => {
      setPrefs({ showOwnPets: false });
    });
    const [prefs] = result.current;
    expect(prefs.showOwnPets).toBe(false);
  });

  it('setPrefs aceita função updater', () => {
    const { result } = renderHook(() => useFeedPreferences());
    const [, setPrefs] = result.current;
    act(() => {
      setPrefs((prev) => ({ ...prev, species: 'cat' }));
    });
    const [prefs] = result.current;
    expect(prefs.species).toBe('cat');
  });

  it('salva em localStorage imediatamente (não espera debounce)', () => {
    const { result } = renderHook(() => useFeedPreferences());
    const [, setPrefs] = result.current;
    act(() => {
      setPrefs({ size: 'large' });
    });
    const stored = JSON.parse(localStorage.getItem('viralata:feed_prefs'));
    expect(stored.size).toBe('large');
  });
});

describe('useFeedPreferences — perfil do user', () => {
  it('hidrata de user.feed_preferences (autoritativo)', () => {
    mockUser.feed_preferences = { species: 'cat', size: 'small' };
    const { result } = renderHook(() => useFeedPreferences());
    const [prefs] = result.current;
    expect(prefs.species).toBe('cat');
    expect(prefs.size).toBe('small');
  });
});
