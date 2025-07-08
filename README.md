# ⚡️ Awesome LWC Collection

![GitHub CI](https://github.com/svierk/awesome-lwc-collection/actions/workflows/ci.yml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=svierk_awesome-lwc-collection&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=svierk_awesome-lwc-collection)
[![codecov](https://codecov.io/gh/svierk/awesome-lwc-collection/branch/main/graph/badge.svg?token=UFE3TWMECQ)](https://codecov.io/gh/svierk/awesome-lwc-collection)
[![FOSSA Status](https://app.fossa.com/api/projects/git%2Bgithub.com%2Fsvierk%2Fawesome-lwc-collection.svg?type=shield)](https://app.fossa.com/projects/git%2Bgithub.com%2Fsvierk%2Fawesome-lwc-collection?ref=badge_shield)

## About the project

The repository should provide a collection of ready-to-use Lightning Web Components that might help your SFDX project and is intended to grow over time. Additionally, it also includes an initial configuration of Prettier, linting rules, git hooks and unit tests as well as useful VS Code settings. The setup really focuses on LWC development.

## Components available

The following list of components is part of this repo. All components contain corresponding unit tests and docs.

- [Base64 To PDF](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/base64ToPdf)
- [Content Document Table](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/contentDocumentTable)
- [CSV To Datatable](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/csvToDatatable)
- [Custom Datatable](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/customDatatable)
- [Custom Map View (UI Record API)](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/customMapView)
- [Custom Map View (GraphQL Wire Adapter)](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/graphqlMapView)
- [Custom Slider](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/customSlider)
- [Drag & Drop Example](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/dragAndDrop)
- [Hello World](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/helloWorld)
- [iFrame](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/iFrame)
- [Multi Select Combobox](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/multiSelectCombobox)
- [Open Record Page Flow Action](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/openRecordPageFlowAction)
- [Render 3D Elements (Three.js)](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/render3DElementsThreeJS)
- [Take User Profile Picture (Webcam)](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/takeUserProfilePicture)
- [Visualforce To PDF](https://github.com/svierk/awesome-lwc-collection/tree/main/force-app/main/default/lwc/visualforceToPdf)

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
