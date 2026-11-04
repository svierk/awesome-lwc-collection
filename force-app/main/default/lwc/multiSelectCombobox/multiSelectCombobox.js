import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { api, LightningElement, track } from 'lwc';

/**
 * Combobox with different configuration options that also supports multi select.
 * @alias MultiSelectCombobox
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-multi-select-combobox label="Products" name="products" options={options} ... required></c-multi-select-combobox>
 */
export default class MultiSelectCombobox extends LightningElement {
  /**
   * If present, the combobox is disabled and users cannot interact with it.
   * @type {boolean}
   * @default false
   */
  @api disabled = false;

  /**
   * If present, a search input is shown inside the dropdown to filter options.
   * @type {boolean}
   * @default false
   */
  @api enableSearch = false;

  /**
   * Text label for the combobox.
   * @type {string}
   * @default ''
   */
  @api label = '';

  /**
   * Specifies the name of the combobox.
   * @type {string}
   */
  @api name;

  /**
   * Text that is displayed before an option is selected, to prompt the user to select an option.
   * @type {string}
   * @default 'Select an Option'
   */
  @api placeholder = 'Select an Option';

  /**
   * If present, the combobox is read-only. A read-only combobox is also disabled.
   * @type {boolean}
   * @default false
   */
  @api readOnly = false;

  /**
   * If present, a value must be selected before a form can be submitted.
   * @type {boolean}
   * @default false
   */
  @api required = false;

  /**
   * If present, the combobox only allows the selection of a single value.
   * @type {boolean}
   * @default false
   */
  @api singleSelect = false;

  /**
   * If present, the combobox will show a pill container with the currently selected options.
   * @type {boolean}
   * @default false
   */
  @api showPills = false;

  @track currentOptions = [];
  errorMessage = '';
  _options = [];
  _searchTerm = '';
  selectedItems = [];
  selectedOptions = [];
  isInitialized = false;
  isOpen = false;
  isVisible = false;
  isDisabled = false;
  pendingFocus;

  /**
   * A list of options that are available for selection, as an array or a JSON string.
   * Supported option attributes: label, value, selected.
   * @type {Array|string}
   * @example
   * options = [
   *   {
   *     label: 'Option 1',
   *     value: 'option1'
   *   },
   *   {
   *     label: 'Option 2',
   *     value: 'option2',
   *     selected: true
   *   },
   * ]
   */
  @api
  get options() {
    return this._options;
  }

  set options(value) {
    this._options = value;
    this.errorMessage = '';
    const options = this.parseOptions(value);
    this.currentOptions = Array.isArray(options) ? options.map((option) => ({ ...option })) : [];
    if (this.isInitialized) this.setSelection();
  }

  /**
   * The values of the selected options, separated by semicolons. Read-only, also available as a Flow output.
   * @type {string}
   */
  @api
  get value() {
    return this.getSelectedItems()
      .map((item) => item.value)
      .join(';');
  }

  /**
   * Checks the required attribute for Flow screens.
   * @returns {{isValid: boolean, errorMessage: (string|undefined)}} The result of the check
   */
  @api
  validate() {
    if (!this.required || this.getSelectedItems().length > 0) return { isValid: true };
    const target = this.label ? ` for ${this.label}` : '';
    return { isValid: false, errorMessage: `Please select a value${target}.` };
  }

