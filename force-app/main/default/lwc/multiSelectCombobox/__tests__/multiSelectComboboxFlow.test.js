import MultiSelectCombobox from 'c/multiSelectCombobox';
import { FlowAttributeChangeEventName } from 'lightning/flowSupport';
import { createElement } from 'lwc';

const OPTIONS = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two', selected: true },
  { label: 'Three', value: 'three', selected: true }
];

let element;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
const items = () => element.shadowRoot.querySelectorAll('c-multi-select-combobox-item');
const select = (value, selected = true) => {
  const item = [...items()].find((child) => child.item.value === value);
  item.dispatchEvent(new CustomEvent('change', { detail: { item: item.item, selected } }));
};

describe('c-multi-select-combobox options and flow', () => {
  beforeEach(() => {
    element = createElement('c-multi-select-combobox', { is: MultiSelectCombobox });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should accept the options as a json string', async () => {
    // given
    element.options = JSON.stringify(OPTIONS);

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(items()).toHaveLength(3);
    expect(element.value).toBe('two;three');
    expect(element.shadowRoot.querySelector('c-error-alert')).toBeNull();
    expect(element.options).toBe(JSON.stringify(OPTIONS));
  });

  it('should show an error when the options are not valid json', async () => {
    // given
    element.options = '{ not json';

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('c-error-alert').message).toBe(
      'The options could not be displayed because they are not valid JSON.'
    );
    expect(items()).toHaveLength(0);
    await expect(element).toBeAccessible();
  });

  it.each([
    ['undefined', undefined],
    ['an object', { value: 'one' }]
  ])('should show no options for %s', async (_label, value) => {
    // given
    element.options = value;

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(items()).toHaveLength(0);
  });

  it('should show options that arrive after connecting, with their selection', async () => {
    // given
    document.body.appendChild(element);
    await flushPromises();

    // when
    element.options = OPTIONS;
    await flushPromises();

    // then
    expect(items()).toHaveLength(3);
    expect(element.shadowRoot.querySelector('.multi-select-combobox__input').value).toBe('Two, Three');
  });

  it('should replace the options when new ones of the same length arrive', async () => {
    // given
    element.options = OPTIONS;
    document.body.appendChild(element);
    await flushPromises();

    // when
    element.options = OPTIONS.map((option) => ({ label: `${option.label}!`, value: `${option.value}!` }));
    await flushPromises();

    // then
    expect(items()[0].item.label).toBe('One!');
    expect(element.value).toBe('');
  });

  it('should not change the options it was given', async () => {
    // given
    const options = [{ label: 'One', value: 'one' }];
    element.options = options;
    document.body.appendChild(element);
    await flushPromises();

    // when
    select('one');
    await flushPromises();

    // then
    expect(options[0].selected).toBeUndefined();
    expect(element.value).toBe('one');
  });

  it('should tell the flow about a changed selection', async () => {
    // given
    const handler = jest.fn();
    element.options = OPTIONS;
    element.addEventListener(FlowAttributeChangeEventName, handler);
    document.body.appendChild(element);
    await flushPromises();

    // when
    select('one');
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail).toEqual({ attributeName: 'value', attributeValue: 'one;two;three' });
    expect(element.value).toBe('one;two;three');
  });

  it('should be valid when it is required and has a selection', async () => {
    // given
    element.options = OPTIONS;
    element.required = true;
    document.body.appendChild(element);
    await flushPromises();

    // when
    const result = element.validate();

    // then
    expect(result).toEqual({ isValid: true });
  });

  it('should be invalid when it is required without a selection', async () => {
    // given
    element.options = [{ label: 'One', value: 'one' }];
    element.required = true;
    element.label = 'Products';
    document.body.appendChild(element);
    await flushPromises();

    // when
    const result = element.validate();

    // then
    expect(result).toEqual({ isValid: false, errorMessage: 'Please select a value for Products.' });
  });

  it('should have a general message when it is required without a label', async () => {
    // given
    element.options = [{ label: 'One', value: 'one' }];
    element.required = true;
    document.body.appendChild(element);
    await flushPromises();

    // when
    const result = element.validate();

    // then
    expect(result.errorMessage).toBe('Please select a value.');
  });

  it('should be valid without a selection when it is not required', async () => {
    // given
    element.options = [{ label: 'One', value: 'one' }];
    document.body.appendChild(element);
    await flushPromises();

    // when
    const result = element.validate();

    // then
    expect(result.isValid).toBe(true);
  });

  it('should remove an option through its pill', async () => {
    // given
    const handler = jest.fn();
    element.options = OPTIONS;
    element.showPills = true;
    element.addEventListener('change', handler);
    document.body.appendChild(element);
    await flushPromises();

    // when
    const pills = element.shadowRoot.querySelector('lightning-pill-container');
    pills.dispatchEvent(new CustomEvent('itemremove', { detail: { index: 0, item: pills.items[0], selected: false } }));
    await flushPromises();

    // then
    expect(element.value).toBe('three');
    expect(handler.mock.calls[0][0].detail.map((item) => item.value)).toEqual(['three']);
  });

  it('should summarize more than two selected options', async () => {
    // given
    element.options = OPTIONS.map((option) => ({ ...option, selected: true }));

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.multi-select-combobox__input').value).toBe('3 Options Selected');
  });

  it('should not close the list when clicking the search', async () => {
    // given
    const closeHandler = jest.fn();
    element.options = OPTIONS;
    element.enableSearch = true;
    element.addEventListener('close', closeHandler);
    document.body.appendChild(element);
    await flushPromises();
    element.shadowRoot.querySelector('.multi-select-combobox__input').click();
    await flushPromises();

    // when
    element.shadowRoot.querySelector('.multi-select-combobox__search').click();

    // then
    expect(closeHandler).not.toHaveBeenCalled();
  });
});
