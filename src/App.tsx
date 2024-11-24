import {
  BrowserRouter as Router,
  Routes,
  Route,
  Link,
  Navigate,
} from 'react-router-dom'
import { AuthProvider } from './providers/AuthProvider'
import { useAuth } from './hooks/useAuth'
import {
  hasTemplateAccess,
  hasPromptAccess,
  hasModelsAccess,
  hasGenerationAccess,
} from './utils/permissions'
import settings from './config/settings'

import MCBench from './components/MCBench'
import Leaderboard from './components/Leaderboard'
import About from './components/About'
import { Login } from './components/Login'
import './App.css'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import { AdminHome } from './components/AdminHome.tsx'
import CreateUser from './components/CreateUser.tsx'
import HeaderAuth from './components/HeaderAuth.tsx'
import TemplateList from './components/templates/TemplateList'
import CreateTemplate from './components/templates/CreateTemplate.tsx'
import ViewTemplate from './components/templates/ViewTemplate.tsx'
import EditTemplate from './components/templates/EditTemplate.tsx'

import PromptList from './components/prompts/PromptList.tsx'

import CreatePrompt from './components/prompts/CreatePrompt.tsx'
import ViewPrompt from './components/prompts/ViewPrompt.tsx'

import CreateModel from './components/models/CreateModel.tsx'
import ModelList from './components/models/ModelList.tsx'
import ViewModel from './components/models/ViewModel.tsx'
import EditModel from './components/models/EditModal.tsx'

import CreateGeneration from './components/generations/CreateGeneration.tsx'
import ViewGeneration from './components/generations/ViewGeneration.tsx'
import ListGenerations from './components/generations/ListGenerations.tsx'

import { useState } from 'react'
import { X, Menu } from 'lucide-react'

function Navigation() {
  const { user, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center">
            <Link to="/" className="text-gray-700 hover:text-gray-900">
              MC-Bench
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex md:space-x-4 md:ml-4">
              {!settings.isProd && (
                <Link to="/leaderboard" className="text-gray-700 hover:text-gray-900">
                  Leaderboard
                </Link>
              )}
              <Link to="/about" className="text-gray-700 hover:text-gray-900">
                About
              </Link>
              {isAuthenticated && user && hasTemplateAccess(user.scopes) && (
                <Link to="/templates" className="text-gray-700 hover:text-gray-900">
                  Templates
                </Link>
              )}
              {isAuthenticated && user && hasPromptAccess(user.scopes) && (
                <Link to="/prompts" className="text-gray-700 hover:text-gray-900">
                  Prompts
                </Link>
              )}
              {isAuthenticated && user && hasModelsAccess(user.scopes) && (
                <Link to="/models" className="text-gray-700 hover:text-gray-900">
                  Models
                </Link>
              )}
              {isAuthenticated && user && hasGenerationAccess(user.scopes) && (
                <Link to="/generations" className="text-gray-700 hover:text-gray-900">
                  Generations
                </Link>
              )}
            </div>
          </div>

          {/* Right side content */}
          <div className="flex items-center">
            {/* Desktop Auth Header */}
            <div className="hidden md:block">
              {!settings.isProd && <HeaderAuth />}
            </div>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-700 hover:text-gray-900"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div className={`${isOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="flex flex-col space-y-2 pt-4 pb-3 border-t border-gray-200">
            {!settings.isProd && (
              <Link to="/leaderboard" className="text-gray-700 hover:text-gray-900 px-2 py-1">
                Leaderboard
              </Link>
            )}
            <Link to="/about" className="text-gray-700 hover:text-gray-900 px-2 py-1">
              About
            </Link>
            {isAuthenticated && user && hasTemplateAccess(user.scopes) && (
              <Link to="/templates" className="text-gray-700 hover:text-gray-900 px-2 py-1">
                Templates
              </Link>
            )}
            {isAuthenticated && user && hasPromptAccess(user.scopes) && (
              <Link to="/prompts" className="text-gray-700 hover:text-gray-900 px-2 py-1">
                Prompts
              </Link>
            )}
            {isAuthenticated && user && hasModelsAccess(user.scopes) && (
              <Link to="/models" className="text-gray-700 hover:text-gray-900 px-2 py-1">
                Models
              </Link>
            )}
            {isAuthenticated && user && hasGenerationAccess(user.scopes) && (
              <Link to="/generations" className="text-gray-700 hover:text-gray-900 px-2 py-1">
                Generations
              </Link>
            )}

            {/* Mobile Auth Header */}
            <div className="pt-4 border-t border-gray-200">
              {!settings.isProd && <HeaderAuth />}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
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
              <Route
                path="/"
                element={
                  settings.isProd ? (
                    <Navigate to="/about" replace />
                  ) : (
                    <MCBench />
                  )
                }
              />
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
                    }
                  />
                  <Route
                    path="/createUser"
                    element={
                      <ProtectedRoute>
                        <CreateUser />
                      </ProtectedRoute>
                    }
                  />
                  {/* Add the new templates route */}
                  <Route
                    path="/templates"
                    element={
                      <ProtectedRoute>
                        <TemplateList />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/templates/new"
                    element={
                      <ProtectedRoute>
                        <CreateTemplate />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/templates/:id"
                    element={
                      <ProtectedRoute>
                        <ViewTemplate />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/templates/:id/edit"
                    element={
                      <ProtectedRoute>
                        <EditTemplate />
                      </ProtectedRoute>
                    }
                  />

                  {/* Start pf prompt routes*/}
                  <Route
                    path="/prompts"
                    element={
                      <ProtectedRoute>
                        <PromptList />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/prompts/new"
                    element={
                      <ProtectedRoute>
                        <CreatePrompt />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/prompts/:id"
                    element={
                      <ProtectedRoute>
                        <ViewPrompt />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/models"
                    element={
                      <ProtectedRoute>
                        <ModelList />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/models/new"
                    element={
                      <ProtectedRoute>
                        <CreateModel />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/models/:id"
                    element={
                      <ProtectedRoute>
                        <ViewModel />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/models/:id/edit"
                    element={
                      <ProtectedRoute>
                        <EditModel />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/generations/new"
                    element={
                      <ProtectedRoute>
                        <CreateGeneration />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/generations"
                    element={
                      <ProtectedRoute>
                        <ListGenerations />
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/generations/:id"
                    element={
                      <ProtectedRoute>
                        <ViewGeneration />
                      </ProtectedRoute>
                    }
                  />
                </>
              )}
            </Routes>
          </div>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
