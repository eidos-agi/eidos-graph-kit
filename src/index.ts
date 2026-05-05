export type GraphNodeKind =
  | "source"
  | "runtime"
  | "warehouse"
  | "transform"
  | "publish"
  | "app"
  | "group"
  | "service"
  | "note";

export type GraphNodeLink = {
  label: string;
  href: string;
};

export type GraphNodePopover = {
  title?: string;
  author?: string;
  details?: string;
  links?: GraphNodeLink[];
};

export type GraphNode = {
  id: string;
  title: string;
  subtitle?: string;
  iconDataUrl?: string;
  popover?: GraphNodePopover;
  kind?: GraphNodeKind;
  layer: string;
  section?: string;
  weight?: number;
};

export type GraphSection = {
  id: string;
  title: string;
  iconDataUrl?: string;
};

export type GraphEdge = {
  from: string;
  to: string;
  label?: string;
};

export type GraphDiagnosticLevel = "error" | "warn";

export type GraphDiagnosticCode =
  | "missing-node"
  | "cycle"
  | "back-edge"
  | "long-edge"
  | "fan-in"
  | "node-overlap"
  | "edge-overlap";

export type GraphDiagnostic = {
  level: GraphDiagnosticLevel;
  code: GraphDiagnosticCode;
  message: string;
  edge?: GraphEdge;
  nodeId?: string;
  count?: number;
};

export type PositionedNode = GraphNode & {
  x: number;
  y: number;
};

export type PositionedEdge = GraphEdge & {
  fromNode: PositionedNode;
  toNode: PositionedNode;
};

export type PositionedSection = GraphSection & {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type GraphInput = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  sections?: GraphSection[];
};

export type GraphLayout = {
  width: number;
  height: number;
  nodes: PositionedNode[];
  edges: PositionedEdge[];
  sections: PositionedSection[];
  layers: string[];
  droppedEdges: GraphEdge[];
  diagnostics: GraphDiagnostic[];
};

export type GraphLayoutMode = "pipeline" | "hubSpoke" | "fanIn";

export type LayeredLayoutOptions = {
  width?: number;
  height?: number;
  marginX?: number;
  marginY?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  gapX?: number;
  gapY?: number;
  layerOrder?: string[];
  fanInWarningAt?: number;
};

export type GraphLayoutOptions = LayeredLayoutOptions & {
  mode?: GraphLayoutMode;
  hubId?: string;
};

export function layoutGraph(input: GraphInput, options: GraphLayoutOptions = {}): GraphLayout {
  if (options.mode === "hubSpoke") {
    return hubSpokeLayout(input, options);
  }

  if (options.mode === "fanIn") {
    return fanInLayout(input, options);
  }

  return layeredLayout(input, options);
}

export function layeredLayout(input: GraphInput, options: LayeredLayoutOptions = {}): GraphLayout {
  const nodeWidth = options.nodeWidth ?? 132;
  const nodeHeight = options.nodeHeight ?? 76;
  const gapX = options.gapX ?? 48;
  const gapY = options.gapY ?? 32;
  const marginX = options.marginX ?? 70;
  const marginY = options.marginY ?? 58;
  const layers = options.layerOrder ?? unique(input.nodes.map((node) => node.layer));
  const maxLayerNodes = Math.max(1, ...layers.map((layer) => input.nodes.filter((node) => node.layer === layer).length));
  const width = Math.max(options.width ?? 1000, marginX * 2 + Math.max(0, layers.length - 1) * (nodeWidth + gapX));
  const height = Math.max(options.height ?? 360, marginY * 2 + Math.max(0, maxLayerNodes - 1) * (nodeHeight + gapY));
  const availableX = Math.max(1, width - marginX * 2);
  const availableY = Math.max(1, height - marginY * 2);

  const nodes = input.nodes.map((node) => {
    const layerIndex = Math.max(0, layers.indexOf(node.layer));
    const layerNodes = stableSortByWeight(input.nodes.filter((item) => item.layer === node.layer));
    const rank = layerNodes.findIndex((item) => item.id === node.id);
    const x = layers.length === 1 ? width / 2 : marginX + layerIndex * (availableX / (layers.length - 1));
    const y = layerNodes.length === 1 ? height / 2 : marginY + rank * (availableY / (layerNodes.length - 1));

    return {
      ...node,
      x: Math.round(x),
      y: Math.round(y),
    };
  });

  return completeLayout(input, nodes, layers, width, height, options);
}

