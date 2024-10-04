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
   * A list of options that are available for selection. Each option has the following attributes: label and value.
   * @type {Array}
   * @example
   * options = [
   *   {
   *     "label": "Option 1",
   *     "value": "option1"
   *   },
   *   {
   *     "label": "Option 2",
   *     "value": "option2"
   *   },
   * ]
   */
  @api options = [];

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

  @api selectedDisplay = 2; //Number of selected values to display

  @track currentOptions = [];
  selectedItems = [];
  selectedOptions = [];
  isInitialized = false;
  isLoaded = false;
  isVisible = false;
  isDisabled = false;

  connectedCallback() {
    this.isDisabled = this.disabled || this.readOnly;
    this.hasPillsEnabled = this.showPills && !this.singleSelect;
    this.currentOptions = this.options;
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
      document.addEventListener('click', () => {
        this.close();
      });
      this.isInitialized = true;
      this.setSelection();
    }
  }

  @api handleDefault(selectedValues){
    /*
    Call from parent - i.e. this.template.querySelector('c-multi-select-combobox').handleDefault(this.selectedMonths);
    Sample Selected Values Array = [
      {"label": "October 2024", "value": "2024-10-01:2024-10-31"},
      {"label": "November 2024", "value": "2024-11-01:2024-11-30"},
      {"label": "December 2024", "value": "2024-12-01:2024-12-31"},      
    ];
    */

    this.selectedOptions = selectedValues.forEach(value => {
      value.selected = true; 
    });

    if (this.isLoaded === false || this.currentOptions?.length !== this.options?.length) {
      this.currentOptions = JSON.parse(JSON.stringify(this.options));
      this.isLoaded = true;
    }

    this.currentOptions = this.currentOptions.map(option => {
      const matchedLabel = selectedValues.find(value => value.label === option.label);
      if(matchedLabel) {
        return{ ...option, selected: true };  // Set selected to true if label matches
      }else{
        return{ ...option, selected: false };  // Set selected to false if label doesn't match
      }
    });

    this.setSelection();
    const selection = this.getSelectedItems();
    this.dispatchEvent(new CustomEvent('change', {detail: this.singleSelect ? selection[0] : selection}));    
  }

  handleChange(event) {
      console.log('MC handleChange = ' + JSON.stringify(event.detail));      
    this.change(event);
  }

  handleRemove(event) {
    this.selectedOptions.splice(event.detail.index, 1);
    this.change(event);
  }

  handleClick() {
    // initialize picklist options on first click to make them editable
    if (this.isLoaded === false || this.currentOptions?.length !== this.options?.length) {
      this.currentOptions = JSON.parse(JSON.stringify(this.options));
      this.isLoaded = true;
    }

    if(this.template.querySelector('.slds-is-open')) {
      this.close();
    }else{
      this.template.querySelectorAll('.multi-select-combobox__dropdown').forEach((node) => {
        node.classList.add('slds-is-open');
      });
    }
  }

 change(event) {
    // remove previous selection for single select picklist
    if(this.singleSelect){
      this.currentOptions.forEach((item) => (item.selected = false));
    }
    // set selected items
    this.currentOptions
      .filter((item) => item.value === event.detail.item.value)
      .forEach((item) => (item.selected = event.detail.selected
    ));
    this.setSelection();
    const selection = this.getSelectedItems();
    this.dispatchEvent(new CustomEvent('change', { detail: this.singleSelect ? selection[0] : selection }));
      
      //console.log('currentOptions = ' + JSON.stringify(this.currentOptions));
      //console.log('selectedItems = ' + this.selectedItems);
      //console.log('selectedOptions = ' + JSON.stringify(this.selectedOptions));
    
    // for single select picklist close dropdown after selection is made
    if (this.singleSelect) {
      this.close();
    }
  }

  close() {
    this.template.querySelectorAll('.multi-select-combobox__dropdown').forEach((node) => {
      node.classList.remove('slds-is-open');
    });
    this.dispatchEvent(new CustomEvent('close'));
  }

  setSelection() {
    const selectedItems = this.getSelectedItems();
    let selection = '';

    if (selectedItems.length < 1) {
      selection = this.placeholder;
      this.selectedOptions = [];
    } 
    
    else if(selectedItems.length > this.selectedDisplay) {
      selection = `${selectedItems.length} Options Selected`;

      this.selectedOptions = this.getSelectedItems();
    }else{
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
