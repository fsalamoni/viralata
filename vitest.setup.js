import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

if (typeof expect !== 'undefined') {
  expect.extend({
    toBeInTheDocument(received) {
      const pass = received !== null && received !== undefined;
      return {
        pass,
        message: () => pass
          ? `expected element not to be in the document`
          : `expected element to be in the document`,
      };
    },
    toBeDisabled(received) {
      const pass = received && (received.disabled === true || received.getAttribute('disabled') !== null);
      return {
        pass,
        message: () => pass ? `expected element not to be disabled` : `expected element to be disabled`,
      };
    },
    toHaveAttribute(received, attr, expected) {
      const actual = received?.getAttribute?.(attr);
      const pass = expected === undefined ? actual !== null : actual === expected;
      return {
        pass,
        message: () => pass
          ? `expected element not to have attribute ${attr}="${expected}"`
          : `expected element to have attribute ${attr}="${expected}", got "${actual}"`,
      };
    },
  });
}
