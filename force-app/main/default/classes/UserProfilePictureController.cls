public with sharing class UserProfilePictureController {
  @AuraEnabled
  public static void updateProfilePicture(String base64) {
    try {
      Blob b = EncodingUtil.base64Decode(base64);
      ConnectApi.BinaryInput binaryInput = new ConnectApi.BinaryInput(b, 'image/png', 'UserPhoto.png');
      ConnectApi.UserProfiles.setPhoto(null, 'me', binaryInput);
    } catch (Exception e) {
      System.debug('The following exception has occurred: ' + e.getMessage());
    }
  }
}
