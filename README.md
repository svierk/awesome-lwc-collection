# ⚡️ Awesome LWC Collection

![GitHub](https://img.shields.io:/github/license/svierk/awesome-lwc-collection)
![GitHub CI](https://github.com/svierk/awesome-lwc-collection/actions/workflows/ci.yaml/badge.svg)
[![Quality Gate Status](https://sonarcloud.io/api/project_badges/measure?project=svierk_awesome-lwc-collection&metric=alert_status)](https://sonarcloud.io/summary/new_code?id=svierk_awesome-lwc-collection)

## About the project

The repository should provide a collection of ready-to-use Lightning Web Components that might help your SFDX project and is intended to grow over time. Additionally, it also includes an initial configuration of Prettier, linting rules, git hooks and unit tests as well as useful VS Code settings. The setup really focuses on LWC development.

## Prerequisites

To use this library and try out the components locally, [Node](https://nodejs.org/en/) and the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) should already be installed.

## Getting started

### Install all dependencies

To get the components up and runnning, you need to open the repository with VS Code, install all the recommended extensions and run `npm install` to install all required dependencies.

### Authorize an org

You need to authorize an org before you use the local development server. This is necessary because all data requests using Lightning Data Service or Apex will get proxied to the Salesforce org and returned in the local components. In VS Code the authorization can be done by pressing **Command + Shift + P**, enter "sfdx", and select **SFDX: Authorize an Org**.

Alternatively you can also run the following command from the command line:

```
sfdx force:auth:web:login
```

### Install the local development server

Lightning Web Components can be viewed and developed locally without the need to push them to an org first. To set up local development you only nedd to install the development server after you authorized an org.

The local development server and its configuration are provided by a Salesforce CLI plugin that can be installed as follows:

```
sfdx plugins:install @salesforce/lwc-dev-server
```

Run `npm run server:lwc` to start the server on http://localhost:3333 and access all components of this project.

## Components available

The following list of components is part of this repo. All components contain corresponding unit tests and docs.

- [Custom Datatable](/force-app/main/default/lwc/customDatatable)
- [Custom Slider](/force-app/main/default/lwc/customSlider)
- [Hello World](/force-app/main/default/lwc/helloWorld)
- [Local Development Wrapper](/force-app/main/default/lwc/localDevelopmentWrapper)
- [Multi Select Combobox](/force-app/main/default/lwc/multiSelectCombobox)

You can also find many more useful and reusable Lightning Web Components in the official [lwc-recipes](https://github.com/trailheadapps/lwc-recipes).

## Quality measures

### Git hooks

The project includes client-side pre-commit git hooks using [husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged). After installing all project dependencies, Prettier, Linter and unit tests are automatically executed before each commit.

### Prettier for code formatting

Run `npm run prettier` to check all files for _Prettier_ issues.

### Code linting with ESLint

Run `npm run lint` to check for _ESLint_ issues.

### Unit tests with Jest

Run

- `npm run test:unit` to execute all unit tests only once
- `npm run test:unit:watch` to execute all unit tests in watch mode for development
- `npm run test:unit:coverage` to execute all unit tests with generated code coverage

### Documentation with JSDoc

Run `npm run docs` to generate code documentation with _JSDoc_ in HTML format.
