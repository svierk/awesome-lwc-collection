import CsvImporterMapping from 'c/csvImporterMapping';
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import { createElement } from 'lwc';

const contactInfo = require('./data/contactObjectInfo.json');

const HEADERS = ['First Name', 'Last-Name', 'E-Mail', 'Phone', 'Score', 'Notes'];

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let element;
let changes;

const query = (selector) => element.shadowRoot.querySelector(selector);

const queryAll = (selector) => [...element.shadowRoot.querySelectorAll(selector)];

const mappedFields = () => queryAll('lightning-combobox').map((box) => box.value);

const lastChange = () => changes.at(-1);

const mount = async (props = {}) => {
  Object.assign(element, { headers: HEADERS, sampleRow: { 'First Name': 'Anna', Notes: 'VIP' }, ...props });
  document.body.appendChild(element);
  await flushPromises();
};

const loadContact = async () => {
  getObjectInfo.emit(contactInfo);
  await flushPromises();
};

const mappingFile = (content) => {
  const file = new File([content], 'mapping.json', { type: 'application/json' });
  file.text = jest.fn().mockResolvedValue(content);
  return file;
};

const importMapping = async (content) => {
  const files = content === undefined ? [] : [mappingFile(content)];
  query('[data-id="mapping-file"]').dispatchEvent(new CustomEvent('change', { detail: { files } }));
  await flushPromises();
  await flushPromises();
};

