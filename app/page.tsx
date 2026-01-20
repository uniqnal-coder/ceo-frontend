'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [status, setStatus] = useState('loading...');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/health`)
      .then(res => res.json())
      .then(data => setStatus(data.status))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <main style={{ padding: 40 }}>
      <h1>CEO School System</h1>
      <p>Backend status: {status}</p>
    </main>
  );
}
