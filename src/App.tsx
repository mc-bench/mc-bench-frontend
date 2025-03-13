import React, { useRef, useState } from 'react'
import { Link, Route, BrowserRouter as Router, Routes } from 'react-router-dom'

import {
  ChevronDown,
  ChevronUp,
  Coffee,
  Menu,
  Moon,
  Sun,
  X,
} from 'lucide-react'

import About from './components/About'
import CreateUser from './components/CreateUser.tsx'
import HeaderAuth from './components/HeaderAuth.tsx'
import Leaderboard from './components/Leaderboard'
import { Login } from './components/Login'
import MCBench from './components/MCBench'
import { ProtectedRoute } from './components/ProtectedRoute.tsx'
import Scheduler from './components/Scheduler'
import SearchUsers from './components/SearchUsers.tsx'
import Tasks from './components/Tasks'
import UserAdmin from './components/UserAdmin.tsx'
import CreateGeneration from './components/generations/CreateGeneration.tsx'
import ListGenerations from './components/generations/ListGenerations.tsx'
import ViewGeneration from './components/generations/ViewGeneration.tsx'
import ModelDetail from './components/leaderboard/ModelDetail'
import ModelSamplesList from './components/leaderboard/ModelSamplesList'
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
import ShareSample from './components/samples/ShareSample'
import ViewSample from './components/samples/ViewSample'
import CreateTemplate from './components/templates/CreateTemplate.tsx'
import EditTemplate from './components/templates/EditTemplate.tsx'
import TemplateList from './components/templates/TemplateList'
import ViewTemplate from './components/templates/ViewTemplate.tsx'
import DonateModal from './components/ui/DonateModal'
import SessionMonitor from './components/ui/SessionMonitor'
import { useAuth } from './hooks/useAuth'
import { ThemeProvider, useTheme } from './hooks/useTheme'
import { AuthProvider } from './providers/AuthProvider'
import './styles/tooltips.css'
import { THEME_MODES } from './types/theme'
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

