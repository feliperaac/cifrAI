import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';
import { createMemoryEventStore } from '../progress/eventStore';
import { configureProgress } from '../progress/progressStore';

// Cada teste começa sem XP: repositório em memória novo, sem tocar IndexedDB.
beforeEach(() => {
  configureProgress({ store: createMemoryEventStore() });
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
