import React, { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import api from '../api';
import 'chart.js/auto';

export default function Dashboard({ socket, token, onLogout }) {
  const [dataPoints, setDataPoints] = useState([]); // array of {topic, temp, hum, ts}
  useEffect(() => {
    if (!socket) return;
    const handler = ({ topic, message }) => {
      try {
        const payload = JSON.parse(message);
        setDataPoints(prev => [...prev.slice(-199), { topic, ...payload, ts: payload.ts || Date.now() }]);
      } catch (e) {
        // ignore non json
      }
    };
    socket.on('mqtt', handler);
    return () => socket.off('mqtt', handler);
  }, [socket]);

  const temps = dataPoints.filter(d => d.temp).slice(-50);
  const chartData = {
    labels: temps.map(d => new Date(d.ts).toLocaleTimeString()),
    datasets: [{ label: 'Temperature', data: temps.map(d => d.temp), tension: 0.2 }]
  };

  const sendControl = async (topic, message) => {
    try {
      await api.publish(topic, message, token);
    } catch (e) {
      console.error(e);
      alert('Control failed');
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display:'flex', justifyContent:'space-between' }}>
        <h2>Smart Home Dashboard</h2>
        <div>
          <button onClick={() => sendControl('home/room1/device/relay/set', 'ON')}>Relay ON</button>
          <button onClick={() => sendControl('home/room1/device/relay/set', 'OFF')}>Relay OFF</button>
          <button onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div style={{ maxWidth: 800 }}>
        <Line data={chartData} />
      </div>

      <h3>Recent readings</h3>
      <table>
        <thead><tr><th>Time</th><th>Topic</th><th>Temp</th><th>Hum</th></tr></thead>
        <tbody>
          {dataPoints.slice().reverse().slice(0,50).map((d,i)=>(
            <tr key={i}>
              <td>{new Date(d.ts).toLocaleTimeString()}</td>
              <td>{d.topic}</td>
              <td>{d.temp ?? '-'}</td>
              <td>{d.hum ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
