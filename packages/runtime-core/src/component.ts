import { hasOwn, isFunction, ShapeFlags } from "@vue3/shared";
import { initProps } from "./initProps";
import { proxyRefs, reactive } from "@vue3/reactivity";

// 全局的instance
export let currentInstance = null;
export function setCurrentInstance(instance) {
  currentInstance = instance;
}
export function getCurrentInstance() {
  return currentInstance;
}

export function createComponentInstance(vnode, parent) {
  // 创建一个实例, 记录这个组件的一些属性和方法
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
    setupState: {},
    parent,
    provides: parent ? parent.provides : Object.create(null),
  };
  return instance;
}

const publicProperties = {
  $props: (i) => i.props,
  $attrs: (i) => i.attrs,
  $slots: (i) => i.slots,
};

const instanceProxyHandler = {
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
  },
};

function initSlots(instance, children) {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    instance.slots = children;
  }
}
// 在这执行的setup函数
export function setupComponent(instance) {
  const { type, props, children } = instance.vnode;
  initProps(instance, props);
  initSlots(instance, children);
  instance.proxy = new Proxy(instance, instanceProxyHandler);
  setCurrentInstance(instance);
  //如果有setup , 则设置上setup
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
      slots: instance.slots,
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

  setCurrentInstance(null);
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
