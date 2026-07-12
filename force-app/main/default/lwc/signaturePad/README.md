# Signature Pad

A canvas-based signature capture component with mouse and touch support. Works on desktop and mobile devices without any external libraries.

**Available in:** App Page · Home Page · Record Page · Flow Screen

<img src="../../../../../images/signature-pad.png" alt="signature-pad" width="400"/>

## Usage

```html
<c-signature-pad onsignaturechange={handleSignatureChange}></c-signature-pad>
```

## Events

| Name            | Detail                 | Description                                                                                                                                           |
| --------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| signaturechange | `{ dataUrl, isEmpty }` | Fired after every stroke and when the pad is cleared. dataUrl contains the signature as a PNG data URL and is an empty string while the pad is empty. |
