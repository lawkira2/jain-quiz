import { Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Join from './pages/Join.jsx';
import HostLogin from './pages/HostLogin.jsx';
import Dashboard from './pages/host/Dashboard.jsx';
import QuizEditor from './pages/host/QuizEditor.jsx';
import HostSession from './pages/host/HostSession.jsx';
import Play from './pages/participant/Play.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/join" element={<Join />} />
      <Route path="/play/:pin" element={<Play />} />
      <Route path="/host" element={<HostLogin />} />
      <Route path="/host/dashboard" element={<Dashboard />} />
      <Route path="/host/quiz/new" element={<QuizEditor />} />
      <Route path="/host/quiz/:id" element={<QuizEditor />} />
      <Route path="/host/session/:pin" element={<HostSession />} />
      <Route path="*" element={<Landing />} />
    </Routes>
  );
}