describe('c-csv-importer-mapping', () => {
  beforeEach(() => {
    changes = [];
    element = createElement('c-csv-importer-mapping', { is: CsvImporterMapping });
    element.addEventListener('mappingchange', (event) => changes.push(event.detail));
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should match the columns to fields by label and API name and be accessible', async () => {
    // given
    await mount({ fixedObjectApiName: 'Contact' });

    // when
    await loadContact();

    // then
    expect(getObjectInfo.getLastConfig()).toEqual({ objectApiName: 'Contact' });
    expect(query('[data-id="object"]').readOnly).toBe(true);
    expect(query('.object-label').textContent.trim()).toBe('Importing into Contact.');
    expect(mappedFields()).toEqual(['FirstName', 'LastName', 'Email', 'Phone', 'Score__c', '']);
    expect(queryAll('tbody td div').map((cell) => cell.textContent)).toEqual(['Anna', '', '', '', '', 'VIP']);
    expect(lastChange()).toEqual({
      objectApiName: 'Contact',
      objectLabel: 'Contact',
      mapping: {
        'First Name': 'FirstName',
        'Last-Name': 'LastName',
        'E-Mail': 'Email',
        Phone: 'Phone',
        Score: 'Score__c',
        Notes: ''
      },
      valid: true
    });
    await expect(element).toBeAccessible();
  });

  it('should offer only the fields records can be created with, sorted by label after the skip option', async () => {
    // given
    await mount({ fixedObjectApiName: 'Contact' });

    // when
    await loadContact();

    // then
    expect(query('lightning-combobox').options.map((option) => option.value)).toEqual([
      '',
      'Phone',
      'Email',
      'FirstName',
      'LastName',
      'Score__c'
    ]);
  });

  it('should load the object users enter and show nothing before', async () => {
    // given - the importer passes an empty object when none is set in the Lightning App Builder
    await mount({ fixedObjectApiName: '' });
    const before = { table: query('table'), config: getObjectInfo.getLastConfig() };
    const input = query('[data-id="object"]');

    // when
    input.value = ' Contact ';
    input.dispatchEvent(new CustomEvent('commit'));
    await flushPromises();
    await loadContact();

    // then
    expect(before.table).toBeNull();
    expect(before.config).toEqual({ objectApiName: undefined });
    expect(getObjectInfo.getLastConfig()).toEqual({ objectApiName: 'Contact' });
    expect(mappedFields()).toHaveLength(HEADERS.length);
  });

  it('should show an error for an object that cannot be used', async () => {
    // given
    await mount({ fixedObjectApiName: 'Unknown__c' });

    // when
    getObjectInfo.error({ message: 'Invalid object' });
    await flushPromises();

    // then
    expect(query('c-error-alert').message).toContain("The object Unknown__c can't be used");
    expect(query('table')).toBeNull();
    expect(lastChange().valid).toBe(false);
    await expect(element).toBeAccessible();
  });

  it('should change a field and report two columns mapped to the same field', async () => {
    // given
    await mount({ fixedObjectApiName: 'Contact' });
    await loadContact();
    const notes = queryAll('lightning-combobox').at(-1);

    // when
    notes.dispatchEvent(new CustomEvent('change', { detail: { value: 'Email' } }));
    await flushPromises();

    // then
    expect(query('.duplicates').textContent).toBe('More than one column is mapped to: Email.');
    expect(lastChange().mapping.Notes).toBe('Email');
    expect(lastChange().valid).toBe(false);
  });

  it('should not be valid when no column is imported', async () => {
    // given
    await mount({ fixedObjectApiName: 'Contact', headers: ['Notes'] });

    // when
    await loadContact();

    // then
    expect(lastChange()).toMatchObject({ mapping: { Notes: '' }, valid: false });
  });

  it('should keep the chosen fields of columns that are still in a new file', async () => {
    // given
    await mount({ fixedObjectApiName: 'Contact' });
    await loadContact();
    queryAll('lightning-combobox')[0].dispatchEvent(new CustomEvent('change', { detail: { value: 'LastName' } }));

    // when
    element.headers = ['First Name', 'Mobile'];
    await flushPromises();

    // then
    expect(mappedFields()).toEqual(['LastName', '']);
  });

  it('should restart with a new object when users enter another one', async () => {
    // given
    await mount();
    query('[data-id="object"]').value = 'Contact';
    query('[data-id="object"]').dispatchEvent(new CustomEvent('commit'));
    await loadContact();

    // when
    query('[data-id="object"]').value = 'Lead';
    query('[data-id="object"]').dispatchEvent(new CustomEvent('commit'));
    await flushPromises();

    // then
    expect(query('table')).toBeNull();
    expect(lastChange()).toMatchObject({ objectApiName: 'Lead', mapping: {}, valid: false });
  });

  it('should download the mapping as JSON', async () => {
    // given
    await mount({ fixedObjectApiName: 'Contact' });
    await loadContact();
    const click = jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function capture() {
      click.link = this;
    });

    // when
    query('lightning-button').click();

    // then
    expect(click.link.download).toBe('Contact-mapping.json');
    const json = JSON.parse(decodeURIComponent(click.link.href.split(',').slice(1).join(',')));
    expect(json).toEqual({ version: 1, objectApiName: 'Contact', mapping: lastChange().mapping });
    click.mockRestore();
  });

  it('should take the known fields of an uploaded mapping and skip the others', async () => {
    // given
    await mount({ fixedObjectApiName: 'Contact' });
    await loadContact();
    const mapping = { 'First Name': 'LastName', Notes: 'Description', Unknown: 'Email' };

    // when
    await importMapping(JSON.stringify({ objectApiName: 'Contact', mapping }));

    // then
    expect(mappedFields()).toEqual(['LastName', '', '', '', '', '']);
    expect(query('c-error-alert')).toBeNull();
  });

  it('should load another object first when an uploaded mapping is for it', async () => {
    // given
    await mount();
    query('[data-id="object"]').value = 'Lead';
    query('[data-id="object"]').dispatchEvent(new CustomEvent('commit'));

    // when
    await importMapping(JSON.stringify({ objectApiName: 'Contact', mapping: { Phone: 'Phone' } }));
    const configAfterImport = getObjectInfo.getLastConfig();
    await loadContact();

    // then
    expect(configAfterImport).toEqual({ objectApiName: 'Contact' });
    expect(mappedFields()).toEqual(['', '', '', 'Phone', '', '']);
  });

  it.each([
    ['for another object', JSON.stringify({ objectApiName: 'Lead', mapping: {} }), 'it is for Lead, not for Contact'],
    ['without a mapping', JSON.stringify({ objectApiName: 'Contact' }), 'it has no mapping'],
    ['that is not JSON', 'not json', 'The mapping could not be used: ']
  ])('should show an error for an uploaded mapping %s', async (_label, content, message) => {
    // given
    await mount({ fixedObjectApiName: 'Contact' });
    await loadContact();

    // when
    await importMapping(content);

    // then
    expect(query('c-error-alert').message).toContain(message);
    expect(mappedFields()[0]).toBe('FirstName');
  });

  it('should skip every column of a mapping without object uploaded before an object is chosen', async () => {
    // given
    await mount();

    // when
    await importMapping(JSON.stringify({ mapping: { Phone: 'Phone' } }));

    // then
    expect(lastChange()).toMatchObject({ objectApiName: undefined, valid: false });
    expect(Object.values(lastChange().mapping)).toEqual(['', '', '', '', '', '']);
  });

  it('should ignore an empty mapping upload', async () => {
    // given
    await mount({ fixedObjectApiName: 'Contact' });
    await loadContact();
    const before = changes.length;

    // when
    await importMapping();

    // then
    expect(changes).toHaveLength(before);
    expect(query('c-error-alert')).toBeNull();
  });

  it('should accept headers that are not an array', async () => {
    // when
    await mount({ fixedObjectApiName: 'Contact', headers: null });
    await loadContact();

    // then
    expect(mappedFields()).toEqual([]);
  });
});
