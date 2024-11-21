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
import { useState } from 'react';
import { X, Menu } from 'lucide-react';


function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated } = useAuth();

  return (
    <nav className="relative flex justify-between items-center max-w-6xl mx-auto p-4">
      <h1 className="text-3xl font-bold">MC-Bench</h1>

      <button
        className="md:hidden p-2"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
      >
        {isMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      <div className="hidden md:flex gap-6 items-center">
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
        {!settings.isProd && <HeaderAuth />}
      </div>

      {isMenuOpen && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border py-2 md:hidden flex flex-col gap-2">
          {!settings.isProd && (
            <Link
              to="/leaderboard"
              className="text-gray-700 hover:text-gray-900 text-center px-4">
              Leaderboard
            </Link>
          )}
          <Link
            to="/about"
            className="text-gray-700 hover:text-gray-900 text-center px-4">
            About
          </Link>
          {!settings.isProd && isAuthenticated && user && hasTemplateAccess(user.scopes) && (
            <Link
              to="/templates"
              className="text-gray-700 hover:text-gray-900 text-center px-4">
              Templates
            </Link>
          )}
          <div className="flex justify-center">
            {!settings.isProd && <HeaderAuth />}
          </div>
        </div>
      )}
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