import MultiSelectCombobox from 'c/multiSelectCombobox';
import { FlowAttributeChangeEventName } from 'lightning/flowSupport';
import { createElement } from 'lwc';

const mockData = require('./data/multiSelectCombobox.json');

const OPTIONS = [
  { label: 'One', value: 'one' },
  { label: 'Two', value: 'two', selected: true },
  { label: 'Three', value: 'three', selected: true }
];
const UNSELECTED = OPTIONS.slice(0, 2).map(({ label, value }) => ({ label, value }));
const KEYBOARD_OPTIONS = [OPTIONS[0], OPTIONS[1], { label: 'Three', value: 'three' }];
const REQUIRED = { options: UNSELECTED, required: true };

let element;

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));
const input = () => element.shadowRoot.querySelector('.multi-select-combobox__input');
const search = () => element.shadowRoot.querySelector('.multi-select-combobox__search');
const listbox = () => element.shadowRoot.querySelector('[role="listbox"]');
const items = () => [...element.shadowRoot.querySelectorAll('c-multi-select-combobox-item')];
const isOpen = () =>
  element.shadowRoot.querySelector('.multi-select-combobox__dropdown').classList.contains('slds-is-open');
const focused = () => element.shadowRoot.activeElement;
const focusedValue = () => focused()?.item?.value;

const setup = async (properties = {}) => {
  Object.assign(element, { options: KEYBOARD_OPTIONS, ...properties });
  document.body.appendChild(element);
  await flushPromises();
  input().focus();
};

const setupOpen = async (properties = {}) => {
  await setup(properties);
  input().click();
  await flushPromises();
};

const setupInSearch = async () => {
  await setupOpen({ enableSearch: true });
  search().focus();
};

const press = async (key, options = {}) => {
  const active = focused() ?? input();
  const target = active.shadowRoot?.activeElement ?? active;
  const event = new KeyboardEvent('keydown', { key, bubbles: true, composed: true, cancelable: true, ...options });
  target.dispatchEvent(event);
  await flushPromises();
  return event;
};

const pressAll = (keys) => keys.reduce((previous, key) => previous.then(() => press(key)), Promise.resolve());

const select = (value, selected = true) => {
  const item = items().find((child) => child.item.value === value);
  item.dispatchEvent(new CustomEvent('change', { detail: { item: item.item, selected } }));
};

const listen = (eventName) => {
  const handler = jest.fn();
  element.addEventListener(eventName, handler);
  return handler;
};

