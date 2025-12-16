import { isObj } from "@vue3/shared";
import { createVNode, isVnode } from "./vnode";

export function h(type, propsOrChildren, children) {
  const l = arguments.length;
  // h('div',{}) h('div',{})
  if (l === 2) {
    if (isObj(propsOrChildren)) {
      if (isVnode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      return createVNode(type, propsOrChildren);
    } else {
      //  是text 或者数组
      return createVNode(type, null, propsOrChildren);
    }
  } else {
    if (l > 3) {
      children = Array.from(arguments).slice(2);
    } else if (l === 3 && isVnode(children)) {
      children = [children];
    }
    return createVNode(type, propsOrChildren, children);
  }
}
