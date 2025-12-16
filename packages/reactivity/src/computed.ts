import {
  activeEffect,
  ReactiveEffect,
  trackEffects,
  triggerEffects,
} from "./effect";
import { isFunction } from "@vue3/shared";

class ComputedRefImpl {
  deps = undefined;
  effect = undefined;
  _dirty = true;
  _value = undefined;
  constructor(public getter, public setter) {
    this.effect = new ReactiveEffect(getter, () => {
      this._dirty = true;
      // 触发计算属性的依赖
      triggerEffects(this.deps);
    });
  }
  get value() {
    // 计算属性收集依赖
    if (activeEffect) {
      trackEffects(this.deps || (this.deps = new Set()));
    }

    if (this._dirty) {
      this._value = this.effect.run();
      this._dirty = false;
    }
    return this._value;
  }
  set value(newValue) {
    this.setter(newValue);
  }
}

export function computed(getterOrOptions) {
  let getter, setter;
  if (isFunction(getterOrOptions)) {
    getter = getterOrOptions;
    setter = () => {
      console.warn("computed value is readonly");
    };
  } else {
    getter = getterOrOptions.get;
    setter = getterOrOptions.set;
  }

  return new ComputedRefImpl(getter, setter);
}
