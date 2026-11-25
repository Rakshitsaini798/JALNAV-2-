import React, { useEffect, useState } from 'react';
import api from '../services/api';

const boxStyle = { padding: '12px 20px', borderTop: '1px solid #1e293b', fontSize: '0.8rem', color: '#cbd5e1' };
const inputStyle = { width: '100%', marginBottom: '6px', padding: '6px 8px', borderRadius: '6px', border: '1px solid #334155', background: '#0f172a', color: '#e2e8f0', boxSizing: 'border-box' };

export default function StaffLogin() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const stop = api.onUserChange(setUser);
    api.restoreSession();
    return stop;
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      await api.login(email, password);
      setPassword('');
    } catch (err) {
      setError(err.message);
    }
  }

  if (user) {
    return (
      <div style={boxStyle}>
        <div>Signed in as <strong>{user.email}</strong></div>
        <div style={{ margin: '4px 0 8px' }}>Role: {user.role}{user.village ? ` (${user.village})` : ''}</div>
        <button className="btn secondary" type="button" onClick={() => api.logout()}>Log out</button>
      </div>
    );
  }

  return (
    <form style={boxStyle} onSubmit={handleSubmit}>
      <div style={{ marginBottom: '6px', fontWeight: 600 }}>Staff login</div>
      <input style={inputStyle} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
      <input style={inputStyle} type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
      {error && <div style={{ color: '#f87171', marginBottom: '6px' }}>{error}</div>}
      <button className="btn primary" type="submit">Log in</button>
    </form>
  );
}
