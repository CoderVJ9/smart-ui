import { nodeOps } from "./nodeOps";
import { patchProp } from "./patchProps";
import { createRenderer } from "@vue3/runtime-core";
export * from "@vue3/runtime-core";
export * from "@vue3/reactivity";

const renderOptions = Object.assign(nodeOps, { patchProp });

export const render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container);
};
