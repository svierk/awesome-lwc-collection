import OrgChartViewer from 'c/orgChartViewer';
import { loadScript } from 'lightning/platformResourceLoader';
import { createElement } from 'lwc';

jest.mock('lightning/platformResourceLoader', () => ({ loadScript: jest.fn() }), { virtual: true });

const flushPromises = () => new Promise(process.nextTick);

const CHAINABLE_METHODS = [
  'container',
  'svgWidth',
  'svgHeight',
  'data',
  'compact',
  'render',
  'fit',
  'expandAll',
  'collapseAll',
  'clearHighlighting',
  'setUpToTheRootHighlighted',
  'setCentered',
  'exportImg'
];

// chainable methods that receive a configuration callback the component logic lives in
const CALLBACK_METHODS = ['nodeId', 'parentNodeId', 'nodeWidth', 'nodeHeight', 'childrenMargin'];

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

function stubContainerSize(el, width = 760, height = 480) {
  const container = el.shadowRoot.querySelector('[data-id="chart-container"]');
  Object.defineProperty(container, 'clientWidth', { value: width, configurable: true });
  Object.defineProperty(container, 'clientHeight', { value: height, configurable: true });
  return container;
}

function createMockChartInstance() {
  const instance = {
    onNodeClickCallback: null,
    nodeContentCallback: null,
    onExpandOrCollapseCallback: null,
    callbacks: {},
    _chartState: { visibleCount: 4, totalCount: 12 }
  };
  CHAINABLE_METHODS.forEach((method) => {
    instance[method] = jest.fn(() => instance);
  });
  // capture the configuration callbacks d3-org-chart is given so the tests can invoke them
  CALLBACK_METHODS.forEach((method) => {
    instance[method] = jest.fn((callback) => {
      instance.callbacks[method] = callback;
      return instance;
    });
  });
  instance.onNodeClick = jest.fn((callback) => {
    instance.onNodeClickCallback = callback;
    return instance;
  });
  instance.nodeContent = jest.fn((callback) => {
    instance.nodeContentCallback = callback;
    return instance;
  });
  instance.onExpandOrCollapse = jest.fn((callback) => {
    instance.onExpandOrCollapseCallback = callback;
    return instance;
  });
  instance.getChartState = jest.fn(() => ({
    root: { descendants: () => new Array(instance._chartState.visibleCount) },
    allNodes: new Array(instance._chartState.totalCount)
  }));
  return instance;
}

// mounts the component, resolves the library load and gives the container a measurable size,
// which is the precondition under which the chart is actually built
async function renderChart(el) {
  loadScript.mockResolvedValue();
  document.body.appendChild(el);
  stubContainerSize(el);
  await flushPromises();
}

