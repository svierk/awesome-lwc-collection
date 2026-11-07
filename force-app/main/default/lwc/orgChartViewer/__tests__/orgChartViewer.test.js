import OrgChartViewer from 'c/orgChartViewer';
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

  it('should expose records through the public api getter and fall back to an empty array', () => {
    // given
    const records = [{ id: 'a', parentId: null, name: 'Custom Root' }];

    // when
    element.records = records;
    const exposed = element.records;
    element.records = null;

    // then
    expect(exposed).toEqual(records);
    expect(element.records).toEqual([]);
  });

  it('should update the chart and node count label when records are set after the initial render', async () => {
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
});