function hubSpokeLayout(input: GraphInput, options: GraphLayoutOptions = {}): GraphLayout {
  const nodeWidth = options.nodeWidth ?? 132;
  const nodeHeight = options.nodeHeight ?? 76;
  const width = Math.max(options.width ?? 900, 520);
  const height = Math.max(options.height ?? 420, 360);
  const marginX = options.marginX ?? 96;
  const marginY = options.marginY ?? 70;
  const hub =
    input.nodes.find((node) => node.id === options.hubId) ??
    input.nodes.find((node) => input.edges.some((edge) => edge.from === node.id)) ??
    input.nodes[0];

  if (!hub) {
    return completeLayout(input, [], [], width, height, options);
  }

  const spokes = stableSortByWeight(input.nodes.filter((node) => node.id !== hub.id));
  const centerX = Math.round(width / 2);
  const centerY = Math.round(height / 2);
  const radiusX = Math.max(120, width / 2 - marginX - nodeWidth / 2);
  const radiusY = Math.max(90, height / 2 - marginY - nodeHeight / 2);
  const start = spokes.length <= 3 ? -110 : -150;
  const spread = spokes.length <= 1 ? 0 : Math.min(300, 44 * (spokes.length - 1));

  const nodes: PositionedNode[] = [
    { ...hub, x: centerX, y: centerY },
    ...spokes.map((node, index) => {
      const angle = ((start + (spokes.length === 1 ? 0 : (spread * index) / (spokes.length - 1))) * Math.PI) / 180;
      return {
        ...node,
        x: Math.round(centerX + Math.cos(angle) * radiusX),
        y: Math.round(centerY + Math.sin(angle) * radiusY),
      };
    }),
  ];

  return completeLayout(input, nodes, unique(input.nodes.map((node) => node.layer)), width, height, options);
}

function fanInLayout(input: GraphInput, options: GraphLayoutOptions = {}): GraphLayout {
  const nodeHeight = options.nodeHeight ?? 76;
  const gapY = options.gapY ?? 32;
  const marginX = options.marginX ?? 88;
  const marginY = options.marginY ?? 56;
  const fallbackWidth = Math.max(options.width ?? 900, 760);
  const fallbackHeight = Math.max(options.height ?? 520, marginY * 2 + nodeHeight);
  const sink =
    input.nodes
      .map((node) => ({ node, count: input.edges.filter((edge) => edge.to === node.id).length }))
      .sort((left, right) => right.count - left.count)[0]?.node ?? input.nodes[0];

  if (!sink) {
    return completeLayout(input, [], [], fallbackWidth, fallbackHeight, options);
  }

  const sourceIds = new Set(input.edges.filter((edge) => edge.to === sink.id).map((edge) => edge.from));
  const sinkSources = stableSortByWeight(input.nodes.filter((node) => sourceIds.has(node.id)));
  const rest = stableSortByWeight(input.nodes.filter((node) => node.id !== sink.id && !sourceIds.has(node.id)));
  const sourceSplit = Math.ceil(sinkSources.length / 2);
  const height = Math.max(
    fallbackHeight,
    marginY * 2 + Math.max(Math.max(sourceSplit, sinkSources.length - sourceSplit), rest.length, 1) * (nodeHeight + gapY),
  );
  const width = fallbackWidth;
  const sinkX = Math.round(width * 0.58);
  const nodes: PositionedNode[] = [];

  for (const [index, node] of sinkSources.entries()) {
    const column = index < sourceSplit ? 0 : 1;
    const rank = column === 0 ? index : index - sourceSplit;
    nodes.push({
      ...node,
      x: column === 0 ? marginX : Math.round(width * 0.27),
      y: distribute(rank, column === 0 ? sourceSplit : sinkSources.length - sourceSplit, marginY, height - marginY),
    });
  }

  nodes.push({ ...sink, x: sinkX, y: Math.round(height / 2) });

  for (const [index, node] of rest.entries()) {
    nodes.push({ ...node, x: width - marginX, y: distribute(index, rest.length, marginY, height - marginY) });
  }

  return completeLayout(input, nodes, unique(input.nodes.map((node) => node.layer)), width, height, options);
}

