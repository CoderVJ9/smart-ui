// packages/shared/src/index.ts
function isObj(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
function isFunction(value) {
  return typeof value === "function";
}

// packages/reactivity/src/effectScope.ts
var activeEffectScope;
var EffectScope = class {
  constructor(detached) {
    this.effects = [];
    this.scopes = [];
    this.active = true;
    if (!detached && activeEffectScope) {
      activeEffectScope.scopes.push(this);
    }
  }
  run(fn) {
    try {
      this.parent = activeEffectScope;
      activeEffectScope = this;
      return fn();
    } finally {
      activeEffectScope = this.parent;
      this.parent = void 0;
    }
  }
  stop() {
    if (this.active) {
      this.effects.forEach((effect2) => effect2.stop());
      this.active = false;
    }
    this.scopes.forEach((scope) => scope.stop());
  }
};
function recordEffectScope(effect2) {
  if (activeEffectScope && activeEffectScope.active) {
    activeEffectScope.effects.push(effect2);
  }
}
function effectScope(detached) {
  return new EffectScope(detached);
}

// packages/reactivity/src/effect.ts
var activeEffect = null;
function cleanupEffect(effect2) {
  const deps = effect2.deps;
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect2);
  }
  effect2.deps.length = 0;
}
var ReactiveEffect = class {
  constructor(fn, scheduler) {
    this.fn = fn;
    this.scheduler = scheduler;
    this.active = true;
    this.deps = [];
    this.parent = null;
    recordEffectScope(this);
  }
  run() {
    if (!this.active) return this.fn();
    this.parent = activeEffect;
    activeEffect = this;
    cleanupEffect(this);
    try {
      return this.fn();
    } finally {
      activeEffect = this.parent;
      this.parent = null;
    }
  }
  stop() {
    if (this.active) {
      this.active = false;
      cleanupEffect(this);
    }
  }
};
var effect = (fn, options = {}) => {
  const effect2 = new ReactiveEffect(fn, options.scheduler);
  effect2.run();
  const runner = effect2.run.bind(effect2);
  runner.effect = effect2;
  return runner;
};
var targetMap = /* @__PURE__ */ new WeakMap();
function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, depsMap = /* @__PURE__ */ new Map());
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, deps = /* @__PURE__ */ new Set());
  }
  trackEffects(deps);
}
function trackEffects(deps) {
  const shouldTrack = !deps.has(activeEffect);
  if (shouldTrack) {
    deps.add(activeEffect);
    activeEffect.deps.push(deps);
  }
}
function trigger(target, key, value, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (!deps) return;
  triggerEffects(deps);
}
var triggerEffects = (deps) => {
  const effects = [...deps];
  effects.forEach((effect2) => {
    if (activeEffect != effect2) {
      if (effect2.scheduler) {
        effect2.scheduler();
        return;
      }
      effect2.run();
    }
  });
};

// packages/reactivity/src/baseHandle.ts
var mutableHandle = {
  get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) return true;
    track(target, key);
    const r = Reflect.get(target, key, receiver);
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
  }
};

// packages/reactivity/src/reactive.ts
var ReactiveFlags = /* @__PURE__ */ ((ReactiveFlags2) => {
  ReactiveFlags2["IS_REACTIVE"] = "__v_isReactive";
  return ReactiveFlags2;
})(ReactiveFlags || {});
var isReactive = (target) => {
  return isObj(target) && target["__v_isReactive" /* IS_REACTIVE */];
};
var cacheMap = /* @__PURE__ */ new WeakMap();
var reactive = (target) => {
  if (!isObj(target)) return target;
  if (target["__v_isReactive" /* IS_REACTIVE */]) return target;
  const existingProxy = cacheMap.get(target);
  if (existingProxy) return existingProxy;
  const proxy = new Proxy(target, mutableHandle);
  cacheMap.set(target, proxy);
  return proxy;
};

// packages/reactivity/src/computed.ts
var ComputedRefImpl = class {
  constructor(getter, setter) {
    this.getter = getter;
    this.setter = setter;
    this.deps = void 0;
    this.effect = void 0;
    this._dirty = true;
    this._value = void 0;
    this.effect = new ReactiveEffect(getter, () => {
      this._dirty = true;
      triggerEffects(this.deps);
    });
  }
  get value() {
    if (activeEffect) {
      trackEffects(this.deps || (this.deps = /* @__PURE__ */ new Set()));
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
};
function computed(getterOrOptions) {
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

// packages/reactivity/src/watch.ts
function traverse(source, s = /* @__PURE__ */ new Set()) {
  if (!isObj(source)) {
    return source;
  }
  if (s.has(source)) return source;
  s.add(source);
  for (const key in source) {
    traverse(source[key], s);
  }
  return source;
}
function doWatch(source, cb, { immediate }) {
  let getter;
  if (isReactive(source)) {
    getter = () => traverse(source);
  } else {
    getter = source;
  }
  let cleanup;
  function onCleanup(callback) {
    cleanup = callback;
  }
  const job = () => {
    if (cb) {
      const newValue = effect2.run();
      if (cleanup) {
        cleanup();
      }
      cb(newValue, oldValue, onCleanup);
      oldValue = newValue;
    } else {
      effect2.run();
    }
  };
  const effect2 = new ReactiveEffect(getter, job);
  let oldValue;
  if (immediate) {
    job();
  }
  oldValue = effect2.run();
}
function watch(source, cb, options) {
  doWatch(source, cb, options);
}
function watchEffect(source, options) {
  doWatch(source, null, Object.assign({}, { immediate: true }, options));
}

// packages/reactivity/src/ref.ts
function ref(value) {
  return new RefImpl(value);
}
function toReactive(value) {
  return isObj(value) ? reactive(value) : value;
}
var RefImpl = class {
  constructor(rawValue) {
    this.rawValue = rawValue;
    this.dep = void 0;
    this.__v_isRef = true;
    this._value = toReactive(rawValue);
  }
  get value() {
    if (activeEffect) {
      trackEffects(this.dep || (this.dep = /* @__PURE__ */ new Set()));
    }
    return this._value;
  }
  set value(newValue) {
    if (newValue !== this.rawValue) {
      this._value = toReactive(newValue);
      this.rawValue = newValue;
    }
    if (this.dep) {
      triggerEffects(this.dep);
    }
  }
};
var ObjectRefImpl = class {
  constructor(_object, _key) {
    this._object = _object;
    this._key = _key;
    this.__v_isRef = true;
  }
  get value() {
    return this._object[this._key];
  }
  set value(newValue) {
    this._object[this._key] = newValue;
  }
};
function toRef(target, key) {
  return new ObjectRefImpl(target, key);
}
function toRefs(target) {
  const res = {};
  for (const key in target) {
    res[key] = toRef(target, key);
  }
  return res;
}
function proxyRefs(target) {
  return new Proxy(target, {
    get(target2, key, receiver) {
      const value = Reflect.get(target2, key, receiver);
      return value.__v_isRef ? value.value : value;
    },
    set(target2, key, value, receiver) {
      const oldValue = target2[key];
      if (oldValue.__v_isRef) {
        oldValue.value = value;
        return true;
      }
      return Reflect.set(target2, key, value, receiver);
    }
  });
}
export {
  ReactiveEffect,
  ReactiveFlags,
  activeEffect,
  computed,
  effect,
  effectScope,
  isReactive,
  proxyRefs,
  reactive,
  recordEffectScope,
  ref,
  toRef,
  toRefs,
  track,
  trackEffects,
  trigger,
  triggerEffects,
  watch,
  watchEffect
};
//# sourceMappingURL=reactivity.esm.js.map
