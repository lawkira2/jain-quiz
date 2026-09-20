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
    if (cleanPin.length < 4) return setError('अपने गुरु द्वारा दिखाया गया रूम पिन दर्ज करें।');
    if (!cleanName) return setError('अपना नाम दर्ज करें।');
    setError('');
    navigate(`/play/${cleanPin}`, { state: { name: cleanName } });
  }

  return (
    <div className="screen">
      <div className="card">
        <h1 className="brand-title">क्विज़ में शामिल हों</h1>
        <p className="brand-subtitle">अपने गुरु द्वारा साझा किया गया पिन और अपना नाम दर्ज करें।</p>
        <form onSubmit={handleSubmit} style={{ width: '100%' }}>
          <div className="field">
            <label htmlFor="pin">रूम पिन</label>
            <input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="उदाहरण: K3F7ZQ"
              autoComplete="off"
              autoCapitalize="characters"
              maxLength={8}
            />
          </div>
          <div className="field">
            <label htmlFor="name">आपका नाम</label>
            <input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="उदाहरण: प्रिया"
              autoComplete="off"
              maxLength={24}
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="btn btn-primary">
            रूम में प्रवेश करें
          </button>
        </form>
      </div>
    </div>
  );
}
