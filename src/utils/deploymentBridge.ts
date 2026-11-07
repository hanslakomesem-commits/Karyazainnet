/**
 * ZAIN.NET GitHub Pages / Node backend deployment compatibility layer.
 * No secret is stored here; VITE_API_BASE_URL is only a public server address.
 */
const apiBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
const basePath = ('/' + (import.meta.env.BASE_URL || '/').replace(/^\/+|\/+$/g, '') + '/').replace(/\/+/g, '/');

export function backendUrl(path: string): string {
  return !apiBase ? path : `${apiBase}${path.startsWith('/') ? path : '/' + path}`;
}
export function appUrl(path: string): string {
  if (!path.startsWith('/') || path.startsWith('//') || basePath === '/') return path;
  if (path.startsWith(basePath)) return path;
  return basePath.replace(/\/$/, '') + path;
}
export function appPathname(): string {
  const p = window.location.pathname;
  if (basePath !== '/' && p.startsWith(basePath)) return '/' + p.slice(basePath.length);
  if (basePath !== '/' && p === basePath.slice(0, -1)) return '/';
  return p;
}
function isServerRoute(p: string): boolean {
  return p === '/api' || p.startsWith('/api/') || p === '/uploads' ||
    p.startsWith('/uploads/') || p.startsWith('/proxy-notajilid') ||
    p.startsWith('/proxy-sewatoga');
}
function rewriteServerUrl(value: string): string {
  if (!apiBase || !value || value.startsWith('//')) return value;
  try {
    const u = new URL(value, window.location.href);
    if (u.origin !== window.location.origin || !isServerRoute(u.pathname)) return value;
    return `${apiBase}${u.pathname}${u.search}${u.hash}`;
  } catch { return value; }
}
function transformLink(raw: string): string {
  const api = rewriteServerUrl(raw);
  if (api !== raw) return api;
  if (raw.startsWith('/') && !raw.startsWith('//')) return appUrl(raw);
  return raw;
}
function isAdminPath(path: string): boolean {
  return path.startsWith('/api/makalah/admin/') || path === '/api/export-code' ||
    path === '/api/journal7/download-source-code' || path === '/api/download-source-code' ||
    path === '/api/r2/configure' || path === '/api/academic/clear-transactions' ||
    path === '/api/makalah/clear-all' || path === '/api/agc/reset-seed' ||
    path === '/api/agc/seed-7000' || path.startsWith('/api/agc/expand/') ||
    path.startsWith('/api/agc/posts/');
}
function adminPath(input: RequestInfo | URL): boolean {
  try {
    const u = new URL(input instanceof Request ? input.url : String(input), window.location.href);
    return isAdminPath(u.pathname);
  } catch { return false; }
}
function adminHeader(input: RequestInfo | URL, init: RequestInit | undefined, token: string): [RequestInfo | URL, RequestInit] {
  const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
  headers.set('X-Zain-Admin-Token', token);
  return [input, {...init, headers}];
}

/** Install before the first React render / SDK requests. */
export function installDeploymentBridge(): void {
  if (!apiBase) {
    console.warn('[ZAIN.NET] VITE_API_BASE_URL belum diatur; /api tidak akan bekerja di GitHub Pages.');
  }
  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let target: RequestInfo | URL = input;
    if (input instanceof Request) {
      const nextUrl = rewriteServerUrl(input.url);
      if (nextUrl !== input.url) target = new Request(nextUrl, input);
    } else {
      const nextUrl = rewriteServerUrl(String(input));
      if (nextUrl !== String(input)) target = nextUrl;
    }
    const needsAdmin = adminPath(target);
    let token = needsAdmin ? (sessionStorage.getItem('zain_backend_admin_token') || '') : '';
    let [request, options] = token ? adminHeader(target, init, token) : [target, init || {}];
    let response = await originalFetch(request, options);
    if (needsAdmin && response.status === 401) {
      sessionStorage.removeItem('zain_backend_admin_token');
      token = window.prompt('Masukkan ADMIN_API_TOKEN yang sudah disetel di hosting backend ZAIN.NET:') || '';
      if (token) {
        sessionStorage.setItem('zain_backend_admin_token', token);
        [request, options] = adminHeader(target, init, token);
        response = await originalFetch(request, options);
      }
    }
    return response;
  };

  for (const method of ['pushState','replaceState'] as const) {
    const original = window.history[method].bind(window.history);
    window.history[method] = ((state: any, unused: string, url?: string | URL | null) => {
      const adjusted = typeof url === 'string' ? transformLink(url) : url;
      // Route navigation should stay on GitHub Pages; API links are handled in the DOM/fetch.
      return original(state, unused, adjusted);
    }) as typeof window.history[typeof method];
  }

  const fixElement = (el: Element) => {
    for (const attr of ['href','src','action'] as const) {
      if (!el.hasAttribute(attr)) continue;
      const old = el.getAttribute(attr);
      if (!old) continue;
      const rewritten = transformLink(old);
      if (rewritten !== old) el.setAttribute(attr, rewritten);
    }
  };
  // React sometimes creates direct download links, iframes or HTML-string images.
  const updateSubtree = (node: Node) => {
    if (!(node instanceof Element)) return;
    fixElement(node);
    node.querySelectorAll('[href],[src],[action]').forEach(fixElement);
  };
  const startObserver = () => {
    const observer = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') updateSubtree(record.target);
        record.addedNodes.forEach(updateSubtree);
      }
    });
    observer.observe(document.documentElement, {
      subtree: true, childList: true, attributes: true, attributeFilter: ['href','src','action']
    });
    updateSubtree(document.documentElement);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, {once:true});
  else startObserver();
}

installDeploymentBridge();
