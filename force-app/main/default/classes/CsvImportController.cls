/**
 * @description Server-side controller of the CSV Importer. Inserts or upserts one chunk of rows per call in user
 * mode, so the sharing rules, object and field permissions of the running user apply. A row that fails doesn't stop
 * the others.
 */
public with sharing class CsvImportController {
  private static final String ATTRIBUTES = 'attributes';

  /**
   * @description Inserts the records, or upserts them by a field that identifies them.
   * @param objectApiName API name of the object, e.g. Contact
   * @param recordsJson the records as a JSON array of objects, with field API names as keys
   * @param externalIdField API name of an external ID field or Id to upsert by, or blank to insert
   * @return the result of each record, in the order of the records
   */
  @AuraEnabled
  public static List<RowResult> importRecords(String objectApiName, String recordsJson, String externalIdField) {
    Schema.DescribeSObjectResult objectDescribe = describeObject(objectApiName);
    Schema.SObjectField upsertField = String.isBlank(externalIdField)
      ? null
      : lookupField(objectDescribe.fields.getMap(), externalIdField);

    List<RowResult> results = new List<RowResult>();
    List<SObject> records = toRecords(recordsJson, objectDescribe, results);
    // the rows that became records, in the same order; the others already have their message
    List<RowResult> pending = new List<RowResult>();
    for (RowResult result : results) {
      if (result.message == null) {
        pending.add(result);
      }
    }

    if (upsertField == null) {
      insertRecords(records, pending);
    } else {
      upsertRecords(records, upsertField, pending);
    }
    return results;
  }

  private static void insertRecords(List<SObject> records, List<RowResult> pending) {
    Database.SaveResult[] saveResults = Database.insert(records, false, AccessLevel.USER_MODE);
    for (Integer i = 0; i < saveResults.size(); i++) {
      Database.SaveResult saveResult = saveResults[i];
      if (saveResult.isSuccess()) {
        pending[i].markCreated(saveResult.getId());
      } else {
        pending[i].markFailed(saveResult.getErrors());
      }
    }
  }

  private static void upsertRecords(List<SObject> records, Schema.SObjectField upsertField, List<RowResult> pending) {
    Database.UpsertResult[] upsertResults = Database.upsert(records, upsertField, false, AccessLevel.USER_MODE);
    for (Integer i = 0; i < upsertResults.size(); i++) {
      Database.UpsertResult upsertResult = upsertResults[i];
      if (!upsertResult.isSuccess()) {
        pending[i].markFailed(upsertResult.getErrors());
      } else if (upsertResult.isCreated()) {
        pending[i].markCreated(upsertResult.getId());
      } else {
        pending[i].markUpdated(upsertResult.getId());
      }
    }
  }

  // turns the rows into records and adds a result for each row; a row that can't become a record gets its message
  private static List<SObject> toRecords(
    String recordsJson,
    Schema.DescribeSObjectResult objectDescribe,
    List<RowResult> results
  ) {
    Map<String, Schema.SObjectField> fields = objectDescribe.fields.getMap();
    // upserts by a field need a list of the concrete object type
    List<SObject> records = (List<SObject>) Type.forName('List<' + objectDescribe.getName() + '>').newInstance();
    for (Object row : (List<Object>) JSON.deserializeUntyped(recordsJson)) {
      RowResult result = new RowResult();
      results.add(result);
      Map<String, Object> values = (Map<String, Object>) row;
      String unknownField = findUnknownField(values, fields);
      if (unknownField != null) {
        // the platform would drop the value without an error
        result.message = 'The field ' + unknownField + ' does not exist.';
      } else {
        try {
          records.add(toRecord(values, objectDescribe.getName()));
        } catch (JSONException e) {
          result.message = e.getMessage();
        }
      }
    }
    return records;
  }

  private static Schema.DescribeSObjectResult describeObject(String objectApiName) {
    try {
      return Schema.describeSObjects(new List<String>{ objectApiName }, SObjectDescribeOptions.DEFERRED)[0];
    } catch (InvalidParameterValueException e) {
      throw handledException('The object ' + objectApiName + ' does not exist.');
    }
  }

  private static Schema.SObjectField lookupField(Map<String, Schema.SObjectField> fields, String fieldApiName) {
    Schema.SObjectField field = fields.get(fieldApiName);
    if (field == null || !field.getDescribe().isIdLookup()) {
      throw handledException('Records can\'t be upserted by ' + fieldApiName + '. Use an external ID field or Id.');
    }
    return field;
  }

  private static String findUnknownField(Map<String, Object> row, Map<String, Schema.SObjectField> fields) {
    for (String fieldApiName : row.keySet()) {
      if (!fields.containsKey(fieldApiName)) {
        return fieldApiName;
      }
    }
    return null;
  }

  // the JSON parser converts the values to the types of the fields, e.g. dates, numbers and checkboxes
  private static SObject toRecord(Map<String, Object> row, String objectName) {
    row.put(ATTRIBUTES, new Map<String, Object>{ 'type' => objectName });
    return (SObject) JSON.deserialize(JSON.serialize(row), SObject.class);
  }

  private static AuraHandledException handledException(String message) {
    AuraHandledException e = new AuraHandledException(message);
    e.setMessage(message);
    return e;
  }

  /**
   * @description The result of one row: whether it was saved, whether a new record was created, its id, or why it
   * failed.
   */
  public class RowResult {
    @AuraEnabled
    public Boolean success = false;
    @AuraEnabled
    public Boolean created = false;
    @AuraEnabled
    public Id recordId;
    @AuraEnabled
    public String message;

    /**
     * @description Marks the row as saved in a new record.
     * @param recordId id of the new record
     */
    public void markCreated(Id recordId) {
      this.success = true;
      this.created = true;
      this.recordId = recordId;
    }

    /**
     * @description Marks the row as saved in an existing record.
     * @param recordId id of the updated record
     */
    public void markUpdated(Id recordId) {
      this.success = true;
      this.recordId = recordId;
    }

    /**
     * @description Marks the row as failed.
     * @param errors why the record was not saved
     */
    public void markFailed(List<Database.Error> errors) {
      List<String> messages = new List<String>();
      for (Database.Error error : errors) {
        messages.add(error.getMessage());
      }
      this.message = String.join(messages, ' ');
    }
  }
}
