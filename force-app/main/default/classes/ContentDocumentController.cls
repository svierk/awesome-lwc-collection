/**
 * @description Server-side controller of the Content Document Table component. Reads the files of a library
 * folder in user mode, so the sharing rules, object and field permissions of the running user apply.
 */
public with sharing class ContentDocumentController {
  /**
   * @description Returns the files of a library folder.
   * @param library name of the library, supports the wildcards of the SOQL LIKE operator
   * @param folder name of the folder in the library, defaults to the object API name of the record
   * @param recordId id of the record whose object API name is used as folder name if no folder is given
   * @return the files of the folder as JSON string, or null if the library or the folder does not exist
   */
  @AuraEnabled(cacheable=true)
  public static String getDocuments(String library, String folder, Id recordId) {
    if (folder == null && recordId == null) {
      return null;
    }
    String folderName = folder != null
      ? folder
      : recordId.getSObjectType().getDescribe(SObjectDescribeOptions.DEFERRED).getName();

    // get workspace library
    List<ContentWorkspace> cwList = [
      SELECT Id, Name
      FROM ContentWorkspace
      WHERE Name LIKE :library
      WITH USER_MODE
      LIMIT 1
    ];
    if (cwList.isEmpty()) {
      return null;
    }
    ContentWorkspace cw = cwList[0];

    // get specific folder from library based on object api name
    List<ContentFolder> cfList = [
      SELECT Id, Name
      FROM ContentFolder
      WHERE ParentContentFolder.Name = :cw.Id AND Name = :folderName
      WITH USER_MODE
      LIMIT 1
    ];
    if (cfList.isEmpty()) {
      return null;
    }
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
      WITH USER_MODE
      LIMIT 200
    ];

    return JSON.serialize(documents);
  }

  /**
   * @description Returns the latest version of a file.
   * @param recordId id of the file
   * @return the id of the latest content version, or null if the file has no version
   */
  @AuraEnabled(cacheable=true)
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
