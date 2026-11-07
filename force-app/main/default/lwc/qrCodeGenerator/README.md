# QR Code Generator

A basic QR Code Generator with optional logo overlay using the external QRCode.js library.

**Type:** Component

**Available in:** App Page · Home Page · Record Page · Flow Screen

<img src="../../../../../images/qr-code-generator.png" alt="qr-code-generator" width="400"/>

## Read on Medium

<a href="https://medium.com/capgemini-salesforce-architects/how-to-generate-qr-codes-with-lightning-web-components-4d41dd09f3c1">
  <img src="https://miro.medium.com/v2/resize:fit:1200/1*iznkZ0Nk4vwrP9u6kp2aNQ.png" alt="How to Generate QR Codes with Lightning Web Components" width="350"/>
</a>

**[How to Generate QR Codes with Lightning Web Components](https://medium.com/capgemini-salesforce-architects/how-to-generate-qr-codes-with-lightning-web-components-4d41dd09f3c1)**

## Attributes

| Name                | Type    | Default   | Description                                                                                    |
| ------------------- | ------- | --------- | ---------------------------------------------------------------------------------------------- |
| color-dark          | string  | '#000000' | The initial color of the dark modules of the code, as any CSS color. Users can change it.      |
| color-light         | string  | '#ffffff' | The initial color of the light modules of the code, as any CSS color. Users can change it.     |
| logo-url            | string  |           | The logo to show in the code. An image from another domain needs to allow this with CORS.      |
| record-id           | string  |           | The record to save the code to. Set automatically on record pages.                             |
| save-to-record      | boolean | false     | If present, a button saves the code as a file on the record given by record-id.                |
| size                | number  | 256       | The displayed size of the code in pixels. The image has at least a resolution of 1024 pixels.  |
| qr-code-data-url    | string  |           | Read-only. The code as a PNG data URL, empty without a code. Also available as a Flow output.  |
| content-document-id | string  |           | Read-only. The id of the saved file. Empties with a new code. Also available as a Flow output. |

## Events

| Name           | Detail                  | Description                                             |
| -------------- | ----------------------- | ------------------------------------------------------- |
| qrcodegenerate | `{ dataUrl, value }`    | Fired when a code was generated.                        |
| qrcodesave     | `{ contentDocumentId }` | Fired after the code was saved as a file on the record. |

## Usage

```html
<c-qr-code-generator size="300" onqrcodegenerate={handleGenerate}></c-qr-code-generator>
```

Users enter a target URL, optionally upload a logo and generate the code. The URL has to be complete, including `https://`.

Users can also change both colors. A hint appears if the contrast is low or the code is inverted, because such a code may be hard to scan. It doesn't block generating.

The image includes the empty border that scanners need, in the light color, so a saved code can be printed or placed anywhere.

Saving creates the file directly through Lightning Data Service, so no Apex is involved and the permissions of the user apply.

## Custom Labels

The texts users see are Custom Labels, so they can be translated in Setup with the Translation Workbench. Copy them together with the component.

| Name                             | Value                                         |
| -------------------------------- | --------------------------------------------- |
| ErrorAlert_Error                 | Error                                         |
| ErrorUtils_UnknownError          | Unknown error                                 |
| QrCodeGenerator_DarkColor        | Dark Color                                    |
| QrCodeGenerator_EnterUrl         | Please enter a URL.                           |
| QrCodeGenerator_ErrorSaving      | Error saving the QR code                      |
| QrCodeGenerator_FileNotRead      | Failed to read the selected file.             |
| QrCodeGenerator_FileTitle        | QR Code                                       |
| QrCodeGenerator_Generate         | Generate QR Code                              |
| QrCodeGenerator_GeneratedCode    | Generated QR Code                             |
| QrCodeGenerator_Generating       | Generating...                                 |
| QrCodeGenerator_GenerationFailed | Failed to generate QR code: {0}               |
| QrCodeGenerator_HardToScan       | These colors may be hard to scan.             |
| QrCodeGenerator_LibraryMissing   | QR code library not loaded. Please try again. |
| QrCodeGenerator_LibraryNotLoaded | Failed to load QR code library: {0}           |
| QrCodeGenerator_LightColor       | Light Color                                   |
| QrCodeGenerator_Logo             | Logo (optional)                               |
| QrCodeGenerator_LogoPreview      | Logo preview                                  |
| QrCodeGenerator_RemoveLogo       | Remove logo                                   |
| QrCodeGenerator_Save             | Save                                          |
| QrCodeGenerator_Saved            | The QR code has been saved.                   |
| QrCodeGenerator_Success          | Success                                       |
| QrCodeGenerator_TargetUrl        | Target URL                                    |
| QrCodeGenerator_Title            | QR Code Generator                             |
| QrCodeGenerator_UrlPlaceholder   | https://example.com                           |

## Component Dependencies

| Name       | Type            | Description                                                              |
| ---------- | --------------- | ------------------------------------------------------------------------ |
| labelUtils | LWC             | Shared function to fill the placeholders of Custom Labels.               |
| qrcodejs   | Static Resource | QRCode.js - JavaScript Library for generating QRCodes with Logo Support. |
| errorAlert | LWC             | Inline alert that shows error messages to the user.                      |
| errorUtils | LWC             | Shared functions to read error messages and show error toasts.           |
