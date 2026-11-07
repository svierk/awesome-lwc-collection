const QUOTE = '"';
const DELIMITERS = [',', ';', '\t'];

function lineOf(text, index) {
  return text.slice(0, index).split(/\r\n|\r|\n/).length;
}

/** Reads the quoted field that opens at `start` and returns its value and the index behind the closing quote. */
function readQuotedField(text, start) {
  let value = '';
  let index = start + 1;
  while (index < text.length) {
    if (text[index] !== QUOTE) {
      value += text[index];
      index += 1;
    } else if (text[index + 1] === QUOTE) {
      value += QUOTE;
      index += 2;
    } else {
      return { value, end: index + 1 };
    }
  }
  throw new Error(`Invalid CSV: the quoted field starting on line ${lineOf(text, start)} is never closed.`);
}

function lineBreakLength(text, index) {
  if (text[index] === '\r' && text[index + 1] === '\n') return 2;
  return text[index] === '\n' || text[index] === '\r' ? 1 : 0;
}

/** Splits the text into records of raw field values, following RFC 4180. */
function readRecords(text, delimiter) {
  const records = [];
  let record = [];
  let field = '';
  let index = 0;

  while (index < text.length) {
    const breakLength = lineBreakLength(text, index);
    if (text[index] === QUOTE && field === '') {
      ({ value: field, end: index } = readQuotedField(text, index));
    } else if (text[index] === delimiter) {
      record.push(field);
      field = '';
      index += 1;
    } else if (breakLength > 0) {
      records.push([...record, field]);
      record = [];
      field = '';
      index += breakLength;
    } else {
      field += text[index];
      index += 1;
    }
  }

  if (field !== '' || record.length > 0) records.push([...record, field]);
  return records;
}

function isBlank(record) {
  return record.every((value) => value.trim() === '');
}

/** Gives empty and duplicate column names a unique name, so that no column gets lost. */
function toUniqueHeaders(rawHeaders) {
  const used = new Set();
  return rawHeaders.map((rawHeader, index) => {
    const base = rawHeader.trim() === '' ? `Column ${index + 1}` : rawHeader;
    let header = base;
    let count = 1;
    while (used.has(header)) {
      count += 1;
      header = `${base} (${count})`;
    }
    used.add(header);
    return header;
  });
}

function toKeyField(headers) {
  let keyField = 'id';
  while (headers.includes(keyField)) {
    keyField = `_${keyField}`;
  }
  return keyField;
}

/**
 * Detects the delimiter from the first line: the comma, semicolon or tab that occurs most often outside quoted fields.
 *
 * @param {string} text - The content of the file
 * @returns {string} The delimiter, a comma if none of them occurs
 */
export function detectDelimiter(text) {
  const counts = new Map(DELIMITERS.map((delimiter) => [delimiter, 0]));
  let quoted = false;
  for (const char of text.replace(/^\uFEFF/, '')) {
    if (char === QUOTE) {
      quoted = !quoted;
    } else if (!quoted && (char === '\n' || char === '\r')) {
      break;
    } else if (!quoted && counts.has(char)) {
      counts.set(char, counts.get(char) + 1);
    }
  }
  return DELIMITERS.reduce((best, delimiter) => (counts.get(delimiter) > counts.get(best) ? delimiter : best), ',');
}

/**
 * Parses delimiter separated text according to RFC 4180.
 *
 * Quoted fields may contain delimiters, line breaks and doubled quotes. A byte order mark and empty lines are
 * ignored. Rows with fewer columns than the header are filled with empty strings, values beyond the last header
 * column are dropped.
 *
 * @param {string} text - The content of the file
 * @param {{delimiter: string}} [options] - The delimiter, a comma by default
 * @returns {{headers: string[], rows: Object[], keyField: string}} The unique column names, one object per row and
 * the name of the property holding each row's synthetic key: `id`, or `_id` if the file has an `id` column.
 * @throws {Error} If a quoted field is never closed
 */
export function parseCsv(text, { delimiter = ',' } = {}) {
  const records = readRecords(text.replace(/^\uFEFF/, ''), delimiter).filter((record) => !isBlank(record));
  const headers = toUniqueHeaders(records[0] ?? []);
  const keyField = toKeyField(headers);
  const rows = records
    .slice(1)
    .map((record, index) =>
      Object.fromEntries([
        [keyField, `row-${index + 1}`],
        ...headers.map((header, column) => [header, record[column] ?? ''])
      ])
    );
  return { headers, rows, keyField };
}
