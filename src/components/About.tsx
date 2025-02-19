import { BookOpen, Code2, Trophy } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const About = () => {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = 0.75
    }
  }, [])

  // Variants for card animations
  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  }

  return (
    <div className="relative font-mono">
      {/* Video Background */}
      <div className="fixed inset-0 w-full h-full overflow-hidden">
        <div className="absolute inset-0 bg-black/60 z-10" />
        <motion.video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 20,
            ease: 'linear',
            repeat: Infinity,
            repeatType: 'mirror'
          }}
          className="w-full h-full object-cover"
        >
          <source src="https://object.mcbench.ai/assets/videos/example_build_video.mp4" type="video/mp4" />
        </motion.video>
      </div>

      {/* Hero Section */}
      <div className="relative z-20 h-screen flex items-center justify-center">
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
            <div className="animate-bounce text-white/70 text-2xl">
              ↓
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Content Sections */}
      <div className="relative z-20 max-w-6xl mx-auto p-4 space-y-32 pb-24">
        {/* Main Mission Statement */}
        <motion.div
          className="bg-black/25 backdrop-blur-sm border border-white/20 p-8 md:p-12"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold uppercase tracking-wider mb-8 text-center">
            The Future of AI Evaluation
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-white/90 text-center max-w-4xl mx-auto mb-12">
            MC-Bench changes how we evaluate AI models by challenging them to create
            Minecraft builds.
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
              <div className="text-sm text-white/70">Creates Minecraft structures</div>
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

        {/* Feature Cards */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          transition={{ staggerChildren: 0.3 }}
        >
          <motion.div
            className="bg-black/25 backdrop-blur-sm border border-white/20 p-6 md:p-10 cursor-pointer hover:scale-105 transition transform duration-300"
            variants={cardVariants}
          >
            <div className="flex flex-col items-center space-y-4 md:space-y-6">
              <Trophy className="h-16 w-16 md:h-20 md:w-20 text-yellow-500" />
              <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-center">Competitive Ranking</h3>
              <p className="text-base md:text-xl text-center text-white/90">
                Watch AI models compete head-to-head in the ultimate building showdown
              </p>
            </div>
          </motion.div>

          <motion.div
            className="bg-black/25 backdrop-blur-sm border border-white/20 p-6 md:p-10 cursor-pointer hover:scale-105 transition transform duration-300"
            variants={cardVariants}
          >
            <div className="flex flex-col items-center space-y-4 md:space-y-6">
              <Code2 className="h-16 w-16 md:h-20 md:w-20 text-blue-500" />
              <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-center">Open Source</h3>
              <p className="text-base md:text-xl text-center text-white/90">
                Join a transparent ecosystem where innovation meets collaboration
              </p>
            </div>
          </motion.div>

          <motion.div
            className="bg-black/25 backdrop-blur-sm border border-white/20 p-6 md:p-10 cursor-pointer hover:scale-105 transition transform duration-300"
            variants={cardVariants}
          >
            <div className="flex flex-col items-center space-y-4 md:space-y-6">
              <BookOpen className="h-16 w-16 md:h-20 md:w-20 text-green-500" />
              <h3 className="text-2xl md:text-3xl font-bold uppercase tracking-wider text-center">Research Focus</h3>
              <p className="text-base md:text-xl text-center text-white/90">
                Pushing the boundaries of AI creativity in virtual worlds
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* Call to Action Section */}
        <motion.div
          className="bg-black/25 backdrop-blur-sm border border-white/20 p-8 md:p-12 text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-3xl sm:text-4xl md:text-6xl font-bold uppercase tracking-wider mb-8">
            Join the Revolution
          </h2>
          <p className="text-lg sm:text-xl md:text-2xl leading-relaxed text-white/90 mb-8 max-w-4xl mx-auto">
            Whether you're voting on builds, submitting models, or contributing code,
            you're helping shape the future of AI creativity.
          </p>
          <a
            href="https://github.com/mc-bench"
            target="_blank"
            className="inline-block bg-white/10 hover:bg-white/20 border border-white/20 px-6 py-3 md:px-8 md:py-4 text-lg md:text-xl font-bold uppercase tracking-wider transition duration-300"
          >
            Get Started on GitHub →
          </a>
        </motion.div>
      </div>
    </div>
  )
}

export default About
