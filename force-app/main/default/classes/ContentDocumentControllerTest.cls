@IsTest
public class ContentDocumentControllerTest {
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

    Account a = new Account();
    a.Name = 'Test Account';
    a.OwnerId = UserInfo.getUserId();
    insert a;
  }

  @IsTest
  public static void getDocumentsTest() {
    User u = [SELECT Id FROM User WHERE Username = '123test@example.com'];

    System.runAs(u) {
      Test.startTest();
      Id accountId = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1].Id;
      Id contentDocumentId = createContentSetup(accountId);
      Test.stopTest();

      String jsonString = ContentDocumentController.getDocuments(accountId, 'Test Documents');
      Assert.areNotEqual('', jsonString, 'Returned documents list is empty.');
    }
  }

  @IsTest
  public static void getLatestVersionTest() {
    User u = [SELECT Id FROM User WHERE Username = '123test@example.com'];

    System.runAs(u) {
      Test.startTest();
      Id accountId = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1].Id;
      Id contentDocumentId = createContentSetup(accountId);
      Test.stopTest();

      String version = ContentDocumentController.getLatestVersion(contentDocumentId);
      Assert.areNotEqual('', version, 'Document version does not exist.');
    }
  }

  @IsTest
  public static void deleteDocumentTest() {
    User u = [SELECT Id FROM User WHERE Username = '123test@example.com'];

    System.runAs(u) {
      Test.startTest();
      Id accountId = [SELECT Id FROM Account WHERE Name = 'Test Account' LIMIT 1].Id;
      Id contentDocumentId = createContentSetup(accountId);
      ContentDocumentController.deleteDocument(contentDocumentId);
      Test.stopTest();

      ContentDocument deletedDocument = [
        SELECT Id, IsDeleted
        FROM ContentDocument
        WHERE Id = :contentDocumentId
        ALL ROWS
      ];
      Assert.areEqual(true, deletedDocument.IsDeleted, 'Document could not be deleted.');
    }
  }

  private static Id createContentSetup(Id recordId) {
    ContentWorkspace cw = getContentWorkspace('Test Documents');
    insert cw;
    ContentFolderLink cfl = [
      SELECT Id, ContentFolderId, ParentEntityId
      FROM ContentFolderLink
      WHERE ParentEntityId = :cw.Id
    ];
    ContentFolder cf = getContentFolder(recordId.getSObjectType().getDescribe().getName(), cfl.ContentFolderId);
    insert cf;
    ContentVersion cv = getContentVersion(1);
    insert cv;
    ContentDocumentLink cdl = getContentDocumentLink(cv, cw.Id);
    insert cdl;
    ContentFolderMember cfm = getContentFolderMember(cdl.ContentDocumentId, cfl.ContentFolderId, cf.Id);
    update cfm;

    return cdl.ContentDocumentId;
  }

  private static ContentWorkspace getContentWorkspace(String name) {
    ContentWorkspace cw = new ContentWorkspace();
    cw.Name = name;
    return cw;
  }

  private static ContentFolder getContentFolder(String name, Id id) {
    ContentFolder cf = new ContentFolder();
    cf.Name = name;
    cf.ParentContentFolderId = id;
    return cf;
  }

  private static ContentVersion getContentVersion(Integer counter) {
    ContentVersion cv = new ContentVersion();
    cv.Title = 'Content_' + counter;
    cv.PathOnClient = '/' + cv.Title + '.jpg';
    Blob bodyBlob = Blob.valueOf('ContentVersion Body');
    cv.VersionData = bodyBlob;
    cv.Origin = 'H';
    return cv;
  }

  private static ContentDocumentLink getContentDocumentLink(ContentVersion cv, Id id) {
    ContentDocumentLink cdl = new ContentDocumentLink();
    cdl.LinkedEntityId = id;
    cdl.ContentDocumentId = [SELECT ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id][0].ContentDocumentId;
    cdl.ShareType = 'I';
    cdl.Visibility = 'AllUsers';
    return cdl;
  }

  private static ContentFolderMember getContentFolderMember(Id fileId, Id parentId, Id childId) {
    ContentFolderMember cfm = [
      SELECT Id, ChildRecordId, ParentContentFolderId
      FROM ContentFolderMember
      WHERE ChildRecordId = :fileId AND ParentContentFolderId = :parentId
    ];
    cfm.ParentContentFolderId = childId;
    return cfm;
  }
}
