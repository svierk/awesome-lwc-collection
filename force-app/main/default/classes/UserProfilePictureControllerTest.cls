@IsTest
public class UserProfilePictureControllerTest {
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
  }

  @IsTest
  public static void updateProfilePicture() {
    User u = [SELECT Id FROM User WHERE Username = '123test@example.com'];

    System.runAs(u) {
      Test.startTest();
      UserProfilePictureController.updateProfilePicture('some base64 string');
      Test.stopTest();

      User uModified = [SELECT Id, LastModifiedDate FROM User WHERE Username = '123test@example.com'];
      Assert.isTrue(System.today().isSameDay(uModified.LastModifiedDate.date()), 'LastModifiedDate is not today.');
    }
  }
}
