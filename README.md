# ⚡️ Awesome LWC Collection

![GitHub CI](https://github.com/svierk/awesome-lwc-collection/actions/workflows/ci.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=svierk_awesome-lwc-collection&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=svierk_awesome-lwc-collection)
[![codecov](https://codecov.io/gh/svierk/awesome-lwc-collection/branch/main/graph/badge.svg?token=UFE3TWMECQ)](https://codecov.io/gh/svierk/awesome-lwc-collection)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fsvierk%2Fawesome-lwc-collection.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fsvierk%2Fawesome-lwc-collection?ref=badge_shield)

<img src="./images/awesome-lwc-collection.png" alt="awesome-lwc-collection" width="900"/>

## About the project

The repository should provide a collection of ready-to-use Lightning Web Components that might help your SFDX project and is intended to grow over time. Additionally, it also includes an initial configuration of Prettier, linting rules, git hooks and unit tests as well as useful VS Code settings. The setup really focuses on LWC development.

## Components available

The following list of components is part of this repo. All components contain corresponding unit tests and docs.

<table>
  <tr>
    <th width="60"></th>
    <th align="left">Component</th>
    <th align="left">Description</th>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/base64ToPdf/base64ToPdf.svg" alt="Base64 To PDF" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/base64ToPdf">Base64 To PDF</a></td>
    <td>A simple utility for Base64 encoded strings to decode and download them as PDF file.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/contentDocumentTable/contentDocumentTable.svg" alt="Content Document Table" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/contentDocumentTable">Content Document Table</a></td>
    <td>A generic table to show shared documents from a Salesforce Files library.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/csvToDatatable/csvToDatatable.svg" alt="CSV To Datatable" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/csvToDatatable">CSV To Datatable</a></td>
    <td>A simple parser for UTF-8 encoded, comma separated .csv files.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/customCarousel/customCarousel.svg" alt="Custom Carousel" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/customCarousel">Custom Carousel</a></td>
    <td>A simple custom carousel with different configuration options.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/customDatatable/customDatatable.svg" alt="Custom Datatable (Apex)" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/customDatatable">Custom Datatable (Apex)</a></td>
    <td>A basic custom datatable with different configuration options.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/graphqlDatatable/graphqlDatatable.svg" alt="Custom Datatable (GraphQL Adapter)" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/graphqlDatatable">Custom Datatable (GraphQL Adapter)</a></td>
    <td>A custom datatable powered by the GraphQL wire adapter instead of Apex.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/customMapView/customMapView.svg" alt="Custom Map View (UI Record API)" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/customMapView">Custom Map View (UI Record API)</a></td>
    <td>Configurable map component for displaying locations via Google Maps API.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/graphqlMapView/graphqlMapView.svg" alt="Custom Map View (GraphQL Adapter)" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/graphqlMapView">Custom Map View (GraphQL Adapter)</a></td>
    <td>Configurable map component for displaying locations via the GraphQL wire adapter.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/dragAndDrop/dragAndDrop.svg" alt="Drag &amp; Drop Example" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/dragAndDrop">Drag &amp; Drop Example</a></td>
    <td>An example showing the use of the HTML Drag and Drop API with LWC.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/helloWorld/helloWorld.svg" alt="Hello World" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/helloWorld">Hello World</a></td>
    <td>An example LWC that adds a classic greeting to any page.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/iFrame/iFrame.svg" alt="iFrame" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/iFrame">iFrame</a></td>
    <td>A custom iFrame component with different configuration options.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/multiSelectCombobox/multiSelectCombobox.svg" alt="Multi Select Combobox" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/multiSelectCombobox">Multi Select Combobox</a></td>
    <td>Combobox with different configuration options that also supports multi select.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/openRecordPageFlowAction/openRecordPageFlowAction.svg" alt="Open Record Page Flow Action" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/openRecordPageFlowAction">Open Record Page Flow Action</a></td>
    <td>Component to forward to a record page from flow.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/qrCodeGenerator/qrCodeGenerator.svg" alt="QR Code Generator (QRCode.js)" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/qrCodeGenerator">QR Code Generator (QRCode.js)</a></td>
    <td>A basic QR Code Generator with optional logo overlay using the external QRCode.js library.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/render3DElementsThreeJS/render3DElementsThreeJS.svg" alt="Render 3D Elements (Three.js)" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/render3DElementsThreeJS">Render 3D Elements (Three.js)</a></td>
    <td>A simple demo component for rendering 3D elements using Three.js.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/signaturePad/signaturePad.svg" alt="Signature Pad" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/signaturePad">Signature Pad</a></td>
    <td>A canvas-based signature capture component with mouse and touch support.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/takeUserProfilePicture/takeUserProfilePicture.svg" alt="Take User Profile Picture (Webcam)" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/takeUserProfilePicture">Take User Profile Picture (Webcam)</a></td>
    <td>Lets Salesforce users take a new profile photo with their device's camera.</td>
  </tr>
  <tr>
    <td align="center"><img src="force-app/main/default/lwc/visualforceToPdf/visualforceToPdf.svg" alt="Visualforce To PDF" width="36" height="36" /></td>
    <td><a href="https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/visualforceToPdf">Visualforce To PDF</a></td>
    <td>A simple utility for displaying Visualforce based PDF documents.</td>
  </tr>
</table>

You can also find many more useful and reusable Lightning Web Components in the official [lwc-recipes](https://github.com/trailheadapps/lwc-recipes).

## Prerequisites

To use this library and try out the components in one of your orgs or locally, the [Node](https://nodejs.org/en/) version specified in the _package.json_ and the latest version of the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) should already be installed.

## Getting started

### Install all dependencies

To get everything up and runnning, you need to open the repository with VS Code, install all the recommended extensions and run the following command to install all required dependencies:

```
npm install
```

### Authorize an org

You need to authorize an org before you can push the components or use the local development server. Even for trying the components locally this is necessary because all data requests using Lightning Data Service or Apex will get proxied to the Salesforce org and returned in the local components. In VS Code the authorization can be done by pressing **Command + Shift + P**, enter "sfdx", and select **SFDX: Authorize an Org**.

Alternatively you can also run the following command from the command line:

```
sf org login web
```

### Deploy components to an org

To deploy all components of this project to the currently connected org execute:

```
sf project deploy start
```

### Local development

Local Dev for Lightning Web Components lets you create and modify components leveraging a real-time browser preview: [Preview Components with Local Dev](https://developer.salesforce.com/docs/platform/lwc/guide/get-started-test-components.html)

## Quality measures

### Git hooks

The project includes client-side pre-commit git hooks using [husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged). After installing all project dependencies, Prettier, Linter and unit tests are automatically executed before each commit.

### Prettier for code formatting

Run _Prettier_ to check all files for formatting issues:

```
npm run prettier
```

### Code linting with ESLint

Run _ESLint_ to check for linting issues:

```
npm run lint
```

### Unit tests with Jest

To execute all unit tests only once run:

```
npm run test:unit
```

To execute all unit tests in watch mode for development run:

```
npm run test:unit:watch
```

To execute all unit tests with generated code coverage run:

```
npm run test:unit:coverage
```

### Documentation with JSDoc

To generate code documentation with _JSDoc_ in HTML format run:

```
npm run docs
```
