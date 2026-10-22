/**
 * @description Server-side controller of the Custom Datatable component. Reads the columns and records of an
 * object's field set. All record queries run in user mode, so the sharing rules, object and field permissions
 * of the running user apply.
 */
public with sharing class CustomDatatableUtil {
  private static final String SEARCH_BIND = 'searchPattern';

  /**
   * @description Returns the records of an object with the fields of the given field set.
   * @param objectName API name of the object to query
   * @param fieldSetName API name of the field set that defines the queried fields
   * @param whereConditions SOQL filter configured for the component, without the WHERE keyword
   * @param pageSize number of records per page, or null to return all records
   * @param pageNumber 1-based number of the page to return
   * @param searchTerm text to search for in all searchable fields of the object
   * @param sortedBy path of the field to sort by, must be part of the field set
   * @param sortDirection sort direction, either asc or desc
   * @return the matching records
   */
  // The parameters are the reactive wire parameters of the component, so they stay a flat list.
  @SuppressWarnings('PMD.ExcessiveParameterList')
  @AuraEnabled(cacheable=true)
  public static List<SObject> getRecordsWithFieldSet(
    String objectName,
    String fieldSetName,
    String whereConditions,
    Integer pageSize,
    Integer pageNumber,
    String searchTerm,
    String sortedBy,
    String sortDirection
  ) {
    Schema.DescribeSObjectResult objectDescribe = describeObject(objectName);
    List<String> fieldPaths = new List<String>();
    for (Schema.FieldSetMember f : readFieldSet(objectDescribe, fieldSetName)) {
      fieldPaths.add(f.getFieldPath());
    }
    if (!fieldPaths.contains('Id')) {
      fieldPaths.add('Id');
    }

    String query =
      'SELECT ' +
      String.join(fieldPaths, ', ') +
      ' FROM ' +
      objectDescribe.getName() +
      buildWhereClause(objectDescribe, whereConditions, searchTerm) +
      buildOrderByClause(fieldPaths, sortedBy, sortDirection) +
      buildLimitClause(pageSize, pageNumber);
    return Database.queryWithBinds(query, buildSearchBinds(searchTerm), AccessLevel.USER_MODE);
  }

  /**
   * @description Returns the number of records that match the filter and the search term.
   * @param objectName API name of the object to count
   * @param whereConditions SOQL filter configured for the component, without the WHERE keyword
   * @param searchTerm text to search for in all searchable fields of the object
   * @return the number of matching records
   */
  @AuraEnabled(cacheable=true)
  public static Integer getRecordCount(String objectName, String whereConditions, String searchTerm) {
    Schema.DescribeSObjectResult objectDescribe = describeObject(objectName);
    String query =
      'SELECT COUNT() FROM ' +
      objectDescribe.getName() +
      buildWhereClause(objectDescribe, whereConditions, searchTerm);
    return Database.countQueryWithBinds(query, buildSearchBinds(searchTerm), AccessLevel.USER_MODE);
  }

  @TestVisible
  private static List<String> getSearchableFields(Schema.DescribeSObjectResult objectDescribe) {
    List<String> searchableFields = new List<String>();
    Set<Schema.DisplayType> searchableTypes = new Set<Schema.DisplayType>{
      Schema.DisplayType.STRING,
      Schema.DisplayType.PHONE,
      Schema.DisplayType.EMAIL,
      Schema.DisplayType.URL,
      Schema.DisplayType.PICKLIST,
      Schema.DisplayType.MULTIPICKLIST
    };

    for (Schema.SObjectField field : objectDescribe.fields.getMap().values()) {
      Schema.DescribeFieldResult fieldDescribe = field.getDescribe();
      if (
        fieldDescribe.isAccessible() &&
        fieldDescribe.isFilterable() &&
        searchableTypes.contains(fieldDescribe.getType())
      ) {
        searchableFields.add(fieldDescribe.getName());
      }
    }
    return searchableFields;
  }

  private static Schema.DescribeSObjectResult describeObject(String objectName) {
    return Schema.describeSObjects(new List<String>{ objectName }, SObjectDescribeOptions.DEFERRED)[0];
  }

  private static List<Schema.FieldSetMember> readFieldSet(
    Schema.DescribeSObjectResult objectDescribe,
    String fieldSetName
  ) {
    return objectDescribe.fieldSets.getMap().get(fieldSetName).getFields();
  }

  // The configured filter is wrapped in parentheses, so an OR inside it cannot leak into the search condition.
  // The search term itself is never part of the query string, it is passed as bind variable.
  private static String buildWhereClause(
    Schema.DescribeSObjectResult objectDescribe,
    String whereConditions,
    String searchTerm
  ) {
    List<String> conditions = new List<String>();
    if (String.isNotBlank(whereConditions)) {
      conditions.add('(' + whereConditions + ')');
    }
    String searchCondition = buildSearchCondition(objectDescribe, searchTerm);
    if (String.isNotBlank(searchCondition)) {
      conditions.add(searchCondition);
    }
    return conditions.isEmpty() ? '' : ' WHERE ' + String.join(conditions, ' AND ');
  }

  private static String buildSearchCondition(Schema.DescribeSObjectResult objectDescribe, String searchTerm) {
    if (String.isBlank(searchTerm)) {
      return '';
    }
    List<String> fieldConditions = new List<String>();
    for (String fieldName : getSearchableFields(objectDescribe)) {
      fieldConditions.add(fieldName + ' LIKE :' + SEARCH_BIND);
    }
    return fieldConditions.isEmpty() ? '' : '(' + String.join(fieldConditions, ' OR ') + ')';
  }

  private static Map<String, Object> buildSearchBinds(String searchTerm) {
    Map<String, Object> binds = new Map<String, Object>();
    if (String.isNotBlank(searchTerm)) {
      binds.put(SEARCH_BIND, '%' + searchTerm.trim() + '%');
    }
    return binds;
  }

  // Only fields of the field set can be sorted by, any other value is ignored.
  private static String buildOrderByClause(List<String> fieldPaths, String sortedBy, String sortDirection) {
    if (!fieldPaths.contains(sortedBy)) {
      return '';
    }
    String direction = 'desc'.equalsIgnoreCase(sortDirection) ? 'DESC' : 'ASC';
    return ' ORDER BY ' + sortedBy + ' ' + direction + ' NULLS LAST';
  }

  private static String buildLimitClause(Integer pageSize, Integer pageNumber) {
    if (pageSize == null || pageSize <= 0) {
      return '';
    }
    Integer offset = (pageNumber != null && pageNumber > 1) ? (pageNumber - 1) * pageSize : 0;
    return ' LIMIT ' + pageSize + ' OFFSET ' + offset;
  }

  /**
   * @description Returns the datatable column definitions for the fields of the given field set.
   * @param objectName API name of the object
   * @param fieldSetName API name of the field set that defines the columns
   * @param readOnly whether inline editing is disabled for all columns
   * @param enableSorting whether the columns can be sorted
   * @return one column definition per field of the field set
   */
  // The parameters are the reactive wire parameters of the component, two of them mirror its Boolean properties.
  @SuppressWarnings('PMD.ExcessiveParameterList, PMD.AvoidBooleanMethodParameters')
  @AuraEnabled(cacheable=true)
  public static List<TableColumn> convertFieldSetToColumns(
    String objectName,
    String fieldSetName,
    Boolean readOnly,
    Boolean enableSorting
  ) {
    List<TableColumn> columns = new List<TableColumn>();

    for (Schema.FieldSetMember f : readFieldSet(describeObject(objectName), fieldSetName)) {
      TableColumn column = new TableColumn();
      column.label = f.getLabel();
      column.fieldName = f.getFieldPath();
      column.type = getColumnType(f.getType());
      column.sortable = enableSorting != null && enableSorting && column.type != 'datatableLookup';
      column.editable = !readOnly && f.getSObjectField().getDescribe().isUpdateable();

      if (column.type == 'datatableLookup') {
        column.typeAttributes = getCustomTypeAttributes(column, objectName);
        column.initialWidth = 180;
      }

      columns.add(column);
    }

    return columns;
  }

  @TestVisible
  private static TypeAttributes getCustomTypeAttributes(TableColumn column, String objectName) {
    TypeAttributes typeAttr = new TypeAttributes();
    typeAttr.fieldName = column.fieldName;
    typeAttr.objectName = objectName;
    typeAttr.disabled = !column.editable;

    FieldName fieldName = new FieldName();
    fieldName.fieldName = 'Id';
    typeAttr.recordId = fieldName;

    return typeAttr;
  }

  /**
   * @description Maps a field type to the matching datatable column type.
   * @param dt type of the field
   * @return the datatable column type, text for all unmapped field types
   */
  public static String getColumnType(Schema.DisplayType dt) {
    switch on dt {
      when INTEGER {
        return 'number';
      }
      when Double {
        return 'number';
      }
      when Boolean {
        return 'boolean';
      }
      when Date {
        return 'date';
      }
      when DateTime {
        return 'date';
      }
      when Currency {
        return 'currency';
      }
      when Phone {
        return 'phone';
      }
      when URL {
        return 'url';
      }
      when Email {
        return 'email';
      }
      when Percent {
        return 'percent';
      }
      when REFERENCE {
        return 'datatableLookup';
      }
      when else {
        return 'text';
      }
    }
  }

  /**
   * @description Column definition of a lightning-datatable.
   */
  // The Boolean properties mirror the column attributes of lightning-datatable.
  @SuppressWarnings('PMD.AvoidBooleanMethodParameters')
  public class TableColumn {
    /** @description Text of the column header. */
    @AuraEnabled
    public String label { get; set; }
    /** @description Data type of the column, such as text, number or datatableLookup. */
    @AuraEnabled
    public String type { get; set; }
    /** @description Path of the field that is shown in the column. */
    @AuraEnabled
    public String fieldName { get; set; }
    /** @description Whether the column can be sorted. */
    @AuraEnabled
    public Boolean sortable { get; set; }
    /** @description Whether the cells of the column can be edited inline. */
    @AuraEnabled
    public Boolean editable { get; set; }
    /** @description Whether long cell values wrap instead of being truncated. */
    @AuraEnabled
    public Boolean wrapText { get; set; }
    /** @description Initial width of the column in pixels. */
    @AuraEnabled
    public Integer initialWidth { get; set; }
    /** @description Styling of the cells of the column. */
    @AuraEnabled
    public CellAttributes cellAttributes { get; set; }
    /** @description Type-specific attributes of the column. */
    @AuraEnabled
    public TypeAttributes typeAttributes { get; set; }
  }

  /**
   * @description Cell attributes of a lightning-datatable column.
   */
  public class CellAttributes {
    /** @description Name of the cell. */
    @AuraEnabled
    public String name { get; set; }
    /** @description Horizontal alignment of the cell content: left, center or right. */
    @AuraEnabled
    public String alignment { get; set; }
    /** @description Name of the icon shown in the cell. */
    @AuraEnabled
    public String iconName { get; set; }
    /** @description Assistive text of the icon. */
    @AuraEnabled
    public String iconAlternativeText { get; set; }
    /** @description Position of the icon relative to the cell content: left or right. */
    @AuraEnabled
    public String iconPosition { get; set; }
    /** @description Label shown next to the icon. */
    @AuraEnabled
    public String iconLabel { get; set; }
    /** @description CSS class added to the cell. */
    @AuraEnabled
    public String className { get; set; }
  }

  /**
   * @description Type attributes of the custom datatableLookup column type.
   */
  // The Boolean property mirrors the disabled type attribute of the lookup column.
  @SuppressWarnings('PMD.AvoidBooleanMethodParameters')
  public class TypeAttributes {
    /** @description Field of the row that holds the record id. */
    @AuraEnabled
    public FieldName recordId { get; set; }
    /** @description Path of the lookup field. */
    @AuraEnabled
    public String fieldName { get; set; }
    /** @description API name of the object that holds the lookup field. */
    @AuraEnabled
    public String objectName { get; set; }
    /** @description Whether the lookup can not be edited. */
    @AuraEnabled
    public Boolean disabled { get; set; }
    /** @description ISO currency code of currency columns. */
    @AuraEnabled
    public String currencyCode { get; set; }
  }

  /**
   * @description Reference to a field of the row, used for type attributes that read their value from the row.
   */
  public class FieldName {
    /** @description Name of the referenced field. */
    @AuraEnabled
    public String fieldName { get; set; }
  }
}
