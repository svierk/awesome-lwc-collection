public with sharing class ContentDocumentController {
  @AuraEnabled(cacheable=true)
  public static String getDocuments(String library, String folder, Id recordId) {
    try {
      String folderName = folder != null ? folder : recordId.getSObjectType().getDescribe().getName();

      // get workspace library
      ContentWorkspace cw = [
        SELECT Id, Name
        FROM ContentWorkspace
        WHERE Name LIKE :library
        WITH USER_MODE
        LIMIT 1
      ];

      // get specific folder from library based on object api name
      ContentFolder cf = [
        SELECT Id, Name
        FROM ContentFolder
        WHERE ParentContentFolder.Name = :cw.Id AND Name = :folderName
        WITH USER_MODE
        LIMIT 1
      ];

      // get all files that are in the folder
      List<Id> cfmIdList = new List<Id>();
      for (ContentFolderMember cfm : [
        SELECT Id, ParentContentFolderId, ParentContentFolder.Name, ChildRecordId, ChildRecord.title
        FROM ContentFolderMember
        WHERE ParentContentFolderId = :cf.Id
        WITH USER_MODE
      ]) {
        cfmIdList.add(cfm.ChildRecordId);
      }

      return JSON.serialize(
        [
          SELECT Id, Title, Description, FileExtension, FileType, ContentSize, CreatedDate
          FROM ContentDocument
          WHERE Id IN :cfmIdList
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
