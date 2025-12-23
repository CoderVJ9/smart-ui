import { nodeOps } from "./nodeOps";
import { patchProp } from "./patchProps";
import { createRenderer } from "packages/runtime-core/src/render";
export * from "packages/runtime-core/src/index";
export * from "@vue3/reactivity";

const renderOptions = Object.assign(nodeOps, { patchProp });

export const render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container);
};
