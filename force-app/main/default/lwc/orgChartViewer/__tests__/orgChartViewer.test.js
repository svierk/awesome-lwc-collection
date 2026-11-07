import OrgChartViewer from 'c/orgChartViewer';
import { gql, graphql } from 'lightning/graphql';
import { getNavigateCalledWith } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import { createElement } from 'lwc';

jest.mock('lightning/platformResourceLoader', () => ({ loadScript: jest.fn() }), { virtual: true });

const flushPromises = () => new Promise(process.nextTick);

const CHAINABLE_METHODS = 'container svgWidth svgHeight data compact render fit expandAll collapseAll'.split(' ');
const ACTION_METHODS = 'clearHighlighting setUpToTheRootHighlighted setCentered exportImg'.split(' ');

// chainable methods that receive a configuration callback the component logic lives in
const CALLBACK_METHODS =
  'nodeId parentNodeId nodeWidth nodeHeight childrenMargin onNodeClick nodeContent onExpandOrCollapse';

let element;
let chart;
let activeResizeObserver;

class MockResizeObserver {
  constructor(callback) {
    this.callback = callback;
    activeResizeObserver = this;
  }
  observe() {
    this.callback();
  }
  disconnect() {}
  unobserve() {}
}

const query = (selector) => element.shadowRoot.querySelector(selector);

const nodeCountLabel = () => query('.slds-text-color_weak')?.textContent.trim();

function stubContainerSize(width = 760, height = 480) {
  const container = query('[data-id="chart-container"]');
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });
  return container;
}

function createMockChart() {
  const instance = { callbacks: {}, state: { visibleCount: 4, totalCount: 12 } };
  [...CHAINABLE_METHODS, ...ACTION_METHODS].forEach((method) => {
    instance[method] = jest.fn(() => instance);
  });
  // capture the configuration callbacks d3-org-chart is given so the tests can invoke them
  CALLBACK_METHODS.split(' ').forEach((method) => {
    instance[method] = jest.fn((callback) => {
      instance.callbacks[method] = callback;
      return instance;
    });
  });
  instance.getChartState = jest.fn(() => ({
    root: { descendants: () => new Array(instance.state.visibleCount) },
    allNodes: new Array(instance.state.totalCount)
  }));
  return instance;
}

// mounts the component with the library load resolved, rejected or pending, and optionally gives the container a
// measurable size, which is the precondition under which the chart is actually built
async function mount({ load = Promise.resolve(), sized = true } = {}) {
  loadScript.mockReturnValue(load);
  document.body.appendChild(element);
  if (sized) {
    stubContainerSize();
  }
  await flushPromises();
}

const contacts = { chartObjectApiName: 'Contact', parentFieldApiName: 'ReportsToId', titleField: 'Title' };

const contact = (Id, parent, Name) => ({ node: { Id, ReportsToId: { value: parent }, Name: { value: Name } } });

// A and C are roots with one child each, E and F form a cycle
const hierarchy = [
  ['A', null],
  ['B', 'A'],
  ['C', null],
  ['D', 'C'],
  ['E', 'F'],
  ['F', 'E']
].map(([id, parent]) => contact(id, parent, `Name ${id}`));

const emitContacts = (edges, hasNextPage = false) =>
  graphql.emit({
    uiapi: { query: { Contact: { edges, pageInfo: { hasNextPage } } }, objectInfos: [{ labelPlural: 'Contacts' }] }
  });

// the records the chart got last, as "id<parentId"
const chartTree = () =>
  chart.data.mock.calls
    .at(-1)[0]
    .map((record) => `${record.id}<${record.parentId ?? ''}`)
    .join();

async function search(term) {
  const input = query('[data-id="search-input"]');
  input.value = term;
  input.dispatchEvent(new CustomEvent('change'));
  await flushPromises();
}

