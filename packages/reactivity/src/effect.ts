import { recordEffectScope } from "./effectScope";

export let activeEffect: ReactiveEffect | null = null;

//每次执行收集依赖前都先清空下依赖
function cleanupEffect(effect: ReactiveEffect) {
  const deps = effect.deps;
  for (let i = 0; i < deps.length; i++) {
    deps[i].delete(effect);
  }
  effect.deps.length = 0;
}
export class ReactiveEffect {
  public active = true;
  public deps = [];
  public parent = null;
  constructor(public fn: () => void, public scheduler?: Function) {
    recordEffectScope(this);
  }
  run() {
    if (!this.active) return this.fn();

    /** 这个使用了标记方法去解决effect嵌套的问题
     * 比如
     * effect(() => {
     *  this.name; //在e1上手机
     *  effect(() => this.age) //在e2上手机
     *  this.address //在e1上收集
     * })
     * 之前vue2和vue3前期是使用了栈队列来解决
     * 应该是为了节省内存, 现在改成标记方法,全局只用一个activeEffect就可以解决该问题
     *
     * 步骤:
     *  1. 设置parent = activeEffect  此时= null
     *  2. 设置activeEffect = this 此时activeEffect = e1
     *  3. 执行fn, 此时e2会再次回到步骤1
     *  3. 这个时候e2的parent = e1, activeEffect = e2
     *  4. 执行完毕后, 恢复activeEffect = e2.parent =  e1, e2.parent = null
     *  5. e1的fn执行完毕, 恢复activeEffect = e1.parent = null, e1.parent = null
     *
     */
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
}

export const effect = (fn: () => void, options: any = {}) => {
  const effect = new ReactiveEffect(fn, options.scheduler);
  effect.run();
  const runner = effect.run.bind(effect);
  runner.effect = effect;
  return runner;
};
/**
 * 收集依赖
 * 使用一个weakMap
 */
const targetMap = new WeakMap();
export function track(target, key) {
  if (!activeEffect) return;
  let depsMap = targetMap.get(target);
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()));
  }
  let deps = depsMap.get(key);
  if (!deps) {
    depsMap.set(key, (deps = new Set()));
  }

  trackEffects(deps);
}
export function trackEffects(deps) {
  const shouldTrack = !deps.has(activeEffect);
  if (shouldTrack) {
    deps.add(activeEffect);
    //反向收集 该effect收集哪些属性依赖了这个effect
    //作用是  后续需要通过这个effect做清理的时候, 可以找到所有依赖了这个effect的属性, 从而进行清理
    activeEffect.deps.push(deps);
  }
}

export function trigger(target, key, value, oldValue) {
  const depsMap = targetMap.get(target);
  if (!depsMap) return;
  const deps = depsMap.get(key);
  if (!deps) return;
  triggerEffects(deps);
}

export const triggerEffects = (deps) => {
  const effects = [...deps];
  effects.forEach((effect) => {
    //if (activeEffect != effect)  这句判断防止effect中继续收集, 防止无限递归
    if (activeEffect != effect) {
      if (effect.scheduler) {
        effect.scheduler();
        return;
      }
      effect.run();
    }
  });
};

//闭包: 定义的作用域和执行的作用域不在同一个
