public with sharing class CustomDatatableUtil {
  @AuraEnabled(cacheable=true)
  public static List<SObject> getRecordsWithFieldSet(String objectName, String fieldSetName, String whereConditions) {
    String fieldList = '';
    for (Schema.FieldSetMember f : readFieldSet(objectName, fieldSetName)) {
      fieldList += f.getFieldPath() + ', ';
    }
    fieldList += 'Id';

    List<SObject> records = getRecords(objectName, fieldList, whereConditions);
    return records;
  }

  private static List<Schema.FieldSetMember> readFieldSet(String objectName, String fieldSetName) {
    Map<String, Schema.SObjectType> globalDescribeMap = Schema.getGlobalDescribe();
    Schema.SObjectType sObjectTypeObj = globalDescribeMap.get(objectName);
    Schema.DescribeSObjectResult describeSObjectResultObj = sObjectTypeObj.getDescribe();
    Schema.FieldSet fieldSetObj = describeSObjectResultObj.FieldSets.getMap().get(fieldSetName);

    return fieldSetObj.getFields();
  }

  private static List<SObject> getRecords(String objectName, String fieldList, String whereConditions) {
    String query = 'SELECT ' + String.escapeSingleQuotes(fieldList) + ' FROM ' + String.escapeSingleQuotes(objectName);
    if (String.isNotBlank(whereConditions)) {
      query = query + ' WHERE ' + whereConditions;
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
