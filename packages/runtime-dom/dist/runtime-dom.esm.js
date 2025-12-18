// packages/runtime-dom/src/nodeOps.ts
var nodeOps = {
  createElement(type) {
    return document.createElement(type);
  },
  setElementText(node, text) {
    node.textContent = text;
  },
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null);
  },
  remove(child) {
    child.parentNode.removeChild(child);
  },
  createText(text) {
    return document.createTextNode(text);
  },
  setText(node, text) {
    node.nodeValue = text;
  },
  parentNode(node) {
    return node.parentNode;
  },
  querySelector(selector) {
    return document.querySelector(selector);
  },
  nextSibling(node) {
    return node.nextSibling;
  },
  setAttribute(el, key, value) {
    el.setAttribute(key, value);
  },
  getAttribute(el, key) {
    return el.getAttribute(key);
  }
};

// packages/runtime-dom/src/modules/attr.ts
function patchAttr(el, key, value) {
  if (value == null) {
    el.removeAttribute(key);
  } else {
    el.setAttribute(key, value);
  }
}

// packages/runtime-dom/src/modules/class.ts
function patchClass(el, value) {
  if (value == null) {
    el.removeAttribute("class");
  } else {
    el.className = value;
  }
}

// packages/runtime-dom/src/modules/event.ts
function createFnInvoker(fn) {
  const invoker = () => invoker.value();
  invoker.value = fn;
  return invoker;
}
function patchEvent(el, key, nextValue) {
  const invokers = el._vei || (el._vei = {});
  const name = key.slice(2).toLowerCase();
  const existingInvoker = invokers[name];
  if (existingInvoker && nextValue) {
    existingInvoker.value = nextValue;
  } else {
    if (nextValue) {
      const fn = invokers[name] = createFnInvoker(nextValue);
      el.addEventListener(name, fn);
    } else if (existingInvoker) {
      el.removeEventListener(name, existingInvoker);
      invokers[name] = null;
    }
  }
}

// packages/runtime-dom/src/modules/style.ts
function patchStyle(el, prevValue, nextValue) {
  const style = el.style;
  for (const key in nextValue) {
    style[key] = nextValue[key];
  }
  for (const key in prevValue) {
    if (nextValue[key] == null) {
      style[key] = null;
    }
  }
}

// packages/runtime-dom/src/patchProps.ts
function patchProp(el, key, prevValue, nextValue) {
  if (key === "class") {
    patchClass(el, nextValue);
  } else if (key === "style") {
    patchStyle(el, prevValue, nextValue);
  } else if (/^on[^a-z]/.test(key)) {
    patchEvent(el, key, nextValue);
  } else {
    patchAttr(el, key, nextValue);
  }
}

// packages/shared/src/index.ts
function isObj(value) {
  return Object.prototype.toString.call(value) === "[object Object]";
}
function isFunction(value) {
  return typeof value === "function";
}
function isString(value) {
  return typeof value === "string";
}
var hasOwnProperty = Object.prototype.hasOwnProperty;
function hasOwn(obj, key) {
  return hasOwnProperty.call(obj, key);
}

// packages/runtime-core/src/vnode.ts
function isVnode(vnode) {
  return vnode && vnode.__v_isVNode;
}
function isSameVnode(vnode1, vnode2) {
  return vnode1.type === vnode2.type && vnode1.key === vnode2.key;
}
function createVNode(type, props, children) {
  const shapeFlag = isString(type) ? 1 /* ELEMENT */ : isObj(type) ? 4 /* STATEFUL_COMPONENT */ : 0;
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    shapeFlag,
    key: props?.key,
    el: null
  };
  if (children) {
    let type2 = 0;
    if (Array.isArray(children)) {
      type2 = 16 /* ARRAY_CHILDREN */;
    } else if (isObj(children)) {
      type2 = 32 /* SLOTS_CHILDREN */;
    } else {
      type2 = 8 /* TEXT_CHILDREN */;
    }
    vnode.shapeFlag |= type2;
  }
  return vnode;
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

// packages/runtime-core/src/scheduler.ts
var queue = [];
var isFlushing = false;
var resolvePromise = Promise.resolve();
function queueJob(job) {
  if (queue.indexOf(job) === -1) {
    queue.push(job);
  }
  if (!isFlushing) {
    isFlushing = true;
    resolvePromise.then(() => {
      isFlushing = false;
      const copy = queue.slice(0);
      queue.length = 0;
      copy.forEach((job2) => job2());
    });
  }
}

