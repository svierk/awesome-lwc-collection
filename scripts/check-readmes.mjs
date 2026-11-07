#!/usr/bin/env node
/**
 * Verifies that every public component README stays in sync with its source.
 *
 * A component is "public" as soon as it ships a README.md (same rule as the
 * docs generator). For each public component the script checks that:
 *
 * - every component exposed in the Lightning App Builder ships a README,
 * - the README starts with an H1 title,
 * - the "**Type:**" line follows the rules in component-type.mjs,
 * - the "**Available in:**" line matches the targets in the js-meta.xml,
 * - a "## Usage" section exists and embeds the component's kebab-case tag,
 * - the "## Attributes" table covers exactly the @api properties of the JS,
 * - every dispatched CustomEvent is documented in an "## Events" table,
 * - the "## Custom Labels" table lists exactly the labels the component and the
 *   LWC bundles in its "## Component Dependencies" table import.
 *
 * Across all bundles it also checks that every imported Custom Label is defined
 * in the labels file, and that every defined label is imported somewhere.
 *
 * Components that can't meet the type rules yet are listed in
 * readme-exceptions.json, together with the issue or milestone resolving them.
 * Finding a listed component that no longer needs its entry fails too, so the
 * list can only shrink.
 *
 * Exits non-zero and lists all findings when a README has drifted.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkExceptions, checkType } from './component-type.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lwcDir = join(root, 'force-app', 'main', 'default', 'lwc');
const exceptions = JSON.parse(readFileSync(join(root, 'scripts', 'readme-exceptions.json'), 'utf-8'));
const labelsFile = join(root, 'force-app', 'main', 'default', 'labels', 'CustomLabels.labels-meta.xml');
const definedLabels = existsSync(labelsFile)
  ? [...readFileSync(labelsFile, 'utf-8').matchAll(/<fullName\s*>([^<]+)<\/fullName\s*>/g)].map((match) => match[1])
  : [];

const TARGET_LABELS = new Map([
  ['lightning__AppPage', 'App Page'],
  ['lightning__HomePage', 'Home Page'],
  ['lightning__RecordPage', 'Record Page'],
  ['lightning__FlowScreen', 'Flow Screen']
]);

const NOT_EXPOSED_LINE =
  '**Available in:** Not exposed in the Lightning App Builder - intended to be embedded in other components.';

/** camelCase LWC name -> kebab-case tag/attribute name (cardIcon -> card-icon). */
function toKebabCase(name) {
  return name.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/** Remove block and line comments so JSDoc text is not scanned for decorators. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1');
}

function parseMeta(component) {
  const metaPath = join(lwcDir, component, `${component}.js-meta.xml`);
  if (!existsSync(metaPath)) return { exposed: false, properties: 0, targets: [] };
  const meta = readFileSync(metaPath, 'utf-8');
  return {
    exposed: /<isExposed>\s*true\s*<\/isExposed>/.test(meta),
    properties: [...meta.matchAll(/<property\b/g)].length,
    targets: [...meta.matchAll(/<target>([^<]+)<\/target>/g)].map((match) => match[1])
  };
}

function expectedAvailabilityLine({ exposed, targets }) {
  if (!exposed || targets.length === 0) return NOT_EXPOSED_LINE;
  const known = [...TARGET_LABELS.keys()].filter((target) => targets.includes(target));
  const labels = known.map((target) => TARGET_LABELS.get(target));
  const unknown = targets.filter((target) => !TARGET_LABELS.has(target));
  return `**Available in:** ${[...labels, ...unknown].join(' · ')}`;
}

function parseComponentJs(component) {
  const jsPath = join(lwcDir, component, `${component}.js`);
  if (!existsSync(jsPath)) return { apiProperties: [], events: [] };
  const source = stripComments(readFileSync(jsPath, 'utf-8'));
  const apiProperties = [...source.matchAll(/@api\s+(?:(?:get|async)\s+)?([A-Za-z_$][\w$]*)/g)].map(
    (match) => match[1]
  );
  const events = [...source.matchAll(/new CustomEvent\(\s*['"]([^'"]+)['"]/g)].map((match) => match[1]);
  return { apiProperties: [...new Set(apiProperties)], events: [...new Set(events)] };
}

/** The Custom Labels the JavaScript files of a bundle import, e.g. CsvImporter_Next. */
function bundleLabels(component) {
  const dir = join(lwcDir, component);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.js'))
    .flatMap((file) => [...readFileSync(join(dir, file), 'utf-8').matchAll(/@salesforce\/label\/c\.(\w+)/g)])
    .map((match) => match[1]);
}

/** Return the body of a `## heading` section, or null if the section is missing. */
function getSection(markdown, heading) {
  const match = markdown.match(new RegExp(`^## ${heading}\\s*$([\\s\\S]*?)(?=^## |(?![\\s\\S]))`, 'm'));
  return match ? match[1] : null;
}

/** Extract the first-column values of a Markdown table (without header rows). */
function getTableRowNames(section) {
  return section
    .split('\n')
    .filter((line) => line.startsWith('|'))
    .slice(2) // header + separator
    .map((line) => line.split('|')[1]?.trim().replace(/`/g, ''))
    .filter(Boolean);
}

function checkComponent(component, errors) {
  const readme = readFileSync(join(lwcDir, component, 'README.md'), 'utf-8');
  const fail = (message) => errors.push(`${component}: ${message}`);

  if (!/^# .+/m.test(readme)) fail('README is missing an H1 title.');

  const meta = parseMeta(component);
  for (const message of checkType({ component, readme, meta, exceptions })) fail(message);

  const expectedLine = expectedAvailabilityLine(meta);
  const availabilityLine = readme.split('\n').find((line) => line.startsWith('**Available in:**'));
  if (!availabilityLine) {
    fail(`README is missing the availability line. Expected: "${expectedLine}"`);
  } else if (availabilityLine.trim() !== expectedLine) {
    fail(`Availability line does not match the js-meta.xml targets. Expected: "${expectedLine}"`);
  }

  const usage = getSection(readme, 'Usage');
  const tag = `c-${toKebabCase(component)}`;
  if (!usage) {
    fail('README is missing a "## Usage" section.');
  } else if (!new RegExp('```html[\\s\\S]*?<' + tag + '[\\s>][\\s\\S]*?```').test(usage)) {
    fail(`The "## Usage" section has no \`\`\`html snippet embedding <${tag}>.`);
  }

  const { apiProperties, events } = parseComponentJs(component);

  if (apiProperties.length > 0) {
    const attributes = getSection(readme, 'Attributes');
    if (!attributes) {
      fail('Component has @api properties but the README is missing an "## Attributes" section.');
    } else {
      const documented = getTableRowNames(attributes);
      const expected = apiProperties.map(toKebabCase);
      for (const name of expected.filter((entry) => !documented.includes(entry))) {
        fail(`@api property "${name}" is not documented in the "## Attributes" table.`);
      }
      for (const name of documented.filter((entry) => !expected.includes(entry))) {
        fail(`Attribute "${name}" is documented but no matching @api property exists.`);
      }
    }
  }

  const dependencies = getTableRowNames(getSection(readme, 'Component Dependencies') ?? '').filter((name) =>
    existsSync(join(lwcDir, name))
  );
  const labels = [...new Set([component, ...dependencies].flatMap(bundleLabels))];
  const labelsSection = getSection(readme, 'Custom Labels');
  const documentedLabels = labelsSection ? getTableRowNames(labelsSection) : [];
  if (labels.length > 0 && !labelsSection) {
    fail('Component uses Custom Labels but the README is missing a "## Custom Labels" section.');
  }
  for (const name of labels.filter((entry) => !documentedLabels.includes(entry))) {
    fail(`Custom Label "${name}" is not documented in the "## Custom Labels" table.`);
  }
  for (const name of documentedLabels.filter((entry) => !labels.includes(entry))) {
    fail(`Custom Label "${name}" is documented but neither the component nor its dependencies use it.`);
  }

  if (events.length > 0) {
    const eventsSection = getSection(readme, 'Events');
    if (!eventsSection) {
      fail(`Component dispatches events (${events.join(', ')}) but the README is missing an "## Events" section.`);
    } else {
      const documented = getTableRowNames(eventsSection);
      for (const name of events.filter((entry) => !documented.includes(entry))) {
        fail(`Event "${name}" is not documented in the "## Events" table.`);
      }
      for (const name of documented.filter((entry) => !events.includes(entry))) {
        fail(`Event "${name}" is documented but never dispatched by the component.`);
      }
    }
  }
}

const components = readdirSync(lwcDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const publicComponents = components.filter((component) => existsSync(join(lwcDir, component, 'README.md')));
const errors = checkExceptions(exceptions, publicComponents);
const usedLabels = new Set(components.flatMap(bundleLabels));
for (const name of [...usedLabels].filter((entry) => !definedLabels.includes(entry))) {
  errors.push(`Custom Label "${name}" is imported but not defined in CustomLabels.labels-meta.xml.`);
}
for (const name of definedLabels.filter((entry) => !usedLabels.has(entry))) {
  errors.push(`Custom Label "${name}" is defined in CustomLabels.labels-meta.xml but no component imports it.`);
}
for (const component of components) {
  const hasReadme = existsSync(join(lwcDir, component, 'README.md'));
  if (!hasReadme) {
    if (parseMeta(component).exposed) {
      errors.push(`${component}: component is exposed in the Lightning App Builder but ships no README.md.`);
    }
    continue;
  }
  checkComponent(component, errors);
}

if (errors.length > 0) {
  console.error(`README check failed with ${errors.length} finding(s):\n`);
  for (const error of errors) console.error(`  - ${error}`);
  process.exit(1);
}
console.log(`README check passed for ${publicComponents.length} public components.`);
