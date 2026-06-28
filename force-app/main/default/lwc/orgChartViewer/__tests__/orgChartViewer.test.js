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
  'nodeId',
  'parentNodeId',
  'nodeWidth',
  'nodeHeight',
  'childrenMargin',
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
    _chartState: { visibleCount: 4, totalCount: 12 }
  };
  CHAINABLE_METHODS.forEach((method) => {
    instance[method] = jest.fn(() => instance);
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
    loadScript.mockResolvedValue();

    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    expect(element).toBeTruthy();
    await expect(element).toBeAccessible();
  });

  it('should initialize the chart with the demo dataset once the library loads', async () => {
    loadScript.mockResolvedValue();

    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    expect(global.d3.OrgChart).toHaveBeenCalledTimes(1);
    expect(mockChartInstance.svgWidth).toHaveBeenCalledWith(760);
    expect(mockChartInstance.svgHeight).toHaveBeenCalledWith(480);
    expect(mockChartInstance.data).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: '1', name: 'Jordan Avery' })])
    );
    expect(mockChartInstance.render).toHaveBeenCalled();
    expect(mockChartInstance.fit).toHaveBeenCalled();
  });

  it('should not initialize the chart while the container has no measurable size yet', async () => {
    loadScript.mockResolvedValue();

    document.body.appendChild(element);
    await flushPromises();

    expect(global.d3.OrgChart).not.toHaveBeenCalled();
  });

  it('should re-sync the chart size and re-fit when the container is resized', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    const container = stubContainerSize(element);
    await flushPromises();

    mockChartInstance.svgWidth.mockClear();
    mockChartInstance.svgHeight.mockClear();
    mockChartInstance.render.mockClear();
    mockChartInstance.fit.mockClear();

    Object.defineProperty(container, 'clientWidth', { value: 1024, configurable: true });
    Object.defineProperty(container, 'clientHeight', { value: 600, configurable: true });
    activeResizeObserver.callback();

    expect(global.d3.OrgChart).toHaveBeenCalledTimes(1);
    expect(mockChartInstance.svgWidth).toHaveBeenCalledWith(1024);
    expect(mockChartInstance.svgHeight).toHaveBeenCalledWith(600);
    expect(mockChartInstance.render).toHaveBeenCalled();
    expect(mockChartInstance.fit).toHaveBeenCalled();
  });

  it('should show an error message when the library fails to load', async () => {
    loadScript.mockRejectedValue(new Error('network down'));

    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    const errorBox = element.shadowRoot.querySelector('.slds-theme_error');
    expect(errorBox).toBeTruthy();
    expect(errorBox.textContent).toContain('network down');
    expect(global.d3.OrgChart).not.toHaveBeenCalled();
  });

  it('should disable the toolbar until the library has finished loading', async () => {
    let resolveLoad;
    loadScript.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      })
    );

    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();
    expect(element.shadowRoot.querySelector('[data-id="search-input"]').disabled).toBe(true);
    expect(element.shadowRoot.querySelector('[data-id="expand-all"]').disabled).toBe(true);

    resolveLoad();
    await flushPromises();

    expect(element.shadowRoot.querySelector('[data-id="search-input"]').disabled).toBe(false);
    expect(element.shadowRoot.querySelector('[data-id="expand-all"]').disabled).toBe(false);
  });

  it('should expand all nodes when "Expand All" is clicked', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    element.shadowRoot.querySelector('[data-id="expand-all"]').click();

    expect(mockChartInstance.expandAll).toHaveBeenCalled();
  });

  it('should collapse all nodes when "Collapse All" is clicked', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    element.shadowRoot.querySelector('[data-id="collapse-all"]').click();

    expect(mockChartInstance.collapseAll).toHaveBeenCalled();
  });

  it('should fit the chart to screen when "Fit to Screen" is clicked', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();
    mockChartInstance.fit.mockClear();

    element.shadowRoot.querySelector('[data-id="fit"]').click();

    expect(mockChartInstance.fit).toHaveBeenCalled();
  });

  it('should export the chart as a PNG when "Export PNG" is clicked', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    element.shadowRoot.querySelector('[data-id="export-png"]').click();

    expect(mockChartInstance.exportImg).toHaveBeenCalledWith(expect.objectContaining({ full: true }));
  });

  it('should highlight and center the matching node when searching by name', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    const searchInput = element.shadowRoot.querySelector('[data-id="search-input"]');
    searchInput.value = 'morgan';
    searchInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    expect(mockChartInstance.clearHighlighting).toHaveBeenCalled();
    expect(mockChartInstance.setUpToTheRootHighlighted).toHaveBeenCalledWith('2');
    expect(mockChartInstance.setCentered).toHaveBeenCalledWith('2');
  });

  it('should only clear highlighting when the search has no matching node', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    const searchInput = element.shadowRoot.querySelector('[data-id="search-input"]');
    searchInput.value = 'does-not-exist';
    searchInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    expect(mockChartInstance.clearHighlighting).toHaveBeenCalled();
    expect(mockChartInstance.setUpToTheRootHighlighted).not.toHaveBeenCalled();
  });

  it('should clear highlighting when the search term is cleared', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    const searchInput = element.shadowRoot.querySelector('[data-id="search-input"]');
    searchInput.value = '';
    searchInput.dispatchEvent(new CustomEvent('change'));
    await flushPromises();

    expect(mockChartInstance.clearHighlighting).toHaveBeenCalled();
  });

  it('should dispatch a nodeselect event with the underlying record when a node is clicked', async () => {
    loadScript.mockResolvedValue();
    const handler = jest.fn();
    element.addEventListener('nodeselect', handler);
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    const record = { id: '2', name: 'Morgan Lee' };
    mockChartInstance.onNodeClickCallback({ data: record });

    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ detail: { record } }));
  });

  it('should escape HTML in node content to prevent XSS from untrusted record data', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    const maliciousRecord = { id: '99', name: '<img src=x onerror=alert(1)>', title: '<b>boss</b>' };
    const html = mockChartInstance.nodeContentCallback({ data: maliciousRecord, width: 220, height: 80 });

    expect(html).not.toContain('<img src=x');
    expect(html).not.toContain('<b>boss</b>');
    expect(html).toContain('&lt;img');
  });

  it('should update the chart when records are set after the initial render', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();
    mockChartInstance.data.mockClear();
    mockChartInstance.render.mockClear();

    element.records = [{ id: 'a', parentId: null, name: 'Custom Root' }];
    await flushPromises();

    expect(mockChartInstance.data).toHaveBeenCalledWith([{ id: 'a', parentId: null, name: 'Custom Root' }]);
    expect(mockChartInstance.render).toHaveBeenCalled();
  });

  it('should display the node count label once the chart has initially rendered', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 4 of 12 nodes');
  });

  it('should not display the node count label before the library has loaded', async () => {
    loadScript.mockReturnValue(new Promise(() => {}));

    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    expect(element.shadowRoot.querySelector('.slds-text-color_weak')).toBeNull();
  });

  it('should update the node count label after "Expand All" is clicked', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    mockChartInstance._chartState = { visibleCount: 12, totalCount: 12 };
    element.shadowRoot.querySelector('[data-id="expand-all"]').click();
    await flushPromises();

    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 12 of 12 nodes');
  });

  it('should update the node count label after "Collapse All" is clicked', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    mockChartInstance._chartState = { visibleCount: 1, totalCount: 12 };
    element.shadowRoot.querySelector('[data-id="collapse-all"]').click();
    await flushPromises();

    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 1 of 12 nodes');
  });

  it('should update the node count label when a node is expanded or collapsed directly in the chart', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    mockChartInstance._chartState = { visibleCount: 7, totalCount: 12 };
    mockChartInstance.onExpandOrCollapseCallback();
    await flushPromises();

    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 7 of 12 nodes');
  });

  it('should update the node count label when records are set after the initial render', async () => {
    loadScript.mockResolvedValue();
    document.body.appendChild(element);
    stubContainerSize(element);
    await flushPromises();

    mockChartInstance._chartState = { visibleCount: 1, totalCount: 1 };
    element.records = [{ id: 'a', parentId: null, name: 'Custom Root' }];
    await flushPromises();

    const label = element.shadowRoot.querySelector('.slds-text-color_weak');
    expect(label.textContent.trim()).toBe('Showing 1 of 1 nodes');
  });
});
