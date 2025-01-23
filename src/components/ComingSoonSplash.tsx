import { Trophy } from 'lucide-react'

const ComingSoonSplash = () => {
  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-lg shadow-xs border p-8 text-center">
        <Trophy className="h-12 w-12 text-yellow-500 mb-4" />
        <h2 className="text-3xl font-bold mb-4">Leaderboard Coming Soon</h2>
        <p className="text-gray-600 max-w-md">
          Currently under construction; leaderboards are coming soon! Come build
          with us on{' '}
          <a
            href="https://github.com/mc-bench"
            target="_blank"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            GitHub
          </a>
          !
        </p>
      </div>
    </div>
  )
}

export default ComingSoonSplash
