import { isObj, isString, ShapeFlags } from "@vue3/shared";

export function isVnode(vnode) {
  return vnode && vnode.__v_isVNode;
}

export function isSameVnode(vnode1, vnode2) {
  return vnode1.type === vnode2.type && vnode1.key === vnode2.key;
}

export function createVNode(type, props, children?) {
  const shapeFlag = isString(type)
    ? ShapeFlags.ELEMENT
    : isObj(type)
    ? ShapeFlags.STATEFUL_COMPONENT
    : 0;

  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    shapeFlag,
    key: props?.key,
    el: null,
  };

  if (children) {
    let type = 0;
    if (Array.isArray(children)) {
      type = ShapeFlags.ARRAY_CHILDREN;
    } else {
      type = ShapeFlags.TEXT_CHILDREN;
    }
    vnode.shapeFlag |= type;
  }

  return vnode;
}