describe('c-org-chart-viewer', () => {
  let element;
  let mockChartInstance;

  beforeEach(() => {
    mockChartInstance = createMockChartInstance();
    global.d3 = { OrgChart: jest.fn(() => mockChartInstance) };
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

  it('should render and be accessible once the library loads', async () => {
    // when
    await renderChart(element);

    // then
    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });

  it('should initialize the chart with the demo dataset once the library loads', async () => {
    // when
    await renderChart(element);

    // then
    expect(global.d3.OrgChart).toHaveBeenCalledTimes(1);
    expect(mockChartInstance.svgWidth).toHaveBeenCalledWith(760);
    expect(mockChartInstance.svgHeight).toHaveBeenCalledWith(480);
    expect(mockChartInstance.data).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: '1', name: 'Jordan Avery' })])
    );
    expect(mockChartInstance.render).toHaveBeenCalled();
    expect(mockChartInstance.fit).toHaveBeenCalled();

    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 4 of 12 nodes');
  });

  it('should not initialize the chart while the container has no measurable size yet', async () => {
    // given
    loadScript.mockResolvedValue();

    // when
    document.body.appendChild(element);
    await flushPromises();

    // then
    expect(global.d3.OrgChart).not.toHaveBeenCalled();
  });

  it('should re-sync the chart size and re-fit when the container is resized', async () => {
    // given
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    const container = stubContainerSize(element);
    await flushPromises();
    mockChartInstance.svgWidth.mockClear();
    mockChartInstance.svgHeight.mockClear();
    mockChartInstance.render.mockClear();
    mockChartInstance.fit.mockClear();

    // when
    Object.defineProperty(container, 'clientWidth', { value: 1024, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    activeResizeObserver.callback();

    // then
    expect(global.d3.OrgChart).toHaveBeenCalledTimes(1);
    expect(mockChartInstance.svgWidth).toHaveBeenCalledWith(1024);
    expect(mockChartInstance.svgHeight).toHaveBeenCalledWith(600);
    expect(mockChartInstance.render).toHaveBeenCalled();
    expect(mockChartInstance.fit).toHaveBeenCalled();
  });

  it('should show an error message when the library fails to load', async () => {
    // given
    loadScript.mockRejectedValue(new Error('network down'));

    // when
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    // then
    const errorBox = element.shadowRoot.querySelector('.slds-theme_error');
    expect(errorBox).toBeTruthy();
    expect(errorBox.textContent).toContain('network down');
    expect(global.d3.OrgChart).not.toHaveBeenCalled();
  });

  it('should disable the toolbar until the library has finished loading', async () => {
    // given
    let resolveLoad;
    loadScript.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      })
    );

    // when
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('[data-id="search-input"]').disabled).toBe(true);
    expect(element.shadowRoot.querySelector('[data-id="expand-all"]').disabled).toBe(true);

    // when
    resolveLoad();
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('[data-id="search-input"]').disabled).toBe(false);
    expect(element.shadowRoot.querySelector('[data-id="expand-all"]').disabled).toBe(false);
  });

  it('should expand all nodes when "Expand All" is clicked', async () => {
    // given
    await renderChart(element);

    // when
    element.shadowRoot.querySelector('[data-id="expand-all"]').click();

    // then
    expect(mockChartInstance.expandAll).toHaveBeenCalled();
  });

  it('should collapse all nodes when "Collapse All" is clicked', async () => {
    // given
    await renderChart(element);

    // when
    element.shadowRoot.querySelector('[data-id="collapse-all"]').click();

    // then
    expect(mockChartInstance.collapseAll).toHaveBeenCalled();
  });

  it('should fit the chart to screen when "Fit to Screen" is clicked', async () => {
    // given
    await renderChart(element);
    mockChartInstance.fit.mockClear();

    // when
    element.shadowRoot.querySelector('[data-id="fit"]').click();

    // then
    expect(mockChartInstance.fit).toHaveBeenCalled();
  });

  it('should export the chart as a PNG when "Export PNG" is clicked', async () => {
    // given
    await renderChart(element);

    // when
    element.shadowRoot.querySelector('[data-id="export-png"]').click();

    // then
    expect(mockChartInstance.exportImg).toHaveBeenCalledWith(expect.objectContaining({ full: true }));
  });

  it('should highlight and center the matching node when searching by name', async () => {
    // given
    await renderChart(element);

    // when
    const searchInput = element.shadowRoot.querySelector('[data-id="search-input"]');
    searchInput.value = 'morgan';
    searchInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    expect(mockChartInstance.clearHighlighting).toHaveBeenCalled();
    expect(mockChartInstance.setUpToTheRootHighlighted).toHaveBeenCalledWith('2');
    expect(mockChartInstance.setCentered).toHaveBeenCalledWith('2');
  });

  it('should only clear highlighting when the search has no matching node', async () => {
    // given
    await renderChart(element);

    // when
    const searchInput = element.shadowRoot.querySelector('[data-id="search-input"]');
    searchInput.value = 'does-not-exist';
    searchInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    expect(mockChartInstance.clearHighlighting).toHaveBeenCalled();
    expect(mockChartInstance.setUpToTheRootHighlighted).not.toHaveBeenCalled();
  });

  it('should clear highlighting when the search term is cleared', async () => {
    // given
    await renderChart(element);

    // when
    const searchInput = element.shadowRoot.querySelector('[data-id="search-input"]');
    searchInput.value = '';
    searchInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    expect(mockChartInstance.clearHighlighting).toHaveBeenCalled();
  });

  it('should ignore search input changes while the chart has not been created yet', async () => {
    // given - library loads but the container never reports a size, so no chart is built
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    await flushPromises();

    // when
    const searchInput = element.shadowRoot.querySelector('[data-id="search-input"]');
    searchInput.value = 'morgan';
    searchInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    // then
    expect(global.d3.OrgChart).not.toHaveBeenCalled();
    expect(mockChartInstance.clearHighlighting).not.toHaveBeenCalled();
  });

  it('should dispatch a nodeselect event with the record, falling back to the raw node', async () => {
    // given
    await renderChart(element);
    const handler = jest.fn();
    element.addEventListener('nodeselect', handler);

    // when - the chart passes a wrapped node
    const record = { id: '2', name: 'Morgan Lee' };
    mockChartInstance.onNodeClickCallback({ data: record });

    // then
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { record } }));

    // when - a node without a data wrapper falls back to the raw node
    const rawRecord = { id: '5', name: 'Sam Patel' };
    mockChartInstance.onNodeClickCallback(rawRecord);

    // then
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { record: rawRecord } }));
  });

  it('should render both schemas with initials and highlight styling, and escape untrusted values', async () => {
    // given
    await renderChart(element);
    const renderNode = mockChartInstance.nodeContentCallback;

    // when - salesforce-style fields with an active highlight
    const sfHtml = renderNode({
      data: { Id: '2', Name: 'Morgan Lee', Title: 'VP of Engineering', _upToTheRootHighlighted: true },
      width: 220,
      height: 80
    });

    // then
    expect(sfHtml).toContain('Morgan Lee');
    expect(sfHtml).toContain('VP of Engineering');
    expect(sfHtml).toContain('ML');
    expect(sfHtml).toContain('#00A1E0');

    // when - a record without a name or title falls back to placeholder content
    const emptyHtml = renderNode({ data: {}, width: 220, height: 80 });

    // then
    expect(emptyHtml).toContain('Unknown');
    expect(emptyHtml).toContain('U</div>');

    // when - untrusted markup must not survive into the rendered node
    const maliciousHtml = renderNode({
      data: { id: '99', name: '<img src=x onerror=alert(1)>', title: '<b>boss</b>' },
      width: 220,
      height: 80
    });

    // then
    expect(maliciousHtml).not.toContain('<img src=x');
    expect(maliciousHtml).not.toContain('<b>boss</b>');
    expect(maliciousHtml).toContain('&lt;img');
  });

  it('should configure id resolvers and fixed node sizing on the chart', async () => {
    // given
    await renderChart(element);

    // then - the node id resolves from the id/Id/nodeId field variants
    expect(mockChartInstance.callbacks.nodeId({ id: '1' })).toBe('1');
    expect(mockChartInstance.callbacks.nodeId({ Id: '2' })).toBe('2');
    expect(mockChartInstance.callbacks.nodeId({ nodeId: '3' })).toBe('3');

    // then - the parent id resolves from parentId/ManagerId/parentNodeId with a null fallback
    const resolveParent = mockChartInstance.callbacks.parentNodeId;
    expect(resolveParent({ parentId: 7 })).toBe('7');
    expect(resolveParent({ ManagerId: '2' })).toBe('2');
    expect(resolveParent({ parentNodeId: '3' })).toBe('3');
    expect(resolveParent({ parentId: null })).toBeNull();
    expect(resolveParent({})).toBeNull();

    // then - the layout uses fixed node dimensions
    expect(mockChartInstance.callbacks.nodeWidth()).toBe(220);
    expect(mockChartInstance.callbacks.nodeHeight()).toBe(80);
    expect(mockChartInstance.callbacks.childrenMargin()).toBe(50);
  });

  it('should expose records through the public api getter and fall back to an empty array', () => {
    // given
    const records = [{ id: 'a', parentId: null, name: 'Custom Root' }];

    // when / then
    element.records = records;
    expect(element.records).toEqual(records);
    element.records = null;
    expect(element.records).toEqual([]);
  });

  it('should update the chart and node count label when records are set after the initial render', async () => {
    // given
    await renderChart(element);
    mockChartInstance.data.mockClear();
    mockChartInstance.render.mockClear();

    // when
    mockChartInstance._chartState = { visibleCount: 1, totalCount: 1 };
    element.records = [{ id: 'a', parentId: null, name: 'Custom Root' }];
    await flushPromises();

    // then
    expect(mockChartInstance.data).toHaveBeenCalledWith([{ id: 'a', parentId: null, name: 'Custom Root' }]);
    expect(mockChartInstance.render).toHaveBeenCalled();
    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 1 of 1 nodes');
  });

  it('should not display the node count label before the library has loaded', async () => {
    // given
    loadScript.mockReturnValue(new Promise(() => {}));

    // when
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    // then
    expect(element.shadowRoot.querySelector('.slds-text-color_weak')).toBeNull();
  });

  it('should update the node count label after "Expand All" is clicked', async () => {
    // given
    await renderChart(element);

    // when
    mockChartInstance._chartState = { visibleCount: 12, totalCount: 12 };
    element.shadowRoot.querySelector('[data-id="expand-all"]').click();
    await flushPromises();

    // then
    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 12 of 12 nodes');
  });

  it('should update the node count label after "Collapse All" is clicked', async () => {
    // given
    await renderChart(element);

    // when
    mockChartInstance._chartState = { visibleCount: 1, totalCount: 12 };
    element.shadowRoot.querySelector('[data-id="collapse-all"]').click();
    await flushPromises();

    // then
    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 1 of 12 nodes');
  });

  it('should update the node count label when a node is expanded or collapsed directly in the chart', async () => {
    // given
    await renderChart(element);

    // when
    mockChartInstance._chartState = { visibleCount: 7, totalCount: 12 };
    mockChartInstance.onExpandOrCollapseCallback();
    await flushPromises();

    // then
    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 7 of 12 nodes');
  });
});
