/**
 * Global Polyfills for ECMAScript 2024 & Legacy Browser Support
 * (Windows 7 / Firefox 115 ESR / Older Chromium / Safari)
 */

// 1. Ensure globalThis is defined
if (typeof globalThis === 'undefined') {
  (window as any).globalThis = window;
}

// 2. Polyfill Iterator & Iterator.prototype for ECMAScript 2024
// Fixes "Iterator is not defined" crash in pdfjs-dist on Firefox 115 ESR / older browsers
if (typeof (globalThis as any).Iterator === 'undefined') {
  function Iterator() {}
  Iterator.prototype = Object.create(Object.prototype);
  (globalThis as any).Iterator = Iterator;
}
if (typeof (globalThis as any).Iterator.prototype.join !== 'function') {
  (globalThis as any).Iterator.prototype.join = function (separator?: string) {
    const sep = separator === undefined ? ',' : String(separator);
    try {
      return Array.from(this as any).join(sep);
    } catch {
      return '';
    }
  };
}

// 3. Polyfill Promise.withResolvers (ECMAScript 2024)
// Used by pdfjs-dist 4.x/5.x
if (typeof (Promise as any).withResolvers !== 'function') {
  (Promise as any).withResolvers = function <T = any>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: any) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// 4. Polyfill Promise.try (ECMAScript 2024 / Stage 4)
// Fixes "#onMessage Promise.try is not a function" crash in pdfjs-dist on Firefox 115 ESR / older browsers
if (typeof (Promise as any).try !== 'function') {
  (Promise as any).try = function (fn: (...args: any[]) => any, ...args: any[]) {
    return new Promise((resolve) => {
      resolve(fn(...args));
    });
  };
}
if (typeof (globalThis as any).Promise.try !== 'function') {
  (globalThis as any).Promise.try = (Promise as any).try;
}

// 4. Polyfill Object.hasOwn
if (typeof Object.hasOwn !== 'function') {
  Object.hasOwn = function (obj: any, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

// 5. Polyfill Array.prototype.at
if (!Array.prototype.at) {
  Array.prototype.at = function (index: number) {
    const k = index >= 0 ? index : this.length + index;
    return k < 0 || k >= this.length ? undefined : this[k];
  };
}

// 6. Polyfill String.prototype.replaceAll
if (!String.prototype.replaceAll) {
  String.prototype.replaceAll = function (search: string | RegExp, replaceWith: string | any) {
    if (search instanceof RegExp) {
      return this.replace(search, replaceWith);
    }
    return this.split(search).join(replaceWith);
  };
}

export {};
