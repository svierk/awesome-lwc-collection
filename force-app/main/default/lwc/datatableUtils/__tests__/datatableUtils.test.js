import {
  addRowActions,
  buildDatatableProperties,
  getSelectedRecords,
  navigateToRecord,
  showToast
} from 'c/datatableUtils';
import { getNavigateCalledWith, NavigationMixin } from 'lightning/navigation';
import { ShowToastEventName } from 'lightning/platformShowToastEvent';

describe('c-datatable-utils', () => {
  it('should dispatch a toast on the component', () => {
    // given
    const component = { dispatchEvent: jest.fn() };

    // when
    showToast(component, 'Saved', 'The record was saved.', 'success');

    // then
    const [event] = component.dispatchEvent.mock.calls[0];
    expect(event.type).toBe(ShowToastEventName);
    expect(event.detail).toEqual({ title: 'Saved', message: 'The record was saved.', variant: 'success' });
  });

  it('should navigate to a record page with the action', () => {
    // given
    const component = new (NavigationMixin(class {}))();

    // when
    navigateToRecord(component, '001000000000001AAA', 'edit');

    // then
    const { pageReference } = getNavigateCalledWith();
    expect(pageReference).toEqual({
      type: 'standard__recordPage',
      attributes: { recordId: '001000000000001AAA', actionName: 'edit' }
    });
  });

  it('should append one action column with the enabled actions in order', () => {
    // given
    const columns = [{ label: 'Name', fieldName: 'Name' }];

    // when
    addRowActions(columns, true, true, true);

    // then
    expect(columns).toHaveLength(2);
    expect(columns[1]).toEqual({
      type: 'action',
      typeAttributes: {
        rowActions: [
          { label: 'View', name: 'view' },
          { label: 'Edit', name: 'edit' },
          { label: 'Delete', name: 'delete' }
        ],
        menuAlignment: 'right'
      }
    });
  });

  it('should only add the enabled actions', () => {
    // given
    const columns = [];

    // when
    addRowActions(columns, false, true, false);

    // then
    expect(columns[0].typeAttributes.rowActions).toEqual([{ label: 'Edit', name: 'edit' }]);
  });

  it('should not add an action column without actions', () => {
    // given
    const columns = [{ label: 'Name', fieldName: 'Name' }];

    // when
    addRowActions(columns, false, false, false);

    // then
    expect(columns).toHaveLength(1);
  });

  it.each([
    ['selected rows', [{ Id: '1' }, { Id: '2' }], true],
    ['no selected rows', [], false]
  ])('should store the selection with %s', (_label, selectedRows, hasSelectedRecords) => {
    // given
    const component = {};

    // when
    getSelectedRecords(component, { detail: { selectedRows } });

    // then
    expect(component.selectedRecords).toBe(selectedRows);
    expect(component.hasSelectedRecords).toBe(hasSelectedRecords);
  });

  it('should build the datatable properties from the component', () => {
    // given
    const component = {
      keyField: 'Id',
      records: [{ Id: '1' }],
      columns: [{ fieldName: 'Name' }],
      columnWidthsMode: 'auto',
      defaultSortDirection: 'asc',
      draftValues: [],
      hideCheckboxColumn: true,
      hideTableHeader: false,
      maxColumnWidth: 1000,
      maxRowSelection: 50,
      minColumnWidth: 50,
      computedRowNumberOffset: 10,
      resizeColumnDisabled: false,
      showRowNumberColumn: true,
      suppressBottomBar: true
    };

    // when
    const properties = buildDatatableProperties(component);

    // then
    expect(properties).toEqual({
      keyField: 'Id',
      data: component.records,
      columns: component.columns,
      columnWidthsMode: 'auto',
      defaultSortDirection: 'asc',
      draftValues: [],
      hideCheckboxColumn: true,
      hideTableHeader: false,
      maxColumnWidth: 1000,
      maxRowSelection: 50,
      minColumnWidth: 50,
      rowNumberOffset: 10,
      resizeColumnDisabled: false,
      showRowNumberColumn: true,
      suppressBottomBar: true
    });
  });
});
