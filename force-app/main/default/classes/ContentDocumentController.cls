public with sharing class ContentDocumentController {
  @AuraEnabled(cacheable=true)
  public static String getDocuments(String library, String folder, Id recordId) {
    try {
      String folderName = folder != null ? folder : recordId.getSObjectType().getDescribe().getName();

      // get workspace library
      List<ContentWorkspace> cwList = [
        SELECT Id, Name
        FROM ContentWorkspace
        WHERE Name LIKE :library
        WITH USER_MODE
        LIMIT 1
      ];
      if (cwList.isEmpty())
        return null;
      ContentWorkspace cw = cwList[0];

      // get specific folder from library based on object api name
      List<ContentFolder> cfList = [
        SELECT Id, Name
        FROM ContentFolder
        WHERE ParentContentFolder.Name = :cw.Id AND Name = :folderName
        WITH USER_MODE
        LIMIT 1
      ];
      if (cfList.isEmpty())
        return null;
      ContentFolder cf = cfList[0];

      // get all files that are in the folder
      List<Id> cfmIdList = new List<Id>();
      List<ContentFolderMember> cfmList = [
        SELECT Id, ParentContentFolderId, ParentContentFolder.Name, ChildRecordId, ChildRecord.title
        FROM ContentFolderMember
        WHERE ParentContentFolderId = :cf.Id
        WITH USER_MODE
        LIMIT 200
      ];
      for (ContentFolderMember cfm : cfmList) {
        cfmIdList.add(cfm.ChildRecordId);
      }

      List<ContentDocument> documents = [
        SELECT Id, Title, Description, FileExtension, FileType, ContentSize, CreatedDate
        FROM ContentDocument
        WHERE Id IN :cfmIdList
        LIMIT 200
      ];

      return JSON.serialize(documents);
    } catch (NullPointerException e) {
      System.debug('Null pointer error occurred: ' + e.getMessage());
      return null;
    } catch (Exception e) {
      System.debug('Error has occurred: ' + e.getMessage());
      return null;
    }
  }

  @AuraEnabled
  public static String getLatestVersion(Id recordId) {
    List<ContentVersion> versionList = [
      SELECT Id, IsLatest, Title, ContentDocumentId
      FROM ContentVersion
      WHERE ContentDocumentId = :recordId AND IsLatest = TRUE
      WITH USER_MODE
      LIMIT 1
    ];
    return versionList.isEmpty() ? null : versionList[0].Id;
  }
}
