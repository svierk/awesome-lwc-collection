import { registerSa11yMatcher } from '@sa11y/jest';
import structuredClone from '@ungap/structured-clone';

if (typeof global.structuredClone !== 'function') {
  global.structuredClone = structuredClone;
}

registerSa11yMatcher();