  connectedCallback() {
    this.isDisabled = this.disabled || this.readOnly;
    this.hasPillsEnabled = this.showPills && !this.singleSelect;
    document.addEventListener('click', this.handleDocumentClick);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.handleDocumentClick);
  }

  renderedCallback() {
    if (!this.isInitialized) {
      this.template.querySelector('.multi-select-combobox__input').addEventListener('click', (event) => {
        this.handleClick(event.target);
        event.stopPropagation();
      });
      this.template.addEventListener('click', (event) => {
        event.stopPropagation();
      });
      this.isInitialized = true;
      this.setSelection();
    }
    if (this.pendingFocus) {
      const focus = this.pendingFocus;
      this.pendingFocus = undefined;
      focus();
    }
  }

  get dropdownClass() {
    const base =
      'slds-combobox slds-dropdown-trigger slds-dropdown-trigger_click slds-picklist multi-select-combobox__dropdown';
    return this.isOpen ? `${base} slds-is-open` : base;
  }

  get inputAria() {
    return { ariaExpanded: String(this.isOpen) };
  }

  get inputLabel() {
    return this.label || this.placeholder;
  }

  get listboxAria() {
    return { ariaMultiSelectable: String(!this.singleSelect) };
  }

  get input() {
    return this.template.querySelector('.multi-select-combobox__input');
  }

  get searchInput() {
    return this.template.querySelector('.multi-select-combobox__search');
  }

  get optionItems() {
    return [...this.template.querySelectorAll('c-multi-select-combobox-item')];
  }

  get filteredOptions() {
    if (!this._searchTerm) {
      return this.currentOptions;
    }
    const term = this._searchTerm.toLowerCase();
    return this.currentOptions.filter((option) => option.label.toLowerCase().includes(term));
  }

  // a class field, so the same function is added in connectedCallback and removed in disconnectedCallback
  handleDocumentClick = () => {
    this.close();
  };

  handleSearch(event) {
    this._searchTerm = event.target.value;
  }

  handleSearchClick(event) {
    event.stopPropagation();
  }

  handleChange(event) {
    this.change(event);
    if (this.singleSelect) this.input.focus();
  }

  handleRemove(event) {
    this.selectedOptions.splice(event.detail.index, 1);
    this.change(event);
  }

  handleClick() {
    if (this.isOpen) {
      this.close();
    } else {
      this.isOpen = true;
    }
  }

  handleKeyDown(event) {
    const { key, target } = event;
    if (key === 'Escape') {
      this.handleEscape(event);
    } else if (key === 'Tab') {
      this.handleTab(event);
    } else if (target === this.input) {
      this.handleInputKey(event);
    } else if (target === this.searchInput) {
      this.handleSearchKey(event);
    } else {
      this.handleOptionKey(event);
    }
  }

  handleEscape(event) {
    if (!this.isOpen) return;
    event.preventDefault();
    event.stopPropagation();
    this.close();
    this.input.focus();
  }

  handleTab({ target, shiftKey }) {
    if (!this.isOpen) return;
    const toSearch = target === this.input && this.enableSearch && !shiftKey;
    const toInput = target === this.searchInput && shiftKey;
    if (!toSearch && !toInput) this.close();
  }

  handleInputKey(event) {
    const { key } = event;
    if (this.isOpen && (key === 'Enter' || key === ' ')) {
      event.preventDefault();
      this.close();
      return;
    }
    const index = this.getStartIndex(key);
    if (index === undefined) return;
    event.preventDefault();
    this.focusOption(index);
  }

  getStartIndex(key) {
    switch (key) {
      case 'ArrowUp':
      case 'End':
        return this.optionItems.length - 1;
      case 'Home':
        return 0;
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        return Math.max(
          this.filteredOptions.findIndex((option) => option.selected),
          0
        );
      default:
        return undefined;
    }
  }

  handleSearchKey(event) {
    const { key } = event;
    if (key === 'Enter') {
      event.preventDefault();
    } else if (key === 'ArrowDown' || key === 'ArrowUp') {
      event.preventDefault();
      this.focusOption(key === 'ArrowDown' ? 0 : this.optionItems.length - 1);
    }
  }

  handleOptionKey(event) {
    const { key, target } = event;
    const items = this.optionItems;
    const index = items.indexOf(target);
    const last = items.length - 1;
    if (key === 'ArrowUp' && index === 0 && this.enableSearch) {
      event.preventDefault();
      this.searchInput.focus();
      return;
    }
    const next = {
      ArrowDown: index === last ? 0 : index + 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last
    }[key];
    if (next === undefined) return;
    event.preventDefault();
    this.focusOption(next);
  }

  focusOption(index) {
    const focus = () => this.optionItems[index]?.focus();
    if (this.isOpen) {
      focus();
    } else {
      this.pendingFocus = focus;
      this.isOpen = true;
    }
  }

  change(event) {
    // remove previous selection for single select picklist
    if (this.singleSelect) {
      this.currentOptions.forEach((item) => (item.selected = false));
    }

    // set selected items
    this.currentOptions
      .filter((item) => item.value === event.detail.item.value)
      .forEach((item) => (item.selected = event.detail.selected));
    this.setSelection();
    const selection = this.getSelectedItems();
    this.dispatchEvent(new CustomEvent('change', { detail: this.singleSelect ? selection[0] : selection }));
    this.dispatchEvent(new FlowAttributeChangeEvent('value', this.value));

    // for single select picklist close dropdown after selection is made
    if (this.singleSelect) {
      this.close();
    }
  }

  close() {
    this._searchTerm = '';
    this.isOpen = false;
    this.dispatchEvent(new CustomEvent('close'));
  }

  parseOptions(value) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      this.errorMessage = 'The options could not be displayed because they are not valid JSON.';
      return [];
    }
  }

  setSelection() {
    const selectedItems = this.getSelectedItems();
    let selection = '';
    if (selectedItems.length < 1) {
      selection = this.placeholder;
      this.selectedOptions = [];
    } else if (selectedItems.length > 2) {
      selection = `${selectedItems.length} Options Selected`;

      this.selectedOptions = this.getSelectedItems();
    } else {
      selection = selectedItems.map((selected) => selected.label).join(', ');
      this.selectedOptions = this.getSelectedItems();
    }
    this.selectedItems = selection;
    this.isVisible = this.selectedOptions && this.selectedOptions.length > 0;
  }

  getSelectedItems() {
    return this.currentOptions.filter((item) => item.selected);
  }
}
