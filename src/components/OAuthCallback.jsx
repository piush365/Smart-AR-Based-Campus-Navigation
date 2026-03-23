/**
 * src/components/OAuthCallback.jsx
 *
 * Landing page for the Google OAuth redirect.
 * The backend redirects to /auth/callback#access=...&refresh=...
 * This page reads the tokens from the hash, stores them, and redirects to home.
 *
 * Add this route in App.jsx:
 *   <Route path="/auth/callback" element={<OAuthCallback />} />
 * (must be a public route — user is not authenticated yet when they land here)
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallback() {
  const { handleOAuthCallback } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  useEffect(() => {
    const hash = window.location.hash.slice(1); // strip leading #
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access');
    const refreshToken = params.get('refresh');

    // Clean the hash immediately so tokens don't linger in browser history
    window.history.replaceState(null, '', window.location.pathname);

    if (!accessToken || !refreshToken) {
      setError('Missing tokens. Please try signing in again.');
      return;
    }

    handleOAuthCallback(accessToken, refreshToken)
      .then(() => navigate('/', { replace: true }))
      .catch((err) => {
        console.error('OAuth callback failed:', err);
        setError('Sign-in failed. Please try again.');
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        gap: '16px',
      }}>
        <p style={{ color: '#e53935', textAlign: 'center' }}>{error}</p>
        <button
          onClick={() => navigate('/login', { replace: true })}
          style={{
            padding: '10px 24px',
            borderRadius: '8px',
            background: '#1a73e8',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Back to login
        </button>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '16px',
    }}>
      <div style={{
        width: '32px',
        height: '32px',
        border: '3px solid #e0e0e0',
        borderTop: '3px solid #1a73e8',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <p style={{ color: '#666', fontSize: '14px' }}>Signing you in…</p>
    </div>
  );
}
