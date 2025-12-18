import { hasOwn, isString, ShapeFlags } from "@vue3/shared";
import { isSameVnode } from "./vnode";
import { reactive, ReactiveEffect, track } from "@vue3/reactivity";
import { queueJob } from "./scheduler";
import { initProps } from "./initProps";
import { createComponentInstance, setupComponent } from "./component";

export * from "./h";
export * from "./vnode";

export const Text = Symbol("Text");
export const Fragment = Symbol("Fragment");

export function createRenderer(options) {
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
    nextSibling: hostNextSibling,
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
    const el = (vnode.el = hostCreateElement(type));
    if (props) {
      for (const key in props) {
        hostPatchProp(el, key, null, props[key]);
      }
    }
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, vnode.children);
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
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
  // 核心diff算法
  const patchKeyedChildren = (c1, c2, el) => {
    let i = 0;
    let e1 = c1.length - 1;
    let e2 = c2.length - 1;
    // 从左到右对比
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
    // 从右到左对比
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

    // 同序列新增
    // a b
    // a b c
    // c a b
    // i = 2 e1 = 1 e2 = 2
    if (i > e1) {
      //一定是新的多,没有别的情况
      while (i <= e2) {
        const anchor = e2 + 1 < c2.length ? c2[e2 + 1].el : null;
        patch(null, c2[i], el, anchor);
        i++;
      }
    } else if (i > e2) {
      // 同序列删除
      //一定是旧的多
      while (i <= e1) {
        unmount(c1[i]);
        i++;
      }
    } else {
      //-----------以上是最优化的处理--------------

      //a b c d e f g
      //a b e c d h f g
      // 最长递增子序列从这里开始出现
      let s1 = i;
      let s2 = i;
      // 首先创建一个新元素的映射表  映射表中key是vnode的key, value是新元素的在数组中的索引
      // 目的: 是为了能够根据这个map去快速找到 这个元素 更新后 应该去的位置
      const keyToNewIndexMap = new Map();
      for (let i = s2; i <= e2; i++) {
        const nextChild = c2[i];
        keyToNewIndexMap.set(nextChild.key, i);
      }
      console.log("keyToNewIndexMap", keyToNewIndexMap);
      //然后再创建一个数组 数组中用来更新 在新元素中找到的旧元素的索引, 如果没有就是0, 有的话  存放旧元素的索引 + 1
      //目的: 如果是0, 则代表没有旧元素可以复用,新建即可;  如果非0, 那么存放旧元素的旧索引,这样可以快速找到旧元素然后移动到新的位置
      // 并且要用newIndexToOldIndexMap这个数组去 最长递增子序列算法
      const newIndexToOldIndexMap = new Array(e2 - s2 + 1).fill(0); //[0,0,0,0]
      for (let i = s1; i <= e1; i++) {
        const oldChild = c1[i];
        const key = oldChild.key;
        // nextIndex 是 新的元素在c2中的索引
        const newIndex = keyToNewIndexMap.get(key);
        if (newIndex == undefined) {
          //老的里面有, 新的没有 , 那么就卸载
          unmount(oldChild);
        } else {
          newIndexToOldIndexMap[newIndex - s2] = i + 1;
          //这一步不能少了, 对比复用的2个节点, 对c2中的vnode的el进行赋值
          patch(oldChild, c2[newIndex], el);
        }
      }
      console.log("newIndexToOldIndexMap = ", newIndexToOldIndexMap); //[5, 3, 4, 0]

      // 执行 最长递增子序列算法
      const seq = getSequence(newIndexToOldIndexMap);
      let j = seq.length - 1;
      // 这个时候, 去倒序更新新的元素
      const toBePatched = e2 - s2 + 1;
      for (let i = toBePatched - 1; i >= 0; i--) {
        // 找到要处理的最后一个元素
        const nextIndex = s2 + i;
        const nextChild = c2[nextIndex];
        // 找到锚点
        const anchor = nextIndex + 1 < c2.length ? c2[nextIndex + 1].el : null;

        if (newIndexToOldIndexMap[i] === 0) {
          //代表这个元素在旧的元素数组中没有, 直接新增即可
          patch(null, nextChild, el, anchor);
        } else {
          // 这个元素在旧的元素中有, 移动即可
          // hostInsert(nextChild.el, el, anchor);
          //这个是消耗性能的做法,
          // 所以正确的 使用最长递增子序列来找到连续的元素, 然后移动哪些不连续的元素
          if (seq[j] !== i) {
            //说明不在最长递增子序列中, 需要手动移动
            hostInsert(nextChild.el, el, anchor);
          } else {
            //符合最长递增子序列, 无需移;提高性能
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
    if (nextShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      //新的是文本
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 之前是数组
        unmountChildren(c1);
      }
      if (c1 !== c2) {
        hostSetElementText(el, c2);
      }
    } else {
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          //核心diff
          patchKeyedChildren(c1, c2, el);
        } else {
          unmountChildren(c1);
        }
      } else {
        //旧的可能是 文本或者空, 那就把旧的先清空
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(el, "");
        }
        // 判断新的是不是 数组 是数组就挂载, 是空的话 不处理
        if (nextShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          mountChildren(c2, el);
        }
      }
    }
  };
  const patchElement = (n1, n2, container) => {
    let el = (n2.el = n1.el); //el复用
    //  更新props
    const nextProps = n2.props;
    const prevProps = n1.props;
    patchProps(el, prevProps, nextProps);
    // 对比children
    patchChildren(n1, n2, el);
  };
  const processElement = (n1, n2, container, anchor) => {
    if (n1 == null) {
      // 初次渲染
      mountElement(n2, container, anchor);
    } else {
      // diff算法
      patchElement(n1, n2, container);
    }
  };

  const processText = (n1, n2, el) => {
    if (n1 == null) {
      hostInsert((n2.el = hostCreateText(n2.children)), el);
    } else {
      const el = (n2.el = n1.el);
      if (n1.children !== n2.children) {
        hostSetText(el, n2.children);
      }
    }
  };

  const mountComponent = (vnode, container, anchor) => {
    // 如何挂载一个组件呢 vnode是组件, subTree是vnode的type中的render函数的返回值

    //1.创建组件实例
    const instance = (vnode.component = createComponentInstance(vnode));
    //2.设置实例信息
    setupComponent(instance);
    //3. 创建组件的effect
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
    const effect = new ReactiveEffect(
      () => {
        const { render } = instance;
        if (instance.mounted) {
          const { next } = instance;
          if (next) {
            //说明有 props 或 插槽有更新 那先更新
            updateComponentPreRender(instance, next);
          }
          //更新
          const subTree = render.call(instance.proxy, instance.proxy);
          patch(instance.subTree, subTree, container);
          instance.subTree = subTree;
        } else {
          //初次渲染
          const subTree = render.call(instance.proxy, instance.proxy);
          instance.subTree = subTree;
          patch(null, subTree, container, anchor);
          instance.mounted = true;
        }
      },
      () => {
        queueJob(instance.update);
      }
    );
    const update = (instance.update = effect.run.bind(effect));
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
  // 判断是否需要更新组件
  const shouldComponentUpdate = (n1, n2) => {
    const { props: prevProps, children: prevChildren = [] } = n1;
    const { props: nextProps, children: nextChildren = [] } = n2;

    if (prevChildren.length || nextChildren.length) {
      //只有其中一个有插槽就 需要更新 无法判断插槽是否不同
      return true;
    }
    if (prevProps === nextProps) return false;
    if (hasPropsChanged(prevProps, nextProps)) return true;
    return false;
  };
  const updateComponent = (n1, n2) => {
    const instance = (n2.component = n1.component);
    if (shouldComponentUpdate(n1, n2)) {
      instance.next = n2;
      instance.update();
    }
  };
  const processComponent = (n1, n2, container, anchor) => {
    if (n1 === null) {
      mountComponent(n2, container, anchor);
    } else {
      //更新组件 只有当传入组件的props, 插槽等发生变化, 才会走这里 去更新组件
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
      // 如果n1存在 且跟n2不是相同的vnode  那么就删除n1, 挂载n2
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
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor);
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
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

  const render = (vnode, container) => {
    if (vnode == null) {
      //卸载
      unmount(container._vnode);
    } else if (container._vnode) {
      //更新
      patch(container._vnode, vnode, container);
    } else {
      //挂载
      patch(null, vnode, container);
    }

    container._vnode = vnode;
  };
  return {
    render,
  };
}

/**
 * 最长递增子序列算法
 */
function getSequence(arr) {
  const len = arr.length;

  const res = [0];

  //   用一个数组记录  每一位的前面的index是多少
  const tail = new Array(len).fill(undefined);
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
        mid = (start + end) >> 1;
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
  while (preIndex !== undefined) {
    ans.unshift(preIndex);
    preIndex = tail[preIndex];
  }

  return ans;
}
