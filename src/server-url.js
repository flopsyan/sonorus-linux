// The one string this app is configured with, and the two things worth doing to
// it before it is trusted.

import { net } from 'electron';

/**
 * What was typed, turned into an address that can be loaded. An empty string
 * comes back for something that is not an address at all.
 *
 * A missing scheme becomes **https**, not http: the session cookie carries
 * `Secure`, so over a plain connection the login would appear to work and then
 * never stay logged in. A trailing slash is dropped so the origin comparison
 * later has two strings that can be equal.
 */
export function normalize(input) {
  const typed = String(input ?? '').trim();
  if (!typed) return '';
  const withScheme = /^https?:\/\//i.test(typed) ? typed : `https://${typed}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname) return '';
    // A reverse proxy may put Sonorus under a path, so the path is kept - only
    // its trailing slashes go.
    return url.origin + url.pathname.replace(/\/+$/, '');
  } catch {
    return '';
  }
}

/** Whether [url] belongs to the configured [server]. */
export function belongsTo(url, server) {
  try {
    return new URL(url).origin === new URL(server).origin;
  } catch {
    return false;
  }
}

/**
 * Whether anything answers there.
 *
 * **Any** HTTP answer counts, including the redirect to the login form and even
 * a 404. The question this asks is whether the address reaches a server at all,
 * not whether the user is logged in or whether that server is Sonorus - the
 * page itself says both, and far better than a probe could.
 */
export function reachable(url, timeoutMs = 10_000) {
  return new Promise((resolve) => {
    const request = net.request({ method: 'GET', url });
    const timer = setTimeout(() => {
      request.abort();
      resolve({ ok: false, error: 'Zeitüberschreitung' });
    }, timeoutMs);
    request.on('response', (response) => {
      clearTimeout(timer);
      // Nothing is read out of it; that it answered is the whole point.
      response.resume();
      resolve({ ok: true, status: response.statusCode });
    });
    request.on('error', (error) => {
      clearTimeout(timer);
      resolve({ ok: false, error: error.message });
    });
    request.end();
  });
}