export type AnalyzeGraphOptions = {
  layers?: string[];
  fanInWarningAt?: number;
};

export function analyzeGraph(input: GraphInput, options: AnalyzeGraphOptions = {}): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = [];
  const nodesById = new Map(input.nodes.map((node) => [node.id, node]));
  const layers = options.layers ?? unique(input.nodes.map((node) => node.layer));
  const layerIndex = new Map(layers.map((layer, index) => [layer, index]));
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();

  for (const node of input.nodes) {
    incoming.set(node.id, 0);
    outgoing.set(node.id, []);
  }

  for (const edge of input.edges) {
    const fromNode = nodesById.get(edge.from);
    const toNode = nodesById.get(edge.to);

    if (!fromNode || !toNode) {
      const missing = !fromNode ? edge.from : edge.to;
      diagnostics.push({
        level: "error",
        code: "missing-node",
        message: `${edge.from} -> ${edge.to} misses ${missing}.`,
        edge,
        nodeId: missing,
      });
      continue;
    }

    incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
    outgoing.get(edge.from)?.push(edge.to);

    const fromLayer = layerIndex.get(fromNode.layer) ?? 0;
    const toLayer = layerIndex.get(toNode.layer) ?? 0;
    const distance = toLayer - fromLayer;

    if (distance < 0) {
      diagnostics.push({
        level: "warn",
        code: "back-edge",
        message: `${edge.from} -> ${edge.to} points backward.`,
        edge,
      });
    } else if (distance > 2) {
      diagnostics.push({
        level: "warn",
        code: "long-edge",
        message: `${edge.from} -> ${edge.to} skips ${distance - 1} layers.`,
        edge,
        count: distance,
      });
    }
  }

  const fanInWarningAt = options.fanInWarningAt ?? 5;
  for (const [nodeId, count] of incoming) {
    if (count >= fanInWarningAt) {
      diagnostics.push({
        level: "warn",
        code: "fan-in",
        message: `${nodeId} has ${count} inputs; use groups or bundles.`,
        nodeId,
        count,
      });
    }
  }

  for (const cycle of findCycles(input.nodes.map((node) => node.id), outgoing)) {
    diagnostics.push({
      level: "warn",
      code: "cycle",
      message: `Cycle detected: ${cycle.join(" -> ")}.`,
      nodeId: cycle[0],
      count: cycle.length,
    });
  }

  return diagnostics;
}

export type SvgRenderOptions = {
  nodeWidth?: number;
  nodeHeight?: number;
  classPrefix?: string;
  showLabels?: boolean;
  routeEdges?: boolean;
  sectionPadding?: number;
};

export function edgePath(edge: PositionedEdge): string {
  const midpoint = Math.round((edge.fromNode.x + edge.toNode.x) / 2);
  return `M ${edge.fromNode.x} ${edge.fromNode.y} C ${midpoint} ${edge.fromNode.y}, ${midpoint} ${edge.toNode.y}, ${edge.toNode.x} ${edge.toNode.y}`;
}

