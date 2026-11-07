@IsTest
private class CsvImportControllerTest {
  private static final String USERNAME = 'c5f1e0a2-csv-import-test@example.com';
  private static final String ADMIN_USERNAME = 'c5f1e0a2-csv-import-admin@example.com';

  @TestSetup
  static void makeData() {
    insert new List<User>{
      newUser(USERNAME, 'Minimum Access - Salesforce'),
      newUser(ADMIN_USERNAME, 'System Administrator')
    };
    insert new Contact(LastName = 'Existing', Email = 'existing@example.com');
  }

  @IsTest
  static void insertsTheRowsAndReportsTheFailedOnes() {
    // given
    String recordsJson = JSON.serialize(
      new List<Object>{
        new Map<String, Object>{ 'LastName' => 'Berg', 'Birthdate' => '1990-05-01' },
        new Map<String, Object>{ 'FirstName' => 'Nameless' }
      }
    );

    // when
    List<CsvImportController.RowResult> results;
    Test.startTest();
    System.runAs(admin()) {
      results = CsvImportController.importRecords('Contact', recordsJson, '');
    }
    Test.stopTest();

    // then
    Assert.isTrue(results[0].success, 'The valid row should be saved.');
    Assert.isTrue(results[0].created, 'The valid row should create a record.');
    Contact berg = [SELECT Birthdate FROM Contact WHERE Id = :results[0].recordId];
    Assert.areEqual(Date.newInstance(1990, 5, 1), berg.Birthdate, 'The date should be converted.');
    Assert.isFalse(results[1].success, 'The row without a last name should fail.');
    Assert.isFalse(results[1].created, 'A failed row should not count as created.');
    Assert.isTrue(results[1].message.contains('LastName'), 'The message should name the missing field.');
  }

  @IsTest
  static void upsertsTheRowsByAFieldThatIdentifiesThem() {
    // given
    String recordsJson = JSON.serialize(
      new List<Object>{
        new Map<String, Object>{ 'Email' => 'existing@example.com', 'Title' => 'CEO' },
        new Map<String, Object>{ 'Email' => 'new@example.com', 'LastName' => 'New' },
        new Map<String, Object>{ 'Email' => 'nameless@example.com' }
      }
    );

    // when
    List<CsvImportController.RowResult> results;
    Test.startTest();
    System.runAs(admin()) {
      results = CsvImportController.importRecords('Contact', recordsJson, 'Email');
    }
    Test.stopTest();

    // then
    Assert.isTrue(results[0].success && !results[0].created, 'The existing contact should be updated.');
    Assert.areEqual('CEO', [SELECT Title FROM Contact WHERE LastName = 'Existing'].Title, 'The title should be set.');
    Assert.isTrue(results[1].success && results[1].created, 'The new contact should be created.');
    Assert.isNull(results[1].message, 'A saved row should have no message.');
    Assert.isFalse(results[2].success, 'A new contact without a last name should fail.');
    Assert.isTrue(results[2].message.contains('LastName'), 'The message should name the missing field.');
  }

  @IsTest
  static void reportsRowsWithUnknownFieldsOrValuesOfTheWrongType() {
    // given
    String recordsJson = JSON.serialize(
      new List<Object>{
        new Map<String, Object>{ 'LastName' => 'Unknown', 'Nope__c' => 'x' },
        new Map<String, Object>{ 'LastName' => 'Wrong', 'Birthdate' => 'yesterday' },
        new Map<String, Object>{ 'LastName' => 'Valid' }
      }
    );

    // when
    List<CsvImportController.RowResult> results;
    Test.startTest();
    System.runAs(admin()) {
      results = CsvImportController.importRecords('Contact', recordsJson, null);
    }
    Test.stopTest();

    // then
    Assert.areEqual('The field Nope__c does not exist.', results[0].message, 'Unknown fields should be reported.');
    Assert.isFalse(results[1].success, 'A value of the wrong type should fail its row.');
    Assert.isNotNull(results[1].message, 'The row with a wrong value should say why.');
    Assert.isTrue(results[2].success, 'The other rows should still be saved.');
  }

  @IsTest
  static void rejectsAnUnknownObjectAndFieldsThatDontIdentifyRecords() {
    // given
    List<List<String>> calls = new List<List<String>>{
      new List<String>{ 'Nope__x', '' },
      new List<String>{ 'Contact', 'LastName' }
    };
    List<String> messages = new List<String>();

    // when
    Test.startTest();
    System.runAs(admin()) {
      for (List<String> args : calls) {
        try {
          CsvImportController.importRecords(args[0], '[]', args[1]);
        } catch (AuraHandledException e) {
          messages.add(e.getMessage());
        }
      }
    }
    Test.stopTest();

    // then
    Assert.areEqual(
      new List<String>{
        'The object Nope__x does not exist.',
        'Records can\'t be upserted by LastName. Use an external ID field or Id.'
      },
      messages,
      'Both calls should be rejected with a message.'
    );
  }

  @IsTest
  static void appliesThePermissionsOfTheRunningUser() {
    // given
    User u = [SELECT Id FROM User WHERE Username = :USERNAME];
    String recordsJson = JSON.serialize(new List<Object>{ new Map<String, Object>{ 'LastName' => 'Denied' } });
    List<CsvImportController.RowResult> results;

    // when
    Test.startTest();
    System.runAs(u) {
      results = CsvImportController.importRecords('Contact', recordsJson, '');
    }
    Test.stopTest();

    // then
    Assert.isFalse(results[0].success, 'A user without access to contacts should not create one.');
    Assert.isTrue(results[0].message.contains('Contact'), 'The message should name the object.');
    Assert.areEqual(0, [SELECT COUNT() FROM Contact WHERE LastName = 'Denied'], 'Nothing should be saved.');
  }

  private static User admin() {
    return [SELECT Id FROM User WHERE Username = :ADMIN_USERNAME];
  }

  private static User newUser(String username, String profileName) {
    User u = new User();
    u.LastName = 'CSV Import';
    u.Username = username;
    u.Alias = username.substringAfterLast('-').left(8);
    u.Email = username;
    u.ProfileId = [SELECT Id FROM Profile WHERE Name = :profileName LIMIT 1].Id;
    u.TimeZoneSidKey = 'America/Chicago';
    u.LocaleSidKey = 'en_US';
    u.EmailEncodingKey = 'UTF-8';
    u.LanguageLocaleKey = 'en_US';
    return u;
  }
}
