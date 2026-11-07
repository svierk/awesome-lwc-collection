import DRAG from '@salesforce/label/c.DragAndDrop_Drag';
import DRAGGABLE_ELEMENTS from '@salesforce/label/c.DragAndDrop_DraggableElements';
import DROP from '@salesforce/label/c.DragAndDrop_Drop';
import DROPZONE from '@salesforce/label/c.DragAndDrop_Dropzone';
import ELEMENT from '@salesforce/label/c.DragAndDrop_Element';
import ID from '@salesforce/label/c.DragAndDrop_Id';
import INVALID_ITEMS from '@salesforce/label/c.DragAndDrop_InvalidItems';
import LABEL from '@salesforce/label/c.DragAndDrop_Label';
import { formatLabel } from 'c/labelUtils';
import { api, LightningElement } from 'lwc';

const COLUMNS = [
  {
    label: ID,
    fieldName: 'id',
    hideDefaultActions: true
  },
  {
    label: LABEL,
    fieldName: 'label',
    hideDefaultActions: true
  }
];

const DEMO_ITEMS = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, label: formatLabel(ELEMENT, i + 1) }));

/**
 * A drag and drop building block based on the HTML Drag and Drop API.
 * @alias DragAndDrop
 * @extends LightningElement
 * @hideconstructor
 *
 * @fires DragAndDrop#itemdrop
 *
 * @example
 * <c-drag-and-drop items={items} onitemdrop={handleItemDrop}></c-drag-and-drop>
 */
export default class DragAndDrop extends LightningElement {
  labels = { draggableElements: DRAGGABLE_ELEMENTS, dropzone: DROPZONE, drag: DRAG, drop: DROP };

  columns = COLUMNS;
  data = [];
  elements = DEMO_ITEMS.map((item) => ({ ...item }));
  errorMessage = '';
  isDragOver = false;
  _items = DEMO_ITEMS;

  /**
   * The items to drag, as an array or a JSON string. Each item has a unique id and a label.
   * Twelve demo elements are used until this is set.
   * @type {Array|string}
   */
  @api
  get items() {
    return this._items;
  }

  set items(value) {
    this._items = value;
    this.errorMessage = '';
    this.data = [];
    const items = this.parseItems(value);
    this.elements = Array.isArray(items) ? items.map((item) => ({ ...item })) : [];
  }

  get dropzoneClass() {
    return `slds-card dropzone card-height${this.isDragOver ? ' dropzone-active' : ''}`;
  }

  parseItems(value) {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      this.errorMessage = INVALID_ITEMS;
      return [];
    }
  }

  handleDragStart(event) {
    event.dataTransfer.setData('id', event.target.dataset.id);
  }

  handleDragOver(event) {
    event.preventDefault();
    this.isDragOver = true;
  }

  handleDragLeave(event) {
    event.preventDefault();
    this.isDragOver = false;
  }

  handleDrop(event) {
    event.preventDefault();
    this.isDragOver = false;

    const id = event.dataTransfer.getData('id');
    const item = this.elements.find((element) => String(element.id) === id);
    if (!item) return;

    this.elements = this.elements.filter((element) => element !== item);
    this.data = [...this.data, item];

    /**
     * Fired when an item was dropped.
     * @event DragAndDrop#itemdrop
     * @type {CustomEvent}
     * @property {Object} detail - A copy of the dropped item
     */
    this.dispatchEvent(new CustomEvent('itemdrop', { detail: { ...item } }));
  }
}
