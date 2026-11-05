/**
 * Checks the rules for the type line in the component READMEs - see
 * scripts/component-type.mjs. Run with `npm run test:docs`.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkExceptions, checkType, parseType, toTypeBadge } from './component-type.mjs';

const readmeWith = (type) => `# Name\n\nA description.\n\n**Type:** ${type}\n\n**Available in:** App Page\n`;
const exposed = { exposed: true, properties: 1 };

const check = (overrides) =>
  checkType({ component: 'foo', readme: readmeWith('Component'), meta: exposed, exceptions: {}, ...overrides });

test('parseType reads the line below the first paragraph', () => {
  assert.equal(parseType(readmeWith('Building Block')), 'Building Block');
});

test('parseType supports a first paragraph with several lines', () => {
  assert.equal(parseType('# Name\n\nLine one\nline two.\n\n**Type:** Utility\n'), 'Utility');
});

test('parseType ignores a type line anywhere else', () => {
  assert.equal(parseType('# Name\n\nA description.\n\n**Available in:** App Page\n\n**Type:** Utility\n'), null);
  assert.equal(parseType('# Name\n\n**Type:** Utility\n'), null);
});

test('checkType accepts every valid type', () => {
  assert.deepEqual(check(), []);
  assert.deepEqual(check({ readme: readmeWith('Building Block'), meta: { exposed: false, properties: 0 } }), []);
  assert.deepEqual(check({ readme: readmeWith('Utility'), meta: { exposed: false, properties: 0 } }), []);
});

test('checkType reports a missing or misplaced type line', () => {
  const [message] = check({ readme: '# Name\n\nA description.\n' });
  assert.match(message, /directly below the first paragraph/);
});

test('checkType reports an unknown type', () => {
  const [message] = check({ readme: readmeWith('Widget') });
  assert.match(message, /Unknown type "Widget"/);
});

test('checkType requires an exposed Component', () => {
  const [message] = check({ meta: { exposed: false, properties: 1 } });
  assert.match(message, /isExposed/);
});

test('checkType requires a Component with a builder property', () => {
  const [message] = check({ meta: { exposed: true, properties: 0 } });
  assert.match(message, /<property>/);
});

test('checkType accepts a listed Component that does not comply yet', () => {
  const result = check({ meta: { exposed: true, properties: 0 }, exceptions: { foo: '#1' } });
  assert.deepEqual(result, []);
});

test('checkType reports an exception that is no longer needed', () => {
  const [message] = check({ exceptions: { foo: '#1' } });
  assert.match(message, /remove it from scripts\/readme-exceptions\.json/);
});

test('checkType reports an exception for a type that does not need one', () => {
  const [message] = check({ readme: readmeWith('Utility'), exceptions: { foo: '#1' } });
  assert.match(message, /remove it from scripts\/readme-exceptions\.json/);
});

test('checkExceptions reports unknown components and missing references', () => {
  assert.deepEqual(checkExceptions({ foo: '#1' }, ['foo']), []);
  assert.match(checkExceptions({ bar: '#1' }, ['foo'])[0], /bar.*no public component/);
  assert.match(checkExceptions({ foo: '' }, ['foo'])[0], /foo.*issue or milestone/);
});

test('toTypeBadge shows a badge to people and plain text to agents', () => {
  assert.match(
    toTypeBadge(readmeWith('Component')),
    /\*\*Type:\*\* <llm-exclude><Badge type="tip" text="Component" \/><\/llm-exclude><llm-only>Component<\/llm-only>\n/
  );
});

test('toTypeBadge picks a badge style for every type', () => {
  assert.match(toTypeBadge(readmeWith('Building Block')), /<Badge type="info" text="Building Block" \/>/);
  assert.match(toTypeBadge(readmeWith('Utility')), /<Badge type="info" text="Utility" \/>/);
});

test('toTypeBadge leaves a readme without a type untouched', () => {
  const readme = '# Name\n\nA description.\n';
  assert.equal(toTypeBadge(readme), readme);
});
