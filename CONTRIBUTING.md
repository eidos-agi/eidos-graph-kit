# Contributing to Eidos Graph Kit

Thanks for your interest in contributing.

## Quick Start

```sh
git clone https://github.com/eidos-agi/eidos-graph-kit.git
cd eidos-graph-kit
npm ci
npm run verify
```

## Development

Useful commands:

```sh
npm run check
npm test
npm run guard
npm run review
```

The review command builds the package and regenerates `demos/graph-kit-review.html`.

## Pull Requests

- Keep PRs focused.
- Include tests for layout, rendering, or diagnostic changes.
- Update `CHANGELOG.md` for user-visible changes.
- Keep runtime dependencies at zero unless there is a deliberate release decision.
- Do not add private customer, company, infrastructure, or production data to examples, tests, demos, or docs.

## Public-Safe Examples

All examples must be synthetic. Use generic names such as `Billing`, `CRM`, `Runtime`, `Warehouse`, `Dashboard`, and `QA`.

Do not include real customer names, internal project names, vendor topology, database schema names, URLs, secrets, or operational data.
