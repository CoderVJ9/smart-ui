import { isObj } from "@vue3/shared";
import { mutableHandle } from "./baseHandle";

export const enum ReactiveFlags {
  IS_REACTIVE = "__v_isReactive",
}

export const isReactive = (target) => {
  return isObj(target) && target[ReactiveFlags.IS_REACTIVE];
};

const cacheMap = new WeakMap();
export const reactive = (target: object) => {
  if (!isObj(target)) return target;

  if (target[ReactiveFlags.IS_REACTIVE]) return target;

  const existingProxy = cacheMap.get(target);
  if (existingProxy) return existingProxy;
  const proxy = new Proxy(target, mutableHandle);
  cacheMap.set(target, proxy);
  return proxy;
};
