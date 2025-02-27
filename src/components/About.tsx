import { useEffect, useRef, useState } from 'react'

import { motion } from 'framer-motion'

const About = () => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [revealedVote, setRevealedVote] = useState<'A' | 'B' | null>(null)
  const [voted, setVoted] = useState(false)

  const handleVote = (vote: 'A' | 'B' | 'tie') => {
    setVoted(true)
    setRevealedVote(vote === 'tie' ? null : vote)
    // No api needed it's a demo
  }

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75
    }
  }, [])

  return (
    <div className="relative font-mono">
      {/* Video Background */}
      <div className="fixed inset-0 w-full h-[100vh] overflow-hidden">
        <div className="absolute inset-0 bg-black/50 z-[1]" />
        <motion.video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 20,
            ease: 'linear',
            repeat: Infinity,
            repeatType: 'mirror',
          }}
          className="w-full h-full object-cover"
        >
          <source
            src="https://object.mcbench.ai/assets/videos/example_build_video.mp4"
            type="video/mp4"
          />
        </motion.video>
      </div>

      {/* Hero Section */}
      <div className="relative z-[2] h-[100vh] flex items-center justify-center">
        <motion.div
          className="text-center space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-8xl font-bold text-white uppercase tracking-widest">
            Minecraft Bench
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/90">
            Text benchmarks are so 2024
          </p>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2, duration: 1 }}
            className="pt-8"
          >
            <div className="animate-bounce text-white/70 text-2xl">↓</div>
          </motion.div>
        </motion.div>
      </div>

      {/* Content Sections */}
      <div className="relative z-[2] max-w-6xl mx-auto p-4 space-y-32 pb-24">
        {/* Main Mission Statement */}
        <motion.div
          className="bg-black/25 backdrop-blur-sm border border-white/20 p-8 md:p-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold uppercase tracking-wider mb-8 text-center text-white">
            The Future of AI Evaluation
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-white/90 text-center max-w-4xl mx-auto mb-12">
            MC-Bench changes how we evaluate AI models by challenging them to
            create Minecraft builds.
          </p>

          {/* Process Flow Diagram */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 max-w-4xl mx-auto">
            <motion.div
              className="flex flex-col items-center p-6 md:p-8 bg-white/5 rounded-lg"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <div className="text-4xl mb-3">🤖</div>
              <div className="text-xl font-bold">AI Model</div>
              <div className="text-sm text-white/70">Receives prompt</div>
            </motion.div>

            <div className="text-3xl rotate-90 md:rotate-0">→</div>

            <motion.div
              className="flex flex-col items-center p-6 md:p-8 bg-white/5 rounded-lg"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="text-4xl mb-3">🏗️</div>
              <div className="text-xl font-bold">Build generation</div>
              <div className="text-sm text-white/70">
                Creates Minecraft structures
              </div>
            </motion.div>

            <div className="text-3xl rotate-90 md:rotate-0">→</div>

            <motion.div
              className="flex flex-col items-center p-6 md:p-8 bg-white/5 rounded-lg"
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <div className="text-4xl mb-3">📊</div>
              <div className="text-xl font-bold">Evaluation</div>
              <div className="text-sm text-white/70">Community rates</div>
            </motion.div>
          </div>
        </motion.div>

        {/* Voting Process Showcase */}
        <motion.div
          className="bg-black/25 backdrop-blur-sm border border-white/20 p-8 md:p-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold uppercase tracking-wider mb-8 text-center text-white">
            How Voting Works
          </h2>

          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-white/90 text-center max-w-4xl mx-auto mb-12">
            We're testing AIs on instruction following, code completion, and
            creativity. Here's an example prompt:
          </p>

          {/* Demo Voting Interface */}
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white/5 p-6 rounded-lg">
              <p className="text-lg text-white/90 mb-6 text-center">
                <span className="font-bold">Prompt:</span> The big bang
              </p>

              {/* Images Container - Horizontal on desktop, Vertical on mobile */}
              <div className="flex flex-col md:flex-row gap-4 md:gap-8">
                <motion.div
                  className="flex-1 aspect-square bg-white/10 rounded-lg overflow-hidden relative"
                  whileHover={{ scale: 1.01 }}
                >
                  <img
                    src="https://object.mcbench.ai/assets/images/Vote-A.png"
                    alt="Build Option 1"
                    className="w-full h-full object-cover scale-110"
                  />
                  {revealedVote && (
                    <div className="absolute top-4 left-4 bg-black/25 dark:bg-white/10 px-4 py-2 rounded">
                      <div className="text-white font-bold">
                        GPT-4-0-2024-11-20
                      </div>
                    </div>
                  )}
                </motion.div>

                <motion.div
                  className="flex-1 aspect-square bg-white/10 rounded-lg overflow-hidden relative"
                  whileHover={{ scale: 1.01 }}
                >
                  <img
                    src="https://object.mcbench.ai/assets/images/Vote-B.png"
                    alt="Build Option 2"
                    className="w-full h-full object-cover scale-110"
                  />
                  {revealedVote && (
                    <div className="absolute top-4 left-4 bg-black/25 dark:bg-white/10 px-4 py-2 rounded">
                      <div className="text-white font-bold">DeepSeek-R1</div>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>

            {/* Voting section now completely outside the demo build container */}
            {!voted ? (
              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleVote('A')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-3 font-mono uppercase tracking-wider border border-white/20 transition-transform hover:translate-y-[-2px]"
                >
                  Vote A
                </button>
                <button
                  onClick={() => handleVote('tie')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-3 font-mono uppercase tracking-wider border border-white/20 transition-transform hover:translate-y-[-2px]"
                >
                  Tie
                </button>
                <button
                  onClick={() => handleVote('B')}
                  className="w-full bg-white/10 hover:bg-white/20 text-white py-3 font-mono uppercase tracking-wider border border-white/20 transition-transform hover:translate-y-[-2px]"
                >
                  Vote B
                </button>
              </div>
            ) : (
              <div className="text-center text-white/90 py-4">
                Thanks for voting!{' '}
                {revealedVote && `You chose Build ${revealedVote}`}
              </div>
            )}

            {/* Instructions */}
            <div className="flex flex-col space-y-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-center space-x-3 text-white/90">
                <span className="text-2xl">👀</span>
                <span>Compare two AI-generated builds</span>
              </div>
              <div className="flex items-center justify-center space-x-3 text-white/90">
                <span className="text-2xl">🏆</span>
                <span>Click on the one that's better</span>
              </div>
              <div className="flex items-center justify-center space-x-3 text-white/90">
                <span className="text-2xl">📊</span>
                <span>Further AI research</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Call to Action Section */}
        <motion.div
          className="bg-black/25 backdrop-blur-sm border border-white/20 p-8 md:p-12 text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold uppercase tracking-wider mb-8 text-white">
            Join us
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-white/90 mb-8 max-w-4xl mx-auto">
            Whether you're voting on builds, submitting models, or contributing
            code, you're helping shape the future of AI creativity.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <a
              href="https://github.com/mc-bench"
              target="_blank"
              className="inline-block w-full bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 md:px-8 md:py-4 text-lg md:text-xl font-bold uppercase tracking-wider transition duration-300"
            >
              GitHub →
            </a>
            <a
              href="https://x.com/_mcbench"
              target="_blank"
              className="inline-block w-full bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 md:px-8 md:py-4 text-lg md:text-xl font-bold uppercase tracking-wider transition duration-300"
            >
              Follow us on X →
            </a>
            <a
              href="http://discord.gg/bZbxhjDTEA"
              target="_blank"
              className="inline-block w-full bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 md:px-8 md:py-4 text-lg md:text-xl font-bold uppercase tracking-wider transition duration-300"
            >
              Join the Discord →
            </a>
          </div>
        </motion.div>

        {/* Team Section */}
        <motion.div
          className="bg-black/25 backdrop-blur-sm border border-white/20 p-8 md:p-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold uppercase tracking-wider mb-8 text-center text-white">
            Meet the devs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <motion.div
              className="flex flex-col items-center p-6 bg-white/5 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <img
                src="https://github.com/IsaacGemal.png"
                alt="Isaac"
                className="w-24 h-24 rounded-full mb-4"
              />
              <h3 className="text-xl font-bold mb-2">Isaac</h3>
              <div className="flex space-x-4">
                <a
                  href="https://github.com/IsaacGemal"
                  target="_blank"
                  className="text-white/90 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/aizkmusic"
                  target="_blank"
                  className="text-white/90 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col items-center p-6 bg-white/5 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <img
                src="https://github.com/huntcsg.png"
                alt="Hunter"
                className="w-24 h-24 rounded-full mb-4"
              />
              <h3 className="text-xl font-bold mb-2">Hunter</h3>
              <div className="flex space-x-4">
                <a
                  href="https://github.com/huntcsg"
                  target="_blank"
                  className="text-white/90 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/xlatentspace"
                  target="_blank"
                  className="text-white/90 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
              </div>
            </motion.div>

            <motion.div
              className="flex flex-col items-center p-6 bg-white/5 rounded-lg"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 }}
            >
              <img
                src="https://github.com/jannalulu.png"
                alt="Janna"
                className="w-24 h-24 rounded-full mb-4"
              />
              <h3 className="text-xl font-bold mb-2">Janna</h3>
              <div className="flex space-x-4">
                <a
                  href="https://github.com/jannalulu"
                  target="_blank"
                  className="text-white/90 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/_jannalulu"
                  target="_blank"
                  className="text-white/90 hover:text-white"
                >
                  <svg
                    className="w-6 h-6"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z" />
                  </svg>
                </a>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Video Info Card */}
        <motion.div
          className="max-w-lg mx-auto"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <div className="bg-black/40 backdrop-blur-sm border border-white/20 p-6 rounded-lg">
            <h3 className="text-xl font-bold mb-2 text-white">
              About the Background
            </h3>
            <p className="text-white/90 mb-4">
              The structure you see being built was generated by Claude 3.5
              Sonnet when prompted to create "a large structure, truly weird and
              alien, out of this world, unusual".
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default About
