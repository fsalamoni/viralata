import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import { JitsiRoomLauncher } from './JitsiRoomLauncher';
describe('JitsiRoomLauncher (TASK-320)', () => {
  it('renderiza URL meet.jit.si', () => {
    const { container } = render(<JitsiRoomLauncher prefix="shelter" />);
    expect(container.querySelector('[data-testid="jitsi-launcher-url"]').textContent).toMatch(/^https:\/\/meet\.jit\.si\/shelter-[a-z0-9]+/);
  });
  it('gera novo link', () => {
    const { container } = render(<JitsiRoomLauncher prefix="test" />);
    const u1 = container.querySelector('[data-testid="jitsi-launcher-url"]').textContent;
    fireEvent.click(container.querySelector('[data-testid="jitsi-launcher-new"]'));
    expect(u1).not.toBe(container.querySelector('[data-testid="jitsi-launcher-url"]').textContent);
  });
});
