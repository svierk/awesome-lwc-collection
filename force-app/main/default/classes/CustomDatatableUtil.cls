public with sharing class CustomDatatableUtil {
  @AuraEnabled(cacheable=true)
  public static List<SObject> getRecordsWithFieldSet(
    String objectName,
    String fieldSetName,
    String whereConditions,
    Integer pageSize,
    Integer pageNumber,
    String searchTerm
  ) {
    String fieldList = '';
    for (Schema.FieldSetMember f : readFieldSet(objectName, fieldSetName)) {
      fieldList += f.getFieldPath() + ', ';
    }
    fieldList += 'Id';

    List<SObject> records = getRecords(objectName, fieldList, whereConditions, pageSize, pageNumber, searchTerm);
    return records;
  }

  @AuraEnabled(cacheable=true)
  public static Integer getRecordCount(
    String objectName,
    String fieldSetName,
    String whereConditions,
    String searchTerm
  ) {
    String query = 'SELECT COUNT() FROM ' + String.escapeSingleQuotes(objectName);
    String searchCondition = buildSearchCondition(objectName, searchTerm);
    List<String> conditions = new List<String>();
    if (String.isNotBlank(whereConditions)) {
      conditions.add(whereConditions);
    }
    if (String.isNotBlank(searchCondition)) {
      conditions.add(searchCondition);
    }
    if (!conditions.isEmpty()) {
      query = query + ' WHERE ' + String.join(conditions, ' AND ');
    }
    return Database.countQuery(query);
  }

  @TestVisible
  private static List<String> getSearchableFields(String objectName) {
    List<String> searchableFields = new List<String>();
    Set<Schema.DisplayType> searchableTypes = new Set<Schema.DisplayType>{
      Schema.DisplayType.STRING,
      Schema.DisplayType.PHONE,
      Schema.DisplayType.EMAIL,
      Schema.DisplayType.URL,
      Schema.DisplayType.PICKLIST,
      Schema.DisplayType.MULTIPICKLIST
    };

    Map<String, Schema.SObjectField> fieldMap = Schema.getGlobalDescribe()
      .get(objectName)
      .getDescribe()
      .fields.getMap();

    for (String fieldName : fieldMap.keySet()) {
      Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
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

  private static String buildSearchCondition(String objectName, String searchTerm) {
    if (String.isBlank(searchTerm)) {
      return '';
    }
    String escapedTerm = String.escapeSingleQuotes(searchTerm.trim());
    List<String> fieldConditions = new List<String>();
    for (String fieldName : getSearchableFields(objectName)) {
      fieldConditions.add(fieldName + ' LIKE \'%' + escapedTerm + '%\'');
    }
    if (fieldConditions.isEmpty()) {
      return '';
    }
    return '(' + String.join(fieldConditions, ' OR ') + ')';
  }

  private static List<Schema.FieldSetMember> readFieldSet(String objectName, String fieldSetName) {
    Map<String, Schema.SObjectType> globalDescribeMap = Schema.getGlobalDescribe();
    Schema.SObjectType sObjectTypeObj = globalDescribeMap.get(objectName);
    Schema.DescribeSObjectResult describeSObjectResultObj = sObjectTypeObj.getDescribe();
    Schema.FieldSet fieldSetObj = describeSObjectResultObj.FieldSets.getMap().get(fieldSetName);

    return fieldSetObj.getFields();
  }

  private static List<SObject> getRecords(
    String objectName,
    String fieldList,
    String whereConditions,
    Integer pageSize,
    Integer pageNumber,
    String searchTerm
  ) {
    String query = 'SELECT ' + String.escapeSingleQuotes(fieldList) + ' FROM ' + String.escapeSingleQuotes(objectName);
    String searchCondition = buildSearchCondition(objectName, searchTerm);
    List<String> conditions = new List<String>();
    if (String.isNotBlank(whereConditions)) {
      conditions.add(whereConditions);
    }
    if (String.isNotBlank(searchCondition)) {
      conditions.add(searchCondition);
    }
    if (!conditions.isEmpty()) {
      query = query + ' WHERE ' + String.join(conditions, ' AND ');
    }

    if (pageSize != null && pageSize > 0) {
      Integer offset = (pageNumber != null && pageNumber > 1) ? (pageNumber - 1) * pageSize : 0;
      query = query + ' LIMIT ' + pageSize + ' OFFSET ' + offset;
    }

    return Database.query(query);
  }

  @AuraEnabled(cacheable=true)
  public static List<TableColumn> convertFieldSetToColumns(String objectName, String fieldSetName, Boolean readOnly) {
    List<TableColumn> columns = new List<TableColumn>();

    for (Schema.FieldSetMember f : readFieldSet(objectName, fieldSetName)) {
      TableColumn column = new TableColumn();
      column.label = f.getLabel();
      column.fieldName = f.getFieldPath();
      column.type = getColumnType(f.getType());
      column.sortable = false;
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

  public class TableColumn {
    @AuraEnabled
    public String label { get; set; }
    @AuraEnabled
    public String type { get; set; }
    @AuraEnabled
    public String fieldName { get; set; }
    @AuraEnabled
    public Boolean sortable { get; set; }
    @AuraEnabled
    public Boolean editable { get; set; }
    @AuraEnabled
    public Boolean wrapText { get; set; }
    @AuraEnabled
    public Integer initialWidth { get; set; }
    @AuraEnabled
    public CellAttributes cellAttributes { get; set; }
    @AuraEnabled
    public TypeAttributes typeAttributes { get; set; }
  }

  public class CellAttributes {
    @AuraEnabled
    public String name { get; set; }
    @AuraEnabled
    public String alignment { get; set; }
    @AuraEnabled
    public String iconName { get; set; }
    @AuraEnabled
    public String iconAlternativeText { get; set; }
    @AuraEnabled
    public String iconPosition { get; set; }
    @AuraEnabled
    public String iconLabel { get; set; }
    @AuraEnabled
    public String className { get; set; }
  }

  public class TypeAttributes {
    @AuraEnabled
    public FieldName recordId { get; set; }
    @AuraEnabled
    public String fieldName { get; set; }
    @AuraEnabled
    public String objectName { get; set; }
    @AuraEnabled
    public Boolean disabled { get; set; }
    @AuraEnabled
    public String currencyCode { get; set; }
  }

  public class FieldName {
    @AuraEnabled
    public String fieldName { get; set; }
  }
}
