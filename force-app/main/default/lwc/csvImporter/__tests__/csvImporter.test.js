import CsvImporter from 'c/csvImporter';
import { FlowAttributeChangeEventName } from 'lightning/flowSupport';
import { createElement } from 'lwc';
import { TextDecoder, TextEncoder } from 'node:util';

// jsdom has no text encoding API, browsers do
Object.assign(globalThis, { TextDecoder, TextEncoder });

// a file whose content is read through arrayBuffer(), from text or raw bytes
const createFile = (content, name = 'test.csv', size) => {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : Uint8Array.from(content);
  const file = new File([bytes], name, { type: 'text/csv' });
  file.arrayBuffer = jest.fn().mockResolvedValue(bytes.buffer);
  if (size !== undefined) {
    Object.defineProperty(file, 'size', { value: size });
  }
  return file;
};

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let element;

const query = (selector) => element.shadowRoot.querySelector(selector);

const errorMessage = () => query('c-error-alert')?.message;

const datatable = () => query('lightning-datatable');

const summary = () => query('.summary')?.textContent;

const upload = async (file) => {
  query('lightning-input').dispatchEvent(new CustomEvent('change', { detail: { files: file ? [file] : [] } }));
  await flushPromises();
};

const next = () => query('lightning-button[data-id="next"]');

const back = () => query('lightning-button[data-id="back"]');

const go = async () => {
  next().click();
  await flushPromises();
};

const send = async (selector, name, detail) => {
  query(selector).dispatchEvent(new CustomEvent(name, { detail }));
  await flushPromises();
};

const choose = async (name, value) => {
  query(`lightning-combobox[data-id="${name}"]`).dispatchEvent(new CustomEvent('change', { detail: { value } }));
  await flushPromises();
};

