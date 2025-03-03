import { useState } from 'react'
import {
  Link,
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from 'react-router-dom'

import { Menu, Moon, Sun, X } from 'lucide-react'

import About from './components/About'
import CreateUser from './components/CreateUser.tsx'
import HeaderAuth from './components/HeaderAuth.tsx'
import Infra from './components/Infra'
import Leaderboard from './components/Leaderboard'
import { Login } from './components/Login'
import MCBench from './components/MCBench'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import SearchUsers from './components/SearchUsers.tsx'
import UserAdmin from './components/UserAdmin.tsx'
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
import { THEME_MODES, ThemeProvider, useTheme } from './hooks/useTheme'
import { AuthProvider } from './providers/AuthProvider'
import './styles/tooltips.css'
import {
  hasGenerationAccess,
  hasInfraAccess,
  hasModelsAccess,
  hasPromptAccess,
  hasRunAccess,
  hasSampleAccess,
  hasTemplateAccess,
  hasUserAdminAccess,
} from './utils/permissions'

function Navigation() {
  const { user, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700 relative z-20">
      <div className="max-w-6xl mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          {/* Logo and Desktop Navigation */}
          <div className="flex items-center">
            <Link
              to="/"
              className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
            >
              Voting
            </Link>

            {/* Always visible navigation links */}
            <div className="flex items-center space-x-4 ml-4">
              {!settings.isProd && (
                <Link
                  to="/leaderboard"
                  className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                >
                  Leaderboard
                </Link>
              )}
              <Link
                to="/about"
                className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                About
              </Link>

              {/* Admin items - Only visible on larger screens */}
              <div
                className={`hidden ${isAuthenticated ? 'lg:flex' : 'sm:flex'} items-center space-x-4`}
              >
                {isAuthenticated && user && (
                  <>
                    {hasTemplateAccess(user.scopes) && (
                      <Link
                        to="/templates"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Templates
                      </Link>
                    )}
                    {hasPromptAccess(user.scopes) && (
                      <Link
                        to="/prompts"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Prompts
                      </Link>
                    )}
                    {hasModelsAccess(user.scopes) && (
                      <Link
                        to="/models"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Models
                      </Link>
                    )}
                    {hasSampleAccess(user.scopes) && (
                      <Link
                        to="/samples"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Samples
                      </Link>
                    )}
                    {hasGenerationAccess(user.scopes) && (
                      <Link
                        to="/generations"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Generations
                      </Link>
                    )}
                    {hasRunAccess(user.scopes) && (
                      <Link
                        to="/runs"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Runs
                      </Link>
                    )}
                    {hasUserAdminAccess(user.scopes) && (
                      <Link
                        to="/admin/users"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Users
                      </Link>
                    )}
                    {hasInfraAccess(user.scopes) && (
                      <Link
                        to="/admin/infra"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Infra
                      </Link>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right side content - Fixed breakpoints */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Toggle theme"
            >
              {theme === THEME_MODES.LIGHT ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </button>

            {/* Desktop Auth Header */}
            <div
              className={`hidden ${isAuthenticated ? 'lg:block' : 'sm:block'} ml-4`}
            >
              <HeaderAuth />
            </div>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className={`${isAuthenticated ? 'lg:hidden' : 'sm:hidden'} p-2 text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white`}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu - Only for admin items */}
        <div
          className={`${isOpen ? 'block' : 'hidden'} ${isAuthenticated ? 'lg:hidden' : 'sm:hidden'}`}
        >
          <div className="flex flex-col space-y-2 pt-4 pb-3 border-t border-gray-200 dark:border-gray-700 text-left">
            {isAuthenticated && user && (
              <>
                {hasTemplateAccess(user.scopes) && (
                  <Link
                    to="/templates"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                  >
                    Templates
                  </Link>
                )}
                {hasPromptAccess(user.scopes) && (
                  <Link
                    to="/prompts"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                  >
                    Prompts
                  </Link>
                )}
                {hasModelsAccess(user.scopes) && (
                  <Link
                    to="/models"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                  >
                    Models
                  </Link>
                )}
                {hasSampleAccess(user.scopes) && (
                  <Link
                    to="/samples"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                  >
                    Samples
                  </Link>
                )}
                {hasGenerationAccess(user.scopes) && (
                  <Link
                    to="/generations"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                  >
                    Generations
                  </Link>
                )}
                {hasRunAccess(user.scopes) && (
                  <Link
                    to="/runs"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                  >
                    Runs
                  </Link>
                )}
                {hasUserAdminAccess(user.scopes) && (
                  <Link
                    to="/admin/users"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                  >
                    User Admin
                  </Link>
                )}
                {hasInfraAccess(user.scopes) && (
                  <Link
                    to="/admin/infra"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                  >
                    Infra
                  </Link>
                )}
              </>
            )}

            <div className="pt-2">
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
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute>
                    <SearchUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/:id"
                element={
                  <ProtectedRoute>
                    <UserAdmin />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/infra"
                element={
                  <ProtectedRoute>
                    <Infra />
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
