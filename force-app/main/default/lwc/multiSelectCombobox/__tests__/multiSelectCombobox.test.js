import MultiSelectCombobox from 'c/multiSelectCombobox';
import { createElement } from 'lwc';

const mockData = require('./data/multiSelectCombobox.json');

let element;

describe('c-multi-select-combobox', () => {
  beforeEach(() => {
    element = createElement('c-multi-select-combobox', {
      is: MultiSelectCombobox
    });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it('should show combobox label', () => {
    // given
    element.label = mockData.label;
    element.name = mockData.name;
    element.placeholder = mockData.placeholder;
    element.options = mockData.options;
    element.singleSelect = mockData.singleSelect;
    element.showPills = mockData.showPills;

    // when
    document.body.appendChild(element);
    const label = element.shadowRoot.querySelector('label');

    // then
    expect(label.textContent).toBe(mockData.label);
  });

  it('should load correct number of child components', () => {
    // given
    element.label = mockData.label;
    element.name = mockData.name;
    element.placeholder = mockData.placeholder;
    element.options = mockData.options;
    element.singleSelect = mockData.singleSelect;
    element.showPills = mockData.showPills;

    // when
    document.body.appendChild(element);

    // then
    return Promise.resolve().then(() => {
      setTimeout(() => {
        const childs = element.shadowRoot.querySelectorAll('c-multi-select-combobox-item');
        expect(childs.length).toBe(4);
      }, 0);
    });
  });

  it('should fire click event when input is clicked', () => {
    // given
    const mockClickHandler = jest.fn();
    element.label = mockData.label;
    element.name = mockData.name;
    element.placeholder = mockData.placeholder;
    element.options = mockData.options;
    element.singleSelect = mockData.singleSelect;
    element.showPills = mockData.showPills;

    // when
    document.body.appendChild(element);
    const input = element.shadowRoot.querySelector('.multi-select-combobox__input');
    input.addEventListener('click', mockClickHandler);
    input.click();

    // then
    expect(mockClickHandler).toHaveBeenCalledTimes(1);
  });

  it('should fire change events when multiple options are selected', () => {
    // given
    const mockChangeHandler = jest.fn();
    element.label = mockData.label;
    element.name = mockData.name;
    element.placeholder = mockData.placeholder;
    element.options = mockData.options;
    element.singleSelect = mockData.singleSelect;
    element.showPills = mockData.showPills;

    // when
    document.body.appendChild(element);
    const input = element.shadowRoot.querySelector('.multi-select-combobox__input');
    input.click();

    // then
    return Promise.resolve().then(() => {
      // when
      const childs = element.shadowRoot.querySelectorAll('c-multi-select-combobox-item');
      childs.forEach((child, index) => {
        child.addEventListener('change', mockChangeHandler);
        child.dispatchEvent(
          new CustomEvent('change', {
            detail: {
              item: { label: mockData.options[index].label, name: mockData.options[index].name, selected: true },
              selected: true
            }
          })
        );
      });

      // then
      expect(mockChangeHandler).toHaveBeenCalledTimes(4);
    });
  });

  it('should close the dropdown when option is selected while using single select configuration', () => {
    // given
    const mockCloseHandler = jest.fn();
    element.label = mockData.label;
    element.name = mockData.name;
    element.placeholder = mockData.placeholder;
    element.options = mockData.options;
    element.singleSelect = true;
    element.showPills = mockData.showPills;
    element.addEventListener('close', mockCloseHandler);

    // when
    document.body.appendChild(element);
    const input = element.shadowRoot.querySelector('.multi-select-combobox__input');
    input.click();

    // then
    return Promise.resolve().then(() => {
      // when
      const child = element.shadowRoot.querySelector('c-multi-select-combobox-item');
      child.dispatchEvent(
        new CustomEvent('change', {
          detail: {
            item: { label: mockData.options[0].label, name: mockData.options[0].name, selected: true },
            selected: true
          }
        })
      );

      // then
      expect(mockCloseHandler).toHaveBeenCalledTimes(1);
    });
  });
});
