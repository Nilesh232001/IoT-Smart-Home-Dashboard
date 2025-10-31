import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('jwt') || null);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (token) {
      const s = io(API_BASE, { auth: { token } });
      setSocket(s);
      return () => s.disconnect();
    } else {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
    }
    // eslint-disable-next-line
  }, [token]);

  if (!token) return <Login onLogin={(t)=> { localStorage.setItem('jwt', t); setToken(t); }} />;

  return <Dashboard token={token} socket={socket} onLogout={() => { localStorage.removeItem('jwt'); setToken(null); }} />;
}
