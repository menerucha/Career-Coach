import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// jsdom gaps that Radix UI touches
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {});
Element.prototype.hasPointerCapture = Element.prototype.hasPointerCapture || (() => false);
Element.prototype.releasePointerCapture = Element.prototype.releasePointerCapture || (() => {});

beforeEach(() => { localStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
