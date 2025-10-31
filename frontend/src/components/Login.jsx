import React, { useState } from 'react';
import api from '../api';

export default function Login({ onLogin }) {
  const [u, setU] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.login(u, p);
      onLogin(res.data.token);
    } catch (e) {
      setErr(e?.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <div><input value={u} onChange={e=>setU(e.target.value)} placeholder="username" /></div>
        <div><input value={p} onChange={e=>setP(e.target.value)} placeholder="password" type="password" /></div>
        <div><button type="submit">Login</button></div>
        {err && <div style={{color:'red'}}>{err}</div>}
      </form>
    </div>
  );
}
