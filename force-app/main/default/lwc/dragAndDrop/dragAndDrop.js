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
  isDragOver = false;

  get dropzoneClass() {
    return `slds-card dropzone card-height${this.isDragOver ? ' dropzone-active' : ''}`;
  }

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
    const label = event.dataTransfer.getData('label');
    const element = this.template.querySelector(`div[data-id="${id}"]`);
    element.remove();

    this.data.push({ id: id, label: label });
    this.data = structuredClone(this.data);
  }
}
