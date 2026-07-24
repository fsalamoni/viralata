/**
 * LazyAdSlot — runtime test
 *
 * Testa que o componente:
 * 1. Renderiza placeholder imediato (sem fazer queries)
 * 2. Carrega AdSlotUnified quando visível (IntersectionObserver)
 * 3. Carrega também quando browser fica idle (requestIdleCallback)
 * 4. Tem altura mínima (sem CLS)
 */

import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useState, useEffect } from 'react';

// Mock IntersectionObserver
let intersectionCallback;
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

class MockIntersectionObserver {
  constructor(cb) {
    intersectionCallback = cb;
  }
  observe(el) {
    mockObserve(el);
  }
  disconnect() {
    mockDisconnect();
  }
  unobserve() {}
}
global.IntersectionObserver = MockIntersectionObserver;

// Mock requestIdleCallback
let idleCallback;
const mockRequestIdleCallback = vi.fn((cb) => {
  idleCallback = cb;
  return 1;
});
const mockCancelIdleCallback = vi.fn();
global.requestIdleCallback = mockRequestIdleCallback;
global.cancelIdleCallback = mockCancelIdleCallback;

// Mock AdSlotUnified
vi.mock('./AdSlotUnified', () => ({
  default: function MockAdSlotUnified({ slotId }) {
    return <div data-testid="ad-slot-unified" data-slot={slotId}>AdSlotUnified</div>;
  },
}));

import LazyAdSlot from './LazyAdSlot';

describe('LazyAdSlot — runtime safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    intersectionCallback = null;
    idleCallback = null;
  });

  it('renders placeholder immediately (no queries)', () => {
    const { container } = render(<LazyAdSlot slotId="test-1" minHeight={90} />);
    
    // Should render placeholder (not AdSlotUnified yet)
    expect(screen.queryByTestId('ad-slot-unified')).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute('data-ad-lazy', 'pending');
    expect(container.firstChild.getAttribute('style')).toContain('90px');
  });

  it('triggers IntersectionObserver on mount', () => {
    render(<LazyAdSlot slotId="test-2" />);
    expect(mockObserve).toHaveBeenCalled();
  });

  it('mounts AdSlotUnified when visible (IntersectionObserver)', () => {
    render(<LazyAdSlot slotId="test-3" />);
    
    // Initially not rendered
    expect(screen.queryByTestId('ad-slot-unified')).not.toBeInTheDocument();
    
    // Simulate becoming visible
    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });
    
    // Now should be rendered
    expect(screen.queryByTestId('ad-slot-unified')).toBeInTheDocument();
  });

  it('mounts AdSlotUnified when idle (requestIdleCallback)', () => {
    render(<LazyAdSlot slotId="test-4" />);
    
    expect(screen.queryByTestId('ad-slot-unified')).not.toBeInTheDocument();
    
    // Simulate browser idle
    act(() => {
      if (idleCallback) idleCallback();
    });
    
    expect(screen.queryByTestId('ad-slot-unified')).toBeInTheDocument();
  });

  it('mounts immediately if eager=true', () => {
    render(<LazyAdSlot slotId="test-5" eager />);
    expect(screen.queryByTestId('ad-slot-unified')).toBeInTheDocument();
  });

  it('does not mount twice after visible', () => {
    render(<LazyAdSlot slotId="test-6" />);
    
    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });
    
    expect(screen.queryByTestId('ad-slot-unified')).toBeInTheDocument();
    
    // Second call should not cause error
    act(() => {
      intersectionCallback([{ isIntersecting: true }]);
    });
    
    expect(screen.queryByTestId('ad-slot-unified')).toBeInTheDocument();
  });

  it('passes props to AdSlotUnified', () => {
    render(<LazyAdSlot slotId="test-7" position="feed_inline" page="/feed" className="w-full" />);
    
    act(() => {
      if (idleCallback) idleCallback();
    });
    
    const ad = screen.getByTestId('ad-slot-unified');
    expect(ad).toHaveAttribute('data-slot', 'test-7');
  });
});
