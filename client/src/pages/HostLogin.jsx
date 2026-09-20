import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, setHostPasscode, getHostPasscode } from '../lib/api.js';

export default function HostLogin() {
  const navigate = useNavigate();
  const [passcode, setPasscode] = useState(getHostPasscode());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.hostLogin(passcode.trim());
      setHostPasscode(passcode.trim());
      navigate('/host/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="screen">
      <div className="card">
        <h1 className="brand-title">गुरु लॉगिन</h1>
        <p className="brand-subtitle">क्विज़ प्रबंधित करने और सत्र चलाने के लिए होस्ट पासकोड दर्ज करें।</p>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="field">
            <label htmlFor="passcode">होस्ट पासकोड</label>
            <input
              id="passcode"
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              autoComplete="off"
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'जाँच हो रही है…' : 'आगे बढ़ें'}
          </button>
        </form>
      </div>
    </div>
  );
}
