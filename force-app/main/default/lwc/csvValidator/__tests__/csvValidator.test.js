import { checkValue, convertValue, isRequired, picklistValues, validateRecords } from 'c/csvValidator';

const field = (dataType, props = {}) => ({ apiName: 'Field', label: 'Field', dataType, ...props });

describe('c-csv-validator', () => {
  it.each([
    ['a required field without a default', { required: true, defaultedOnCreate: false }, true],
    ['a required field with a default', { required: true, defaultedOnCreate: true }, false],
    ['an optional field', { required: false, defaultedOnCreate: false }, false]
  ])('should tell whether %s must have a value', (_label, props, expected) => {
    // then
    expect(isRequired(field('String', props))).toBe(expected);
  });

  it.each([
    ['Int', ['42', '-7', ' +3 '], ['4.2', '1e3', 'abc'], "isn't a whole number"],
    ['Double', ['4.2', '-0.5', '10'], ['4,2', '.5', '1.'], "isn't a number. Use a dot for decimals"],
    ['Currency', ['1234.56'], ['€12'], "isn't a number"],
    ['Percent', ['12.5'], ['12%'], "isn't a number"],
    ['Date', ['2026-11-07', '2024-02-29'], ['07.11.2026', '2026-02-30', '2026-13-01'], 'Use YYYY-MM-DD'],
    [
      'DateTime',
      ['2026-11-07T10:30:00Z', '2026-11-07T10:30', '2026-11-07T10:30:00.123+01:00', '2026-11-07T10:30+0100'],
      ['2026-11-07 10:30', '2026-11-07T25:00:00Z', '2026-02-30T10:00:00Z', '2026-11-07T10:30:00+1', '2026-11-07'],
      'Use YYYY-MM-DDThh:mm:ssZ'
    ],
    ['Boolean', ['true', 'FALSE', 'Yes', 'no', '1', '0'], ['y', 'maybe'], "isn't true or false"],
    [
      'Email',
      ['anna@example.com', 'a.b+c@mail.example.de'],
      [
        'anna',
        'anna@',
        '@example.com',
        'anna@example',
        'a b@example.com',
        'a@b@example.com',
        'anna@.com',
        'anna@example.'
      ],
      "isn't an email address"
    ]
  ])('should check values of %s fields', (dataType, valid, invalid, message) => {
    // then
    valid.forEach((value) => expect(checkValue(value, field(dataType))).toBe(''));
    invalid.forEach((value) => expect(checkValue(value, field(dataType))).toContain(message));
  });

  it('should check picklist values, and multi-select ones each on their own', () => {
    // given
    const values = ['Web', 'Phone Inquiry'];

    // then
    expect(checkValue('Web', field('Picklist'), values)).toBe('');
    expect(checkValue('web', field('Picklist'), values)).toBe('Field: "web" isn\'t a value of the picklist.');
    expect(checkValue('Web;Phone Inquiry', field('MultiPicklist'), values)).toBe('');
    expect(checkValue('Web;Fax', field('MultiPicklist'), values)).toBe('Field: "Fax" isn\'t a value of the picklist.');
    expect(checkValue('Fax', field('Picklist'))).toBe('');
  });

  it('should accept empty values unless the field is required, and other values of fields it has no rule for', () => {
    // then
    expect(checkValue('  ', field('Int'))).toBe('');
    expect(checkValue(undefined, field('Email'))).toBe('');
    expect(checkValue(' ', field('String', { required: true }))).toBe('Field is required.');
    expect(checkValue('anything', field('String'))).toBe('');
  });

  it('should collect the errors of every row for the datatable', () => {
    // given
    const fields = [
      field('String', { apiName: 'LastName', label: 'Last Name', required: true }),
      field('Email', { apiName: 'Email', label: 'Email' })
    ];
    const records = [
      { key: 'row-1', LastName: 'Doe', Email: 'doe@example.com' },
      { key: 'row-2', LastName: '', Email: 'doe' },
      { key: 'row-3', Email: 'jane@example.com' }
    ];

    // when
    const errors = validateRecords(records, fields, 'key');

    // then
    expect(errors).toEqual({
      'row-2': {
        title: 'This row has 2 errors.',
        messages: ['Last Name is required.', 'Email: "doe" isn\'t an email address.'],
        fieldNames: ['LastName', 'Email']
      },
      'row-3': {
        title: 'This row has an error.',
        messages: ['Last Name is required.'],
        fieldNames: ['LastName']
      }
    });
  });

  it('should read the values of every picklist from the UI API', () => {
    // given
    const data = { picklistFieldValues: { LeadSource: { values: [{ value: 'Web', label: 'Website' }] } } };

    // then
    expect(picklistValues(data)).toEqual({ LeadSource: ['Web'] });
    expect(picklistValues(undefined)).toEqual({});
  });

  it.each([
    ['Int', ' +42 ', 42],
    ['Double', '-0.5', -0.5],
    ['Currency', '1234.56', 1234.56],
    ['Percent', '12.5', 12.5],
    ['Boolean', 'Yes', true],
    ['Boolean', '0', false],
    ['DateTime', '2026-11-07T10:30:00+01:00', '2026-11-07T09:30:00.000Z'],
    ['MultiPicklist', 'Web ; Phone Inquiry', 'Web;Phone Inquiry'],
    ['Date', '2026-11-07', '2026-11-07'],
    ['String', ' Anna ', 'Anna'],
    ['String', '  ', undefined],
    ['String', undefined, undefined]
  ])('should convert a value of a %s field', (dataType, value, expected) => {
    // then
    expect(convertValue(value, field(dataType))).toEqual(expected);
  });
});
