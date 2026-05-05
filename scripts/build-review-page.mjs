import { mkdir, writeFile } from "node:fs/promises";
import { layoutGraph, renderSvg } from "../dist/src/index.js";

const makeIcon = (svg) => `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
const icons = {
  app: makeIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="3" fill="#155e75"/><path d="M8 10h8M8 14h5" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'),
  platform: makeIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="4" fill="#17201b"/><path d="M7 8h10M7 12h10M7 16h7" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>'),
  source: makeIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" fill="#6a9f45"/><circle cx="12" cy="12" r="3" fill="#fff"/></svg>'),
  store: makeIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M13 3v8h7L10 21v-8H4L13 3z" fill="#249361"/></svg>'),
  transform: makeIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 7h12m4 0-3-3m3 3-3 3M20 17H8m-4 0 3-3m-3 3 3 3" stroke="#64748b" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'),
  publish: makeIcon('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 3v12m0-12 4 4m-4-4-4 4m-4 10h16" stroke="#a76011" stroke-width="2" fill="none" stroke-linecap="round"/></svg>'),
};

const popover = (author, details, links = []) => ({ author, details, links });

const cases = [
  {
    id: "pipeline",
    label: "Pipeline",
    note: "Synthetic data-flow map with sections, icons, routed edges, and public-safe hover metadata.",
    graph: {
      sections: [
        { id: "sources", title: "Sources", iconDataUrl: icons.source },
        { id: "runtime", title: "Runtime", iconDataUrl: icons.platform },
        { id: "warehouse", title: "Warehouse", iconDataUrl: icons.store },
        { id: "apps", title: "Apps", iconDataUrl: icons.app },
      ],
      nodes: [
        { id: "billing", title: "Billing", subtitle: "source", iconDataUrl: icons.source, kind: "source", layer: "source", section: "sources", popover: popover("Example team", "Synthetic billing records used to prove source fan-in.", [{ label: "Source", href: "#" }, { label: "Runbook", href: "#" }]) },
        { id: "crm", title: "CRM", subtitle: "source", iconDataUrl: icons.source, kind: "source", layer: "source", section: "sources", popover: popover("Example team", "Synthetic customer records used in the review harness.", [{ label: "Owner", href: "#" }]) },
        { id: "support", title: "Support", subtitle: "source", iconDataUrl: icons.source, kind: "source", layer: "source", section: "sources", popover: popover("Example team", "Synthetic tickets used to exercise source-to-runtime routing.", [{ label: "Docs", href: "#" }]) },
        { id: "collector", title: "Collector", subtitle: "scheduled job", iconDataUrl: icons.platform, kind: "runtime", layer: "runtime", section: "runtime", popover: popover("Platform", "Collects source records and writes raw batches.", [{ label: "Logs", href: "#" }, { label: "Deploy", href: "#" }]) },
        { id: "metadata", title: "Metadata", subtitle: "run state", iconDataUrl: icons.platform, kind: "warehouse", layer: "meta", section: "runtime", popover: popover("Platform", "Stores synthetic run status and proof records.", [{ label: "Table", href: "#" }]) },
        { id: "raw", title: "Raw Store", subtitle: "landing", iconDataUrl: icons.store, kind: "warehouse", layer: "raw", section: "warehouse", popover: popover("Warehouse", "Raw landing area for synthetic records.", [{ label: "Schema", href: "#" }]) },
        { id: "normalize", title: "Normalize", subtitle: "transform", iconDataUrl: icons.transform, kind: "transform", layer: "transform", section: "runtime", popover: popover("Data", "Normalizes raw records into a reviewable model.", [{ label: "Models", href: "#" }]) },
        { id: "model", title: "Model Store", subtitle: "serving", iconDataUrl: icons.store, kind: "warehouse", layer: "serve", section: "warehouse", popover: popover("Warehouse", "Serving model for app and QA surfaces.", [{ label: "Docs", href: "#" }]) },
        { id: "publish", title: "Publish", subtitle: "contract", iconDataUrl: icons.publish, kind: "publish", layer: "publish", section: "runtime", popover: popover("Data", "Publishes a versioned read contract after validation.", [{ label: "Asset", href: "#" }, { label: "Proof", href: "#" }]) },
        { id: "dashboard", title: "Dashboard", subtitle: "app", iconDataUrl: icons.app, kind: "app", layer: "app", section: "apps", popover: popover("Product", "Example dashboard reading from the serving model.", [{ label: "Open", href: "#" }]) },
        { id: "qa", title: "QA", subtitle: "checks", iconDataUrl: icons.app, kind: "app", layer: "app", section: "apps", popover: popover("Platform", "Example operator surface for proofs and checks.", [{ label: "Open", href: "#" }]) },
      ],
      edges: [
        { from: "billing", to: "collector" },
        { from: "crm", to: "collector" },
        { from: "support", to: "collector" },
        { from: "collector", to: "metadata" },
        { from: "collector", to: "raw" },
        { from: "raw", to: "normalize" },
        { from: "normalize", to: "model" },
        { from: "model", to: "publish" },
        { from: "publish", to: "dashboard" },
        { from: "publish", to: "qa" },
        { from: "metadata", to: "qa" },
      ],
    },
    options: { mode: "pipeline", width: 1040, height: 380 },
  },
  {
    id: "hub",
    label: "Hub Spokes",
    note: "A central app with satellites. This exercises radial placement and connection readability.",
    graph: {
      nodes: [
        { id: "hub", title: "Workspace", subtitle: "central hub", kind: "app", layer: "hub" },
        { id: "qa", title: "Checks", subtitle: "operator site", kind: "app", layer: "spoke" },
        { id: "assistant", title: "Assistant", subtitle: "AI access", kind: "service", layer: "spoke" },
        { id: "store", title: "Store", subtitle: "auth + data", kind: "warehouse", layer: "spoke" },
        { id: "runtime", title: "Runtime", subtitle: "workers", kind: "runtime", layer: "spoke" },
      ],
      edges: [
        { from: "hub", to: "qa" },
        { from: "hub", to: "assistant" },
        { from: "hub", to: "store" },
        { from: "hub", to: "runtime" },
      ],
    },
    options: { mode: "hubSpoke", hubId: "hub", width: 900, height: 380 },
  },
  {
    id: "diamond",
    label: "Diamond",
    note: "Split, parallel work, merge. Edges should not feel like spaghetti.",
    graph: {
      nodes: [
        { id: "input", title: "Input", subtitle: "event", kind: "source", layer: "one" },
        { id: "validate", title: "Validate", subtitle: "checks", kind: "transform", layer: "two" },
        { id: "enrich", title: "Enrich", subtitle: "metadata", kind: "transform", layer: "two" },
        { id: "score", title: "Score", subtitle: "rules", kind: "transform", layer: "two" },
        { id: "merge", title: "Merge", subtitle: "record", kind: "publish", layer: "three" },
        { id: "out", title: "Output", subtitle: "table", kind: "warehouse", layer: "four" },
      ],
      edges: [
        { from: "input", to: "validate" },
        { from: "input", to: "enrich" },
        { from: "input", to: "score" },
        { from: "validate", to: "merge" },
        { from: "enrich", to: "merge" },
        { from: "score", to: "merge" },
        { from: "merge", to: "out" },
      ],
    },
    options: { mode: "pipeline", width: 900, height: 340 },
  },
  {
    id: "crowded",
    label: "Crowded",
    note: "Lots of sources into one runtime. This exposes text collisions and edge bundling problems.",
    graph: {
      nodes: [
        ...["Billing", "CRM", "Support", "Inventory", "Payroll", "Events", "Forms", "Telemetry"].map((title) => ({
          id: title.toLowerCase(),
          title,
          subtitle: "source",
          kind: "source",
          layer: "source",
        })),
        { id: "runtime", title: "Runtime", subtitle: "collector", kind: "runtime", layer: "runtime" },
        { id: "warehouse", title: "Warehouse", subtitle: "landing", kind: "warehouse", layer: "warehouse" },
      ],
      edges: [
        ...["billing", "crm", "support", "inventory", "payroll", "events", "forms", "telemetry"].map((from) => ({ from, to: "runtime" })),
        { from: "runtime", to: "warehouse" },
      ],
    },
    options: { mode: "fanIn", width: 900, height: 520 },
  },
  {
    id: "bad",
    label: "Bad Input",
    note: "Cycle plus missing edge target. Good libraries expose this clearly instead of silently lying.",
    graph: {
      nodes: [
        { id: "a", title: "A", subtitle: "starts", kind: "note", layer: "one" },
        { id: "b", title: "B", subtitle: "cycles", kind: "note", layer: "two" },
        { id: "c", title: "C", subtitle: "returns", kind: "note", layer: "three" },
      ],
      edges: [
        { from: "a", to: "b" },
        { from: "b", to: "c" },
        { from: "c", to: "a" },
        { from: "c", to: "missing" },
      ],
    },
    options: { mode: "pipeline", width: 760, height: 300 },
  },
];

await mkdir(new URL("../demos", import.meta.url), { recursive: true });

const panels = cases.map((item, index) => {
  const layout = layoutGraph(item.graph, item.options);
  const svg = renderSvg(layout, { showLabels: true, classPrefix: `egk-${item.id}` });
  return `
    <section class="panel ${index === 0 ? "active" : ""}" id="${item.id}" data-dropped="${layout.droppedEdges.length}">
      <header>
        <div>
          <p>${item.note}</p>
          <h2>${item.label}</h2>
        </div>
        <dl>
          <div><dt>Nodes</dt><dd>${layout.nodes.length}</dd></div>
          <div><dt>Edges</dt><dd>${layout.edges.length}</dd></div>
          <div><dt>Dropped</dt><dd>${layout.droppedEdges.length}</dd></div>
          <div><dt>Warnings</dt><dd>${layout.diagnostics.length}</dd></div>
          <div><dt>Mode</dt><dd>${item.options.mode}</dd></div>
        </dl>
      </header>
      <div class="graph-frame">${svg}</div>
      ${layout.diagnostics.length ? `<ul class="diagnostics">${layout.diagnostics.map((diagnostic) => `<li data-level="${diagnostic.level}"><b>${diagnostic.code}</b> ${escapeHtml(diagnostic.message)}</li>`).join("")}</ul>` : ""}
      ${layout.droppedEdges.length ? `<pre>${escapeHtml(JSON.stringify(layout.droppedEdges, null, 2))}</pre>` : ""}
    </section>
  `;
}).join("");

const tabs = cases.map((item, index) => `<button class="${index === 0 ? "active" : ""}" data-target="${item.id}">${item.label}</button>`).join("");

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Eidos Graph Kit Review</title>
  <style>
    :root { color-scheme: light; --bg:#f7f8f5; --ink:#17201b; --muted:#66736b; --line:#d9dfd7; --green:#1f7a4d; --panel:#fff; }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--ink); font: 14px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { max-width: 1180px; margin: 0 auto; padding: 24px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    h2 { font-size: 18px; margin: 0; }
    p { color: var(--muted); margin: 0; }
    .tabs { display: flex; gap: 6px; margin: 18px 0; overflow-x: auto; border-bottom: 1px solid var(--line); padding-bottom: 8px; }
    button { border: 1px solid var(--line); background: var(--panel); border-radius: 6px; color: var(--ink); cursor: pointer; font: inherit; padding: 8px 10px; white-space: nowrap; }
    button.active { background: #dde6dc; border-color: #c5d2c4; font-weight: 700; }
    .panel { display: none; }
    .panel.active { display: block; }
    .panel header { align-items: start; display: flex; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
    dl { display: flex; gap: 8px; margin: 0; }
    dl div { background: var(--panel); border: 1px solid var(--line); min-width: 76px; padding: 8px; }
    dt { color: var(--muted); font-size: 11px; text-transform: uppercase; }
    dd { font-size: 20px; font-weight: 800; margin: 0; }
    .graph-frame { background: var(--panel); border: 1px solid var(--line); overflow: auto; padding: 12px; }
    svg { display: block; min-width: 720px; width: 100%; }
    [class*="-edge"] { fill: none; stroke: var(--green); stroke-linecap: round; stroke-width: 2.5; }
    [class*="-arrowhead"] { fill: var(--green); }
    [class*="-section"] rect { fill: #f8faf7; stroke: #cfd8cf; stroke-dasharray: 4 4; stroke-width: 1; }
    [class*="-section-title"] { fill: var(--muted); font-size: 11px; font-weight: 800; text-anchor: start; text-transform: uppercase; }
    [class*="-node"] rect { fill: #fff; stroke: var(--line); stroke-width: 1; }
    [class*="-node"] [class*="-hit-area"] { cursor: pointer; fill: transparent; stroke: transparent; }
    [class*="-source"] rect { stroke: #6a9f45; stroke-width: 2; }
    [class*="-runtime"] rect { stroke: #0f603b; stroke-width: 2; }
    [class*="-warehouse"] rect { stroke: #1f7a4d; stroke-width: 2; }
    [class*="-transform"] rect { stroke: #64748b; stroke-width: 2; }
    [class*="-publish"] rect { stroke: #a76011; stroke-width: 2; }
    [class*="-app"] rect { stroke: #155e75; stroke-width: 2; }
    [class*="-title"] { dominant-baseline: middle; fill: var(--ink); font-size: 13px; font-weight: 800; text-anchor: middle; }
    [class*="-subtitle"] { fill: var(--muted); font-size: 11px; text-anchor: middle; }
    [class*="-kind"] { fill: var(--muted); font-size: 9px; font-weight: 800; letter-spacing: 0.06em; text-anchor: middle; text-transform: uppercase; }
    [class*="-popover"] { display: none; }
    [class*="-node"].is-active > rect:not([class*="-hit-area"]) { filter: drop-shadow(0 0 0.35rem rgba(31, 122, 77, 0.22)); }
    .floating-popover { background: #fff; border: 1px solid #cfd8cf; box-shadow: 0 16px 34px rgba(23, 32, 27, 0.18); color: var(--ink); display: none; font: 13px/1.4 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; max-width: 320px; min-width: 280px; padding: 12px; position: fixed; z-index: 20; }
    .floating-popover.is-visible { display: block; }
    .floating-popover strong { display: block; font-size: 14px; margin-bottom: 2px; }
    .floating-popover [class*="-popover-author"] { color: #1f7a4d; display: block; font-size: 11px; font-weight: 800; margin-bottom: 6px; text-transform: uppercase; }
    .floating-popover [class*="-popover-details"] { color: #334139; display: block; margin: 0 0 10px; }
    .floating-popover [class*="-popover-links"] { display: flex; flex-wrap: wrap; gap: 6px; }
    .floating-popover [class*="-popover-pill"] { border: 1px solid #d9dfd7; color: var(--ink); display: inline-block; padding: 4px 7px; text-decoration: none; }
    .diagnostics { display: grid; gap: 6px; list-style: none; margin: 10px 0 0; padding: 0; }
    .diagnostics li { background: #fff; border: 1px solid var(--line); color: var(--muted); padding: 8px 10px; }
    .diagnostics li[data-level="error"] { border-color: #efb4a8; color: #7f1d1d; }
    .diagnostics b { color: var(--ink); display: inline-block; margin-right: 6px; }
    pre { background: #fff; border: 1px solid var(--line); overflow: auto; padding: 10px; }
  </style>
</head>
<body>
  <main>
    <h1>Eidos Graph Kit Review</h1>
    <p>Five tabs using synthetic data. Use this to judge layout behavior before adding features.</p>
    <nav class="tabs">${tabs}</nav>
    ${panels}
  </main>
  <div class="floating-popover" id="floating-popover"></div>
  <script>
    const buttons = [...document.querySelectorAll("button[data-target]")];
    const panels = [...document.querySelectorAll(".panel")];
    const floatingPopover = document.querySelector("#floating-popover");
    let pinnedNode = undefined;
    const graphNodes = () => [...document.querySelectorAll('[class*="-nodes"] > [class*="-node"]')];
    const visibleNodeRect = (node) => {
      const rects = [...node.querySelectorAll("rect")].filter((rect) => !rect.getAttribute("class")?.includes("-hit-area"));
      return rects[0]?.getBoundingClientRect() ?? node.getBoundingClientRect();
    };
    const positionPopover = (activeNode) => {
      const card = activeNode?.querySelector('[class*="-popover-card"]');
      if (!activeNode || !card || !floatingPopover) {
        floatingPopover?.classList.remove("is-visible");
        return;
      }
      floatingPopover.innerHTML = card.innerHTML;
      const rect = visibleNodeRect(activeNode);
      const margin = 12;
      const popoverWidth = 320;
      let left = rect.right + margin;
      if (left + popoverWidth > window.innerWidth - margin) left = rect.left - popoverWidth - margin;
      let top = rect.top - 8;
      floatingPopover.style.left = Math.max(margin, left) + "px";
      floatingPopover.style.top = Math.max(margin, Math.min(top, window.innerHeight - 180)) + "px";
      floatingPopover.classList.add("is-visible");
    };
    const activateNode = (activeNode) => {
      for (const node of graphNodes()) node.classList.toggle("is-active", node === activeNode);
      activeNode?.parentElement?.appendChild(activeNode);
      positionPopover(activeNode);
    };
    for (const button of buttons) {
      button.addEventListener("click", () => {
        buttons.forEach((item) => item.classList.toggle("active", item === button));
        panels.forEach((panel) => panel.classList.toggle("active", panel.id === button.dataset.target));
        pinnedNode = undefined;
        activateNode(undefined);
      });
    }
    for (const node of graphNodes()) {
      node.addEventListener("mouseenter", () => activateNode(node));
      node.addEventListener("mouseleave", () => {
        if (pinnedNode !== node) activateNode(pinnedNode);
      });
      node.addEventListener("focus", () => activateNode(node));
      node.addEventListener("blur", () => {
        if (pinnedNode !== node) activateNode(pinnedNode);
      });
      node.addEventListener("click", () => {
        pinnedNode = pinnedNode === node ? undefined : node;
        activateNode(pinnedNode ?? node);
      });
    }
    document.addEventListener("mousemove", (event) => {
      if (pinnedNode) return;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      const activeNode = target?.closest?.('[class*="-nodes"] > [class*="-node"]');
      if (target?.closest?.(".floating-popover")) return;
      activateNode(activeNode);
    });
  </script>
</body>
</html>`;

await writeFile(new URL("../demos/graph-kit-review.html", import.meta.url), html);
console.log("wrote demos/graph-kit-review.html");

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
