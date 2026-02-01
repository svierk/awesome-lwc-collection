import { registerSa11yMatcher } from '@sa11y/jest';
import structuredClone from '@ungap/structured-clone';

if (typeof globalThis.structuredClone !== 'function') {
  globalThis.structuredClone = structuredClone;
}

registerSa11yMatcher();
