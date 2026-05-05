import assert from "node:assert/strict";
import test from "node:test";

import { analyzeGraph, edgePath, layeredLayout, layoutGraph, renderSvg, type GraphInput } from "../src/index.js";

const graph: GraphInput = {
  nodes: [
    { id: "a", title: "A", layer: "one" },
    { id: "b", title: "B", layer: "two" },
    { id: "c", title: "C", layer: "two" },
    { id: "d", title: "D", layer: "three" },
  ],
  edges: [
    { from: "a", to: "b" },
    { from: "a", to: "c" },
    { from: "c", to: "d" },
    { from: "missing", to: "d" },
  ],
};

test("layeredLayout positions nodes and keeps valid edges", () => {
  const layout = layeredLayout(graph, { width: 1000, height: 300 });

  assert.equal(layout.nodes.length, 4);
  assert.equal(layout.edges.length, 3);
  assert.equal(layout.droppedEdges.length, 1);
  assert.equal(layout.diagnostics.some((item) => item.code === "missing-node"), true);
  assert.deepEqual(layout.layers, ["one", "two", "three"]);
  assert.equal(layout.nodes.find((node) => node.id === "a")?.x, 70);
  assert.equal(layout.nodes.find((node) => node.id === "d")?.x, 930);
});

test("edgePath returns a cubic SVG path", () => {
  const layout = layeredLayout(graph);
  const path = edgePath(layout.edges[0]!);

  assert.match(path, /^M \d+ \d+ C /);
});

test("renderSvg returns static SVG", () => {
  const layout = layeredLayout(graph);
  const svg = renderSvg(layout);

  assert.match(svg, /^<svg /);
  assert.match(svg, /<path /);
  assert.match(svg, /<rect /);
  assert.match(svg, /A/);
});

test("renderSvg routes edges around blocking nodes", () => {
  const svg = renderSvg({
    width: 500,
    height: 260,
    layers: ["one", "two", "three"],
    droppedEdges: [],
    diagnostics: [],
    sections: [],
    nodes: [
      { id: "a", title: "A", layer: "one", x: 80, y: 100 },
      { id: "blocker", title: "Blocker", layer: "two", x: 250, y: 100 },
      { id: "b", title: "B", layer: "three", x: 420, y: 100 },
    ],
    edges: [
      {
        from: "a",
        to: "b",
        fromNode: { id: "a", title: "A", layer: "one", x: 80, y: 100 },
        toNode: { id: "b", title: "B", layer: "three", x: 420, y: 100 },
      },
    ],
  });

  assert.match(svg, / Q /);
});

test("renderSvg can keep direct curves", () => {
  const layout = layeredLayout(graph);
  const svg = renderSvg(layout, { routeEdges: false });

  assert.match(svg, / C /);
});

test("renderSvg draws optional node corner icons", () => {
  const layout = layoutGraph({
    nodes: [
      { id: "with-icon", title: "With", layer: "one", iconDataUrl: "data:image/svg+xml;base64,PHN2Zy8+" },
      { id: "without-icon", title: "Without", layer: "two" },
    ],
    edges: [{ from: "with-icon", to: "without-icon" }],
  });
  const svg = renderSvg(layout);

  assert.match(svg, /data:image\/svg\+xml;base64/);
  assert.equal((svg.match(/<image /g) ?? []).length, 1);
});

test("renderSvg draws optional node popovers", () => {
  const layout = layoutGraph({
    nodes: [
      {
        id: "with-popover",
        title: "With",
        layer: "one",
        popover: {
          title: "Runtime",
          author: "Platform",
          details: "Owns data collection.",
          links: [{ label: "Logs", href: "https://example.com/logs?x=1&y=2" }],
        },
      },
    ],
    edges: [],
  });
  const svg = renderSvg(layout);

  assert.match(svg, /<foreignObject /);
  assert.match(svg, /-hit-area/);
  assert.match(svg, /Runtime/);
  assert.match(svg, /Platform/);
  assert.match(svg, /Owns data collection\./);
  assert.match(svg, /https:\/\/example.com\/logs\?x=1&amp;y=2/);
});

test("renderSvg draws labeled sections with corner icons", () => {
  const layout = layoutGraph({
    sections: [{ id: "runtime", title: "Runtime", iconDataUrl: "data:image/svg+xml;base64,PHN2Zy8+" }],
    nodes: [
      { id: "a", title: "A", layer: "one", section: "runtime" },
      { id: "b", title: "B", layer: "two", section: "runtime" },
    ],
    edges: [{ from: "a", to: "b" }],
  });
  const svg = renderSvg(layout);

  assert.equal(layout.sections.length, 1);
  assert.match(svg, /Runtime/);
  assert.match(svg, /<image /);
  assert.match(svg, /data:image\/svg\+xml;base64/);
});

