import { BookOpen, Code2, Trophy } from 'lucide-react'

const About = () => {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-12">
      {/* Header section - keeping this centered */}
      <header className="text-center space-y-3">
        <h1 className="text-4xl font-bold">About Minecraft Benchmark</h1>
        <p className="text-lg text-gray-600">
          Evaluating AI Models for Minecraft Building Generation
        </p>
      </header>

      {/* Introduction - left aligned for better readability */}
      <div className="space-y-6">
        <p className="text-lg leading-relaxed">
          MC-Bench is a platform for evaluating and comparing different AI
          models that generate Minecraft builds. Through human feedback and
          voting, we aim to understand which approaches produce the most
          impressive and accurate results.
        </p>
      </div>

      {/* Features grid - visual elements remain centered, but in distinct cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col items-center mb-4">
            <Trophy className="h-10 w-10 text-yellow-500 mb-3" />
            <h3 className="text-xl font-semibold">Competitive Ranking</h3>
          </div>
          <p className="text-gray-600 text-center">
            Models compete head-to-head and are ranked based on user votes
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col items-center mb-4">
            <Code2 className="h-10 w-10 text-blue-500 mb-3" />
            <h3 className="text-xl font-semibold">Open Source</h3>
          </div>
          <p className="text-gray-600 text-center">
            The platform and evaluation metrics are fully open source
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex flex-col items-center mb-4">
            <BookOpen className="h-10 w-10 text-green-500 mb-3" />
            <h3 className="text-xl font-semibold">Research Focus</h3>
          </div>
          <p className="text-gray-600 text-center">
            Helping advance AI research in creative generation tasks
          </p>
        </div>
      </div>

      {/* Content sections - left aligned with clear hierarchy */}
      <div className="space-y-8">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-2">How It Works</h2>
          <p className="text-lg leading-relaxed">
            Users are presented with pairs of Minecraft builds generated by
            different AI models, given the same prompt. By voting on which build
            better matches the prompt, we collect data on model performance
            across different types of builds and scenarios.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold border-b pb-2">Get Involved</h2>
          <p className="text-lg leading-relaxed">
            MC-Bench is a community effort. You can contribute by voting on
            builds, submitting your own models for evaluation, or contributing
            to the platform's development on{' '}
            <a
              href="https://github.com/mc-bench"
              target="_blank"
              className="text-blue-600 hover:text-blue-800 hover:underline"
            >
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}

export default About
