import { parseCsv } from 'c/csvParser';

describe('c-csv-parser', () => {
  it('should parse headers and rows', () => {
    // when
    const { headers, rows, keyField } = parseCsv('Name,Age\nJohn,30\nJane,25');

    // then
    expect(headers).toEqual(['Name', 'Age']);
    expect(keyField).toBe('id');
    expect(rows).toEqual([
      { id: 'row-1', Name: 'John', Age: '30' },
      { id: 'row-2', Name: 'Jane', Age: '25' }
    ]);
  });

  it('should keep delimiters inside quoted fields', () => {
    // when
    const { rows } = parseCsv('Name,City\n"Doe, John","Berlin, Germany"');

    // then
    expect(rows[0]).toMatchObject({ Name: 'Doe, John', City: 'Berlin, Germany' });
  });

  it('should unescape doubled quotes', () => {
    // when
    const { rows } = parseCsv('Name,Note\n"John ""Johnny"" Doe",""""');

    // then
    expect(rows[0]).toMatchObject({ Name: 'John "Johnny" Doe', Note: '"' });
  });

  it('should keep line breaks inside quoted fields', () => {
    // when
    const { rows } = parseCsv('Name,Address\nJohn,"Main St 1\r\nBerlin"\nJane,"Elm St 2\nHamburg"');

    // then
    expect(rows).toHaveLength(2);
    expect(rows[0].Address).toBe('Main St 1\r\nBerlin');
    expect(rows[1].Address).toBe('Elm St 2\nHamburg');
  });

  it('should support crlf and cr line endings', () => {
    // when
    const crlf = parseCsv('A,B\r\n1,2\r\n3,4\r\n');
    const cr = parseCsv('A,B\r1,2\r3,4');

    // then
    expect(crlf.rows).toHaveLength(2);
    expect(crlf.rows[1]).toMatchObject({ A: '3', B: '4' });
    expect(cr.rows).toHaveLength(2);
    expect(cr.rows[1]).toMatchObject({ A: '3', B: '4' });
  });

  it('should remove a leading byte order mark', () => {
    // when
    const { headers } = parseCsv('\uFEFFName,Age\nJohn,30');

    // then
    expect(headers).toEqual(['Name', 'Age']);
  });

  it('should ignore empty lines', () => {
    // when
    const { headers, rows } = parseCsv('\nName,Age\n\nJohn,30\n,\n   \nJane,25\n\n');

    // then
    expect(headers).toEqual(['Name', 'Age']);
    expect(rows.map((row) => row.Name)).toEqual(['John', 'Jane']);
  });

  it('should keep rows with partly empty fields and whitespace in values', () => {
    // when
    const { rows } = parseCsv('Name,Age\n John ,\n,30');

    // then
    expect(rows[0]).toMatchObject({ Name: ' John ', Age: '' });
    expect(rows[1]).toMatchObject({ Name: '', Age: '30' });
  });

  it('should fill missing columns with empty strings', () => {
    // when
    const { rows } = parseCsv('A,B,C\n1');

    // then
    expect(rows[0]).toEqual({ id: 'row-1', A: '1', B: '', C: '' });
  });

  it('should ignore columns beyond the header', () => {
    // when
    const { rows } = parseCsv('A,B\n1,2,3,4');

    // then
    expect(rows[0]).toEqual({ id: 'row-1', A: '1', B: '2' });
  });

  it('should return no headers and rows for an empty file', () => {
    // when
    const empty = parseCsv('');
    const blank = parseCsv('\uFEFF\r\n\r\n');

    // then
    expect(empty).toEqual({ headers: [], rows: [], keyField: 'id' });
    expect(blank).toEqual({ headers: [], rows: [], keyField: 'id' });
  });

  it('should return headers without rows for a file with only a header', () => {
    // when
    const { headers, rows } = parseCsv('Name,Age\n');

    // then
    expect(headers).toEqual(['Name', 'Age']);
    expect(rows).toEqual([]);
  });

  it('should not overwrite a csv column named like the row key', () => {
    // when
    const { headers, rows, keyField } = parseCsv('id,_id,Name\n42,43,John');

    // then
    expect(headers).toEqual(['id', '_id', 'Name']);
    expect(keyField).toBe('__id');
    expect(rows[0]).toEqual({ __id: 'row-1', id: '42', _id: '43', Name: 'John' });
  });

  it('should keep every column when headers are empty or duplicated', () => {
    // when
    const { headers, rows } = parseCsv('Name,,Name,Name (2)\na,b,c,d');

    // then
    expect(headers).toEqual(['Name', 'Column 2', 'Name (2)', 'Name (2) (2)']);
    expect(rows[0]).toEqual({ id: 'row-1', Name: 'a', 'Column 2': 'b', 'Name (2)': 'c', 'Name (2) (2)': 'd' });
  });

  it('should store a column named __proto__ as plain data', () => {
    // when
    const { rows } = parseCsv('__proto__,Name\npolluted,John');

    // then
    expect(Object.keys(rows[0])).toEqual(['id', '__proto__', 'Name']);
    expect(Object.getPrototypeOf(rows[0])).toBe(Object.prototype);
  });

  it('should treat quotes inside unquoted fields as literal characters', () => {
    // when
    const { rows } = parseCsv('Size,Name\n5" display,"Quoted" tail');

    // then
    expect(rows[0]).toMatchObject({ Size: '5" display', Name: 'Quoted tail' });
  });

  it('should throw with the line number when a quote is never closed', () => {
    // when / then
    expect(() => parseCsv('Name,Note\nJohn,ok\nJane,"open\nmore')).toThrow(
      'Invalid CSV: the quoted field starting on line 3 is never closed.'
    );
  });
});
