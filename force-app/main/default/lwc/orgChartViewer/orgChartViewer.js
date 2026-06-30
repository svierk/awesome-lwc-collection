import d3orgchart from '@salesforce/resourceUrl/d3orgchart';
import { loadScript } from 'lightning/platformResourceLoader';
import { LightningElement, api } from 'lwc';

const DEMO_RECORDS = [
  { id: '1', parentId: null, name: 'Jordan Avery', title: 'Chief Executive Officer' },
  { id: '2', parentId: '1', name: 'Morgan Lee', title: 'VP of Engineering' },
  { id: '3', parentId: '1', name: 'Riley Chen', title: 'VP of Sales' },
  { id: '4', parentId: '1', name: 'Casey Brooks', title: 'VP of Marketing' },
  { id: '5', parentId: '2', name: 'Sam Patel', title: 'Engineering Manager' },
  { id: '6', parentId: '2', name: 'Taylor Kim', title: 'Engineering Manager' },
  { id: '7', parentId: '3', name: 'Jamie Rivera', title: 'Sales Manager' },
  { id: '8', parentId: '4', name: 'Drew Sullivan', title: 'Marketing Manager' },
  { id: '9', parentId: '5', name: 'Alex Johnson', title: 'Senior Software Engineer' },
  { id: '10', parentId: '5', name: 'Jess Romero', title: 'Software Engineer' },
  { id: '11', parentId: '6', name: 'Chris Nguyen', title: 'Senior Software Engineer' },
  { id: '12', parentId: '7', name: 'Pat Delgado', title: 'Account Executive' }
];

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

function getNodeId(record) {
  return String(record.id ?? record.Id ?? record.nodeId);
}

function getNodeName(record) {
  return record.name || record.Name || 'Unknown';
}

/**
 * An interactive organization chart renderer powered by d3-org-chart.
 * @alias OrgChartViewer
 * @extends LightningElement
 * @hideconstructor
 *
 * @example
 * <c-org-chart-viewer records={employees} onnodeselect={handleNodeSelect}></c-org-chart-viewer>
 */
export default class OrgChartViewer extends LightningElement {
  isLibraryLoaded = false;
  error;
  searchTerm = '';
  visibleNodeCount = 0;
  totalNodeCount = 0;

  _records = [];
  _chart;
  _initialized = false;
  _resizeObserver;

  @api
  get records() {
    return this._records;
  }

  set records(value) {
    this._records = Array.isArray(value) ? value : [];
    if (this._chart) {
      this._chart.data(this.chartData).render();
      this._chart.fit();
      this.updateNodeCount();
    }
  }

  connectedCallback() {
    loadScript(this, d3orgchart)
      .then(() => {
        this.isLibraryLoaded = true;
      })
      .catch((err) => {
        this.error = `Failed to load chart library: ${err.message || String(err)}`;
      });
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
  }

  renderedCallback() {
    if (!this.isLibraryLoaded || this._initialized) {
      return;
    }
    this._initialized = true;
    this.initChart();
  }

  get chartData() {
    return this._records.length ? this._records : DEMO_RECORDS;
  }

  get isToolbarDisabled() {
    return !this.isLibraryLoaded;
  }

  get nodeCountLabel() {
    return `Showing ${this.visibleNodeCount} of ${this.totalNodeCount} nodes`;
  }

  initChart() {
    const container = this.template.querySelector('[data-id="chart-container"]');

    this._resizeObserver = new ResizeObserver(() => this.syncChartSize());
    this._resizeObserver.observe(container);
  }

  // d3-org-chart defaults svgHeight to window.innerHeight and only ever re-measures
  // svgWidth from the container, so the actual container size must be applied explicitly
  // whenever it becomes available or changes, otherwise the chart is laid out against the
  // wrong canvas size and fit()/the initial view get clipped.
  syncChartSize() {
    const container = this.template.querySelector('[data-id="chart-container"]');
    const { clientWidth: width, clientHeight: height } = container;
    if (!width || !height) {
      return;
    }

    if (this._chart) {
      this._chart.svgWidth(width).svgHeight(height).render();
    } else {
      this._chart = new globalThis.d3.OrgChart()
        .container(container)
        .svgWidth(width)
        .svgHeight(height)
        .data(this.chartData)
        .nodeId(getNodeId)
        .parentNodeId((record) => {
          const parentId = record.parentId ?? record.ManagerId ?? record.parentNodeId ?? null;
          return parentId === null || parentId === undefined ? null : String(parentId);
        })
        .nodeWidth(() => 220)
        .nodeHeight(() => 80)
        .childrenMargin(() => 50)
        .compact(true)
        .nodeContent((d) => this.renderNode(d))
        .onNodeClick((node) => this.handleNodeClick(node))
        .onExpandOrCollapse(() => this.updateNodeCount())
        .render();
    }

    this._chart.fit();
    this.updateNodeCount();
  }

  // getChartState().allNodes reflects every loaded node regardless of expand state, while
  // root.descendants() only walks currently-visible nodes, so the difference is exactly the
  // "X expanded of Y loaded" count shown in the toolbar.
  updateNodeCount() {
    if (!this._chart) {
      return;
    }
    const state = this._chart.getChartState();
    this.visibleNodeCount = state.root.descendants().length;
    this.totalNodeCount = state.allNodes.length;
  }

  renderNode(d) {
    const record = d.data;
    const name = getNodeName(record);
    const title = record.title || record.Title || '';
    const isHighlighted = Boolean(record._highlighted || record._upToTheRootHighlighted);
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

    return `
      <div style="width:${d.width}px;height:${d.height}px;padding:4px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
        <div style="display:flex;align-items:center;gap:10px;height:100%;background:#FFFFFF;border:1px solid ${isHighlighted ? '#00A1E0' : '#D8DDE6'};border-left:4px solid #00A1E0;border-radius:6px;padding:0 12px;box-shadow:${isHighlighted ? '0 0 0 2px rgba(0,161,224,0.35)' : '0 1px 2px rgba(0,0,0,0.08)'};box-sizing:border-box;">
          <div style="flex:0 0 36px;width:36px;height:36px;border-radius:50%;background:#0D1B3E;color:#FFFFFF;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;">${escapeHtml(initials)}</div>
          <div style="overflow:hidden;">
            <div style="font-size:13px;font-weight:600;color:#16325C;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</div>
            <div style="font-size:11px;color:#54698D;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title)}</div>
          </div>
        </div>
      </div>`;
  }

  handleNodeClick(node) {
    const record = node?.data ? node.data : node;
    this.dispatchEvent(new CustomEvent('nodeselect', { detail: { record } }));
  }

  handleSearchChange(event) {
    this.searchTerm = event.target.value;
    if (!this._chart) {
      return;
    }

    this._chart.clearHighlighting();

    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      return;
    }

    const match = this.chartData.find((record) => getNodeName(record).toLowerCase().includes(term));
    if (match) {
      const id = getNodeId(match);
      this._chart.setUpToTheRootHighlighted(id).setCentered(id).render();
      this.updateNodeCount();
    }
  }

  handleExpandAll() {
    if (this._chart) {
      this._chart.expandAll();
      this.updateNodeCount();
    }
  }

  handleCollapseAll() {
    if (this._chart) {
      this._chart.collapseAll();
      this.updateNodeCount();
    }
  }

  handleFit() {
    this.syncChartSize();
  }

  handleExportPng() {
    if (this._chart) {
      this._chart.exportImg({ full: true });
    }
  }
}
