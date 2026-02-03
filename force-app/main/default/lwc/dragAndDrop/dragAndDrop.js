import { LightningElement, track } from 'lwc';

const COLUMNS = [
  {
    label: 'Id',
    fieldName: 'id',
    hideDefaultActions: true
  },
  {
    label: 'Label',
    fieldName: 'label',
    hideDefaultActions: true
  }
];

const DEFAULT_STYLES = 'background-color: rgb(255, 255, 255); border-color: rgb(201, 201, 201);';
const DRAG_OVER_STYLES = 'background-color: pink; border-color:red;';

/**
 * HTML Drag and Drop API usage example.
 * @alias DragAndDrop
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-drag-and-drop></c-drag-and-drop>
 */
export default class DragAndDrop extends LightningElement {
  elements = [];
  columns = COLUMNS;
  @track data = [];

  connectedCallback() {
    for (let i = 1; i <= 12; i++) {
      this.elements.push({ id: i, label: `Element ${i}` });
    }
  }

  handleDragStart(event) {
    event.dataTransfer.setData('id', event.target.dataset.id);
    event.dataTransfer.setData('label', event.target.dataset.name);
  }

  handleDragOver(event) {
    event.preventDefault();
    event.currentTarget.style = DRAG_OVER_STYLES;
  }

  handleDragLeave(event) {
    event.preventDefault();
    event.currentTarget.style = DEFAULT_STYLES;
  }

  handleDrop(event) {
    event.preventDefault();
    event.currentTarget.style = DEFAULT_STYLES;

    const id = event.dataTransfer.getData('id');
    const label = event.dataTransfer.getData('label');
    const element = this.template.querySelector(`div[data-id="${id}"]`);
    element.remove();

    this.data.push({ id: id, label: label });
    this.data = structuredClone(this.data);
  }
}
