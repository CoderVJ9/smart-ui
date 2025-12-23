import { getCurrentInstance, setCurrentInstance } from "./component";

enum Lifecycle {
  BEFORE_MOUNT = "bm",
  MOUNTED = "m",
  BEFORE_UPDATE = "bu",
  UPDATED = "u",
}

// 工厂函数
const createLifecycleHook = (type) => {
  return (hook) => {
    const instance = getCurrentInstance();
    const hooks = instance[type] || (instance[type] = []);

    //解决 使用者在生命周期中调用 getCurrentInstance()的时候获取不到instance
    //利用闭包
    //闭包: 函数的执行作用域不在定义作用域上 就叫做闭包
    //这样执行的时候, 先利用闭包引用外界的instance, 然后执行完fn后, 立即释放全局的instance
    const invoker = () => {
      setCurrentInstance(instance);
      hook();
      setCurrentInstance(null);
    };

    hooks.push(invoker);
  };
};

export const onBeforeMount = createLifecycleHook(Lifecycle.BEFORE_MOUNT);
export const onMounted = createLifecycleHook(Lifecycle.MOUNTED);
export const onBeforeUpdate = createLifecycleHook(Lifecycle.BEFORE_UPDATE);
export const onUpdated = createLifecycleHook(Lifecycle.UPDATED);
