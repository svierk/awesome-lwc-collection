/**
 * The rules for the "**Type:**" line in the component READMEs, used by the
 * README check and the docs generator.
 */
const EXAMPLE_ALLOWLIST = ['helloWorld'];

const BADGE_BY_TYPE = new Map([
  ['Component', 'tip'],
  ['Building Block', 'info'],
  ['Utility', 'info'],
  ['Example', 'warning']
]);

const TYPE_NAMES = [...BADGE_BY_TYPE.keys()].join(' | ');
const EXCEPTIONS_FILE = 'scripts/readme-exceptions.json';

/** Return the type from the line directly below the first paragraph, or null. */
export function parseType(readme) {
  const match = readme.match(/^# .+\n+(?:[^\n]+\n)+\n\*\*Type:\*\* (.+)$/m);
  return match ? match[1].trim() : null;
}

function checkComponentRequirements(meta) {
  const errors = [];
  if (!meta.exposed) errors.push('Type "Component" requires isExposed=true in the js-meta.xml.');
  if (meta.properties === 0) errors.push('Type "Component" requires at least one <property> in the js-meta.xml.');
  return errors;
}

/** Return the findings for one component's type line. */
export function checkType({ component, readme, meta, exceptions }) {
  const type = parseType(readme);
  if (!type) return [`README needs a line "**Type:** <${TYPE_NAMES}>" directly below the first paragraph.`];
  if (!BADGE_BY_TYPE.has(type)) return [`Unknown type "${type}". Use one of: ${TYPE_NAMES}.`];
  if (type === 'Example' && !EXAMPLE_ALLOWLIST.includes(component)) {
    return [`Type "Example" is only allowed for ${EXAMPLE_ALLOWLIST.join(', ')}.`];
  }

  const requirements = type === 'Component' ? checkComponentRequirements(meta) : [];
  const isListed = Object.hasOwn(exceptions, component);
  if (isListed && requirements.length === 0) {
    return [`The exception is no longer needed - remove it from ${EXCEPTIONS_FILE}.`];
  }
  return isListed ? [] : requirements;
}

/** Return the findings for entries of the exception list itself. */
export function checkExceptions(exceptions, publicComponents) {
  return Object.entries(exceptions).flatMap(([component, reference]) => {
    if (!publicComponents.includes(component)) {
      return [`${component}: ${EXCEPTIONS_FILE} lists it, but there is no public component with this name.`];
    }
    return reference
      ? []
      : [`${component}: the entry in ${EXCEPTIONS_FILE} needs the issue or milestone resolving it.`];
  });
}

/**
 * Render the value of the type line as a VitePress badge. The Markdown copies
 * for agents would lose the badge, so they get the type as plain text instead.
 */
export function toTypeBadge(readme) {
  return readme.replace(/^\*\*Type:\*\* (.+)$/m, (line, type) => {
    const name = type.trim();
    if (!BADGE_BY_TYPE.has(name)) return line;
    const badge = `<Badge type="${BADGE_BY_TYPE.get(name)}" text="${name}" />`;
    return `**Type:** <llm-exclude>${badge}</llm-exclude><llm-only>${name}</llm-only>`;
  });
}
