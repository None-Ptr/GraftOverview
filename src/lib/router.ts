/** Hash routing (§2.1). No 404 fallback needed on GitHub Pages. */

export type Route =
  | { kind: 'workspace' }
  | { kind: 'share'; data: string | null }
  | { kind: 'share-invalid' };

export function parseHash(hash: string): Route {
  const h = hash.replace(/^#/, '') || '/';
  if (h.startsWith('/share/invalid')) return { kind: 'share-invalid' };
  if (h.startsWith('/share')) {
    const q = h.indexOf('?');
    const data = q >= 0 ? new URLSearchParams(h.slice(q + 1)).get('d') : null;
    return { kind: 'share', data };
  }
  return { kind: 'workspace' };
}

export function currentRoute(): Route {
  if (typeof window === 'undefined') return { kind: 'workspace' };
  return parseHash(window.location.hash);
}

export function navigate(path: string): void {
  if (typeof window === 'undefined') return;
  window.location.hash = path.startsWith('#') ? path : `#${path}`;
}

export function goWorkspace(): void {
  navigate('#/');
}

export function onRouteChange(callback: (route: Route) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = (): void => callback(currentRoute());
  window.addEventListener('hashchange', handler);
  return () => window.removeEventListener('hashchange', handler);
}
