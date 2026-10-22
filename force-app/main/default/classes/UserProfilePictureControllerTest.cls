@IsTest
public class UserProfilePictureControllerTest {
  @TestSetup
  static void makeData() {
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
  }

  @IsTest
  public static void updateProfilePicture() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];
    Exception caughtException;

    System.runAs(u) {
      Test.startTest();
      try {
        UserProfilePictureController.updateProfilePicture(EncodingUtil.base64Encode(Blob.valueOf('image')));
      } catch (Exception e) {
        caughtException = e;
      }
      Test.stopTest();
    }

    // Connect API calls are not supported in tests without SeeAllData, so the call may fail here.
    // Either way, the component must only ever receive an AuraHandledException.
    Assert.isTrue(
      caughtException == null || caughtException instanceof AuraHandledException,
      'Errors should be passed on to the component as AuraHandledException.'
    );
  }

  @IsTest
  public static void updateProfilePictureWithoutImageTest() {
    User u = [SELECT Id FROM User WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'];
    Exception caughtException;

    System.runAs(u) {
      Test.startTest();
      try {
        UserProfilePictureController.updateProfilePicture(null);
      } catch (Exception e) {
        caughtException = e;
      }
      Test.stopTest();
    }

    Assert.isInstanceOfType(
      caughtException,
      AuraHandledException.class,
      'A missing image should be passed on to the component as AuraHandledException.'
    );
  }
}
