import { NavigationMixin } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

/**
 * Dispatches a toast event on the given component.
 * @param {LightningElement} component - The component instance
 * @param {string} title - Toast title
 * @param {string} message - Toast message
 * @param {string} variant - Toast variant (success, error, warning, info)
 */
export function showToast(component, title, message, variant) {
  component.dispatchEvent(new ShowToastEvent({ title, message, variant }));
}

/**
 * Navigates to a record page using the NavigationMixin.
 * @param {LightningElement} component - The component instance (must extend NavigationMixin)
 * @param {string} recordId - The record Id to navigate to
 * @param {string} actionName - The navigation action ('view' or 'edit')
 */
export function navigateToRecord(component, recordId, actionName) {
  component[NavigationMixin.Navigate]({
    type: 'standard__recordPage',
    attributes: { recordId, actionName }
  });
}

/**
 * Appends row action columns to the columns array.
 * @param {Array} columns - The columns array to modify
 * @param {boolean} showView - Whether to show the View action
 * @param {boolean} showEdit - Whether to show the Edit action
 * @param {boolean} showDelete - Whether to show the Delete action
 */
export function addRowActions(columns, showView, showEdit, showDelete) {
  const actions = [];
  if (showView) actions.push({ label: 'View', name: 'view' });
  if (showEdit) actions.push({ label: 'Edit', name: 'edit' });
  if (showDelete) actions.push({ label: 'Delete', name: 'delete' });
  if (actions.length) {
    columns.push({ type: 'action', typeAttributes: { rowActions: actions, menuAlignment: 'right' } });
  }
}

/**
 * Handles row selection events from lightning-datatable.
 * @param {LightningElement} component - The component instance
 * @param {Event} event - The rowselection event
 */
export function getSelectedRecords(component, event) {
  component.selectedRecords = event.detail.selectedRows;
  component.hasSelectedRecords = component.selectedRecords.length > 0;
}

/**
 * Builds the properties object passed to the datatable extension component.
 * @param {LightningElement} component - The component instance
 * @returns {Object} The datatable properties
 */
export function buildDatatableProperties(component) {
  return {
    keyField: component.keyField,
    data: component.records,
    columns: component.columns,
    columnWidthsMode: component.columnWidthsMode,
    defaultSortDirection: component.defaultSortDirection,
    draftValues: component.draftValues,
    hideCheckboxColumn: component.hideCheckboxColumn,
    hideTableHeader: component.hideTableHeader,
    maxColumnWidth: component.maxColumnWidth,
    maxRowSelection: component.maxRowSelection,
    minColumnWidth: component.minColumnWidth,
    rowNumberOffset: component.computedRowNumberOffset,
    resizeColumnDisabled: component.resizeColumnDisabled,
    showRowNumberColumn: component.showRowNumberColumn,
    suppressBottomBar: component.suppressBottomBar
  };
}
