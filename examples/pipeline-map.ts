import { layoutGraph, renderSvg, type GraphInput } from "../src/index.js";

export const pipelineMap: GraphInput = {
  sections: [
    { id: "sources", title: "Sources" },
    { id: "runtime", title: "Runtime" },
    { id: "warehouse", title: "Warehouse" },
    { id: "apps", title: "Apps" },
  ],
  nodes: [
    { id: "billing", title: "Billing", subtitle: "source", kind: "source", layer: "source", section: "sources" },
    { id: "crm", title: "CRM", subtitle: "source", kind: "source", layer: "source", section: "sources" },
    { id: "collector", title: "Collector", subtitle: "scheduled job", kind: "runtime", layer: "runtime", section: "runtime" },
    { id: "raw", title: "Raw Store", subtitle: "landing", kind: "warehouse", layer: "raw", section: "warehouse" },
    { id: "transform", title: "Transform", subtitle: "normalize", kind: "transform", layer: "transform", section: "runtime" },
    { id: "model", title: "Model Store", subtitle: "serving", kind: "warehouse", layer: "serve", section: "warehouse" },
    { id: "dashboard", title: "Dashboard", subtitle: "read model", kind: "app", layer: "app", section: "apps" },
  ],
  edges: [
    { from: "billing", to: "collector" },
    { from: "crm", to: "collector" },
    { from: "collector", to: "raw" },
    { from: "raw", to: "transform" },
    { from: "transform", to: "model" },
    { from: "model", to: "dashboard" },
  ],
};

const layout = layoutGraph(pipelineMap, { mode: "pipeline", width: 900, height: 320 });
console.log(renderSvg(layout, { showLabels: true }));