describe('c-multi-select-combobox', () => {
  beforeEach(() => {
    element = createElement('c-multi-select-combobox', { is: MultiSelectCombobox });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should be accessible, show the label and load one child per option', async () => {
    // when
    await setupOpen({ label: mockData.label, options: mockData.options, showPills: mockData.showPills });

    // then
    expect(element.shadowRoot.querySelector('label').textContent).toBe(mockData.label);
    expect(items()).toHaveLength(mockData.options.length);
    await expect(element).toBeAccessible();
  });

  it('should open and close when the input is clicked', async () => {
    // given
    await setup();

    // when / then
    input().click();
    await flushPromises();
    expect(isOpen()).toBe(true);
    input().click();
    await flushPromises();
    expect(isOpen()).toBe(false);
  });

  it('should fire change events when multiple options are selected', async () => {
    // given
    const handler = listen('change');
    await setupOpen({ options: UNSELECTED });

    // when
    select('one');
    select('two');

    // then
    expect(handler).toHaveBeenCalledTimes(2);
    expect(handler.mock.calls[1][0].detail.map((item) => item.value)).toEqual(['one', 'two']);
  });

  it('should filter options when typing in search and clear the term when closing', async () => {
    // given
    const handler = listen('close');
    await setupOpen({ options: mockData.options, enableSearch: true });

    // when
    search().click();
    search().value = mockData.options[0].label;
    search().dispatchEvent(new CustomEvent('input'));
    await flushPromises();

    // then
    expect(handler).not.toHaveBeenCalled();
    expect(items().length).toBeLessThan(mockData.options.length);
    expect(items().length).toBeGreaterThan(0);

    // when
    input().click();
    await flushPromises();

    // then
    expect(items()).toHaveLength(mockData.options.length);
  });

  it('should close the dropdown on a click outside and stop listening once removed', async () => {
    // given
    const handler = listen('close');
    await setup();

    // when
    document.dispatchEvent(new CustomEvent('click'));

    // then
    expect(handler).toHaveBeenCalledTimes(1);

    // when
    document.body.removeChild(element);
    document.dispatchEvent(new CustomEvent('click'));

    // then
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('should remove an option through its pill', async () => {
    // given
    const handler = listen('change');
    await setup({ options: OPTIONS, showPills: true });
    const pills = element.shadowRoot.querySelector('lightning-pill-container');

    // when
    pills.dispatchEvent(new CustomEvent('itemremove', { detail: { index: 0, item: pills.items[0], selected: false } }));
    await flushPromises();

    // then
    expect(element.value).toBe('three');
    expect(handler.mock.calls[0][0].detail.map((item) => item.value)).toEqual(['three']);
  });

  it.each([
    ['ArrowDown', 'two', KEYBOARD_OPTIONS],
    ['Enter', 'two', KEYBOARD_OPTIONS],
    [' ', 'two', KEYBOARD_OPTIONS],
    ['ArrowUp', 'three', KEYBOARD_OPTIONS],
    ['Home', 'one', KEYBOARD_OPTIONS],
    ['End', 'three', KEYBOARD_OPTIONS],
    ['ArrowDown', 'one', UNSELECTED]
  ])('should open on "%s" and focus %s', async (key, expected, options) => {
    // given
    await setup({ options });

    // when
    const event = await press(key);

    // then
    expect(isOpen()).toBe(true);
    expect(focusedValue()).toBe(expected);
    expect(event.defaultPrevented).toBe(true);
  });

  it.each([
    [['ArrowDown'], 'three'],
    [['ArrowDown', 'ArrowDown'], 'one'],
    [['ArrowDown', 'ArrowDown', 'ArrowUp'], 'three'],
    [['Home'], 'one'],
    [['End'], 'three']
  ])('should move through the options with %j to %s', async (keys, expected) => {
    // given
    await setup();
    await press('ArrowDown');

    // when
    await pressAll(keys);

    // then
    expect(focusedValue()).toBe(expected);
  });

  it.each([
    ['the input', false],
    ['an option', true]
  ])('should ignore other keys on %s', async (_label, onOption) => {
    // given
    await setup();
    if (onOption) await press('ArrowDown');

    // when
    const event = await press('a');

    // then
    expect(isOpen()).toBe(onOption);
    expect(event.defaultPrevented).toBe(false);
  });

  it('should toggle an option with Enter and Space and keep the list open', async () => {
    // given
    const handler = listen('change');
    await setup();
    await press('ArrowDown');

    // when
    await press('Enter');

    // then
    expect(handler.mock.calls[0][0].detail).toEqual([]);
    expect(isOpen()).toBe(true);

    // when
    await press(' ');

    // then
    expect(handler.mock.calls[1][0].detail.map((item) => item.value)).toEqual(['two']);
    expect(focusedValue()).toBe('two');
  });

  it('should close and return to the input after a single select choice', async () => {
    // given
    const handler = listen('close');
    await setup({ singleSelect: true });
    await pressAll(['ArrowDown', 'ArrowDown']);

    // when
    await press('Enter');

    // then
    expect(handler).toHaveBeenCalledTimes(1);
    expect(isOpen()).toBe(false);
    expect(focused()).toBe(input());
    expect(input().value).toBe('Three');
  });

  it.each([['Enter'], [' ']])('should close with %s when the input has the focus and the list is open', async (key) => {
    // given
    await setupOpen();

    // when
    const event = await press(key);

    // then
    expect(isOpen()).toBe(false);
    expect(focused()).toBe(input());
    expect(event.defaultPrevented).toBe(true);
  });

  it('should close on Escape, return to the input and not leak the key', async () => {
    // given
    const closeHandler = listen('close');
    const outerHandler = jest.fn();
    await setup();
    document.body.addEventListener('keydown', outerHandler);
    await press('ArrowDown');

    // when
    await press('Escape');
    document.body.removeEventListener('keydown', outerHandler);

    // then
    expect(isOpen()).toBe(false);
    expect(focused()).toBe(input());
    expect(closeHandler).toHaveBeenCalledTimes(1);
    expect(outerHandler).toHaveBeenCalledTimes(1);
  });

  it.each([['Escape'], ['Tab']])('should not react to %s while the list is closed', async (key) => {
    // given
    const handler = listen('close');
    await setup();

    // when
    const event = await press(key);

    // then
    expect(handler).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });

  it('should close when Tab leaves an open list', async () => {
    // given
    await setup();
    await press('ArrowDown');

    // when
    const event = await press('Tab');

    // then
    expect(isOpen()).toBe(false);
    expect(event.defaultPrevented).toBe(false);
  });

  it('should only stay open while Tab moves between the input and the search', async () => {
    // given
    await setupOpen({ enableSearch: true });

    // when / then
    await press('Tab');
    expect(isOpen()).toBe(true);
    search().focus();
    await press('Tab', { shiftKey: true });
    expect(isOpen()).toBe(true);
    await press('Tab');
    expect(isOpen()).toBe(false);
  });

  it('should move between the search and the options, also without results', async () => {
    // given
    await setupInSearch();

    // when / then
    await press('ArrowDown');
    expect(focusedValue()).toBe('one');
    await press('ArrowUp');
    expect(focused()).toBe(search());

    // when
    search().value = 'nothing';
    search().dispatchEvent(new CustomEvent('input'));
    await flushPromises();
    await press('ArrowDown');

    // then
    expect(items()).toHaveLength(0);
    expect(focused()).toBe(search());
  });

  it.each([
    ['Home', false],
    ['End', false],
    [' ', false],
    ['a', false],
    ['Enter', true]
  ])('should handle "%s" in the search with defaultPrevented %s', async (key, prevented) => {
    // given
    await setupInSearch();

    // when
    const event = await press(key);

    // then
    expect(event.defaultPrevented).toBe(prevented);
    expect(focused()).toBe(search());
  });

  it('should expose the state to assistive technology and be accessible', async () => {
    // given
    await setup({ label: 'Products', enableSearch: true });

    // then
    expect(element.shadowRoot.querySelector('[role="listbox"] input')).toBeNull();
    expect(input().getAttribute('role')).toBe('combobox');
    expect(input().getAttribute('aria-haspopup')).toBe('listbox');
    expect(input().getAttribute('aria-expanded')).toBe('false');
    expect(input().getAttribute('aria-label')).toBe('Products');
    expect(input().getAttribute('aria-controls')).toBe(listbox().id);
    expect(listbox().getAttribute('aria-multiselectable')).toBe('true');
    await expect(element).toBeAccessible();

    // when
    await press('ArrowDown');

    // then
    expect(input().getAttribute('aria-expanded')).toBe('true');
    await expect(element).toBeAccessible();
  });

  it('should not mark a single select list as multi selectable and label it by the placeholder', async () => {
    // when
    await setup({ singleSelect: true, placeholder: 'Pick one' });

    // then
    expect(listbox().getAttribute('aria-multiselectable')).toBe('false');
    expect(input().getAttribute('aria-label')).toBe('Pick one');
  });

  it('should accept the options as a json string', async () => {
    // when
    await setup({ options: JSON.stringify(OPTIONS) });

    // then
    expect(items()).toHaveLength(3);
    expect(element.value).toBe('two;three');
    expect(element.shadowRoot.querySelector('c-error-alert')).toBeNull();
    expect(element.options).toBe(JSON.stringify(OPTIONS));
  });

  it('should show an error when the options are not valid json', async () => {
    // when
    await setup({ options: '{ not json' });

    // then
    expect(element.shadowRoot.querySelector('c-error-alert').message).toBe(
      'The options could not be displayed because they are not valid JSON.'
    );
    expect(items()).toHaveLength(0);
    await expect(element).toBeAccessible();
  });

  it.each([
    ['two selected options', OPTIONS, 3, 'Two, Three'],
    [
      'more than two selected options',
      OPTIONS.map((option) => ({ ...option, selected: true })),
      3,
      '3 Options Selected'
    ],
    ['no selected options', UNSELECTED, 2, 'Select an Option'],
    ['nothing for undefined', undefined, 0, 'Select an Option'],
    ['nothing for an object', { value: 'one' }, 0, 'Select an Option']
  ])('should show %s, also when they arrive after connecting', async (_label, options, count, expected) => {
    // given
    await setup({ options: [] });

    // when
    element.options = options;
    await flushPromises();

    // then
    expect(items()).toHaveLength(count);
    expect(input().value).toBe(expected);
  });

  it('should replace the options when new ones of the same length arrive', async () => {
    // given
    await setup({ options: OPTIONS });

    // when
    element.options = OPTIONS.map((option) => ({ label: `${option.label}!`, value: `${option.value}!` }));
    await flushPromises();

    // then
    expect(items()[0].item.label).toBe('One!');
    expect(element.value).toBe('');
  });

  it('should tell the flow about a changed selection and not change the given options', async () => {
    // given
    const handler = listen(FlowAttributeChangeEventName);
    const options = OPTIONS.map((option) => ({ ...option }));
    await setup({ options });

    // when
    select('one');
    await flushPromises();

    // then
    expect(handler.mock.calls[0][0].detail).toEqual({ attributeName: 'value', attributeValue: 'one;two;three' });
    expect(element.value).toBe('one;two;three');
    expect(options[0].selected).toBeUndefined();
  });

  it.each([
    ['required with a selection', { options: OPTIONS, required: true }, undefined],
    ['optional without a selection', { options: UNSELECTED }, undefined],
    ['required and empty', { ...REQUIRED, label: 'Products' }, 'Please select a value for Products.'],
    ['required, empty and without a label', REQUIRED, 'Please select a value.']
  ])('should validate when it is %s', async (_label, properties, errorMessage) => {
    // given
    await setup(properties);

    // when
    const result = element.validate();

    // then
    expect(result).toEqual({ isValid: !errorMessage, errorMessage });
  });
});
