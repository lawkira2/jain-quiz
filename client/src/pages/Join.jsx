import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Join() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const cleanPin = pin.trim().toUpperCase();
    const cleanName = name.trim();
    if (cleanPin.length < 4) return setError('Enter the room PIN shown by your Guru.');
    if (!cleanName) return setError('Enter your name.');
    setError('');
    navigate(`/play/${cleanPin}`, { state: { name: cleanName } });
  }

  return (
    <div className="screen">
      <div className="card">
        <h1 className="brand-title">Join Quiz</h1>
        <p className="brand-subtitle">Enter the PIN your Guru shared and your name.</p>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="field">
            <label htmlFor="pin">Room PIN</label>
            <input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="e.g. K3F7ZQ"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={8}
            />
          </div>
          <div className="field">
            <label htmlFor="name">Your Name</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Priya"
              autoComplete="off"
              maxLength={24}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary">
            Enter Room
          </button>
        </form>
      </div>
    </div>
  );
}
