public with sharing class UserProfilePictureController {
  @AuraEnabled
  public static void updateProfilePicture(String base64) {
    try {
      Blob b = EncodingUtil.base64Decode(base64);
      ConnectApi.BinaryInput binaryInput = new ConnectApi.BinaryInput(b, 'image/png', 'UserPhoto.png');
      ConnectApi.UserProfiles.setPhoto(null, 'me', binaryInput);
    } catch (NullPointerException e) {
      System.debug('Null pointer error occurred: ' + e.getMessage());
    } catch (Exception e) {
      System.debug('Error has occurred: ' + e.getMessage());
    }
  }
}
