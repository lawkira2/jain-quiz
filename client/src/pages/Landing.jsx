import { useNavigate } from 'react-router-dom';
import WheelMark from '../components/WheelMark.jsx';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <div className="card">
        <WheelMark size={56} />
        <h1 className="brand-title">Jain Gyan Quiz</h1>
        <p className="brand-subtitle">A live quiz on Jainism — join as a Chhatra or run the show as the Guru.</p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => navigate('/host')}>
            I'm the Guru
          </button>
          <button className="btn btn-chhatra" onClick={() => navigate('/join')}>
            Join as Chhatra
          </button>
        </div>
      </div>
    </div>
  );
}