test("sections are omitted when no nodes belong to them", () => {
  const layout = layoutGraph({
    sections: [{ id: "empty", title: "Empty" }],
    nodes: [{ id: "a", title: "A", layer: "one" }],
    edges: [],
  });

  assert.equal(layout.sections.length, 0);
});

test("layout is deterministic for the same input", () => {
  const left = layeredLayout(graph);
  const right = layeredLayout(graph);

  assert.deepEqual(left, right);
});

test("svg renderer escapes text", () => {
  const layout = layeredLayout({
    nodes: [{ id: "x", title: "<script>", subtitle: "A & B", layer: "one" }],
    edges: [],
  });
  const svg = renderSvg(layout);

  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
  assert.match(svg, /A &amp; B/);
});

test("analyzeGraph reports cycles, back edges, long edges, and fan-in", () => {
  const diagnostics = analyzeGraph(
    {
      nodes: [
        { id: "a", title: "A", layer: "one" },
        { id: "b", title: "B", layer: "two" },
        { id: "c", title: "C", layer: "three" },
        { id: "d", title: "D", layer: "four" },
        { id: "e", title: "E", layer: "one" },
        { id: "f", title: "F", layer: "one" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "a" },
        { from: "a", to: "d" },
        { from: "e", to: "b" },
        { from: "f", to: "b" },
      ],
    },
    { layers: ["one", "two", "three", "four"], fanInWarningAt: 3 },
  );

  assert.equal(diagnostics.some((item) => item.code === "cycle"), true);
  assert.equal(diagnostics.some((item) => item.code === "back-edge"), true);
  assert.equal(diagnostics.some((item) => item.code === "long-edge"), true);
  assert.equal(diagnostics.some((item) => item.code === "fan-in"), true);
});

test("layoutGraph supports hub-spoke mode", () => {
  const layout = layoutGraph(
    {
      nodes: [
        { id: "hub", title: "Hub", layer: "hub" },
        { id: "left", title: "Left", layer: "spoke" },
        { id: "right", title: "Right", layer: "spoke" },
      ],
      edges: [
        { from: "hub", to: "left" },
        { from: "hub", to: "right" },
      ],
    },
    { mode: "hubSpoke", hubId: "hub", width: 600, height: 300 },
  );

  assert.equal(layout.nodes.find((node) => node.id === "hub")?.x, 300);
  assert.equal(layout.nodes.find((node) => node.id === "hub")?.y, 180);
  assert.equal(layout.edges.length, 2);
});

test("layoutGraph supports fan-in mode", () => {
  const layout = layoutGraph(
    {
      nodes: [
        { id: "a", title: "A", layer: "source" },
        { id: "b", title: "B", layer: "source" },
        { id: "runtime", title: "Runtime", layer: "runtime" },
        { id: "out", title: "Out", layer: "warehouse" },
      ],
      edges: [
        { from: "a", to: "runtime" },
        { from: "b", to: "runtime" },
        { from: "runtime", to: "out" },
      ],
    },
    { mode: "fanIn", width: 800, height: 360 },
  );

  const runtime = layout.nodes.find((node) => node.id === "runtime");
  const a = layout.nodes.find((node) => node.id === "a");
  const out = layout.nodes.find((node) => node.id === "out");

  assert.equal(layout.edges.length, 3);
  if (!a || !runtime || !out) {
    assert.fail("expected fan-in nodes to be present");
  }
  assert.ok(a.x < runtime.x);
  assert.ok(runtime.x < out.x);
});

test("layout expands instead of overlapping crowded layers", () => {
  const layout = layoutGraph(
    {
      nodes: Array.from({ length: 6 }, (_, index) => ({
        id: `source-${index}`,
        title: `Source ${index}`,
        layer: "source",
      })).concat([{ id: "runtime", title: "Runtime", layer: "runtime" }]),
      edges: Array.from({ length: 6 }, (_, index) => ({ from: `source-${index}`, to: "runtime" })),
    },
    { mode: "pipeline", width: 360, height: 180 },
  );

  const sources = layout.nodes.filter((node) => node.layer === "source").sort((left, right) => left.y - right.y);

  for (let index = 1; index < sources.length; index += 1) {
    assert.ok(sources[index]!.y - sources[index - 1]!.y >= 76);
  }

  assert.ok(layout.height > 180);
});

test("layout avoids node overlap in crowded layers", () => {
  const layout = layoutGraph(
    {
      nodes: Array.from({ length: 8 }, (_, index) => ({ id: `source-${index}`, title: `Source ${index}`, layer: "source" })),
      edges: [],
    },
    { width: 320, height: 180 },
  );

  assert.equal(layout.diagnostics.some((item) => item.code === "node-overlap"), false);
});
