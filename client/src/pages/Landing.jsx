import { useNavigate } from 'react-router-dom';
import WheelMark from '../components/WheelMark.jsx';

export default function Landing() {
  const navigate = useNavigate();
  return (
    <div className="screen">
      <div className="card">
        <WheelMark size={56} />
        <h1 className="brand-title">जैन ज्ञान क्विज़</h1>
        <p className="brand-subtitle">जैन धर्म पर एक लाइव क्विज़ — छात्र के रूप में जुड़ें या गुरु के रूप में संचालन करें।</p>
        <div className="btn-row">
          <button className="btn btn-primary" onClick={() => navigate('/host')}>
            मैं गुरु हूँ
          </button>
          <button className="btn btn-chhatra" onClick={() => navigate('/join')}>
            छात्र के रूप में जुड़ें
          </button>
        </div>
      </div>
    </div>
  );
}
