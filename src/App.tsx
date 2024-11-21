import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { AuthProvider } from './providers/AuthProvider';
import { useAuth } from './hooks/useAuth'
import { hasTemplateAccess } from './utils/permissions';
import settings from './config/settings';


import MCBench from './components/MCBench';
import Leaderboard from './components/Leaderboard';
import About from './components/About';
import { Login } from './components/Login'
import './App.css';
import {
  ProtectedRoute
} from "./components/ProtectedRoute.tsx";
import {
  AdminHome
} from "./components/AdminHome.tsx";
import CreateUser
  from "./components/CreateUser.tsx";
import HeaderAuth
  from "./components/HeaderAuth.tsx";
import TemplateList from './components/templates/TemplateList';
import CreateTemplate
  from "./components/templates/CreateTemplate.tsx";
import ViewTemplate
  from "./components/templates/ViewTemplate.tsx";
import EditTemplate
  from "./components/templates/EditTemplate.tsx";


function Navigation() {
  const { user, isAuthenticated } = useAuth();

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <Link
              to="/"
              className="text-gray-700 hover:text-gray-900">
              MC-Bench
            </Link>
            {!settings.isProd && (
              <Link
                to="/leaderboard"
                className="text-gray-700 hover:text-gray-900">
                Leaderboard
              </Link>
            )}
            <Link
              to="/about"
              className="text-gray-700 hover:text-gray-900">
              About
            </Link>
            {!settings.isProd && isAuthenticated && user && hasTemplateAccess(user.scopes) && (
              <Link
                to="/templates"
                className="text-gray-700 hover:text-gray-900">
                Templates
              </Link>
            )}
          </div>
          {!settings.isProd && <HeaderAuth />}
        </div>
      </div>
    </nav>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Navigation />

          <div className="container mx-auto">
            <Routes>
              <Route path="/about" element={<About />} />
              <Route path="/" element={
                settings.isProd ?
                  <Navigate to="/about" replace /> :
                  <MCBench />
              } />
              {!settings.isProd && (
                <>
                  <Route path="/login" element={<Login />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route
                    path="/admin"
                    element={
                      <ProtectedRoute>
                        <AdminHome />
                      </ProtectedRoute>
                    } />
                  <Route
                    path="/createUser"
                    element={
                      <ProtectedRoute>
                        <CreateUser />
                      </ProtectedRoute>
                    } />
                  <Route
                    path="/templates"
                    element={
                      <ProtectedRoute>
                        <TemplateList />
                      </ProtectedRoute>
                    } />
                  <Route path="/templates/new" element={
                    <ProtectedRoute>
                      <CreateTemplate />
                    </ProtectedRoute>
                  } />
                  <Route path="/templates/:id" element={
                    <ProtectedRoute>
                      <ViewTemplate />
                    </ProtectedRoute>
                  } />
                  <Route path="/templates/:id/edit" element={
                    <ProtectedRoute>
                      <EditTemplate />
                    </ProtectedRoute>
                  } />
                </>
              )}
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;