// NavDropdown component for desktop navigation
const NavDropdown = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Simple close handler that can be called from any menu item
  const closeDropdown = () => {
    setIsDropdownOpen(false)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        onBlur={(e) => {
          // Close only if focus moved outside the dropdown
          if (!dropdownRef.current?.contains(e.relatedTarget as Node)) {
            setIsDropdownOpen(false)
          }
        }}
      >
        {label}
        {isDropdownOpen ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        )}
      </button>
      {isDropdownOpen && (
        <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" onClick={closeDropdown}>
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

// MobileNavGroup component for mobile navigation
const MobileNavGroup = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => {
  const [isGroupOpen, setIsGroupOpen] = useState(false)

  // Simple close handler to close the group
  const closeGroup = () => {
    setIsGroupOpen(false)
  }

  return (
    <div className="space-y-1">
      <button
        className="w-full flex items-center justify-between text-left text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white px-2 py-1"
        onClick={() => setIsGroupOpen(!isGroupOpen)}
      >
        {label}
        {isGroupOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>
      {isGroupOpen && (
        <div
          className="pl-4 border-l border-gray-200 dark:border-gray-700 ml-2"
          onClick={closeGroup}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function Navigation() {
  const { user, isAuthenticated } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isDonateModalOpen, setIsDonateModalOpen] = useState(false)
  const { theme, toggleTheme } = useTheme()

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-sm dark:shadow-gray-700 z-20 fixed top-0 w-full" >
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
              <Link
                to="/leaderboard"
                className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                Leaderboard
              </Link>
              <Link
                to="/about"
                className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                About
              </Link>
              <button
                onClick={() => setIsDonateModalOpen(true)}
                className="flex items-center text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
              >
                <Coffee className="mr-1 h-4 w-4 text-yellow-500" />
                Donate
              </button>
              <DonateModal
                isOpen={isDonateModalOpen}
                onClose={() => setIsDonateModalOpen(false)}
              />

              {/* Divider Line - Only visible when there are admin items and on larger screens */}
              {isAuthenticated &&
                user &&
                (hasSampleAccess(user.scopes) ||
                  hasTemplateAccess(user.scopes) ||
                  hasPromptAccess(user.scopes) ||
                  hasModelsAccess(user.scopes) ||
                  hasGenerationAccess(user.scopes) ||
                  hasRunAccess(user.scopes) ||
                  hasUserAdminAccess(user.scopes) ||
                  hasInfraAccess(user.scopes)) && (
                  <div
                    className={`h-4 w-px mx-4 bg-gray-300 dark:bg-gray-600 ${isAuthenticated ? 'hidden lg:block' : 'hidden sm:block'}`}
                  ></div>
                )}

              {/* Admin items - Only visible on larger screens */}
              <div
                className={`hidden ${isAuthenticated ? 'lg:flex' : 'sm:flex'} items-center space-x-4`}
              >
                {isAuthenticated && user && (
                  <>
                    {/* Samples as top-level item */}
                    {hasSampleAccess(user.scopes) && (
                      <Link
                        to="/samples"
                        className="text-gray-700 dark:text-gray-200 hover:text-gray-900 dark:hover:text-white"
                      >
                        Samples
                      </Link>
                    )}

                    {/* Config Dropdown */}
                    {(hasTemplateAccess(user.scopes) ||
                      hasPromptAccess(user.scopes) ||
                      hasModelsAccess(user.scopes)) && (
                      <NavDropdown label="Config">
                        {hasTemplateAccess(user.scopes) && (
                          <>
                            <div className="flex justify-between items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                              <Link
                                to="/templates"
                                className="text-gray-700 dark:text-gray-200 flex-grow"
                              >
                                Templates
                              </Link>
                              <Link
                                to="/templates/new"
                                className="ml-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-gray-700 dark:text-gray-200"
                                title="Create new template"
                              >
                                +
                              </Link>
                            </div>
                          </>
                        )}
                        {hasPromptAccess(user.scopes) && (
                          <>
                            <div className="flex justify-between items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                              <Link
                                to="/prompts"
                                className="text-gray-700 dark:text-gray-200 flex-grow"
                              >
                                Prompts
                              </Link>
                              <Link
                                to="/prompts/new"
                                className="ml-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-gray-700 dark:text-gray-200"
                                title="Create new prompt"
                              >
                                +
                              </Link>
                            </div>
                          </>
                        )}
                        {hasModelsAccess(user.scopes) && (
                          <>
                            <div className="flex justify-between items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                              <Link
                                to="/models"
                                className="text-gray-700 dark:text-gray-200 flex-grow"
                              >
                                Models
                              </Link>
                              <Link
                                to="/models/new"
                                className="ml-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-gray-700 dark:text-gray-200"
                                title="Create new model"
                              >
                                +
                              </Link>
                            </div>
                          </>
                        )}
                      </NavDropdown>
                    )}

                    {/* Ops Dropdown */}
                    {(hasGenerationAccess(user.scopes) ||
                      hasRunAccess(user.scopes) ||
                      hasInfraAccess(user.scopes)) && (
                      <NavDropdown label="Ops">
                        {hasGenerationAccess(user.scopes) && (
                          <div className="flex justify-between items-center px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Link
                              to="/generations"
                              className="text-gray-700 dark:text-gray-200 flex-grow"
                            >
                              Generations
                            </Link>
                            <Link
                              to="/generations/new"
                              className="ml-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full w-5 h-5 flex items-center justify-center text-gray-700 dark:text-gray-200"
                              title="Create new generation"
                            >
                              +
                            </Link>
                          </div>
                        )}
                        {hasRunAccess(user.scopes) && (
                          <Link
                            to="/runs"
                            className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Runs
                          </Link>
                        )}
                        {hasInfraAccess(user.scopes) && (
                          <>
                            <Link
                              to="/admin/tasks"
                              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Tasks
                            </Link>
                            <Link
                              to="/admin/scheduler"
                              className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                              Scheduler
                            </Link>
                          </>
                        )}
                      </NavDropdown>
                    )}

                    {/* Admin Dropdown */}
                    {hasUserAdminAccess(user.scopes) && (
                      <NavDropdown label="Admin">
                        <Link
                          to="/admin/users"
                          className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Users
                        </Link>
                      </NavDropdown>
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
            {/* Public Links (for mobile) */}
            <div className="flex flex-col space-y-2 mb-2">
              <Link
                to="/"
                className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                Voting
              </Link>
              <Link
                to="/leaderboard"
                className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                Leaderboard
              </Link>
              <Link
                to="/about"
                className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setIsOpen(false)}
              >
                About
              </Link>
              <button
                onClick={() => {
                  setIsDonateModalOpen(true)
                  setIsOpen(false)
                }}
                className="flex items-center text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
              >
                <Coffee className="mr-1 h-4 w-4 text-yellow-500" />
                Donate
              </button>
            </div>

            {/* Divider Line - Only visible when there are admin items */}
            {isAuthenticated &&
              user &&
              (hasSampleAccess(user.scopes) ||
                hasTemplateAccess(user.scopes) ||
                hasPromptAccess(user.scopes) ||
                hasModelsAccess(user.scopes) ||
                hasGenerationAccess(user.scopes) ||
                hasRunAccess(user.scopes) ||
                hasUserAdminAccess(user.scopes) ||
                hasInfraAccess(user.scopes)) && (
                <div className="h-px w-full bg-gray-300 dark:bg-gray-600 my-2"></div>
              )}

            {isAuthenticated && user && (
              <>
                {/* Samples as top-level item */}
                {hasSampleAccess(user.scopes) && (
                  <Link
                    to="/samples"
                    className="text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    Samples
                  </Link>
                )}

                {/* Config Group */}
                {(hasTemplateAccess(user.scopes) ||
                  hasPromptAccess(user.scopes) ||
                  hasModelsAccess(user.scopes)) && (
                  <MobileNavGroup label="Config">
                    {hasTemplateAccess(user.scopes) && (
                      <div className="flex justify-between items-center">
                        <Link
                          to="/templates"
                          className="flex-grow text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                          onClick={() => setIsOpen(false)}
                        >
                          Templates
                        </Link>
                        <Link
                          to="/templates/new"
                          className="mr-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-gray-700 dark:text-gray-200"
                          onClick={() => setIsOpen(false)}
                          title="Create new template"
                        >
                          +
                        </Link>
                      </div>
                    )}
                    {hasPromptAccess(user.scopes) && (
                      <div className="flex justify-between items-center">
                        <Link
                          to="/prompts"
                          className="flex-grow text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                          onClick={() => setIsOpen(false)}
                        >
                          Prompts
                        </Link>
                        <Link
                          to="/prompts/new"
                          className="mr-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-gray-700 dark:text-gray-200"
                          onClick={() => setIsOpen(false)}
                          title="Create new prompt"
                        >
                          +
                        </Link>
                      </div>
                    )}
                    {hasModelsAccess(user.scopes) && (
                      <div className="flex justify-between items-center">
                        <Link
                          to="/models"
                          className="flex-grow text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                          onClick={() => setIsOpen(false)}
                        >
                          Models
                        </Link>
                        <Link
                          to="/models/new"
                          className="mr-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-gray-700 dark:text-gray-200"
                          onClick={() => setIsOpen(false)}
                          title="Create new model"
                        >
                          +
                        </Link>
                      </div>
                    )}
                  </MobileNavGroup>
                )}

                {/* Ops Group */}
                {(hasGenerationAccess(user.scopes) ||
                  hasRunAccess(user.scopes) ||
                  hasInfraAccess(user.scopes)) && (
                  <MobileNavGroup label="Ops">
                    {hasGenerationAccess(user.scopes) && (
                      <div className="flex justify-between items-center">
                        <Link
                          to="/generations"
                          className="flex-grow text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                          onClick={() => setIsOpen(false)}
                        >
                          Generations
                        </Link>
                        <Link
                          to="/generations/new"
                          className="mr-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-full w-6 h-6 flex items-center justify-center text-gray-700 dark:text-gray-200"
                          onClick={() => setIsOpen(false)}
                          title="Create new generation"
                        >
                          +
                        </Link>
                      </div>
                    )}
                    {hasRunAccess(user.scopes) && (
                      <Link
                        to="/runs"
                        className="block text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                        onClick={() => setIsOpen(false)}
                      >
                        Runs
                      </Link>
                    )}
                    {hasInfraAccess(user.scopes) && (
                      <>
                        <Link
                          to="/admin/tasks"
                          className="block text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                          onClick={() => setIsOpen(false)}
                        >
                          Tasks
                        </Link>
                        <Link
                          to="/admin/scheduler"
                          className="block text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                          onClick={() => setIsOpen(false)}
                        >
                          Scheduler
                        </Link>
                      </>
                    )}
                  </MobileNavGroup>
                )}

                {/* Admin Group */}
                {hasUserAdminAccess(user.scopes) && (
                  <MobileNavGroup label="Admin">
                    <Link
                      to="/admin/users"
                      className="block text-gray-700 dark:text-gray-200 px-2 py-1 hover:text-gray-900 dark:hover:text-white"
                      onClick={() => setIsOpen(false)}
                    >
                      Users
                    </Link>
                  </MobileNavGroup>
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
        <Navigation />

            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16 w-full">
            <SessionMonitor />
            <Routes>
              <Route path="/about" element={<About />} />
              <Route path="/" element={<MCBench />} />
              <Route path="/login" element={<Login />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route
                path="/leaderboard/model/:modelSlug"
                element={<ModelDetail />}
              />
              <Route
                path="/leaderboard/:metricName/:testSetName/:modelSlug/samples"
                element={<ModelSamplesList />}
              />
              {/* Public sample share route (no authentication required) */}
              <Route path="/share/samples/:id" element={<ShareSample />} />
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
                path="/admin/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/scheduler"
                element={
                  <ProtectedRoute>
                    <Scheduler />
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
