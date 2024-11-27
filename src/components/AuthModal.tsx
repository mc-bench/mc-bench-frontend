import React from 'react'
import { Github, Loader2 } from 'lucide-react'
import Modal from './ui/Modal'
import settings from '../config/settings'

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  isLoading: boolean
}

const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  isLoading,
}) => {
  const handleGitHubLogin = () => {
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${settings.githubClientId}&scope=user:email,read:user`
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Login to MC-Bench"
      description="Join our community to start comparing and rating AI-generated Minecraft builds"
    >
      <div className="space-y-4 py-4">
        <button
          onClick={handleGitHubLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 bg-gray-900 text-white px-4 py-3 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Github className="w-5 h-5" />
          )}
          {isLoading ? 'Authenticating...' : 'Continue with GitHub'}
        </button>

        {/* Placeholder buttons for future auth providers */}
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 px-4 py-3 rounded-lg cursor-not-allowed"
        >
          Coming soon: Google
        </button>
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 px-4 py-3 rounded-lg cursor-not-allowed"
        >
          Coming soon: Meta
        </button>
        <button
          disabled
          className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-400 px-4 py-3 rounded-lg cursor-not-allowed"
        >
          Coming soon: X
        </button>
      </div>

      <p className="text-xs text-center text-gray-500 mt-4">
        By continuing, you agree to our Terms of Service and Privacy Policy
      </p>
    </Modal>
  )
}

export default AuthModal
