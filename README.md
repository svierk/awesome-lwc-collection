# ☁️ Salesforce DX Project Starter Kit

![GitHub](https://img.shields.io:/github/license/svierk/lwc-starter-kit)

## About the project

The repository provides a template for Salesforce DX projects which includes an initial configuration of Prettier, Linter rules, git hooks and unit tests as well as useful VS Code settings. The setup currently focuses primarily on the development of Lightning Web Components.

## Prerequisites

To use this template, [Node](https://nodejs.org/en/) and the [Salesforce CLI](https://developer.salesforce.com/tools/sfdxcli) should already be installed.

## Getting started

To get the template up and runnning, you need to open the repository with VS Code, install all the recommended extensions and run `npm install` to install all required dependencies.

After that you need to authorize an org for which you want to develop. In VS Code this can be done by pressing **Command + Shift + P**, enter "sfdx", and select **SFDX: Authorize an Org**.

Alternatively you can also run the following command from the command line:

```
sfdx force:auth:web:login
```

## Code scaffolding

To generate new components in VS Code, press **Command + Shift + P**, enter "sfdx create", and select what you want to create, e.g. **SFDX: Create Lightning Web Component**.

Alternatively you can also create all components from the command line, e.g.:

```
cd force-app/main/default/lwc
sfdx force:lightning:component:create --type lwc -n helloWorld -d force-app/main/default/lwc
```

## Code quality

### Git hooks

The project includes client-side pre-commit git hooks using [husky](https://github.com/typicode/husky) and [lint-staged](https://github.com/okonet/lint-staged). After installing all project dependencies, Prettier, Linter and unit tests are automatically executed before each commit.

### Prettier

Run `npm run prettier` to check all files for _Prettier_ issues.

### Linter

#### Linting LWC and Aura

Run `npm run lint` to check for _ESLint_ issues.

#### Linting Apex code

Use the recommended extension [Apex PMD](https://github.com/ChuckJonas/vscode-apex-pmd) to check manually for Apex linting issues.

## Unit tests

### Execute LWC unit tests with Jest

Run

- `npm run test:unit` to execute all unit tests only once
- `npm run test:unit:watch` to execute all unit tests in watch mode for development
- `npm run test:unit:coverage` to execute all unit tests with generated code coverage

## Local development

### LWC development server

Lightning Web Components can be developed locally without the need to push them to an org first. To set up local development you only need to authorize an org and install the development server.

The local development server and its configuration are provided by a Salesforce CLI plugin that can be installed as follows:

```
sfdx plugins:install @salesforce/lwc-dev-server
```

Run `npm run server:lwc` to start the server on http://localhost:3333 and access all components of the project.

## Debugging

To debug and troubleshoot Lightning Web Components, in addition to enabling [Debug Mode in Salesforce](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.debug_mode_enable), you should also configure the following settings in [Chrome Dev Tools](https://developer.salesforce.com/docs/component-library/documentation/en/lwc/lwc.debug_dev_tools):

- Enable custom formatters under Settings --> Preferences
- User the Ignore List to ignore framework code while troubleshooting. Add the following two patterns under Settings --> Ignore List:

  - `/aura_prod.*.js$`
  - `/components/.*.js$`

## Read more about Salesforce DX development

- [Salesforce Development Model](https://developer.salesforce.com/tools/vscode/en/user-guide/development-models)
- [Salesforce DX Project Configuration](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_ws_config.htm)
- [Salesforce Extensions Documentation](https://developer.salesforce.com/tools/vscode/)
- [Salesforce CLI Setup Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_setup.meta/sfdx_setup/sfdx_setup_intro.htm)
- [Salesforce DX Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm)
- [Salesforce CLI Command Reference](https://developer.salesforce.com/docs/atlas.en-us.sfdx_cli_reference.meta/sfdx_cli_reference/cli_reference.htm)
