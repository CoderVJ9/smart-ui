import { hasOwn, isFunction } from "@vue3/shared";
import { initProps } from "./initProps";
import { proxyRefs, reactive } from "@vue3/reactivity";

export function createComponentInstance(vnode) {
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
  };
  return instance;
}

const publicProperties = {
  $props: (i) => i.props,
  $attrs: (i) => i.attrs,
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
export function setupComponent(instance) {
  const { type, props } = instance.vnode;
  initProps(instance, props);
  instance.proxy = new Proxy(instance, instanceProxyHandler);

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