describe('c-org-chart-viewer', () => {
  beforeEach(() => {
    chart = createMockChart();
    global.d3 = { OrgChart: jest.fn(() => chart) };
    global.ResizeObserver = MockResizeObserver;
    element = createElement('c-org-chart-viewer', { is: OrgChartViewer });
  });

  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
    delete global.d3;
    delete global.ResizeObserver;
    activeResizeObserver = undefined;
  });

  it('should initialize the chart with the demo dataset and be accessible once the library loads', async () => {
    // when
    await mount();

    // then
    expect(global.d3.OrgChart).toHaveBeenCalledTimes(1);
    expect(chart.svgWidth).toHaveBeenCalledWith(760);
    expect(chart.svgHeight).toHaveBeenCalledWith(480);
    expect(chart.data).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: '1', name: 'Jordan Avery' })])
    );
    expect(chart.render).toHaveBeenCalled();
    expect(chart.fit).toHaveBeenCalled();
    expect(nodeCountLabel()).toBe('Showing 4 of 12 nodes');
    await expect(element).toBeAccessible();
  });

  it('should neither build the chart nor search while the container has no measurable size yet', async () => {
    // given
    await mount({ sized: false });

    // when
    await search('morgan');

    // then
    expect(global.d3.OrgChart).not.toHaveBeenCalled();
    expect(chart.clearHighlighting).not.toHaveBeenCalled();
  });

  it('should re-sync the chart size and re-fit when the container is resized', async () => {
    // given
    await mount();
    const container = query('[data-id="chart-container"]');
    [chart.svgWidth, chart.svgHeight, chart.render, chart.fit].forEach((method) => method.mockClear());

    // when
    Object.defineProperty(container, 'clientWidth', { value: 1024, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    activeResizeObserver.callback();

    // then
    expect(global.d3.OrgChart).toHaveBeenCalledTimes(1);
    expect(chart.svgWidth).toHaveBeenCalledWith(1024);
    expect(chart.svgHeight).toHaveBeenCalledWith(600);
    expect(chart.render).toHaveBeenCalled();
    expect(chart.fit).toHaveBeenCalled();
  });

  it('should show an error message when the library fails to load', async () => {
    // when
    await mount({ load: Promise.reject(new Error('network down')) });

    // then
    expect(query('c-error-alert').message).toContain('network down');
    expect(global.d3.OrgChart).not.toHaveBeenCalled();
  });

  it('should disable the toolbar and hide the node count until the library has finished loading', async () => {
    // given
    let resolveLoad;
    await mount({ load: new Promise((resolve) => (resolveLoad = resolve)) });
    const disabled = () => ['search-input', 'expand-all'].map((id) => query(`[data-id="${id}"]`).disabled);
    const whileLoading = { disabled: disabled(), label: nodeCountLabel() };

    // when
    resolveLoad();
    await flushPromises();

    // then
    expect(whileLoading).toEqual({ disabled: [true, true], label: undefined });
    expect(disabled()).toEqual([false, false]);
  });

  it.each([
    ['expand-all', 'expandAll', [], { visibleCount: 12, totalCount: 12 }],
    ['collapse-all', 'collapseAll', [], { visibleCount: 1, totalCount: 12 }],
    ['fit', 'fit', [], { visibleCount: 4, totalCount: 12 }],
    ['export-png', 'exportImg', [expect.objectContaining({ full: true })], { visibleCount: 4, totalCount: 12 }]
  ])('should call %s on the chart and update the node count', async (button, method, args, state) => {
    // given
    await mount();
    chart[method].mockClear();
    chart.state = state;

    // when
    query(`[data-id="${button}"]`).click();
    await flushPromises();

    // then
    expect(chart[method]).toHaveBeenCalledWith(...args);
    expect(nodeCountLabel()).toBe(`Showing ${state.visibleCount} of ${state.totalCount} nodes`);
  });

  it.each([
    ['morgan', '2'],
    ['does-not-exist', undefined],
    ['', undefined]
  ])('should clear the highlighting when searching for %p and highlight the match %p', async (term, id) => {
    // given
    await mount();

    // when
    await search(term);

    // then
    expect(chart.clearHighlighting).toHaveBeenCalled();
    expect(chart.setUpToTheRootHighlighted.mock.calls).toEqual(id ? [[id]] : []);
    expect(chart.setCentered.mock.calls).toEqual(id ? [[id]] : []);
  });

  it('should dispatch a nodeselect event with the record, falling back to the raw node', async () => {
    // given
    await mount();
    const handler = jest.fn();
    element.addEventListener('nodeselect', handler);
    const record = { id: '2', name: 'Morgan Lee' };
    const rawRecord = { id: '5', name: 'Sam Patel' };

    // when - the chart passes a wrapped node, then a node without a data wrapper
    chart.callbacks.onNodeClick({ data: record });
    chart.callbacks.onNodeClick(rawRecord);

    // then
    expect(handler.mock.calls.map(([event]) => event.detail)).toEqual([{ record }, { record: rawRecord }]);
    expect(getNavigateCalledWith().pageReference).toBeUndefined();
  });

  it('should render both schemas with initials and highlight styling, and escape untrusted values', async () => {
    // given
    await mount();
    const renderNode = (data) => chart.callbacks.nodeContent({ data, width: 220, height: 80 });

    // when
    const sfHtml = renderNode({
      Id: '2',
      Name: 'Morgan Lee',
      Title: 'VP of Engineering',
      _upToTheRootHighlighted: true
    });
    const emptyHtml = renderNode({});
    const maliciousHtml = renderNode({ id: '99', name: '<img src=x onerror=alert(1)>', title: '<b>boss</b>' });
    const photoHtml = renderNode({ name: 'Ann Lee', imageUrl: '/profilephoto/005/T' });
    const unsafePhotoHtml = renderNode({ name: 'Ann Lee', imageUrl: 'data:image/svg+xml,<svg/>' });

    // then - salesforce-style fields with an active highlight
    expect(sfHtml).toContain('Morgan Lee');
    expect(sfHtml).toContain('VP of Engineering');
    expect(sfHtml).toContain('ML');
    expect(sfHtml).toContain('box-shadow:0 0 0 2px var(--slds-g-color-accent-light-2, #d8e6fe)');
    // then - a record without a name or title falls back to placeholder content
    expect(emptyHtml).toContain('Unknown');
    expect(emptyHtml).toContain('U</div>');
    expect(emptyHtml).toContain('box-shadow:var(--slds-g-shadow-1, 0 2px 2px 0 #0000001a)');
    // then - untrusted markup must not survive into the rendered node
    expect(maliciousHtml).not.toContain('<img src=x');
    expect(maliciousHtml).not.toContain('<b>boss</b>');
    expect(maliciousHtml).toContain('&lt;img');
    // then - only a safe image URL replaces the initials
    expect(photoHtml).toContain('<img src="/profilephoto/005/T" alt=""');
    expect(unsafePhotoHtml).not.toContain('<img');
    expect(unsafePhotoHtml).toContain('AL</div>');
  });

  it('should configure id resolvers and fixed node sizing on the chart', async () => {
    // when
    await mount();

    // then - the node id resolves from the id/Id/nodeId field variants
    const { nodeId, parentNodeId, nodeWidth, nodeHeight, childrenMargin } = chart.callbacks;
    expect([{ id: '1' }, { Id: '2' }, { nodeId: '3' }].map(nodeId)).toEqual(['1', '2', '3']);
    // then - the parent id resolves from parentId/ManagerId/parentNodeId with a null fallback
    const parents = [{ parentId: 7 }, { ManagerId: '2' }, { parentNodeId: '3' }, { parentId: null }, {}];
    expect(parents.map(parentNodeId)).toEqual(['7', '2', '3', null, null]);
    // then - the layout uses fixed node dimensions
    expect([nodeWidth(), nodeHeight(), childrenMargin()]).toEqual([220, 80, 50]);
  });

  it('should update the chart, the node count and the records getter when records are set after rendering', async () => {
    // given
    await mount();
    chart.data.mockClear();
    chart.render.mockClear();
    chart.state = { visibleCount: 1, totalCount: 1 };

    // when
    element.records = [{ id: 'a', parentId: null, name: 'Custom Root' }];
    await flushPromises();

    // then
    expect(chart.data).toHaveBeenCalledWith([{ id: 'a', parentId: null, name: 'Custom Root' }]);
    expect(chart.render).toHaveBeenCalled();
    expect(nodeCountLabel()).toBe('Showing 1 of 1 nodes');
    expect(element.records).toEqual([{ id: 'a', parentId: null, name: 'Custom Root' }]);
    element.records = null;
    expect(element.records).toEqual([]);
  });

  it('should update the node count label when a node is expanded or collapsed directly in the chart', async () => {
    // given
    await mount();
    chart.state = { visibleCount: 7, totalCount: 12 };

    // when
    chart.callbacks.onExpandOrCollapse();
    await flushPromises();

    // then
    expect(nodeCountLabel()).toBe('Showing 7 of 12 nodes');
  });

  it('should load the configured fields and build no chart while the records are loading', async () => {
    // given
    Object.assign(element, { ...contacts, imageField: 'Photo Url' });

    // when - the wire reports neither data nor errors yet
    await mount();
    graphql.emit(undefined);
    await flushPromises();

    // then
    const builtQuery = gql.mock.results.at(-1).value;
    expect(builtQuery).toContain('Contact(first: 2000)');
    expect(builtQuery).toContain('Id ReportsToId { value } Name { value } Title { value }');
    expect(builtQuery).not.toContain('Photo');
    expect(builtQuery).toContain('objectInfos(apiNames: ["Contact"])');
    expect(global.d3.OrgChart).not.toHaveBeenCalled();
    expect(query('lightning-spinner')).toBeTruthy();
  });

  it.each([
    ['all records under a shared root', {}, 'org-chart-root<,A<org-chart-root,C<org-chart-root,B<A,D<C', 'Contacts'],
    ['the root record id', { rootRecordId: 'C', recordId: 'A' }, 'C<,D<C', 'Name C'],
    ['the record of the record page', { recordId: 'A' }, 'A<,B<A', 'Name A'],
    [
      'a start record that is not loaded',
      { recordId: 'X' },
      'org-chart-root<,A<org-chart-root,C<org-chart-root,B<A,D<C',
      'Contacts'
    ],
    ['a start record inside a cycle', { rootRecordId: 'E' }, 'E<,F<E', 'Name E']
  ])('should show %s as one tree', async (_label, start, expected, rootName) => {
    // given
    Object.assign(element, { ...contacts, ...start });
    await mount();

    // when
    emitContacts(hierarchy);
    await flushPromises();

    // then
    expect(global.d3.OrgChart).toHaveBeenCalledTimes(1);
    expect(chartTree()).toBe(expected);
    expect(chart.data.mock.calls.at(-1)[0][0].name).toBe(rootName);
  });

  it('should say when there are more records and update the chart when the records are loaded again', async () => {
    // given - record pages set objectApiName to the object of the page
    Object.assign(element, { ...contacts, objectApiName: 'Account' });
    await mount();
    emitContacts(hierarchy, true);
    await flushPromises();
    const moreRecords = query('[data-id="more-records"]').textContent.trim();

    // when - without object info this time
    graphql.emit({ uiapi: { query: { Contact: { edges: [contact('A', null, 'Ann Lee')] } } } });
    await flushPromises();

    // then
    expect(moreRecords).toBe('Only the first 2000 records are shown.');
    expect(query('[data-id="more-records"]')).toBeNull();
    expect(global.d3.OrgChart).toHaveBeenCalledTimes(1);
    expect(chart.data.mock.calls.at(-1)[0]).toEqual([
      { id: 'A', parentId: null, name: 'Ann Lee', title: null, imageUrl: null }
    ]);
  });

  it.each([
    ['no records', () => emitContacts([]), 'No records found.', undefined],
    [
      'an error',
      () => graphql.emitErrors([{ message: 'No access' }]),
      undefined,
      'The records could not be loaded: No access'
    ]
  ])('should show %s without a chart', async (_label, emit, emptyText, error) => {
    // given
    Object.assign(element, contacts);
    await mount();

    // when
    emit();
    await flushPromises();

    // then
    expect(query('[data-id="empty-state"]')?.textContent.trim()).toBe(emptyText);
    expect(query('c-error-alert')?.message).toBe(error);
    expect(global.d3.OrgChart).not.toHaveBeenCalled();
    expect(query('lightning-spinner')).toBeNull();
    await expect(element).toBeAccessible();
  });

  it.each([
    ['records set from outside', { ...contacts, records: [{ id: 'a', parentId: null, name: 'Custom Root' }] }, 'a<'],
    ['an invalid object name', { ...contacts, chartObjectApiName: 'Contact { Id }' }, expect.stringContaining('1<,2<1')]
  ])('should load nothing with %s', async (_label, props, expected) => {
    // given
    Object.assign(element, props);

    // when
    await mount();

    // then
    expect(gql).not.toHaveBeenCalled();
    expect(chartTree()).toEqual(expected);
  });

  it('should export photos as initials and show them again afterwards', async () => {
    // given
    await mount();
    const photoNode = () =>
      chart.callbacks.nodeContent({ data: { name: 'Ann Lee', imageUrl: '/photo' }, width: 220, height: 80 });

    // when
    query('[data-id="export-png"]').click();
    const duringExport = photoNode();
    const { onLoad } = chart.exportImg.mock.calls[0][0];
    const result = onLoad('data:image/png;base64,x');

    // then
    expect(duringExport).not.toContain('<img');
    expect(photoNode()).toContain('<img src="/photo"');
    expect(result).toBe('data:image/png;base64,x');
    expect(chart.render.mock.calls.length).toBeGreaterThanOrEqual(3);
  });

  const opened = { type: 'standard__recordPage', attributes: { recordId: 'B', actionName: 'view' } };

  it.each([
    ['a click on a loaded record opens it', 'B', 'click', opened],
    ['Enter on a loaded record opens it', 'B', 'Enter', opened],
    ['another key leaves it to the chart', 'B', 'Tab', undefined],
    ['a click on the shared root opens nothing', 'org-chart-root', 'click', undefined],
    ['a parent can cancel the navigation', 'B', 'cancel', undefined]
  ])('should handle nodes so that %s', async (_label, id, action, expected) => {
    // given
    Object.assign(element, contacts);
    await mount();
    emitContacts(hierarchy);
    await flushPromises();
    element.addEventListener('nodeselect', (event) => action === 'cancel' && event.preventDefault());
    const node = chart.data.mock.calls.at(-1)[0].find((record) => record.id === id);
    const html = chart.callbacks.nodeContent({ data: node, width: 220, height: 80 });

    // when - keys go to the rendered node inside the chart container
    if (['click', 'cancel'].includes(action)) {
      chart.callbacks.onNodeClick({ data: node });
    } else {
      const link = Object.assign(document.createElement('div'), { tabIndex: 0 });
      link.dataset.recordId = id;
      query('[data-id="chart-container"]').appendChild(link);
      link.dispatchEvent(new KeyboardEvent('keydown', { key: action, bubbles: true }));
    }

    // then
    expect(getNavigateCalledWith().pageReference).toEqual(expected);
    expect(html.includes('cursor:pointer')).toBe(id === 'B');
    expect(html.includes('tabindex="0" role="link" aria-label="Open Name B" data-record-id="B"')).toBe(id === 'B');
  });
});
