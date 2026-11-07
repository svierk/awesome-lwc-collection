import SELECTED from '@salesforce/label/c.MultiSelectComboboxItem_Selected';
import { api, LightningElement } from 'lwc';

/**
 * Component that represents an item within the multi select combobox parent component.
 * @alias MultiSelectComboboxItem
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-multi-select-combobox-item key={item.value} item={item} onchange={handleChange}></c-multi-select-combobox-item>
 */
export default class MultiSelectComboboxItem extends LightningElement {
  /**
   * Single selectable item received from the multi select combobox parent component.
   * @type {Object}
   */
  @api item;

  labels = { selected: SELECTED };

  get itemClass() {
    return `slds-listbox__item ${this.item.selected ? 'slds-is-selected' : ''}`;
  }

  get optionAria() {
    return { ariaSelected: String(Boolean(this.item.selected)) };
  }

  /**
   * Moves the keyboard focus to this option.
   */
  @api
  focus() {
    this.template.querySelector('[role="option"]').focus();
  }

  handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.handleClick();
    }
  }

  handleClick() {
    this.dispatchEvent(
      new CustomEvent('change', {
        detail: { item: this.item, selected: !this.item.selected }
      })
    );
  }
}
