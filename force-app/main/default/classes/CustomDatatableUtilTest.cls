@IsTest
public with sharing class CustomDatatableUtilTest {
  @TestSetup
  static void makeData() {
    User u = new User();
    u.FirstName = 'Test';
    u.LastName = 'User';
    u.Username = '123test@example.com';
    u.Alias = '123test';
    u.Email = '123test@example.com';
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
    User u = [SELECT Id FROM User WHERE Username = '123test@example.com'];

    System.runAs(u) {
      Test.startTest();
      List<SObject> records = CustomDatatableUtil.getRecordsWithFieldSet(
        'Account',
        'Test_Field_Set',
        'Name LIKE \'Test Account %\''
      );
      Test.stopTest();

      Assert.areNotEqual(null, records, 'Returned records list empty.');
      Assert.areEqual(100, records.size(), 'Number of returned records is not correct.');
    }
  }

  @IsTest
  static void convertFieldSetToColumnsTest() {
    User u = [SELECT Id FROM User WHERE Username = '123test@example.com'];

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
  static void getCustomTypeAttributesTest() {
    User u = [SELECT Id FROM User WHERE Username = '123test@example.com'];

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
