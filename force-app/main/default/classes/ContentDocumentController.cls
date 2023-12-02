public with sharing class ContentDocumentController {
  @AuraEnabled
  public static String getDocuments(Id recordId, String library) {
    try {
      String objectName = recordId.getSObjectType().getDescribe().getName();

      // get workspace library
      ContentWorkspace workspace = [
        SELECT Id, Name
        FROM ContentWorkspace
        WHERE Name LIKE :library
        WITH USER_MODE
        LIMIT 1
      ];

      // get specific folder from library based on object api name
      ContentFolder folder = [
        SELECT Id, Name
        FROM ContentFolder
        WHERE ParentContentFolder.Name = :workspace.Id AND Name = :objectName
        WITH USER_MODE
        LIMIT 1
      ];

      // get all files that are in the folder
      List<Id> folderMemberIdList = new List<Id>();
      for (ContentFolderMember link : [
        SELECT Id, ParentContentFolderId, ParentContentFolder.Name, ChildRecordId, ChildRecord.title
        FROM ContentFolderMember
        WHERE ParentContentFolderId = :folder.Id
        WITH USER_MODE
      ]) {
        folderMemberIdList.add(link.ChildRecordId);
      }

      return JSON.serialize(
        [
          SELECT Id, Title, Description, FileExtension, FileType, ContentSize, CreatedDate
          FROM ContentDocument
          WHERE Id IN :folderMemberIdList
        ]
      );
    } catch (Exception e) {
      System.debug('The following exception has occurred: ' + e.getMessage());
      return null;
    }
  }

  @AuraEnabled
  public static void deleteDocument(Id recordId) {
    try {
      ContentDocument document = [SELECT Id FROM ContentDocument WHERE Id = :recordId WITH USER_MODE LIMIT 1];

      if (!Schema.sObjectType.ContentDocument.isDeletable()) {
        System.debug('The document cannot be deleted by the current user.');
      }

      delete document;
    } catch (Exception e) {
      System.debug('The following exception has occurred: ' + e.getMessage());
    }
  }

  @AuraEnabled
  public static string getLatestVersion(Id recordId) {
    return [
      SELECT Id, IsLatest, Title, ContentDocumentId
      FROM ContentVersion
      WHERE ContentDocumentId = :recordId AND isLatest = TRUE
      WITH USER_MODE
      LIMIT 1
    ]
    .Id;
  }
}
