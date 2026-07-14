import { useState } from 'react';
import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const from = location.state?.from?.pathname || '/';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>🎓 CEO School System</h1>
          <p style={styles.subtitle}>Sign in to continue</p>

          <form onSubmit={handleSubmit}>
            <div style={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="you@school.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
            </div>

            <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Signing in…' : 'Login'}
            </button>

            {error && <p style={styles.error}>❌ {error}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundImage: 'linear-gradient(135deg, #188a54 0%, #0c2a48 100%)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
  },
  container: { width: '100%', maxWidth: '400px', padding: '20px' },
  card: { backgroundColor: 'white', borderRadius: '16px', padding: '40px', boxShadow: '0 20px 40px rgba(12,42,72,0.25)' },
  title: { fontSize: '26px', fontWeight: 800, margin: '0 0 10px', textAlign: 'center', color: '#0f172a' },
  subtitle: { fontSize: '14px', color: '#64748b', textAlign: 'center', marginBottom: '30px' },
  formGroup: { marginBottom: '20px' },
  input: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    boxSizing: 'border-box',
    marginTop: '8px',
  },
  button: {
    width: '100%',
    padding: '12px',
    fontSize: '16px',
    fontWeight: 'bold',
    color: 'white',
    backgroundColor: '#188a54',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  error: {
    color: '#dc2626',
    padding: '12px',
    backgroundColor: '#fee2e2',
    borderRadius: '4px',
    marginTop: '15px',
    fontSize: '14px',
  },
};
