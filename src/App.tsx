import { useState } from 'react'
import {
  Link,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom'

import { Menu, X, Moon, Sun } from 'lucide-react'

import About from './components/About'
import CreateUser from './components/CreateUser.tsx'
import HeaderAuth from './components/HeaderAuth.tsx'
import Leaderboard from './components/Leaderboard'
import { Login } from './components/Login'
import MCBench from './components/MCBench'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import CreateGeneration from './components/generations/CreateGeneration.tsx'
import ListGenerations from './components/generations/ListGenerations.tsx'
import ViewGeneration from './components/generations/ViewGeneration.tsx'
import CreateModel from './components/models/CreateModel.tsx'
import EditModel from './components/models/EditModal.tsx'
import ModelList from './components/models/ModelList.tsx'
import ViewModel from './components/models/ViewModel.tsx'
import CreatePrompt from './components/prompts/CreatePrompt.tsx'
import PromptList from './components/prompts/PromptList.tsx'
import ViewPrompt from './components/prompts/ViewPrompt.tsx'
import RunList from './components/runs/RunList.tsx'
import ViewRun from './components/runs/ViewRun.tsx'
import ListSamples from './components/samples/ListSamples'
import ViewSample from './components/samples/ViewSample'
import CreateTemplate from './components/templates/CreateTemplate.tsx'
import EditTemplate from './components/templates/EditTemplate.tsx'
import TemplateList from './components/templates/TemplateList'
import ViewTemplate from './components/templates/ViewTemplate.tsx'
import settings from './config/settings'
import { useAuth } from './hooks/useAuth'
import { AuthProvider } from './providers/AuthProvider'
import './styles/tooltips.css'
import {
  hasGenerationAccess,
  hasModelsAccess,
  hasPromptAccess,
  hasRunAccess,
  hasSampleAccess,
  hasTemplateAccess,
} from './utils/permissions'
import { useTheme, ThemeProvider } from './hooks/useTheme'

function Navigation() {
  const { user, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center">
            <Link to="/" className="text-gray-700 hover:text-gray-900">
              Voting
            </Link>

            {/* Desktop Navigation Links - Fixed breakpoints */}
            <div
              className={`hidden ${isAuthenticated ? 'md:flex' : 'sm:flex'} items-center space-x-4 ml-4`}
            >
              {!settings.isProd && (
                <Link
                  to="/leaderboard"
                  className="text-gray-700 hover:text-gray-900"
                >
                  Leaderboard
                </Link>
              )}
              <Link to="/about" className="text-gray-700 hover:text-gray-900">
                About
              </Link>

              {/* Add separator and admin items */}
              {isAuthenticated &&
                user &&
                (hasTemplateAccess(user.scopes) ||
                  hasPromptAccess(user.scopes) ||
                  hasModelsAccess(user.scopes) ||
                  hasGenerationAccess(user.scopes) ||
                  hasSampleAccess(user.scopes)) && (
                  <>
                    <div className="h-6 w-px bg-gray-300 mx-2"></div>
                    {hasTemplateAccess(user.scopes) && (
                      <Link
                        to="/templates"
                        className="text-gray-700 hover:text-gray-900"
                      >
                        Templates
                      </Link>
                    )}
                    {hasPromptAccess(user.scopes) && (
                      <Link
                        to="/prompts"
                        className="text-gray-700 hover:text-gray-900"
                      >
                        Prompts
                      </Link>
                    )}
                    {hasModelsAccess(user.scopes) && (
                      <Link
                        to="/models"
                        className="text-gray-700 hover:text-gray-900"
                      >
                        Models
                      </Link>
                    )}
                    {hasSampleAccess(user.scopes) && (
                      <Link
                        to="/samples"
                        className="text-gray-700 hover:text-gray-900"
                      >
                        Samples
                      </Link>
                    )}
                    {hasGenerationAccess(user.scopes) && (
                      <Link
                        to="/generations"
                        className="text-gray-700 hover:text-gray-900"
                      >
                        Generations
                      </Link>
                    )}
                    {hasRunAccess(user.scopes) && (
                      <Link
                        to="/runs"
                        className="text-gray-700 hover:text-gray-900"
                      >
                        Runs
                      </Link>
                    )}
                  </>
                )}
            </div>
          </div>

          {/* Right side content - Fixed breakpoints */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 hover:text-gray-900 rounded-md hover:bg-gray-100"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* Desktop Auth Header */}
            <div
              className={`hidden ${isAuthenticated ? 'md:block' : 'sm:block'} ml-4`}
            >
              <HeaderAuth />
            </div>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`${isAuthenticated ? 'md:hidden' : 'sm:hidden'} p-2 text-gray-700`}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={`${isOpen ? 'block' : 'hidden'} ${isAuthenticated ? 'md:hidden' : 'sm:hidden'}`}
        >
          <div className="flex flex-col space-y-2 pt-4 pb-3 border-t border-gray-200 text-left">
            {!settings.isProd && (
              <Link
                to="/leaderboard"
                className="text-gray-700 px-2 py-1"
              >
                Leaderboard
              </Link>
            )}
            <Link
              to="/about"
              className="text-gray-700 px-2 py-1"
            >
              About
            </Link>

            {/* Add separator and admin items */}
            {isAuthenticated &&
              user &&
              (hasTemplateAccess(user.scopes) ||
                hasPromptAccess(user.scopes) ||
                hasModelsAccess(user.scopes) ||
                hasGenerationAccess(user.scopes) ||
                hasSampleAccess(user.scopes)) && (
                <>
                  <div className="h-px w-full bg-gray-300 my-2"></div>
                  {hasTemplateAccess(user.scopes) && (
                    <Link
                      to="/templates"
                      className="text-gray-700 px-2 py-1"
                    >
                      Templates
                    </Link>
                  )}
                  {hasPromptAccess(user.scopes) && (
                    <Link
                      to="/prompts"
                      className="text-gray-700 px-2 py-1"
                    >
                      Prompts
                    </Link>
                  )}
                  {hasModelsAccess(user.scopes) && (
                    <Link
                      to="/models"
                      className="text-gray-700 px-2 py-1"
                    >
                      Models
                    </Link>
                  )}
                  {hasSampleAccess(user.scopes) && (
                    <Link
                      to="/samples"
                      className="text-gray-700 px-2 py-1"
                    >
                      Samples
                    </Link>
                  )}
                  {hasGenerationAccess(user.scopes) && (
                    <Link
                      to="/generations"
                      className="text-gray-700 px-2 py-1"
                    >
                      Generations
                    </Link>
                  )}
                  {hasRunAccess(user.scopes) && (
                    <Link
                      to="/runs"
                      className="text-gray-700 px-2 py-1"
                    >
                      Runs
                    </Link>
                  )}
                </>
              )}

            {/* Add Theme Toggle to mobile menu */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 px-2 py-1 text-gray-700"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-5 w-5" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun className="h-5 w-5" />
                  <span>Light Mode</span>
                </>
              )}
            </button>

            <div className="pt-4 border-t border-gray-200">
              <HeaderAuth />
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <Navigation />
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
              <Route path="/login" element={<Login />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
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

              <Route
                path="/generations/:id"
                element={
                  <ProtectedRoute>
                    <ViewGeneration />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/runs/:id"
                element={
                  <ProtectedRoute>
                    <ViewRun />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/runs"
                element={
                  <ProtectedRoute>
                    <RunList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/samples"
                element={
                  <ProtectedRoute>
                    <ListSamples />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/samples/:id"
                element={
                  <ProtectedRoute>
                    <ViewSample />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
