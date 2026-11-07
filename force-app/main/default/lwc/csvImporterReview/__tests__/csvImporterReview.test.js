import CsvImporterReview from 'c/csvImporterReview';
import { getObjectInfo, getPicklistValuesByRecordType } from 'lightning/uiObjectInfoApi';
import { createElement } from 'lwc';

const contactInfo = require('./data/contactObjectInfo.json');
const contactPicklists = require('./data/contactPicklistValues.json');

// a custom field, whose API name ESLint's camelcase rule would flag as a property name
const SCORE = 'Score__c';

const MAPPING = {
  Name: 'LastName',
  Mail: 'Email',
  Born: 'Birthdate',
  Source: 'LeadSource',
  Score: 'Score__c',
  Notes: ''
};

const VALID_ROW = {
  id: 'row-1',
  Name: 'Doe',
  Mail: 'doe@example.com',
  Born: '1990-05-01',
  Source: 'Web',
  Score: '4.5'
};
const INVALID_ROW = { id: 'row-2', Name: '', Mail: 'doe', Born: '01.05.1990', Source: 'Fax', Score: '4,5', Notes: 'x' };

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let element;

const query = (selector) => element.shadowRoot.querySelector(selector);

const table = () => query('lightning-datatable');

const rowErrors = () => table().errors.rows;

const summary = () => query('.summary').textContent;

const mount = async ({ rows = [VALID_ROW, INVALID_ROW], mapping = MAPPING, picklists = true } = {}) => {
  Object.assign(element, { objectApiName: 'Contact', mapping, rows });
  document.body.appendChild(element);
  getObjectInfo.emit(contactInfo);
  await flushPromises();
  if (picklists) {
    getPicklistValuesByRecordType.emit(contactPicklists);
    await flushPromises();
  }
};

const save = async (draftValues) => {
  table().dispatchEvent(new CustomEvent('save', { detail: { draftValues } }));
  await flushPromises();
};

describe('c-csv-importer-review', () => {
  beforeEach(() => {
    element = createElement('c-csv-importer-review', { is: CsvImporterReview });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should show the mapped fields as editable columns, mark the rows with errors and be accessible', async () => {
    // when
    await mount();

    // then
    expect(table().columns).toEqual([
      { label: 'Last Name', fieldName: 'LastName', editable: true },
      { label: 'Email', fieldName: 'Email', editable: true },
      { label: 'Birthdate', fieldName: 'Birthdate', editable: true },
      { label: 'Lead Source', fieldName: 'LeadSource', editable: true },
      { label: 'Rating', fieldName: 'Score__c', editable: true }
    ]);
    expect(table().data[0]).toEqual({
      _key: '1',
      LastName: 'Doe',
      Email: 'doe@example.com',
      Birthdate: '1990-05-01',
      LeadSource: 'Web',
      [SCORE]: '4.5'
    });
    expect(Object.keys(rowErrors())).toEqual(['2']);
    expect(rowErrors()['2']).toEqual({
      title: 'This row has 5 errors.',
      messages: [
        'Last Name is required.',
        'Email: "doe" isn\'t an email address.',
        'Birthdate: "01.05.1990" isn\'t a date. Use YYYY-MM-DD.',
        'Lead Source: "Fax" isn\'t a value of the picklist.',
        'Rating: "4,5" isn\'t a number. Use a dot for decimals, e.g. 1234.5.'
      ],
      fieldNames: ['LastName', 'Email', 'Birthdate', 'LeadSource', 'Score__c']
    });
    expect(summary()).toBe(
      'Rows with errors: 1 of 2 (2). Correct them in the table, or fix the file and upload it again.'
    );
    expect(getPicklistValuesByRecordType.getLastConfig()).toEqual({
      objectApiName: 'Contact',
      recordTypeId: '012000000000000AAA'
    });
    await expect(element).toBeAccessible();
  });

  it('should show only the rows with errors when users ask for it', async () => {
    // given
    await mount();
    const checkbox = query('lightning-input');

    // when
    checkbox.checked = true;
    checkbox.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    expect(table().data.map((record) => record._key)).toEqual(['2']);
    expect(table().columns[0]).toEqual({ label: 'Row', fieldName: '_key', initialWidth: 80 });
  });

  it('should check the rows again with the values users corrected in the table', async () => {
    // given
    await mount();

    // when
    await save([
      { _key: '2', LastName: 'Roe', Email: 'roe@example.com', Birthdate: '1990-05-01' },
      { _key: '2', LeadSource: 'Phone Inquiry', [SCORE]: '4.5' }
    ]);

    // then
    expect(rowErrors()).toEqual({});
    expect(table().draftValues).toEqual([]);
    expect(table().data[1]).toMatchObject({ LastName: 'Roe', LeadSource: 'Phone Inquiry' });
    expect(summary()).toBe('Rows with errors: 0 of 2.');
    expect(query('lightning-input').disabled).toBe(true);
  });

  it('should keep corrections when the mapping changes, and drop them for a new file', async () => {
    // given
    await mount();
    await save([{ _key: '2', LastName: 'Roe' }]);

    // when
    element.mapping = { Name: 'LastName', Notes: 'Email' };
    await flushPromises();
    const afterMapping = table().data[1];
    element.rows = [INVALID_ROW];
    await flushPromises();

    // then
    expect(afterMapping).toEqual({ _key: '2', LastName: 'Roe', Email: 'x' });
    expect(table().data[0]).toEqual({ _key: '1', LastName: '', Email: 'x' });
  });

  it('should list the first ten rows with errors only', async () => {
    // when
    await mount({ rows: Array.from({ length: 12 }, () => INVALID_ROW) });

    // then
    expect(summary()).toContain('Rows with errors: 12 of 12 (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, …).');
  });

  it('should show the rows in pages of 50 and the next page on scrolling down', async () => {
    // given
    await mount({ rows: Array.from({ length: 120 }, () => VALID_ROW) });
    const first = { rows: table().data.length, more: table().enableInfiniteLoading };

    // when
    table().dispatchEvent(new CustomEvent('loadmore'));
    table().dispatchEvent(new CustomEvent('loadmore'));
    await flushPromises();

    // then
    expect(first).toEqual({ rows: 50, more: true });
    expect([table().data.length, table().enableInfiniteLoading]).toEqual([120, false]);
  });

  it('should check everything but picklists when their values cannot be loaded', async () => {
    // given
    await mount({ picklists: false });

    // when
    getPicklistValuesByRecordType.error({ message: 'No access' });
    await flushPromises();

    // then
    expect(query('c-error-alert').message).toBe(
      "The picklist values could not be loaded, so they aren't checked: No access"
    );
    expect(rowErrors()['2'].fieldNames).toEqual(['LastName', 'Email', 'Birthdate', 'Score__c']);
    await expect(element).toBeAccessible();
  });

  it('should wait for the fields of another object before it checks the rows', async () => {
    // given
    await mount();

    // when
    element.objectApiName = 'Lead';
    await flushPromises();
    const before = { columns: table().columns, errors: rowErrors() };
    element.objectApiName = 'Lead';

    // then
    expect(before).toEqual({ columns: [], errors: {} });
    expect(getObjectInfo.getLastConfig()).toEqual({ objectApiName: 'Lead' });
  });

  it('should accept a missing mapping and rows', async () => {
    // when
    await mount({ rows: null, mapping: null });

    // then
    expect({ mapping: element.mapping, rows: element.rows }).toEqual({ mapping: {}, rows: [] });
    expect(table().data).toEqual([]);
    expect(summary()).toBe('Rows with errors: 0 of 0.');
  });
});
