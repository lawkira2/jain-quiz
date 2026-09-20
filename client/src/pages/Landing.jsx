import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <div className="card">
        <h1 className="brand-title">Jain Gyan Quiz</h1>
        <p className="brand-subtitle">A live quiz on Jainism — join as a Chhatra or run the show as the Guru.</p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => navigate('/join')}>
            Join as Chhatra
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/host')}>
            I'm the Guru
          </button>
        </div>
      </div>
    </div>
  );
}