export function renderSvg(layout: GraphLayout, options: SvgRenderOptions = {}): string {
  const nodeWidth = options.nodeWidth ?? 132;
  const nodeHeight = options.nodeHeight ?? 76;
  const prefix = options.classPrefix ?? "egk";
  const showLabels = options.showLabels ?? false;
  const routeEdges = options.routeEdges ?? true;
  const sections = layout.sections
    .map((section) => {
      const icon = section.iconDataUrl
        ? `<image href="${escapeAttr(section.iconDataUrl)}" xlink:href="${escapeAttr(section.iconDataUrl)}" x="${section.x + section.width - 30}" y="${section.y + 10}" width="18" height="18" />`
        : "";

      return [
        `<g class="${prefix}-section">`,
        `<rect x="${section.x}" y="${section.y}" width="${section.width}" height="${section.height}" rx="10" />`,
        `<text x="${section.x + 14}" y="${section.y + 24}" class="${prefix}-section-title">${escapeText(section.title)}</text>`,
        icon,
        "</g>",
      ].join("");
    })
    .join("");

  const edges = layout.edges
    .map((edge) => `<path class="${prefix}-edge" d="${escapeAttr(routeEdges ? routedEdgePath(edge, layout.nodes, layout.height, nodeWidth, nodeHeight) : edgePath(edge))}" />`)
    .join("");
  const nodes = layout.nodes
    .map((node) => {
      const x = node.x - nodeWidth / 2;
      const y = node.y - nodeHeight / 2;
      const subtitle = node.subtitle ? `<text x="${node.x}" y="${node.y + 16}" class="${prefix}-subtitle">${escapeText(node.subtitle)}</text>` : "";
      const label = showLabels && node.kind ? `<text x="${node.x}" y="${node.y - 22}" class="${prefix}-kind">${escapeText(node.kind)}</text>` : "";
      const icon = node.iconDataUrl
        ? `<image href="${escapeAttr(node.iconDataUrl)}" xlink:href="${escapeAttr(node.iconDataUrl)}" x="${x + nodeWidth - 24}" y="${y + 8}" width="16" height="16" />`
        : "";
      const popover = renderPopover(node, x + nodeWidth + 10, y - 6, layout.width, layout.height, prefix);
      const hitArea = node.popover ? renderPopoverHitArea(x, y, nodeWidth, nodeHeight, x + nodeWidth + 10, y - 6, layout.width, layout.height, prefix) : "";

      return [
        `<g class="${prefix}-node ${prefix}-${escapeAttr(node.kind ?? "node")}" data-node-id="${escapeAttr(node.id)}" tabindex="0">`,
        hitArea,
        `<rect x="${x}" y="${y}" width="${nodeWidth}" height="${nodeHeight}" rx="7" />`,
        icon,
        label,
        `<text x="${node.x}" y="${node.y - 2}" class="${prefix}-title">${escapeText(node.title)}</text>`,
        subtitle,
        popover,
        "</g>",
      ].join("");
    })
    .join("");

  return [
    `<svg viewBox="0 0 ${layout.width} ${layout.height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`,
    "<defs>",
    `<marker id="${prefix}-arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">`,
    `<polygon points="0 0, 10 3.5, 0 7" class="${prefix}-arrowhead" />`,
    "</marker>",
    "</defs>",
    `<g class="${prefix}-sections">${sections}</g>`,
    `<g class="${prefix}-edges" marker-end="url(#${prefix}-arrowhead)">${edges}</g>`,
    `<g class="${prefix}-nodes">${nodes}</g>`,
    "</svg>",
  ].join("");
}

function renderPopoverHitArea(
  nodeX: number,
  nodeY: number,
  nodeWidth: number,
  nodeHeight: number,
  popoverX: number,
  popoverY: number,
  width: number,
  height: number,
  prefix: string,
): string {
  const popoverWidth = 210;
  const popoverHeight = 132;
  const left = Math.max(6, Math.min(Math.round(popoverX), width - popoverWidth - 6));
  const top = Math.max(6, Math.min(Math.round(popoverY), height - popoverHeight - 6));
  const hitLeft = Math.min(nodeX, left) - 4;
  const hitTop = Math.min(nodeY, top) - 4;
  const hitRight = Math.max(nodeX + nodeWidth, left + popoverWidth) + 4;
  const hitBottom = Math.max(nodeY + nodeHeight, top + popoverHeight) + 4;

  return `<rect class="${prefix}-hit-area" x="${Math.round(hitLeft)}" y="${Math.round(hitTop)}" width="${Math.round(hitRight - hitLeft)}" height="${Math.round(hitBottom - hitTop)}" style="fill: transparent; stroke: transparent; pointer-events: all;" />`;
}

function renderPopover(node: PositionedNode, x: number, y: number, width: number, height: number, prefix: string): string {
  if (!node.popover) {
    return "";
  }

  const popoverWidth = 210;
  const popoverHeight = 132;
  const left = Math.max(6, Math.min(Math.round(x), width - popoverWidth - 6));
  const top = Math.max(6, Math.min(Math.round(y), height - popoverHeight - 6));
  const title = node.popover.title ?? node.title;
  const author = node.popover.author ? `<div class="${prefix}-popover-author">${escapeText(node.popover.author)}</div>` : "";
  const details = node.popover.details ? `<p class="${prefix}-popover-details">${escapeText(node.popover.details)}</p>` : "";
  const links = node.popover.links?.length
    ? `<div class="${prefix}-popover-links">${node.popover.links
        .map((link) => `<a class="${prefix}-popover-pill" href="${escapeAttr(link.href)}">${escapeText(link.label)}</a>`)
        .join("")}</div>`
    : "";

  return [
    `<foreignObject x="${left}" y="${top}" width="${popoverWidth}" height="${popoverHeight}" class="${prefix}-popover">`,
    `<div xmlns="http://www.w3.org/1999/xhtml" class="${prefix}-popover-card">`,
    `<strong>${escapeText(title)}</strong>`,
    author,
    details,
    links,
    "</div>",
    "</foreignObject>",
  ].join("");
}

