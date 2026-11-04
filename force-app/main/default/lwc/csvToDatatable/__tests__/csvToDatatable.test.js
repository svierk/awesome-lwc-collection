import CsvToDatatable from 'c/csvToDatatable';
import { createElement } from 'lwc';

// helper to create mock file with text() method
const createMockFile = (content, filename = 'test.csv') => {
  const file = new File([content], filename, { type: 'text/csv' });
  file.text = jest.fn().mockResolvedValue(content);
  return file;
};

// helper to wait for async dom updates
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

let element;

const errorMessage = () => element.shadowRoot.querySelector('c-error-alert')?.message;

const upload = async (file) => {
  const fileInput = element.shadowRoot.querySelector('lightning-input');
  fileInput.dispatchEvent(new CustomEvent('change', { detail: { files: [file] } }));
  await flushPromises();
};

describe('c-csv-to-datatable', () => {
  beforeEach(() => {
    element = createElement('c-csv-to-datatable', {
      is: CsvToDatatable
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should render with default values and be accessible', async () => {
    // when
    document.body.appendChild(element);

    // then
    const card = element.shadowRoot.querySelector('lightning-card');
    expect(card).toBeTruthy();
    expect(card.title).toBe('CSV To Datatable');
    expect(card.iconName).toBe('doctype:csv');

    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable).toBeTruthy();
    expect(datatable.hideCheckboxColumn).toBe(true);
    await expect(element).toBeAccessible();
  });

  it('should handle valid csv file upload', async () => {
    // given
    const csvContent = 'Name,Age,City\nJohn,30,New York\nJane,25,Los Angeles';
    const mockFile = createMockFile(csvContent, 'employees.csv');

    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(
      new CustomEvent('change', {
        detail: { files: [mockFile] }
      })
    );

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.columns).toHaveLength(3);
    expect(datatable.columns[0]).toEqual({ label: 'Name', fieldName: 'Name' });
    expect(datatable.data).toHaveLength(2);
    expect(datatable.keyField).toBe('id');
    expect(datatable.data[0]).toEqual({ id: 'row-1', Name: 'John', Age: '30', City: 'New York' });
  });

  it('should handle csv with crlf line endings', async () => {
    // given
    const csvContent = 'Product,Price\r\nLaptop,1200\r\nMouse,25';
    const mockFile = createMockFile(csvContent);

    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(
      new CustomEvent('change', {
        detail: { files: [mockFile] }
      })
    );

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.data).toHaveLength(2);
    expect(datatable.data[0]).toEqual({ id: 'row-1', Product: 'Laptop', Price: '1200' });
  });

  it('should keep commas in quoted fields and ignore the empty last line', async () => {
    // given
    const mockFile = createMockFile('Name,City\n"Doe, John",Berlin\n');

    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(new CustomEvent('change', { detail: { files: [mockFile] } }));

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.data).toEqual([{ id: 'row-1', Name: 'Doe, John', City: 'Berlin' }]);
  });

  it('should use a separate key field when the csv has an id column', async () => {
    // given
    const mockFile = createMockFile('id,Name\n42,John');

    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(new CustomEvent('change', { detail: { files: [mockFile] } }));

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.keyField).toBe('_id');
    expect(datatable.data).toEqual([{ _id: 'row-1', id: '42', Name: 'John' }]);
  });

  it('should handle empty files array', async () => {
    // when
    document.body.appendChild(element);
    const fileInput = element.shadowRoot.querySelector('lightning-input');
    fileInput.dispatchEvent(
      new CustomEvent('change', {
        detail: { files: [] }
      })
    );

    await flushPromises();

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.columns).toEqual([]);
    expect(datatable.data).toEqual([]);
  });

  it('should show an error when the file cannot be read', async () => {
    // given
    const mockFile = new File(['content'], 'error.csv', { type: 'text/csv' });
    mockFile.text = jest.fn().mockRejectedValue(new Error('File read error'));

    // when
    document.body.appendChild(element);
    await upload(mockFile);

    // then
    expect(errorMessage()).toBe('The file could not be read: File read error');
    await expect(element).toBeAccessible();
  });

  it('should show the parser error when the file is not valid csv', async () => {
    // given
    const mockFile = createMockFile('Name,Note\nJane,"open');

    // when
    document.body.appendChild(element);
    await upload(mockFile);

    // then
    expect(errorMessage()).toBe('Invalid CSV: the quoted field starting on line 2 is never closed.');
  });

  it('should clear the previous table when a new file fails', async () => {
    // given
    document.body.appendChild(element);
    await upload(createMockFile('id,Name\n1,John'));

    // when
    await upload(createMockFile('Name\n"open', 'broken.csv'));

    // then
    const datatable = element.shadowRoot.querySelector('lightning-datatable');
    expect(datatable.columns).toEqual([]);
    expect(datatable.data).toEqual([]);
    expect(datatable.keyField).toBe('id');
    expect(element.shadowRoot.querySelector('.slds-var-p-around_medium').textContent).toContain('broken.csv');
  });

  it('should remove the error when a valid file follows', async () => {
    // given
    document.body.appendChild(element);
    await upload(createMockFile('Name\n"open'));

    // when
    await upload(createMockFile('Name\nJohn'));

    // then
    expect(errorMessage()).toBeUndefined();
    expect(element.shadowRoot.querySelector('lightning-datatable').data).toHaveLength(1);
  });
});
