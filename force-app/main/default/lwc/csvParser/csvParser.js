const DELIMITER = ',';
const QUOTE = '"';

function lineOf(text, index) {
  return text.slice(0, index).split(/\r\n|\r|\n/).length;
}

/** Splits the text into records of raw field values, following RFC 4180. */
function readRecords(text) {
  const records = [];
  let record = [];
  let field = '';
  let quoteStart = -1;

  const endField = () => {
    record.push(field);
    field = '';
  };
  const endRecord = () => {
    endField();
    records.push(record);
    record = [];
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoteStart >= 0) {
      if (char !== QUOTE) {
        field += char;
      } else if (text[i + 1] === QUOTE) {
        field += QUOTE;
        i++;
      } else {
        quoteStart = -1;
      }
    } else if (char === QUOTE && field === '') {
      quoteStart = i;
    } else if (char === DELIMITER) {
      endField();
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      endRecord();
    } else {
      field += char;
    }
  }

  if (quoteStart >= 0) {
    throw new Error(`Invalid CSV: the quoted field starting on line ${lineOf(text, quoteStart)} is never closed.`);
  }
  if (field !== '' || record.length > 0) endRecord();
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
    for (let count = 2; used.has(header); count++) {
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
 * Parses comma separated text according to RFC 4180.
 *
 * Quoted fields may contain delimiters, line breaks and doubled quotes. A byte order mark and empty lines are
 * ignored. Rows with fewer columns than the header are filled with empty strings, values beyond the last header
 * column are dropped.
 *
 * @param {string} text - The content of the file
 * @returns {{headers: string[], rows: Object[], keyField: string}} The unique column names, one object per row and
 * the name of the property holding each row's synthetic key: `id`, or `_id` if the file has an `id` column.
 * @throws {Error} If a quoted field is never closed
 */
export function parseCsv(text) {
  const records = readRecords(text.replace(/^\uFEFF/, '')).filter((record) => !isBlank(record));
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
