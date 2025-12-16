let activeEffectScope;
class EffectScope {
  effects = [];
  parent;
  scopes = [];
  active = true;
  constructor(detached?: boolean) {
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
      this.parent = undefined;
    }
  }
  stop() {
    if (this.active) {
      this.effects.forEach((effect) => effect.stop());
      this.active = false;
    }
    this.scopes.forEach((scope) => scope.stop());
  }
}

// scope将effect收集
export function recordEffectScope(effect) {
  if (activeEffectScope && activeEffectScope.active) {
    activeEffectScope.effects.push(effect);
  }
}

export function effectScope(detached?: boolean) {
  return new EffectScope(detached);
}
