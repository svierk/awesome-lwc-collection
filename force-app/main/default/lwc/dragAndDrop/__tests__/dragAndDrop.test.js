import DragAndDrop from 'c/dragAndDrop';
import { createElement } from 'lwc';

const ITEMS = [
  { id: 'first', label: 'First' },
  { id: 'second', label: 'Second' }
];

const dropItem = (element, id) => {
  const drop = new CustomEvent('drop');
  drop.dataTransfer = { getData: () => id };
  element.shadowRoot.querySelector('.dropzone').dispatchEvent(drop);
};

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
    await Promise.resolve();

    // then
    expect(dropzone.classList).toContain('dropzone-active');

    // when
    dropzone.dispatchEvent(dragleave);
    await Promise.resolve();

    // then
    expect(dropzone.classList).not.toContain('dropzone-active');

    // when
    dropzone.dispatchEvent(dragover);
    dropzone.dispatchEvent(drop);
    await Promise.resolve();

    // then
    expect(dropzone.classList).not.toContain('dropzone-active');
    await expect(element).toBeAccessible();
  });

  it('should show twelve demo elements when no items are set', () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelectorAll('.grabbable')).toHaveLength(12);
    expect(element.items).toHaveLength(12);
  });

  it('should not add demo elements again when it is reconnected', () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    document.body.appendChild(element);

    // when
    document.body.removeChild(element);
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelectorAll('.grabbable')).toHaveLength(12);
  });

  it('should show the given items', async () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    element.items = ITEMS;

    // when
    document.body.appendChild(element);

    // then
    const labels = [...element.shadowRoot.querySelectorAll('.grabbable')].map((item) => item.textContent);
    expect(labels).toEqual(['First', 'Second']);
    await expect(element).toBeAccessible();
  });

  it('should accept the items as a json string', () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    element.items = JSON.stringify(ITEMS);

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelectorAll('.grabbable')).toHaveLength(2);
    expect(element.shadowRoot.querySelector('c-error-alert')).toBeNull();
  });

  it('should show an error when the items are not valid json', async () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    element.items = '{ not json';

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelector('c-error-alert').message).toBe(
      'The items could not be displayed because they are not valid JSON.'
    );
    expect(element.shadowRoot.querySelectorAll('.grabbable')).toHaveLength(0);
    await expect(element).toBeAccessible();
  });

  it.each([
    ['undefined', undefined],
    ['an object', { id: 1 }]
  ])('should show no items for %s', (_label, value) => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    element.items = value;

    // when
    document.body.appendChild(element);

    // then
    expect(element.shadowRoot.querySelectorAll('.grabbable')).toHaveLength(0);
  });

  it('should move a dropped item to the table and dispatch itemdrop', async () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    element.items = ITEMS;
    const handler = jest.fn();
    element.addEventListener('itemdrop', handler);
    document.body.appendChild(element);

    // when
    dropItem(element, 'second');
    await Promise.resolve();

    // then
    const labels = [...element.shadowRoot.querySelectorAll('.grabbable')].map((item) => item.textContent);
    expect(labels).toEqual(['First']);
    expect(element.shadowRoot.querySelector('lightning-datatable').data).toEqual([{ id: 'second', label: 'Second' }]);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler.mock.calls[0][0].detail).toEqual({ id: 'second', label: 'Second' });
  });

  it('should keep numeric ids in the itemdrop event', () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    const handler = jest.fn();
    element.addEventListener('itemdrop', handler);
    document.body.appendChild(element);

    // when
    dropItem(element, '3');

    // then
    expect(handler.mock.calls[0][0].detail).toEqual({ id: 3, label: 'Element 3' });
  });

  it('should ignore a drop that is not one of its items', async () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    element.items = ITEMS;
    const handler = jest.fn();
    element.addEventListener('itemdrop', handler);
    document.body.appendChild(element);

    // when
    dropItem(element, 'unknown');
    await Promise.resolve();

    // then
    expect(handler).not.toHaveBeenCalled();
    expect(element.shadowRoot.querySelectorAll('.grabbable')).toHaveLength(2);
    expect(element.shadowRoot.querySelector('.dropzone').classList).not.toContain('dropzone-active');
  });

  it('should start over when new items arrive', async () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    element.items = ITEMS;
    document.body.appendChild(element);
    dropItem(element, 'first');
    await Promise.resolve();

    // when
    element.items = ITEMS;
    await Promise.resolve();

    // then
    expect(element.shadowRoot.querySelectorAll('.grabbable')).toHaveLength(2);
    expect(element.shadowRoot.querySelector('lightning-datatable').data).toEqual([]);
  });

  it('should not change the items it was given', async () => {
    // given
    const element = createElement('c-drag-and-drop', { is: DragAndDrop });
    const items = [{ id: 'a', label: 'A' }];
    element.items = items;
    document.body.appendChild(element);

    // when
    dropItem(element, 'a');
    await Promise.resolve();

    // then
    expect(items).toEqual([{ id: 'a', label: 'A' }]);
    expect(element.items).toHaveLength(1);
  });
});
