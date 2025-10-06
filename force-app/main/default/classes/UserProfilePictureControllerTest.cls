@IsTest
public class UserProfilePictureControllerTest {
  @TestSetup
  static void makeData() {
    User u = new User();
    u.FirstName = 'Test';
    u.LastName = 'User';
    u.Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com';
    u.Alias = '4e42b089-3bc6-496c-a86f-2e6e1e639547';
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

    System.runAs(u) {
      Test.startTest();
      UserProfilePictureController.updateProfilePicture('some base64 string');
      Test.stopTest();

      User uModified = [
        SELECT Id, LastModifiedDate
        FROM User
        WHERE Username = '4e42b089-3bc6-496c-a86f-2e6e1e639547@example.com'
      ];
      Assert.isTrue(System.today().isSameDay(uModified.LastModifiedDate.date()), 'LastModifiedDate is not today.');
    }
  }
}
