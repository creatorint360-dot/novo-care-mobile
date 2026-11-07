// Talks to the Novo Care server. The app does not use cookies: the server hands out the
// same signed values in two headers (X-Pending-Token, X-Session-Token) when it sees
// "X-Client: novostaff-app". They are kept in the phone's secure storage
// (Android Keystore / iOS Keychain) and nowhere else.
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { API_BASE } from './config';

const SESSION = 'ns_session';
const PENDING = 'ns_pending';
const memory = {};

async function saveToken(name, value) {
  memory[name] = value || '';
  if (Platform.OS === 'web') return;
  try {
    if (value) await SecureStore.setItemAsync(name, value);
    else await SecureStore.deleteItemAsync(name);
  } catch (e) { /* the copy in memory still works for this run */ }
}

async function loadToken(name) {
  if (memory[name] !== undefined) return memory[name];
  if (Platform.OS === 'web') return '';
  try { memory[name] = (await SecureStore.getItemAsync(name)) || ''; } catch (e) { memory[name] = ''; }
  return memory[name];
}

export async function hasSavedSession() {
  return Boolean(await loadToken(SESSION));
}

// Forget everything on this phone (used when signing out or when the session ended).
export async function forgetTokens() {
  await saveToken(SESSION, '');
  await saveToken(PENDING, '');
}

let onSessionEnded = () => {};
export function setSessionEndedHandler(fn) { onSessionEnded = fn; }

const WAIT_MS = 90000;   // the free server can take about a minute to wake up

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

// Returns { ok, status, data }. It never throws.
export async function api(path, method = 'GET', body) {
  const headers = { 'X-Requested-With': 'novostaff', 'X-Client': 'novostaff-app' };
  const session = await loadToken(SESSION);
  const pending = await loadToken(PENDING);
  if (session) headers['X-Session-Token'] = session;
  if (pending) headers['X-Pending-Token'] = pending;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let res;
  try {
    res = await withTimeout(fetch(API_BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), WAIT_MS);
  } catch (e) {
    return { ok: false, status: 0, data: { error: 'Cannot reach the server. Check your internet and try again. (The free server can take up to a minute to wake up.)' } };
  }

  const s = res.headers.get('x-session-token');
  if (s !== null) await saveToken(SESSION, s);
  const p = res.headers.get('x-pending-token');
  if (p !== null) await saveToken(PENDING, p);

  let data = {};
  try { data = await res.json(); } catch (e) { /* not JSON */ }

  // The server says "please sign in" on a protected page: the session is over.
  if (res.status === 401 && data && data.error === 'Please sign in.') {
    await forgetTokens();
    onSessionEnded();
  }
  return { ok: res.ok, status: res.status, data };
}
