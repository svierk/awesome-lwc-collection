@IsTest
public with sharing class CustomDatatableUtilTest {
  @TestSetup
  static void setup() {
    User u = new User();
    u.FirstName = 'Test';
    u.LastName = 'User';
    u.Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com';
    u.Alias = 'a86f';
    u.Email = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com';
    u.ProfileId = [SELECT Id FROM Profile WHERE Name = 'System Administrator' LIMIT 1].Id;
    u.TimeZoneSidKey = 'America/Chicago';
    u.LocaleSidKey = 'en_US';
    u.EmailEncodingKey = 'UTF-8';
    u.LanguageLocaleKey = 'en_US';
    insert u;

    List<Account> accounts = new List<Account>();
    for (Integer i = 0; i < 100; i++) {
      Account a = new Account();
      a.Name = 'Test Account ' + String.valueOf(i);
      a.OwnerId = UserInfo.getUserId();
      accounts.add(a);
    }
    insert accounts;
  }

  @IsTest
  static void getRecordsWithFieldSetTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      List<SObject> records = CustomDatatableUtil.getRecordsWithFieldSet(
        'Account',
        'Test_Field_Set',
        'Name LIKE \'Test Account %\'',
        null,
        null,
        null
      );
      Test.stopTest();

      Assert.areNotEqual(null, records, 'Returned records list is empty.');
      Assert.areEqual(100, records.size(), 'Number of returned records is not correct.');
    }
  }

  @IsTest
  static void getRecordsWithFieldSetPaginatedTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      List<SObject> records = CustomDatatableUtil.getRecordsWithFieldSet(
        'Account',
        'Test_Field_Set',
        'Name LIKE \'Test Account %\'',
        10,
        2,
        null
      );
      Test.stopTest();

      Assert.areNotEqual(null, records, 'Returned records list is empty.');
      Assert.areEqual(10, records.size(), 'Paginated query should return exactly pageSize records.');
    }
  }

  @IsTest
  static void getRecordCountTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      Integer count = CustomDatatableUtil.getRecordCount(
        'Account',
        'Test_Field_Set',
        'Name LIKE \'Test Account %\'',
        null
      );
      Test.stopTest();

      Assert.areEqual(100, count, 'Record count should match the number of inserted accounts.');
    }
  }

  @IsTest
  static void getRecordCountWithoutWhereTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      Integer count = CustomDatatableUtil.getRecordCount('Account', 'Test_Field_Set', null, null);
      Test.stopTest();

      Assert.isTrue(count >= 100, 'Record count should include at least the inserted accounts.');
    }
  }

  @IsTest
  static void convertFieldSetToColumnsTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      List<CustomDatatableUtil.TableColumn> columnList = CustomDatatableUtil.convertFieldSetToColumns(
        'Account',
        'Test_Field_Set',
        true
      );
      Test.stopTest();

      Assert.areNotEqual(null, columnList, 'Returned column list is empty.');
      Assert.areNotEqual(0, columnList.size(), 'Returned column list is empty.');
    }
  }

  @IsTest
  static void getRecordsWithFieldSetSearchTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      List<SObject> records = CustomDatatableUtil.getRecordsWithFieldSet(
        'Account',
        'Test_Field_Set',
        null,
        null,
        null,
        'Test Account 1'
      );
      Test.stopTest();

      Assert.areNotEqual(null, records, 'Returned records list should not be null.');
      Assert.isTrue(records.size() > 0, 'Search should return matching records.');
      Assert.isTrue(records.size() < 100, 'Search should filter results to fewer than all records.');
    }
  }

  @IsTest
  static void getRecordCountWithSearchTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      Integer count = CustomDatatableUtil.getRecordCount('Account', 'Test_Field_Set', null, 'Test Account 1');
      Test.stopTest();

      Assert.isTrue(count > 0, 'Search count should return matching records.');
      Assert.isTrue(count < 100, 'Search count should be fewer than all records.');
    }
  }

  @IsTest
  static void getSearchableFieldsTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      List<String> fields = CustomDatatableUtil.getSearchableFields('Account');
      Test.stopTest();

      Assert.areNotEqual(null, fields, 'Searchable fields list should not be null.');
      Assert.isTrue(fields.size() > 0, 'Account should have at least one searchable text field.');
      Assert.isTrue(fields.contains('Name'), 'Account Name should be a searchable field.');

      Map<String, Schema.SObjectField> fieldMap = Schema.SObjectType.Account.fields.getMap();
      for (String fieldName : fields) {
        Schema.DescribeFieldResult fieldDescribe = fieldMap.get(fieldName).getDescribe();
        Assert.isTrue(fieldDescribe.isFilterable(), 'Field ' + fieldName + ' should be filterable.');
        Assert.isTrue(fieldDescribe.isAccessible(), 'Field ' + fieldName + ' should be accessible.');
      }
    }
  }

  @IsTest
  static void getCustomTypeAttributesTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];

    System.runAs(u) {
      Test.startTest();
      CustomDatatableUtil.TableColumn column = new CustomDatatableUtil.TableColumn();
      column.fieldName = 'TestField';
      column.editable = true;
      column.wrapText = true;
      column.initialWidth = 100;
      CustomDatatableUtil.CellAttributes cellAttributes = new CustomDatatableUtil.CellAttributes();
      cellAttributes.name = 'test';
      cellAttributes.alignment = 'test';
      cellAttributes.iconName = 'test';
      cellAttributes.iconAlternativeText = 'test';
      cellAttributes.iconPosition = 'test';
      cellAttributes.iconLabel = 'test';
      cellAttributes.className = 'test';
      column.cellAttributes = cellAttributes;
      CustomDatatableUtil.TypeAttributes typeAttributes = new CustomDatatableUtil.TypeAttributes();
      typeAttributes.currencyCode = 'EUR';
      column.typeAttributes = typeAttributes;
      CustomDatatableUtil.TypeAttributes customTypeAttributes = CustomDatatableUtil.getCustomTypeAttributes(
        column,
        'Account'
      );
      Test.stopTest();

      Assert.areNotEqual(null, customTypeAttributes, 'CustomTypeAttributes is null.');
    }
  }
}