// packages/runtime-core/src/initProps.ts
function initProps(instance, rawProps) {
  const props = {};
  const attrs = {};
  if (rawProps) {
    for (const key in rawProps) {
      if (hasOwn(instance.propsOptions, key)) {
        props[key] = rawProps[key];
      } else {
        attrs[key] = rawProps[key];
      }
    }
  }
  instance.props = reactive(props);
  instance.attrs = attrs;
}

// packages/runtime-core/src/component.ts
function createComponentInstance(vnode) {
  const instance = {
    data: null,
    vnode,
    subTree: null,
    mounted: null,
    update: null,
    propsOptions: vnode.type.props || {},
    props: {},
    attrs: {},
    proxy: null,
    render: null,
    setupState: {}
  };
  return instance;
}
var publicProperties = {
  $props: (i) => i.props,
  $attrs: (i) => i.attrs,
  $slots: (i) => i.slots
};
var instanceProxyHandler = {
  get(target, key) {
    let { data, props, setupState } = target;
    if (data && hasOwn(data, key)) {
      return data[key];
    } else if (hasOwn(props, key)) {
      return props[key];
    } else if (hasOwn(publicProperties, key)) {
      return publicProperties[key](target);
    } else if (hasOwn(setupState, key)) {
      return setupState[key];
    }
    return target[key];
  },
  set(target, key, value) {
    let { data, props, setupState } = target;
    if (hasOwn(data, key)) {
      data[key] = value;
    } else if (hasOwn(props, key)) {
      console.warn(`props is readonly`);
      return false;
    } else if (hasOwn(setupState, key)) {
      setupState[key] = value;
    }
    return true;
  }
};
function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
    instance.slots = children;
  }
}
function setupComponent(instance) {
  const { type, props, children } = instance.vnode;
  initProps(instance, props);
  initSlots(instance, children);
  instance.proxy = new Proxy(instance, instanceProxyHandler);
  const setup = type.setup;
  if (setup) {
    const setupContext = {
      attrs: instance.attrs,
      emit: (event, ...args) => {
        const eventName = `on${event[0].toUpperCase() + event.slice(1)}`;
        const handle = instance.vnode.props[eventName];
        handle && handle(...args);
      },
      expose: (exposed) => {
        instance.exposed = exposed || {};
      },
      slots: instance.slots
    };
    const setupResult = setup.call(
      instance.proxy,
      instance.props,
      setupContext
    );
    if (isFunction(setupResult)) {
      instance.render = setupResult;
    } else {
      instance.setupState = proxyRefs(setupResult);
    }
  }
  let data = type.data;
  if (data) {
    if (isFunction(data)) {
      instance.data = reactive(data.call(instance.proxy));
    }
  }
  if (!instance.render) {
    instance.render = type.render;
  }
}

