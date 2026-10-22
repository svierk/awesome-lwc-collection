/**
 * @description Server-side controller of the Take User Profile Picture component.
 */
public with sharing class UserProfilePictureController {
  /**
   * @description Sets the given image as profile picture of the running user.
   * @param base64 Base64 encoded PNG image
   */
  @AuraEnabled
  public static void updateProfilePicture(String base64) {
    try {
      Blob b = EncodingUtil.base64Decode(base64);
      ConnectApi.BinaryInput binaryInput = new ConnectApi.BinaryInput(b, 'image/png', 'UserPhoto.png');
      ConnectApi.UserProfiles.setPhoto(null, 'me', binaryInput);
    } catch (Exception e) {
      // passed on to the component, which shows the message in an error toast
      throw new AuraHandledException(e.getMessage());
    }
  }
}