function routedEdgePath(edge: PositionedEdge, nodes: PositionedNode[], height: number, nodeWidth: number, nodeHeight: number): string {
  const blockers = nodes.filter((node) => node.id !== edge.from && node.id !== edge.to);

  if (!curveHitsNode(edge, blockers, nodeWidth, nodeHeight)) {
    return edgePath(edge);
  }

  const from = { x: edge.fromNode.x, y: edge.fromNode.y + nodeHeight / 2 };
  const to = { x: edge.toNode.x, y: edge.toNode.y + nodeHeight / 2 };
  const bottom = Math.max(...blockers.map((node) => node.y + nodeHeight / 2), from.y, to.y);
  const railY = Math.min(height - 14, bottom + 26);
  const bend = 12;
  const direction = to.x >= from.x ? 1 : -1;

  return [
    `M ${Math.round(from.x)} ${Math.round(from.y)}`,
    `L ${Math.round(from.x)} ${Math.round(railY - bend)}`,
    `Q ${Math.round(from.x)} ${Math.round(railY)} ${Math.round(from.x + direction * bend)} ${Math.round(railY)}`,
    `L ${Math.round(to.x - direction * bend)} ${Math.round(railY)}`,
    `Q ${Math.round(to.x)} ${Math.round(railY)} ${Math.round(to.x)} ${Math.round(railY - bend)}`,
    `L ${Math.round(to.x)} ${Math.round(to.y)}`,
  ].join(" ");
}

function curveHitsNode(edge: PositionedEdge, nodes: PositionedNode[], nodeWidth: number, nodeHeight: number): boolean {
  for (const node of nodes) {
    for (const step of [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
      const point = sampleEdge(edge, step);
      if (Math.abs(point.x - node.x) < nodeWidth / 2 + 8 && Math.abs(point.y - node.y) < nodeHeight / 2 + 8) {
        return true;
      }
    }
  }

  return false;
}

function completeLayout(
  input: GraphInput,
  nodes: PositionedNode[],
  layers: string[],
  width: number,
  height: number,
  options: LayeredLayoutOptions = {},
): GraphLayout {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const sections = positionSections(input.sections ?? [], nodes, options);
  const edges: PositionedEdge[] = [];
  const droppedEdges: GraphEdge[] = [];

  for (const edge of input.edges) {
    const fromNode = byId.get(edge.from);
    const toNode = byId.get(edge.to);

    if (!fromNode || !toNode) {
      droppedEdges.push(edge);
    } else {
      edges.push({ ...edge, fromNode, toNode });
    }
  }

  return {
    width,
    height,
    nodes,
    edges,
    sections,
    layers,
    droppedEdges,
    diagnostics: [...analyzeGraph(input, { layers, fanInWarningAt: options.fanInWarningAt }), ...geometryDiagnostics(nodes, edges, options)],
  };
}

function positionSections(sections: GraphSection[], nodes: PositionedNode[], options: LayeredLayoutOptions): PositionedSection[] {
  const nodeWidth = options.nodeWidth ?? 132;
  const nodeHeight = options.nodeHeight ?? 76;
  const padding = options.gapX ?? 48;

  return sections
    .map((section) => {
      const sectionNodes = nodes.filter((node) => node.section === section.id);
      if (sectionNodes.length === 0) {
        return undefined;
      }

      const left = Math.min(...sectionNodes.map((node) => node.x - nodeWidth / 2)) - padding / 2;
      const right = Math.max(...sectionNodes.map((node) => node.x + nodeWidth / 2)) + padding / 2;
      const top = Math.min(...sectionNodes.map((node) => node.y - nodeHeight / 2)) - padding;
      const bottom = Math.max(...sectionNodes.map((node) => node.y + nodeHeight / 2)) + padding / 2;

      return {
        ...section,
        x: Math.round(left),
        y: Math.round(top),
        width: Math.round(right - left),
        height: Math.round(bottom - top),
      };
    })
    .filter((section): section is PositionedSection => Boolean(section));
}

function geometryDiagnostics(nodes: PositionedNode[], edges: PositionedEdge[], options: LayeredLayoutOptions): GraphDiagnostic[] {
  const diagnostics: GraphDiagnostic[] = [];
  const nodeWidth = options.nodeWidth ?? 132;
  const nodeHeight = options.nodeHeight ?? 76;

  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      if (Math.abs(nodes[left]!.x - nodes[right]!.x) < nodeWidth && Math.abs(nodes[left]!.y - nodes[right]!.y) < nodeHeight) {
        diagnostics.push({ level: "warn", code: "node-overlap", message: `${nodes[left]!.id} touches ${nodes[right]!.id}.` });
      }
    }
  }

  for (let left = 0; left < edges.length; left += 1) {
    for (let right = left + 1; right < edges.length; right += 1) {
      if (edges[left]!.from === edges[right]!.from || edges[left]!.to === edges[right]!.to) {
        continue;
      }

      if (closeSamples(edges[left]!, edges[right]!) >= 2) {
        diagnostics.push({ level: "warn", code: "edge-overlap", message: `${edges[left]!.from}->${edges[left]!.to} overlaps ${edges[right]!.from}->${edges[right]!.to}.` });
      }
    }
  }

  return diagnostics;
}

