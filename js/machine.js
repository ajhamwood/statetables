// Utilities
var $ = (() => { let wm = new WeakMap(), v = Object.values, r = Promise.resolve.bind(Promise),
    test = (obj, con) => obj.constructor === con || con.prototype.isPrototypeOf(obj),
    add = (k, t, fn, es = wm.get(k) ?? {}) => { remove(k, t, fn.name); k.addEventListener(t, (es[t] ??= {})[fn.name] = fn); wm.set(k, es) },
    remove = (k, t, fname, es = wm.get(k)) => { if (es && t in es && fname in es[t]) {
      k.removeEventListener(t, es[t][fname]); delete es[t][fname] && (v(es[t]).length || delete es[t]) && (v(es).length || wm.delete(k)) } };
  
  //   $ enhances querySelectorAll
  return Object.assign((sel, node = document) => sel ? node.querySelector(sel) : node, {
    all (sel, node = document) { return sel ? v(node.querySelectorAll(sel)) : [node] },
  
  //   $.Machine creates state machines for the page
    Machine: class { constructor (s) { let state = Object.seal(s); wm.set(this, { es: {}, state: Object.seal(s) });
        for (let k in state) Object.defineProperty(this, k, { get: () => state[k], set: v => state[k] = v }) }
      state () { return wm.get(this).state }
      on (t, fn) { (wm.get(this).es[t] ??= new Map()).set(fn.name, fn); return this }
      stop (t, fname = t) { let {es} = wm.get(this); es[t]?.delete(fname) && (es[t].size || delete es[t]); return this }
      emit (t, ...args) { return (a => (wm.get(this).es[t]?.forEach(fn => a[fn.name] = fn.apply(this, args)), a))({}) }
      emitAsync (t, ...args) { return (p => (wm.get(this).es[t]?.forEach(fn => p = p.then(a => r(fn.apply(this, args)).then(v => ({...a, [fn.name]: v})))), p))(r({})) } },
  
  //   $.pipe manages async event chronology
    pipe: (ps => (p, ...ands) => ps[p] = (ps[p] ?? r()).then(v => Promise.all(ands.map(ors =>
      (test(ors, Array) && Promise.race(ors.map(fn => fn(v)))) || (test(ors, Function) && ors(v))))))({}),
  
  //   $.targets recursively adds event listeners to objects and removes them by name, indexed by regex
    targets (obj, target = window) {
      for (let ts in obj) if (test(obj[ts], Function)) { if (test(target, $.Machine)) ts.split(' ').forEach(t => target.on(t, obj[ts]));
        else if (test(target, EventTarget)) ts.split(' ').forEach(t => add(target, t, obj[ts].bind(target))) }
      else if (test(obj[ts], String)) { if (test(target, $.Machine)) ts.split(' ').forEach(t => target.stop(t, obj[ts]));
        else if (test(target, EventTarget)) ts.split(' ').forEach(t => remove(target, t, 'bound ' + obj[ts])) }
      else if (ts in target) $.targets(obj[ts], target[ts]);
      else for (let k in target) if (k.match(new RegExp(`^${ts}$`))) $.targets(obj[ts], target[k]) },
  
  //   $.queries adds event listeners to DOM nodes and removes them by name, indexed by selector
    queries (obj, root) {
      for (let q in obj) { let ns = q === "" ? [root] : $.all(q, root); if (ns.length) for (let ts in obj[q])
        if (test(obj[q][ts], Function)) ts.split(' ').forEach(t => ns.forEach(n => add(n, t, obj[q][ts].bind(n))));
        else if (test(obj[q][ts], String)) ts.split(' ').forEach(t => ns.forEach(n => remove(n, t, 'bound ' + obj[q][ts]))) } },
  
  //   $.load enhances importNode
    load (id, dest = 'body', root) {
      return $.all(dest, root).map(n => v($('template#' + id).content.cloneNode(true).children).map(c => n.appendChild(c))) },
  
  //   $.loadWc adds web components
    loadWc (tag, { constructor: c, ...methods }, attrs = []) { class El extends HTMLElement { static get observedAttributes () { return attrs }
      constructor(...args) { super(); this.attachShadow({mode: 'open'}).appendChild($('#' + tag).content.cloneNode(true)); c.apply(this, args) } };
      Object.assign(El.prototype, methods); customElements.define(tag, El) } }) })();