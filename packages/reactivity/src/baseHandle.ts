import { isObj } from "@vue3/shared";
import { track, trigger } from "./effect";
import { reactive, ReactiveFlags } from "./reactive";

export const mutableHandle = {
  get(target, key, receiver) {
    if (key === ReactiveFlags.IS_REACTIVE) return true;
    track(target, key);
    const r = Reflect.get(target, key, receiver);
    // 深层代理, 对象嵌套对象, 则进行深层代理
    if (isObj(r)) {
      return reactive(r);
    }
    return r;
  },
  set(target, key, value, receiver) {
    const oldValue = target[key];
    const res = Reflect.set(target, key, value, receiver);
    if (oldValue !== value) trigger(target, key, value, oldValue);
    return res;
  },
};