function closeSamples(left: PositionedEdge, right: PositionedEdge): number {
  let close = 0;

  for (const step of [0.25, 0.5, 0.75]) {
    const a = sampleEdge(left, step);
    const b = sampleEdge(right, step);
    if (Math.hypot(a.x - b.x, a.y - b.y) < 18) {
      close += 1;
    }
  }

  return close;
}

function sampleEdge(edge: PositionedEdge, step: number): { x: number; y: number } {
  const mid = (edge.fromNode.x + edge.toNode.x) / 2;
  const left = (1 - step) ** 3;
  const right = step ** 3;
  return {
    x: left * edge.fromNode.x + 3 * (1 - step) ** 2 * step * mid + 3 * (1 - step) * step ** 2 * mid + right * edge.toNode.x,
    y: left * edge.fromNode.y + 3 * (1 - step) ** 2 * step * edge.fromNode.y + 3 * (1 - step) * step ** 2 * edge.toNode.y + right * edge.toNode.y,
  };
}

function distribute(index: number, count: number, min: number, max: number): number {
  if (count <= 1) {
    return Math.round((min + max) / 2);
  }

  return Math.round(min + (index * (max - min)) / (count - 1));
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function stableSortByWeight(nodes: GraphNode[]): GraphNode[] {
  return nodes
    .map((node, index) => ({ node, index }))
    .sort((left, right) => {
      const weight = (right.node.weight ?? 0) - (left.node.weight ?? 0);
      return weight === 0 ? left.index - right.index : weight;
    })
    .map((item) => item.node);
}

function findCycles(nodeIds: string[], outgoing: Map<string, string[]>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const active = new Set<string>();
  const path: string[] = [];
  const seenCycles = new Set<string>();

  function visit(nodeId: string) {
    if (active.has(nodeId)) {
      const start = path.indexOf(nodeId);
      if (start >= 0) {
        const cycle = [...path.slice(start), nodeId];
        const key = normalizeCycle(cycle);
        if (!seenCycles.has(key)) {
          seenCycles.add(key);
          cycles.push(cycle);
        }
      }
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    active.add(nodeId);
    path.push(nodeId);

    for (const next of outgoing.get(nodeId) ?? []) {
      visit(next);
    }

    path.pop();
    active.delete(nodeId);
  }

  for (const nodeId of nodeIds) {
    visit(nodeId);
  }

  return cycles;
}

function normalizeCycle(cycle: string[]): string {
  const closedCycle = cycle[0] === cycle.at(-1) ? cycle.slice(0, -1) : cycle;
  const rotations = closedCycle.map((_, index) => [...closedCycle.slice(index), ...closedCycle.slice(0, index)].join(">"));
  return rotations.sort()[0] ?? closedCycle.join(">");
}

function escapeText(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttr(value: string): string {
  return escapeText(value).replaceAll('"', "&quot;");
}
