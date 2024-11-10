import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import MCBench from './components/MCBench';
import Leaderboard from './components/Leaderboard';
import './App.css';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white shadow-sm">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex space-x-4">
              <Link to="/" className="text-gray-700 hover:text-gray-900">
                MC-Bench
              </Link>
              <Link to="/leaderboard" className="text-gray-700 hover:text-gray-900">
                Leaderboard
              </Link>
            </div>
          </div>
        </nav>

        <div className="container mx-auto">
          <Routes>
            <Route path="/" element={<MCBench />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
