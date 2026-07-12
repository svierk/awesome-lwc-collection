# QR Code Generator

A basic QR Code Generator with optional logo overlay using the external QRCode.js library.

**Available in:** App Page · Home Page · Record Page · Flow Screen

<img src="../../../../../images/qr-code-generator.png" alt="qr-code-generator" width="400"/>

## Read on Medium

<a href="https://medium.com/capgemini-salesforce-architects/how-to-generate-qr-codes-with-lightning-web-components-4d41dd09f3c1">
  <img src="https://miro.medium.com/v2/resize:fit:1200/1*iznkZ0Nk4vwrP9u6kp2aNQ.png" alt="How to Generate QR Codes with Lightning Web Components" width="350"/>
</a>

**[How to Generate QR Codes with Lightning Web Components](https://medium.com/capgemini-salesforce-architects/how-to-generate-qr-codes-with-lightning-web-components-4d41dd09f3c1)**

## Usage

```html
<c-qr-code-generator></c-qr-code-generator>
```

The component is self-contained: enter a target URL, optionally upload a logo for the overlay and generate the QR code.

## Component Dependencies

| Name     | Type            | Description                                                              |
| -------- | --------------- | ------------------------------------------------------------------------ |
| qrcodejs | Static Resource | QRCode.js - JavaScript Library for generating QRCodes with Logo Support. |
