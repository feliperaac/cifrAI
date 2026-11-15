import { describe, expect, it } from 'vitest';
import { PACKAGE_NAME } from './index.js';

describe('@cifrai/shared', () => {
  it('exports its package name', () => {
    expect(PACKAGE_NAME).toBe('@cifrai/shared');
  });
});
