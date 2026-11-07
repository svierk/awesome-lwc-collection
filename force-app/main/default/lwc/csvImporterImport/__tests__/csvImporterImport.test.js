import importRecords from '@salesforce/apex/CsvImportController.importRecords';
import CsvImporterImport from 'c/csvImporterImport';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { createElement } from 'lwc';

jest.mock('@salesforce/apex/CsvImportController.importRecords', () => ({ default: jest.fn() }), { virtual: true });

const leadInfo = require('./data/leadObjectInfo.json');

const HEADERS = ['Name', 'Firm', 'Staff', 'Unread', 'Notes'];
const MAPPING = { Name: 'LastName', Firm: 'Company', Staff: 'NumberOfEmployees', Unread: 'IsUnreadByOwner', Notes: '' };

const row = (index) => ({
  id: `row-${index}`,
  Name: `Lead ${index}`,
  Firm: 'Acme; Inc',
  Staff: '12',
  Unread: 'yes',
  Notes: ''
});

const rowsOf = (count) => Array.from({ length: count }, (_, index) => row(index + 1));

// the result Apex returns for each record: every row saved, the first one as an update
const saveAll = ({ recordsJson }) =>
  Promise.resolve(
    JSON.parse(recordsJson).map((_, index) => ({ success: true, created: index > 0, recordId: `00Q${index}` }))
  );

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let element;
let events;

const query = (selector) => element.shadowRoot.querySelector(selector);

const text = (selector) => query(selector)?.textContent;

const mount = async (props = {}, { loaded = true } = {}) => {
  Object.assign(element, { objectApiName: 'Lead', mapping: MAPPING, headers: HEADERS, rows: rowsOf(3), ...props });
  document.body.appendChild(element);
  if (loaded) {
    getObjectInfo.emit(leadInfo);
  }
  await flushPromises();
};

const runImport = async () => {
  query('lightning-button').click();
  await flushPromises();
  await flushPromises();
};

describe('c-csv-importer-import', () => {
  beforeEach(() => {
    events = [];
    element = createElement('c-csv-importer-import', { is: CsvImporterImport });
    ['importstart', 'importfinish'].forEach((name) =>
      element.addEventListener(name, (event) => events.push([name, event.detail]))
    );
    importRecords.mockImplementation(saveAll);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should say what the import does and be accessible', async () => {
    // when
    await mount();

    // then
    expect(text('.intro')).toBe('3 rows are ready to be imported into Leads. Every row creates a new record.');
    expect(query('lightning-button').disabled).toBe(false);
    await expect(element).toBeAccessible();
  });

  it.each([
    [
      'before the object is loaded',
      {},
      false,
      '3 rows are ready to be imported into Lead. Every row creates a new record.'
    ],
    ['without rows', { rows: [] }, true, '0 rows are ready to be imported into Leads. Every row creates a new record.']
  ])('should not import %s', async (_label, props, loaded, intro) => {
    // when
    await mount(props, { loaded });

    // then
    expect(query('lightning-button').disabled).toBe(true);
    expect(text('.intro')).toBe(intro);
  });

  it.each([
    ['a field of the object', 'Key__c', 'Lead Key'],
    ['a field the object info does not know', 'Id', 'Id']
  ])('should explain the upsert by %s', async (_label, externalIdFieldApiName, keyLabel) => {
    // when
    await mount({ externalIdFieldApiName });

    // then
    expect(text('.intro')).toContain(
      `Rows with the ${keyLabel} of an existing record update it, the others create new records.`
    );
  });

  it('should send the rows in chunks of 200 with the values converted to the field types', async () => {
    // given
    await mount({ rows: rowsOf(450), externalIdFieldApiName: 'Key__c' });

    // when
    await runImport();

    // then
    const calls = importRecords.mock.calls.map(([params]) => params);
    expect(calls.map((params) => JSON.parse(params.recordsJson).length)).toEqual([200, 200, 50]);
    expect(calls[0]).toMatchObject({ objectApiName: 'Lead', externalIdField: 'Key__c' });
    expect(JSON.parse(calls[0].recordsJson)[0]).toEqual({
      LastName: 'Lead 1',
      Company: 'Acme; Inc',
      NumberOfEmployees: 12,
      IsUnreadByOwner: true
    });
    expect(query('lightning-progress-bar').value).toBe(100);
    expect(text('.progress-text')).toBe('Processed 450 of 450 rows.');
    expect(text('.summary')).toBe('Done: 447 created, 3 updated, 0 failed.');
    expect(query('lightning-datatable')).toBeNull();
    expect(events.map(([name]) => name)).toEqual(['importstart', 'importfinish']);
    expect(events[1][1]).toMatchObject({ created: 447, updated: 3, failed: 0 });
    expect(events[1][1].recordIds).toHaveLength(450);
  });

  it('should list the failed rows, also of a call that failed as a whole, and be accessible', async () => {
    // given - the second row of the first chunk fails, and the call of the second chunk as a whole
    const missingCompany = { success: false, created: false, message: 'Required fields are missing: [Company]' };
    importRecords
      .mockImplementationOnce(({ recordsJson }) =>
        saveAll({ recordsJson }).then((results) =>
          results.map((result, index) => (index === 1 ? missingCompany : result))
        )
      )
      .mockRejectedValueOnce({ body: { message: 'Session expired' } });
    await mount({ rows: rowsOf(202) });

    // when
    await runImport();

    // then
    const failures = query('lightning-datatable').data;
    expect(failures.map(({ rowNumber, message }) => [rowNumber, message])).toEqual([
      [2, 'Required fields are missing: [Company]'],
      [201, 'Session expired'],
      [202, 'Session expired']
    ]);
    expect(text('.summary')).toBe('Done: 198 created, 1 updated, 3 failed.');
    expect(events[1][1]).toMatchObject({ created: 198, updated: 1, failed: 3 });
    await expect(element).toBeAccessible();
  });

  it.each([
    ['named after the file', 'leads.csv', ';', 'leads-failed.csv'],
    ['with a default name', '', ',', 'import-failed.csv']
  ])('should download the failed rows with their error, %s', async (_label, fileName, delimiter, download) => {
    // given
    importRecords.mockResolvedValueOnce([
      { success: false, created: false, message: 'Duplicate' },
      { success: true, created: true, recordId: '00Q1' }
    ]);
    await mount({ rows: rowsOf(2), fileName, delimiter });
    await runImport();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture() {
      click.link = this;
    });

    // when
    query('lightning-button').click();

    // then
    expect(click.link.download).toBe(download);
    const csv = decodeURIComponent(click.link.href.split(',').slice(1).join(','));
    const firm = delimiter === ';' ? '"Acme; Inc"' : 'Acme; Inc';
    const header = [...HEADERS, 'Import Error'].join(delimiter);
    const failedRow = ['Lead 1', firm, '12', 'yes', '', 'Duplicate'].join(delimiter);
    expect(csv).toBe(`\uFEFF${header}\r\n${failedRow}`);
    click.mockRestore();
  });
});
