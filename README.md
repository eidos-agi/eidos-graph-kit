# Eidos Graph Kit

[![CI](https://github.com/eidos-agi/eidos-graph-kit/actions/workflows/ci.yml/badge.svg)](https://github.com/eidos-agi/eidos-graph-kit/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@eidos-agi/graph-kit)](https://www.npmjs.com/package/@eidos-agi/graph-kit)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Tiny deterministic graph layout and SVG rendering toolkit.

Eidos Graph Kit is for small operator maps, infrastructure diagrams, data-flow maps, and proof surfaces where you want:

- deterministic output for the same input
- zero runtime dependencies
- server-renderable SVG
- typed graph data
- basic diagnostics for bad graph inputs
- enough geometry handling that nodes are visibly connected

It is not trying to replace React Flow, Cytoscape, D3, or ELK for large interactive graph applications.

## Install

```sh
npm install @eidos-agi/graph-kit
```

## Use

```ts
import { layoutGraph, renderSvg } from "@eidos-agi/graph-kit";

const layout = layoutGraph(
  {
    nodes: [
      { id: "source", title: "Source", layer: "input" },
      { id: "runtime", title: "Runtime", layer: "work" },
      { id: "output", title: "Output", layer: "serve" }
    ],
    edges: [
      { from: "source", to: "runtime" },
      { from: "runtime", to: "output" }
    ]
  },
  { mode: "pipeline" }
);

const svg = renderSvg(layout);
```

## Layout Modes

`layoutGraph` currently supports three deterministic modes:

- `pipeline`: left-to-right declared layers for ETL, process, and data-flow maps.
- `hubSpoke`: one central node with satellites arranged around it.
- `fanIn`: many sources arranged into input columns feeding one runtime or collector.

`layeredLayout` remains available as the compatibility entrypoint for pipeline-style graphs.

## Diagnostics

Layouts include diagnostics from `analyzeGraph`, including:

- missing nodes
- cycles
- back-edges
- long layer jumps
- crowded fan-in
- node overlap
- suspicious edge overlap

The renderer can also route connectors around blocking node boxes when the default curve would pass behind a card.

## Sections, Icons, And Popovers

Nodes can carry optional `iconDataUrl` values for item-level corner icons and optional `popover` metadata for inspection UIs. Popovers support a title, author or owner, details, and links that callers can style as pills.

Nodes can also belong to labeled `sections`, such as `Sources`, `Runtime`, `Warehouse`, or `Apps`. The renderer draws section boxes behind their child nodes and can place a base64 icon in the section corner.

## Review Harness

Build the package and generate the local review page:

```sh
npm run review
python3 -m http.server 4191
```

Then open:

```text
http://localhost:4191/demos/graph-kit-review.html
```

The review page uses public-safe synthetic examples. It should expose layout failures, dropped edges, cycles, back-edges, long jumps, hover behavior, and fan-in pressure before the package is used in another app.

## Guardrails

Run:

```sh
npm run verify
```

The guard checks:

- package has zero runtime dependencies
- source does not import heavyweight graph/browser runtimes
- built JS stays below the current size budget

The budget includes layout modes, node/edge geometry diagnostics, obstacle-aware connector routing, labeled section boxes, and popover metadata emission. If the package crosses that boundary, it should be a conscious versioned decision, not dependency drift.

## Development

```sh
npm ci
npm run verify
npm run review
```

## Release

This package publishes to npm as `@eidos-agi/graph-kit`.

For maintainers:

```sh
npm version patch
git push --follow-tags
```

The publish workflow uses npm provenance and GitHub Actions OIDC. Do not add long-lived npm tokens to this repository.

## License

MIT - see [LICENSE](LICENSE).
