import { isObj } from "@vue3/shared";
import { reactive } from "./reactive";
import { activeEffect, trackEffects, triggerEffects } from "./effect";

export function ref(value) {
  return new RefImpl(value);
}

function toReactive(value) {
  return isObj(value) ? reactive(value) : value;
}

class RefImpl {
  dep = undefined;
  _value;
  __v_isRef = true;
  constructor(public rawValue) {
    this._value = toReactive(rawValue);
  }

  get value() {
    // 收集依赖
    if (activeEffect) {
      trackEffects(this.dep || (this.dep = new Set()));
    }
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this._value = toReactive(newValue);
      this.rawValue = newValue;
    }
    // 触发依赖
    if (this.dep) {
      triggerEffects(this.dep);
    }
  }
}

class ObjectRefImpl {
  __v_isRef = true;
  constructor(public _object, public _key) {}
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
}
/**
 * 本质上 toRef/toRefs / proxyRefs都是对reactive做了一层代理
 * 实际上还是reactive中去收集依赖, 触发更新
 */

export function toRef(target, key) {
  return new ObjectRefImpl(target, key);
}

export function toRefs(target) {
  const res = {};
  for (const key in target) {
    res[key] = toRef(target, key);
  }

  return res;
}

export function proxyRefs(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      const value = Reflect.get(target, key, receiver);
      return value.__v_isRef ? value.value : value;
    },
    set(target, key, value, receiver) {
      const oldValue = target[key];
      if (oldValue.__v_isRef) {
        oldValue.value = value;
        return true;
      }
      return Reflect.set(target, key, value, receiver);
    },
  });
}
