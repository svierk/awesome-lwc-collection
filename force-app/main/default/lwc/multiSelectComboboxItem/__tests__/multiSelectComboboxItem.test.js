import MultiSelectComboboxItem from 'c/multiSelectComboboxItem';
import { createElement } from 'lwc';

let element;

describe('c-multi-select-combobox-item', () => {
  beforeEach(() => {
    element = createElement('c-multi-select-combobox-item', {
      is: MultiSelectComboboxItem
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should be accessible and show label of selected item', async () => {
    // given
    element.item = { name: 'name', label: 'label', selected: true };

    // when
    document.body.appendChild(element);
    const item = element.shadowRoot.querySelector('span.slds-truncate');

    // then
    expect(item.textContent).toBe('label');
    await expect(element).toBeAccessible();
  });

  it('should fire change event when clicked', () => {
    // given
    const mockClickHandler = jest.fn();
    element.item = { name: 'name', label: 'label', selected: false };
    element.addEventListener('click', mockClickHandler);

    // when
    document.body.appendChild(element);
    const listItem = element.shadowRoot.querySelector('li');
    listItem.click();

    // then
    expect(mockClickHandler).toHaveBeenCalledTimes(1);
  });
});
