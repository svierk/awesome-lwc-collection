import d3orgchart from '@salesforce/resourceUrl/d3orgchart';
import { getErrorMessage } from 'c/errorUtils';
import { graphql } from 'lightning/graphql';
import { NavigationMixin } from 'lightning/navigation';
import { loadScript } from 'lightning/platformResourceLoader';
import { LightningElement, api, wire } from 'lwc';
import { buildQuery, isApiName, MAX_RECORDS, safeImageUrl, toChartRecords, toTree } from './orgChartData';

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

// the nodes are rendered as an HTML string, so they reference the SLDS styling hooks inline, with static fallback values for environments without styling hooks
const NODE_STYLES = {
  font: "var(--slds-g-font-family, -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif)",
  surface: 'var(--slds-g-color-surface-container-1, #fff)',
  border: 'var(--slds-g-color-border-1, #c9c9c9)',
  accent: 'var(--slds-g-color-border-accent-1, #0176d3)',
  highlight: 'var(--slds-g-color-accent-light-2, #d8e6fe)',
  shadow: 'var(--slds-g-shadow-1, 0 2px 2px 0 #0000001a)',
  avatar: 'var(--slds-g-color-surface-inverse-1, #032d60)',
  onAvatar: 'var(--slds-g-color-on-surface-inverse-1, #fff)',
  name: 'var(--slds-g-color-on-surface-3, #181818)',
  title: 'var(--slds-g-color-on-surface-1, #757575)'
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
 * <c-org-chart-viewer chart-object-api-name="User" parent-field-api-name="ManagerId" title-field="Title"></c-org-chart-viewer>
 */
export default class OrgChartViewer extends NavigationMixin(LightningElement) {
  /**
   * API name of the object whose records the chart loads, e.g. 'User' or 'Contact'. Used together with
   * parent-field-api-name; records set from outside take precedence. It isn't called objectApiName, because record
   * pages set that property to the object of the page.
   * @type {string}
   */
  @api chartObjectApiName;

  /**
   * API name of the field with the parent record, e.g. 'ManagerId', 'ReportsToId' or 'ParentId'.
   * @type {string}
   */
  @api parentFieldApiName;

  /**
   * API name of the field shown as the name of a node.
   * @type {string}
   * @default 'Name'
   */
  @api nameField = 'Name';

  /**
   * API name of the field shown below the name, e.g. 'Title'.
   * @type {string}
   */
  @api titleField;

  /**
   * API name of the field with an image URL shown instead of the initials, e.g. 'SmallPhotoUrl'.
   * @type {string}
   */
  @api imageField;

  /**
   * Id of the record the chart starts from. Without it, the chart starts from the record of the record page, if it is
   * among the loaded records, or else shows all of them.
   * @type {string}
   */
  @api rootRecordId;

  /**
   * Id of the record of the record page, filled automatically there.
   * @type {string}
   */
  @api recordId;

  isLibraryLoaded = false;
  errorMessage;
  searchTerm = '';
  visibleNodeCount = 0;
  totalNodeCount = 0;

  _records = [];
  _loaded;
  _exporting = false;
  _chart;
  _initialized = false;
  _resizeObserver;

  @api
  get records() {
    return this._records;
  }

  set records(value) {
    this._records = Array.isArray(value) ? value : [];
    this.refreshChart();
  }

  get loadsRecords() {
    return this._records.length === 0 && isApiName(this.chartObjectApiName) && isApiName(this.parentFieldApiName);
  }

  get graphqlQuery() {
    if (!this.loadsRecords) {
      return undefined;
    }
    const fields = [this.nameField, this.titleField, this.imageField];
    return buildQuery({ objectApiName: this.chartObjectApiName, parentField: this.parentFieldApiName, fields });
  }

  @wire(graphql, { query: '$graphqlQuery' })
  wiredRecords({ data, errors }) {
    if (!this.loadsRecords) {
      return;
    }
    if (errors) {
      this._loaded = { tree: [], hasMore: false };
      this.errorMessage = `The records could not be loaded: ${getErrorMessage(errors)}`;
    } else if (data) {
      const { records, label, hasMore } = toChartRecords(data, {
        objectApiName: this.chartObjectApiName,
        parentField: this.parentFieldApiName,
        nameField: this.nameField,
        titleField: this.titleField,
        imageField: this.imageField
      });
      this._loaded = { tree: toTree(records, this.rootRecordId || this.recordId, label), hasMore };
    } else {
      return;
    }
    this.refreshChart();
  }

  connectedCallback() {
    loadScript(this, d3orgchart)
      .then(() => {
        this.isLibraryLoaded = true;
      })
      .catch((err) => {
        this.errorMessage = `Failed to load chart library: ${getErrorMessage(err)}`;
      });
  }

  disconnectedCallback() {
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    // without the observer the chart no longer follows its container, so it is built again on the next connect
    this._chart = undefined;
    this._initialized = false;
  }

  renderedCallback() {
    if (!this.isLibraryLoaded || this._initialized) {
      return;
    }
    this._initialized = true;
    this.initChart();
  }

  get chartData() {
    if (this._records.length) {
      return this._records;
    }
    return this.loadsRecords ? (this._loaded?.tree ?? []) : DEMO_RECORDS;
  }

  get isLoadingRecords() {
    return this.loadsRecords && !this._loaded;
  }

  get showSpinner() {
    return this.isToolbarDisabled || this.isLoadingRecords;
  }

  get showEmptyState() {
    return this.isLibraryLoaded && !this.isLoadingRecords && !this.errorMessage && this.chartData.length === 0;
  }

  get hasMoreRecords() {
    return Boolean(this.loadsRecords && this._loaded?.hasMore);
  }

  get moreRecordsLabel() {
    return `Only the first ${MAX_RECORDS} records are shown.`;
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
    // a listener on an element of the own template needs no cleanup; the same function is only added once
    container.addEventListener('keydown', this.handleNodeKeydown, true);
  }

  // d3-org-chart turns Enter on a node into expand or collapse, so Enter on a record link, caught before the library,
  // opens the record instead
  handleNodeKeydown = (event) => {
    const id = event.target.dataset?.recordId;
    if (event.key !== 'Enter' || !id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    this.handleNodeClick(this.chartData.find((record) => String(record.id) === id));
  };

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
    } else if (this.chartData.length === 0) {
      return;
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

  /** Shows changed records: updates an existing chart, or builds it once there is something to show. */
  refreshChart() {
    if (!this._chart) {
      if (this._initialized) {
        this.syncChartSize();
      }
      return;
    }
    if (this.chartData.length > 0) {
      this._chart.data(this.chartData).render();
      this._chart.fit();
      this.updateNodeCount();
    }
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
    // a node that opens its record is a link the keyboard can reach, see handleNodeKeydown
    const link = this.opensRecord(record)
      ? ` tabindex="0" role="link" aria-label="Open ${escapeHtml(name)}" data-record-id="${escapeHtml(record.id)}"`
      : '';
    const cursor = link ? 'cursor:pointer;' : '';
    const imageUrl = this._exporting ? undefined : safeImageUrl(record.imageUrl);
    const initials = name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join('');

    return `
      <div${link} style="width:${d.width}px;height:${d.height}px;padding:4px;box-sizing:border-box;${cursor}font-family:${NODE_STYLES.font};">
        <div style="display:flex;align-items:center;gap:10px;height:100%;background:${NODE_STYLES.surface};border:1px solid ${isHighlighted ? NODE_STYLES.accent : NODE_STYLES.border};border-left:4px solid ${NODE_STYLES.accent};border-radius:6px;padding:0 12px;box-shadow:${isHighlighted ? `0 0 0 2px ${NODE_STYLES.highlight}` : NODE_STYLES.shadow};box-sizing:border-box;">
          <div style="flex:0 0 36px;width:36px;height:36px;border-radius:50%;background:${NODE_STYLES.avatar};color:${NODE_STYLES.onAvatar};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;overflow:hidden;">${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="" style="width:100%;height:100%;object-fit:cover;">` : escapeHtml(initials)}</div>
          <div style="overflow:hidden;">
            <div style="font-size:13px;font-weight:600;color:${NODE_STYLES.name};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(name)}</div>
            <div style="font-size:11px;color:${NODE_STYLES.title};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(title)}</div>
          </div>
        </div>
      </div>`;
  }

  /** A loaded record opens its record page, unless a parent cancels the nodeselect event. */
  handleNodeClick(node) {
    const record = node?.data ? node.data : node;
    const notCancelled = this.dispatchEvent(new CustomEvent('nodeselect', { detail: { record }, cancelable: true }));
    if (notCancelled && this.opensRecord(record)) {
      this[NavigationMixin.Navigate]({
        type: 'standard__recordPage',
        attributes: { recordId: record.id, actionName: 'view' }
      });
    }
  }

  opensRecord(record) {
    return this.loadsRecords && !record.group;
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

  // d3-org-chart embeds every image with a request the file domain of Salesforce doesn't allow, and then never
  // finishes the export, so the nodes show their initials while the image is created
  handleExportPng() {
    if (this._chart) {
      this._exporting = true;
      this._chart.render();
      this._chart.exportImg({
        full: true,
        onLoad: (image) => {
          this._exporting = false;
          this._chart.render();
          return image;
        }
      });
    }
  }
}
