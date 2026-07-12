# Contributing

Thanks for your interest in improving the Awesome LWC Collection! 🙌 This project is a curated, growing set of ready-to-use Lightning Web Components - contributions of new components, improvements and fixes are very welcome.

## Ways to contribute

- **Report a bug** in an existing component.
- **Propose a new component** that is broadly reusable in SFDX projects.
- **Improve an existing component** (features, accessibility, docs).
- **Improve the tooling or documentation** (CI, catalog, README).

Please open an issue first so we can align on the approach before you invest time in a pull request. There are issue templates for bugs, new component proposals and feature requests.

## Prerequisites

Install the [Node](https://nodejs.org/en/) version specified in the `package.json` and the latest [Salesforce CLI](https://developer.salesforce.com/tools/salesforcecli), then install the dependencies:

```
npm install
```

A Salesforce org (a free [Developer Edition](https://developer.salesforce.com/signup) or scratch org works) is needed to deploy and try out components.

## Proposing changes

1. Open an issue describing the problem or idea.
2. Fork the repository and create a feature branch.
3. Keep changes focused and follow the conventions of the surrounding code.
4. Make sure all quality checks pass locally (they also run in CI).
5. Open a pull request and link the related issue.

## Adding a new component

New components are welcome when they cover a distinct, reusable need. A component is considered "public" - and automatically appears in the [component catalog](https://svierk.github.io/awesome-lwc-collection/) - as soon as it ships a `README.md`. Please include all of the following:

- **Component files** under `force-app/main/default/lwc/<yourComponent>/` (`.js`, `.html`, optional `.css`, and the `.js-meta.xml`).
- **An icon** `<yourComponent>.svg` in the component folder - used in the README overview and the catalog cards.
- **A `README.md`** in the component folder with:
  - an `# H1` title (this becomes the catalog page title and the display name - keep it consistent with the README overview),
  - a one-line description as the first paragraph,
  - an `**Available in:**` line matching the targets in the `.js-meta.xml`,
  - a screenshot (add the image to `images/` and reference it),
  - a `## Usage` section with an ` ```html ` snippet embedding the component tag,
  - a `## Attributes` table covering all `@api` properties (if the component has any),
  - a `## Events` table covering all dispatched custom events (if the component fires any),
  - any component/Apex dependencies.

  `npm run lint:readme` verifies these conventions against the component source and also runs in CI.

- **Unit tests** in a `__tests__/` folder using [sfdx-lwc-jest](https://github.com/salesforce/sfdx-lwc-jest), including an accessibility assertion via `await expect(element).toBeAccessible()`.
- **A category** entry for the component in [`scripts/docs/site.config.json`](scripts/docs/site.config.json) so it is grouped correctly in the catalog sidebar (uncategorized components fall back to an "Other" group).
- **A row** in the `Components available` table of the root [`README.md`](README.md) within the matching category.

You don't need to build or commit the docs site - it is generated from the READMEs and deployed automatically on merge. To preview it locally run `npm run docs:dev`.

## Quality checks

Client-side git hooks ([husky](https://github.com/typicode/husky) + [lint-staged](https://github.com/okonet/lint-staged)) run Prettier, ESLint and the affected unit tests before each commit. You can also run them manually:

```
npm run prettier      # format and check all files
npm run lint          # ESLint on all components
npm run lint:readme   # check component READMEs against the component source
npm run test:unit     # run all Jest unit tests
```

Please make sure Prettier, ESLint and the unit tests are green before opening a pull request.

## Commit messages

This project follows the [Conventional Commits](https://www.conventionalcommits.org/) style, e.g. `feat(lwc): add signature pad component` or `fix(docs): correct attribute table`. Keep commits focused and descriptive.

## Code of conduct

This project adheres to a [Code of Conduct](https://github.com/svierk/awesome-lwc-collection?tab=coc-ov-file). By participating, you are expected to uphold it - let's keep this a welcoming place for the Trailblazer Community.