describe('c-csv-importer', () => {
  beforeEach(() => {
    element = createElement('c-csv-importer', {
      is: CsvImporter
    });
    document.body.appendChild(element);
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should render the upload with encoding and delimiter choices and be accessible', async () => {
    // then
    const card = query('lightning-card');
    expect([card.title, card.iconName]).toEqual(['CSV Importer', 'doctype:csv']);
    expect(query('lightning-input').accept).toBe('.csv,.txt,text/csv');
    expect(query('lightning-combobox[data-id="encoding"]').value).toBe('utf-8');
    expect(query('lightning-combobox[data-id="delimiter"]').value).toBe('auto');
    expect(datatable()).toBeNull();
    await expect(element).toBeAccessible();
  });

  it('should preview the rows of a valid file', async () => {
    // when
    await upload(createFile('Name,Age,City\r\nJohn,30,New York\r\nJane,25,Los Angeles', 'employees.csv'));

    // then
    expect(datatable().columns).toHaveLength(3);
    expect(datatable().columns[0]).toEqual({ label: 'Name', fieldName: 'Name' });
    expect(datatable().keyField).toBe('id');
    expect(datatable().hideCheckboxColumn).toBe(true);
    expect(datatable().data).toEqual([
      { id: 'row-1', Name: 'John', Age: '30', City: 'New York' },
      { id: 'row-2', Name: 'Jane', Age: '25', City: 'Los Angeles' }
    ]);
    expect(summary()).toBe('employees.csv: showing 2 of 2 rows, separated by comma.');
    await expect(element).toBeAccessible();
  });

  it('should preview only the first 20 rows', async () => {
    // given
    const lines = Array.from({ length: 25 }, (_, i) => `Row ${i + 1}`);

    // when
    await upload(createFile(['Name', ...lines].join('\n'), 'long.csv'));

    // then
    expect(datatable().data).toHaveLength(20);
    expect(datatable().data.at(-1).Name).toBe('Row 20');
    expect(summary()).toBe('long.csv: showing 20 of 25 rows, separated by comma.');
  });

  it.each([
    [
      'a semicolon',
      'Name;City\n"Doe; John";Berlin, Germany',
      'semicolon',
      { Name: 'Doe; John', City: 'Berlin, Germany' }
    ],
    ['a tab', 'Name\tCity\nJohn\tBerlin', 'tab', { Name: 'John', City: 'Berlin' }]
  ])('should detect %s as the delimiter', async (_label, content, name, row) => {
    // when
    await upload(createFile(content));

    // then
    expect(datatable().data[0]).toMatchObject(row);
    expect(summary()).toContain(`separated by ${name}.`);
  });

  it('should parse the file again with a chosen delimiter', async () => {
    // given
    await upload(createFile('Name;City\nJohn;Berlin'));

    // when
    await choose('delimiter', ',');

    // then
    expect(datatable().columns).toEqual([{ label: 'Name;City', fieldName: 'Name;City' }]);
    expect(summary()).toContain('separated by comma.');
  });

  it('should decode the file again with a chosen encoding', async () => {
    // given - "Müller" in Windows-1252, where ü is the single byte 0xFC
    const bytes = [...new TextEncoder().encode('Name\nM'), 0xfc, ...new TextEncoder().encode('ller')];
    await upload(createFile(bytes));
    const asUtf8 = datatable().data[0].Name;

    // when
    await choose('encoding', 'windows-1252');

    // then
    expect(asUtf8).not.toBe('Müller');
    expect(datatable().data[0].Name).toBe('Müller');
  });

  it('should use a separate key field when the csv has an id column', async () => {
    // when
    await upload(createFile('id,Name\n42,John'));

    // then
    expect(datatable().keyField).toBe('_id');
    expect(datatable().data).toEqual([{ _id: 'row-1', id: '42', Name: 'John' }]);
  });

  it('should ignore an empty selection and a choice before any file', async () => {
    // when
    await choose('encoding', 'windows-1252');
    await upload();

    // then
    expect(datatable()).toBeNull();
    expect(errorMessage()).toBeUndefined();
  });

  it.each([
    [
      'larger than the limit',
      { maxFileSizeMb: 1 },
      createFile('Name\nJohn', 'big.csv', 2 * 1024 * 1024),
      'The file is larger than 1 MB.'
    ],
    [
      'larger than the default limit',
      { maxFileSizeMb: 0 },
      createFile('Name\nJohn', 'big.csv', 6 * 1024 * 1024),
      'The file is larger than 5 MB.'
    ],
    ['with more rows than allowed', { maxRows: 2 }, createFile('Name\nA\nB\nC'), 'The file has more than 2 rows.'],
    [
      'not valid csv',
      {},
      createFile('Name,Note\nJane,"open'),
      'Invalid CSV: the quoted field starting on line 2 is never closed.'
    ]
  ])('should show an error and no preview for a file %s', async (_label, props, file, message) => {
    // given
    Object.assign(element, props);
    await upload(createFile('Name\nPrevious'));

    // when
    await upload(file);

    // then
    expect(errorMessage()).toBe(message);
    expect(datatable()).toBeNull();
    await expect(element).toBeAccessible();
  });

  it('should show an error when the file cannot be read', async () => {
    // given
    const file = createFile('content', 'error.csv');
    file.arrayBuffer.mockRejectedValue(new Error('File read error'));

    // when
    await upload(file);

    // then
    expect(errorMessage()).toBe('The file could not be read: File read error');
  });

  it('should remove the error when a valid file follows', async () => {
    // given
    await upload(createFile('Name\n"open'));

    // when
    await upload(createFile('Name\nJohn'));

    // then
    expect(errorMessage()).toBeUndefined();
    expect(datatable().data).toHaveLength(1);
  });

  it('should dispatch parsed with the file name, the data and the delimiter', async () => {
    // given
    const handler = jest.fn();
    element.addEventListener('parsed', handler);

    // when
    await upload(createFile('Name;Age\nJohn;30', 'people.csv'));

    // then
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({
      fileName: 'people.csv',
      headers: ['Name', 'Age'],
      keyField: 'id',
      rows: [{ id: 'row-1', Name: 'John', Age: '30' }],
      delimiter: ';'
    });
  });

  it('should not dispatch parsed for a file with errors', async () => {
    // given
    const handler = jest.fn();
    element.addEventListener('parsed', handler);

    // when
    await upload(createFile('Name\n"open'));

    // then
    expect(handler).not.toHaveBeenCalled();
  });

  it('should keep its preview when a listener changes the event data', async () => {
    // given
    element.addEventListener('parsed', (event) => {
      event.detail.rows[0].Name = 'Changed';
    });

    // when
    await upload(createFile('Name\nJohn'));

    // then
    expect(datatable().data[0].Name).toBe('John');
  });

  it('should go to the mapping step only with rows and back again', async () => {
    // given
    element.importObjectApiName = 'Contact';
    const disabledWithoutRows = next().disabled;
    await upload(createFile('Name,Email\nJohn,john@example.com'));

    // when
    await go();
    const onMapStep = {
      step: query('lightning-progress-indicator').currentStep,
      upload: query('[data-id="upload-step"]').className,
      map: query('[data-id="map-step"]').className
    };
    const mapping = query('c-csv-importer-mapping');
    back().click();
    await flushPromises();

    // then
    expect(disabledWithoutRows).toBe(true);
    expect(onMapStep).toEqual({ step: 'map', upload: 'slds-hide', map: '' });
    expect(mapping.headers).toEqual(['Name', 'Email']);
    expect(mapping.sampleRow).toEqual({ id: 'row-1', Name: 'John', Email: 'john@example.com' });
    expect(mapping.fixedObjectApiName).toBe('Contact');
    expect(query('lightning-progress-indicator').currentStep).toBe('upload');
    expect(query('[data-id="map-step"]').className).toBe('slds-hide');
    await expect(element).toBeAccessible();
  });

  it('should go through the review to the import and pass on what each step needs', async () => {
    // given
    element.externalIdFieldApiName = 'Email';
    const imported = jest.fn();
    element.addEventListener('imported', imported);
    await upload(createFile('Name;Email\nJohn;john@example.com', 'leads.csv'));
    await go();
    const disabled = { map: next().disabled };
    const mapping = { Name: 'LastName', Email: 'Email' };
    const correctedRows = [{ id: 'row-1', Name: 'Johnny', Email: 'john@example.com' }];

    // when
    await send('c-csv-importer-mapping', 'mappingchange', { objectApiName: 'Contact', mapping, valid: true });
    await go();
    disabled.review = next().disabled;
    const review = query('c-csv-importer-review');
    await send('c-csv-importer-review', 'reviewchange', { rows: correctedRows, valid: true });
    await go();
    const importStep = query('c-csv-importer-import');
    const onImportStep = [query('[data-id="import-step"]').className, next().className, back().className];
    await send('c-csv-importer-import', 'importstart');
    const backAfterStart = back().className;
    const flowChanges = {};
    element.addEventListener(FlowAttributeChangeEventName, (event) => {
      flowChanges[event.detail.attributeName] = event.detail.attributeValue;
    });
    await send('c-csv-importer-import', 'importfinish', {
      created: 1,
      updated: 1,
      failed: 2,
      recordIds: ['003x', '003y'],
      createdRecordIds: ['003x']
    });

    // then
    expect(disabled).toEqual({ map: true, review: true });
    expect(query('c-csv-importer-mapping').keyFieldApiName).toBe('Email');
    expect([review.objectApiName, review.mapping, review.rows.length]).toEqual(['Contact', mapping, 1]);
    expect(query('lightning-progress-indicator').currentStep).toBe('import');
    expect(onImportStep).toEqual(['', 'slds-col_bump-left slds-hide', '']);
    expect(backAfterStart).toBe('slds-hide');
    expect([
      importStep.objectApiName,
      importStep.mapping,
      importStep.rows,
      importStep.headers,
      importStep.delimiter,
      importStep.fileName,
      importStep.externalIdFieldApiName
    ]).toEqual(['Contact', mapping, correctedRows, ['Name', 'Email'], ';', 'leads.csv', 'Email']);
    expect(imported.mock.calls[0][0].detail).toEqual({
      objectApiName: 'Contact',
      created: 1,
      updated: 1,
      failed: 2,
      recordIds: ['003x', '003y'],
      createdRecordIds: ['003x']
    });
    expect(flowChanges).toEqual({ successCount: 2, failedCount: 2, createdRecordIds: ['003x'] });
    expect([element.successCount, element.failedCount, element.createdRecordIds]).toEqual([2, 2, ['003x']]);
    await expect(element).toBeAccessible();
  });

  it('should start over with the upload after an import and keep the chosen encoding', async () => {
    // given
    await upload(createFile('Name\nJohn'));
    await choose('encoding', 'windows-1252');
    await go();
    await send('c-csv-importer-mapping', 'mappingchange', {
      objectApiName: 'Lead',
      mapping: { Name: 'LastName' },
      valid: true
    });
    await go();
    await send('c-csv-importer-review', 'reviewchange', { rows: [{ Name: 'John' }], valid: true });
    await go();
    const fileInput = query('lightning-input');
    await send('c-csv-importer-import', 'importstart');
    await send('c-csv-importer-import', 'importfinish', {
      created: 1,
      updated: 0,
      failed: 0,
      recordIds: ['00Qx'],
      createdRecordIds: ['00Qx']
    });
    const flowChanges = [];
    element.addEventListener(FlowAttributeChangeEventName, (event) => flowChanges.push(event.detail.attributeName));

    // when
    query('lightning-button[data-id="new-import"]').click();
    await flushPromises();

    // then
    expect(query('lightning-progress-indicator').currentStep).toBe('upload');
    expect(query('lightning-input')).not.toBe(fileInput);
    expect(query('lightning-combobox[data-id="encoding"]').value).toBe('windows-1252');
    expect([datatable(), query('c-csv-importer-mapping'), query('c-csv-importer-import')]).toEqual([null, null, null]);
    expect([next().disabled, back().className]).toEqual([true, 'slds-hide']);
    expect(query('lightning-button[data-id="new-import"]')).toBeNull();
    expect([element.successCount, element.failedCount, element.createdRecordIds]).toEqual([0, 0, []]);
    expect(flowChanges).toEqual(['successCount', 'failedCount', 'createdRecordIds']);
    await expect(element).toBeAccessible();
  });
});
