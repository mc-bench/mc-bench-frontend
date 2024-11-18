import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';
import settings from '../config/settings';

interface GitHubOAuthResponse {
  access_token: string;
  token_type: string;
  username: string | null;
}

export const Login = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [processedCode, setProcessedCode] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubLogin = () => {
    setIsLoading(true);
    localStorage.removeItem('token');
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${settings.githubClientId}&scope=user:email,read:user`;
  };

  const memoizedLogin = useCallback(async (token: string) => {
    return new Promise<void>((resolve) => {
      login(token);
      // Give the token a moment to be set
      setTimeout(() => {
        resolve();
      }, 500);
    });
  }, [login]);

  useEffect(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const code = urlParams.get('code');

    if (code && code !== processedCode) {
      console.log('Processing OAuth code:', code);
      setIsLoading(true);
      setProcessedCode(code);

      fetch(`${settings.apiUrl}/api/auth/github?code=${code}`)
        .then(response => {
          if (!response.ok) {
            throw new Error('Authentication failed');
          }
          return response.json();
        })
        .then(async (data: GitHubOAuthResponse) => {
          console.log('Received token from OAuth');
          await memoizedLogin(data.access_token);

          // Verify token was set
          const storedToken = localStorage.getItem('token');
          console.log('Token in storage:', storedToken);

          if (!storedToken) {
            throw new Error('Token failed to persist');
          }

          if (data.username == null) {
            navigate('/createUser', { replace: true });
          } else {
            navigate('/', { replace: true });
          }
        })
        .catch((error: Error) => {
          console.error('Error during GitHub OAuth:', error);
          localStorage.removeItem('token');
          setIsLoading(false);
        });
    }
  }, [memoizedLogin, navigate, processedCode]);

  // Debug helper
  useEffect(() => {
    const checkToken = () => {
      const token = localStorage.getItem('token');
      console.log('Current token in storage:', token);
    };

    // Check token every second
    const interval = setInterval(checkToken, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <button
        onClick={handleGitHubLogin}
        disabled={isLoading}
        className="bg-gray-900 text-white px-6 py-3 rounded-lg flex items-center gap-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385c.6.105.825-.255.825-.57c0-.285-.015-1.23-.015-2.235c-3.015.555-3.795-.735-4.035-1.41c-.135-.345-.72-1.41-1.23-1.695c-.42-.225-1.02-.78-.015-.795c.945-.015 1.62.87 1.845 1.23c1.08 1.815 2.805 1.305 3.495.99c.105-.78.42-1.305.765-1.605c-2.67-.3-5.46-1.335-5.46-5.925c0-1.305.465-2.385 1.23-3.225c-.12-.3-.54-1.53.12-3.18c0 0 1.005-.315 3.3 1.23c.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23c.66 1.65.24 2.88.12 3.18c.765.84 1.23 1.905 1.23 3.225c0 4.605-2.805 5.625-5.475 5.925c.435.375.81 1.095.81 2.22c0 1.605-.015 2.895-.015 3.3c0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
        )}
        {isLoading ? 'Authenticating...' : 'Login with GitHub'}
      </button>
    </div>
  );
};

export default Login;