// packages/runtime-core/src/h.ts
function h(type, propsOrChildren, children) {
  const l = arguments.length;
  if (l === 2) {
    if (isObj(propsOrChildren)) {
      if (isVnode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren]);
      }
      return createVNode(type, propsOrChildren);
    } else {
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

// packages/runtime-core/src/index.ts
var Text = Symbol("Text");
var Fragment = Symbol("Fragment");
function createRenderer(options) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling
  } = options;
  const mountChildren = (children, container) => {
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      patch(null, child, container);
    }
  };
  const unmountChildren = (children) => {
    for (let i = 0; i < children.length; i++) {
      unmount(children[i]);
    }
  };
  const mountElement = (vnode, container, anchor) => {
    const { type, props, shapeFlag } = vnode;
    const el = vnode.el = hostCreateElement(type);
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & 8 /* TEXT_CHILDREN */) {
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & 16 /* ARRAY_CHILDREN */) {
      mountChildren(vnode.children, el);
    }
    return hostInsert(el, container, anchor);
  };
  const patchProps = (el, prevProps = {}, nextProps = {}) => {
    if (prevProps === nextProps) return;
    for (const key in nextProps) {
      hostPatchProp(el, key, prevProps[key], nextProps[key]);
    }
    for (const key in prevProps) {
      if (!(key in nextProps)) {
        hostPatchProp(el, key, prevProps[key], null);
      }
    }
  };
  const patchKeyedChildren = (c1, c2, el) => {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    while (i <= e1 && i <= e2) {
      const n1 = c1[i];
      const n2 = c2[i];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      i++;
    }
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1];
      const n2 = c2[e2];
      if (isSameVnode(n1, n2)) {
        patch(n1, n2, el);
      } else {
        break;
      }
      e1--;
      e2--;
    }
    if (i > e1) {
      while (i <= e2) {
        const anchor = e2 + 1 < c2.length ? c2[e2 + 1].el : null;
        patch(null, c2[i], el, anchor);
        i++;
      }
    } else if (i > e2) {
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    } else {
      let s1 = i;
      let s2 = i;
      const keyToNewIndexMap = /* @__PURE__ */ new Map();
      for (let i2 = s2; i2 <= e2; i2++) {
        const nextChild = c2[i2];
        keyToNewIndexMap.set(nextChild.key, i2);
      }
      console.log("keyToNewIndexMap", keyToNewIndexMap);
      const newIndexToOldIndexMap = new Array(e2 - s2 + 1).fill(0);
      for (let i2 = s1; i2 <= e1; i2++) {
        const oldChild = c1[i2];
        const key = oldChild.key;
        const newIndex = keyToNewIndexMap.get(key);
        if (newIndex == void 0) {
          unmount(oldChild);
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i2 + 1;
          patch(oldChild, c2[newIndex], el);
        }
      }
      console.log("newIndexToOldIndexMap = ", newIndexToOldIndexMap);
      const seq = getSequence(newIndexToOldIndexMap);
      let j = seq.length - 1;
      const toBePatched = e2 - s2 + 1;
      for (let i2 = toBePatched - 1; i2 >= 0; i2--) {
        const nextIndex = s2 + i2;
        const nextChild = c2[nextIndex];
        const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;
        if (newIndexToOldIndexMap[i2] === 0) {
          patch(null, nextChild, el, anchor);
        } else {
          if (seq[j] !== i2) {
            hostInsert(nextChild.el, el, anchor);
          } else {
            j--;
          }
        }
      }
    }
  };
  const patchChildren = (n1, n2, el) => {
    const c1 = n1.children;
    const c2 = n2.children;
    const prevShapeFlag = n1.shapeFlag;
    const nextShapeFlag = n2.shapeFlag;
    if (nextShapeFlag & 8 /* TEXT_CHILDREN */) {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(el, c2);
      }
    } else {
      if (prevShapeFlag & 16 /* ARRAY_CHILDREN */) {
        if (nextShapeFlag & 16 /* ARRAY_CHILDREN */) {
          patchKeyedChildren(c1, c2, el);
        } else {
          unmountChildren(c1);
        }
      } else {
        if (prevShapeFlag & 8 /* TEXT_CHILDREN */) {
          hostSetElementText(el, "");
        }
        if (nextShapeFlag & 16 /* ARRAY_CHILDREN */) {
          mountChildren(c2, el);
        }
      }
    }
  };
  const patchElement = (n1, n2, container) => {
    let el = n2.el = n1.el;
    const nextProps = n2.props;
    const prevProps = n1.props;
    patchProps(el, prevProps, nextProps);
    patchChildren(n1, n2, el);
  };
  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      mountElement(n2, container, anchor);
    } else {
      patchElement(n1, n2, container);
    }
  };
  const processText = (n1, n2, el) => {
    if (n1 == null) {
      hostInsert(n2.el = hostCreateText(n2.children), el);
    } else {
      const el2 = n2.el = n1.el;
      if (n1.children !== n2.children) {
        hostSetText(el2, n2.children);
      }
    }
  };
  const mountComponent = (vnode, container, anchor) => {
    const instance = vnode.component = createComponentInstance(vnode);
    setupComponent(instance);
    setupRenderEffect(instance, container, anchor);
  };
  const updateProps = (prevProps, nextProps) => {
    for (const key in nextProps) {
      if (nextProps[key] !== prevProps[key]) {
        prevProps[key] = nextProps[key];
      }
    }
    for (const key in prevProps) {
      if (!(key in nextProps)) {
        delete prevProps[key];
      }
    }
  };
  const updateComponentPreRender = (instance, nextVnode) => {
    instance.next = null;
    instance.vnode = nextVnode;
    updateProps(instance.props, nextVnode.props);
  };
  const setupRenderEffect = (instance, container, anchor) => {
    const effect2 = new ReactiveEffect(
      () => {
        const { render: render3 } = instance;
        if (instance.mounted) {
          const { next } = instance;
          if (next) {
            updateComponentPreRender(instance, next);
          }
          const subTree = render3.call(instance.proxy, instance.proxy);
          patch(instance.subTree, subTree, container);
          instance.subTree = subTree;
        } else {
          const subTree = render3.call(instance.proxy, instance.proxy);
          instance.subTree = subTree;
          patch(null, subTree, container, anchor);
          instance.mounted = true;
        }
      },
      () => {
        queueJob(instance.update);
      }
    );
    const update = instance.update = effect2.run.bind(effect2);
    update();
  };
  const hasPropsChanged = (prevProps, nextProps) => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    if (prevKeys.length !== nextKeys.length) {
      return true;
    }
    for (const key in nextProps) {
      if (nextProps[key] !== prevProps[key]) {
        return true;
      }
    }
    return false;
  };
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren = [] } = n1;
    const { props: nextProps, children: nextChildren = [] } = n2;
    if (prevChildren.length || nextChildren.length) {
      return true;
    }
    if (prevProps === nextProps) return false;
    if (hasPropsChanged(prevProps, nextProps)) return true;
    return false;
  };
  const updateComponent = (n1, n2) => {
    const instance = n2.component = n1.component;
    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2;
      instance.update();
    }
  };
  const processComponent = (n1, n2, container, anchor) => {
    if (n1 === null) {
      mountComponent(n2, container, anchor);
    } else {
      updateComponent(n1, n2);
    }
  };
  const processFragment = (n1, n2, container) => {
    if (n1 === null) {
      mountChildren(n2.children, container);
    } else {
      patchKeyedChildren(n1.children, n2.children, container);
    }
  };
  const patch = (n1, n2, container, anchor = null) => {
    if (n1 === n2) {
      return;
    }
    if (n1 && !isSameVnode(n1, n2)) {
      unmount(n1);
      n1 = null;
    }
    const { type, shapeFlag } = n2;
    switch (type) {
      case Text:
        processText(n1, n2, container);
        break;
      case Fragment:
        processFragment(n1, n2, container);
        break;
      default:
        if (shapeFlag & 1 /* ELEMENT */) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & 4 /* STATEFUL_COMPONENT */) {
          processComponent(n1, n2, container, anchor);
        }
        break;
    }
  };
  const unmount = (vnode) => {
    const { type } = vnode;
    if (type === Fragment) {
      unmountChildren(vnode.children);
    } else {
      hostRemove(vnode.el);
    }
  };
  const render2 = (vnode, container) => {
    if (vnode == null) {
      unmount(container._vnode);
    } else if (container._vnode) {
      patch(container._vnode, vnode, container);
    } else {
      patch(null, vnode, container);
    }
    container._vnode = vnode;
  };
  return {
    render: render2
  };
}
function getSequence(arr) {
  const len = arr.length;
  const res = [0];
  const tail = new Array(len).fill(void 0);
  let start;
  let end;
  let mid;
  for (let i = 0; i < len; i++) {
    const num = arr[i];
    if (num > arr[res[res.length - 1]]) {
      res.push(i);
      tail[i] = res[res.length - 2];
    } else {
      start = 0;
      end = res.length - 1;
      while (start < end) {
        mid = start + end >> 1;
        if (arr[res[mid]] < num) {
          start = mid + 1;
        } else {
          end = mid;
        }
      }
      res[start] = i;
      tail[i] = res[start - 1];
    }
  }
  const ans = [res[res.length - 1]];
  let preIndex = tail[ans[0]];
  while (preIndex !== void 0) {
    ans.unshift(preIndex);
    preIndex = tail[preIndex];
  }
  return ans;
}

// packages/runtime-dom/src/index.ts
var renderOptions = Object.assign(nodeOps, { patchProp });
var render = (vnode, container) => {
  return createRenderer(renderOptions).render(vnode, container);
};
export {
  Fragment,
  ReactiveEffect,
  ReactiveFlags,
  Text,
  activeEffect,
  computed,
  createRenderer,
  createVNode,
  effect,
  effectScope,
  h,
  isReactive,
  isSameVnode,
  isVnode,
  proxyRefs,
  reactive,
  recordEffectScope,
  ref,
  render,
  toRef,
  toRefs,
  track,
  trackEffects,
  trigger,
  triggerEffects,
  watch,
  watchEffect
};
//# sourceMappingURL=runtime-dom.esm.js.map
