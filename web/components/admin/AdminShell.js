'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TOKEN_KEY = 'hitkram-admin-token';
const AdminContext = createContext(null);

export const useAdmin = () => useContext(AdminContext);

function Login({ onLogin }) {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: f.email, password: f.password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(res.status === 429 ? 'Too many attempts. Wait 15 minutes.' : data.error || 'Login failed');
      onLogin(data.token, data.email);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 64 }}>
      <form className="panel form-grid" onSubmit={submit}>
        <h1 style={{ fontSize: '1.4rem', margin: 0 }}>Hitkram admin</h1>
        <div className="field">
          <label htmlFor="ad-email">Email</label>
          <input id="ad-email" name="email" type="email" autoComplete="username" required />
        </div>
        <div className="field">
          <label htmlFor="ad-pass">Password</label>
          <input id="ad-pass" name="password" type="password" autoComplete="current-password" required />
        </div>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </div>
  );
}

const NAV = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/reviews', label: 'Reviews' },
  { href: '/admin/content', label: 'Pages & Blog' },
];

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const [token, setToken] = useState(null);
  const [email, setEmail] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(TOKEN_KEY) || 'null');
      if (saved?.token) {
        setToken(saved.token);
        setEmail(saved.email);
      }
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  /** fetch() against the admin API with the login token; logs out on 401. */
  const api = useCallback(
    async (path, { method = 'GET', body, raw } = {}) => {
      const res = await fetch(`/api/admin${path}`, {
        method,
        headers: { Authorization: `Bearer ${token}`, ...(body && !raw ? { 'Content-Type': 'application/json' } : {}) },
        body: raw ? body : body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401) {
        logout();
        throw new Error('Session expired. Please log in again.');
      }
      if (res.status === 204) return null;
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const fieldMsg = data.fields ? Object.entries(data.fields).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
        throw new Error([data.error, fieldMsg].filter(Boolean).join(' ') || `Request failed (${res.status})`);
      }
      return data;
    },
    [token, logout],
  );

  if (!ready) return null;
  if (!token) {
    return (
      <div className="admin-shell">
        <Login
          onLogin={(t, e) => {
            localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: t, email: e }));
            setToken(t);
            setEmail(e);
          }}
        />
      </div>
    );
  }

  return (
    <AdminContext.Provider value={{ api, email, logout }}>
      <div className="admin-shell">
        <header className="admin-top">
          <div className="container">
            <strong>Hitkram admin</strong>
            <nav style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} aria-current={(n.href === '/admin' ? pathname === n.href : pathname.startsWith(n.href)) ? 'page' : undefined}>
                  {n.label}
                </Link>
              ))}
            </nav>
            <span style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
              <Link href="/" target="_blank">View shop ↗</Link>
              <button type="button" onClick={logout}>Log out</button>
            </span>
          </div>
        </header>
        <main className="admin-main container">{children}</main>
      </div>
    </AdminContext.Provider>
  );
}

/** Small helper for loading data on admin pages. */
export function useAdminData(path) {
  const { api } = useAdmin();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let live = true;
    setError('');
    api(path)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [api, path, tick]);
  return { data, error, reload: () => setTick((t) => t + 1), setData };
}
