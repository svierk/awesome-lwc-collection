import DragAndDrop from 'c/dragAndDrop';
import { createElement } from 'lwc';

describe('c-drag-and-drop', () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it('should be accessible and handle all drag and drop events', async () => {
    // given
    const element = createElement('c-drag-and-drop', {
      is: DragAndDrop
    });
    const storage = new Map();
    const event = {
      dataTransfer: {
        setData: (key, value) => storage.set(key, value),
        getData: (key) => storage.get(key)
      }
    };
    const dragstart = new CustomEvent('dragstart');
    const dragover = new CustomEvent('dragover');
    const dragleave = new CustomEvent('dragleave');
    const drop = new CustomEvent('drop');
    Object.assign(dragstart, event);
    Object.assign(drop, event);

    // when
    document.body.appendChild(element);

    const item = element.shadowRoot.querySelector('.grabbable');
    item.dispatchEvent(dragstart);

    const dropzone = element.shadowRoot.querySelector('.dropzone');
    dropzone.dispatchEvent(dragover);
    dropzone.dispatchEvent(dragleave);
    dropzone.dispatchEvent(drop);

    // then
    await expect(element).toBeAccessible();
  });
});
