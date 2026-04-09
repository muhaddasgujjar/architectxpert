import { Canvas } from "@react-three/fiber";
import InteractiveSphere from "@/components/ui/InteractiveSphere";
import Navbar from "@/components/layout/Navbar";
import PageParticles from "@/components/ui/PageParticles";
import { motion } from "framer-motion";

export default function Demo3DPage() {
  console.log("Forced page compile - R3F loaded!");
  return (
    <div className="min-h-screen bg-[#050505] relative overflow-hidden flex flex-col font-sans">
      <Navbar />
      <PageParticles count={100} />
      
      {/* Background gradients similar to screenshot */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 h-[40vh] bg-gradient-to-t from-[#0f2c2c]/40 to-transparent" />
        <div className="noise-overlay" />
      </div>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16 relative z-10 w-full flex flex-col lg:flex-row items-center">
        
        {/* Left Side Content */}
        <div className="w-full lg:w-1/2 pt-10 lg:pt-0 lg:pr-12 text-left z-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-display font-medium leading-[1.1] tracking-tight mb-4 text-white">
              Effortless <br />
              AI integration <br />
              <span className="text-teal-500">for business</span>
            </h1>
            
            <p className="text-lg text-white/40 leading-relaxed max-w-xl mb-10 font-normal">
              No extra setup, just smart automation when you need it.<br />
              Handle the heavy lifting while you stay in control.
            </p>

            <button className="px-8 py-4 rounded-xl bg-[#093532] border border-teal-500/30 text-white font-medium text-sm hover:bg-[#0c4743] hover:border-teal-400 transition-all shadow-[0_0_20px_rgba(20,184,166,0.15)] flex items-center gap-2">
              JOIN US NOW
            </button>
          </motion.div>
        </div>

        {/* Right Side 3D Canvas */}
        <div className="w-full lg:w-1/2 h-[600px] mt-12 lg:mt-0 relative z-10">
          <Canvas camera={{ position: [0, 0, 10], fov: 45 }}>
            {/* Studio lighting setup natively instead of Environment map */}
            <ambientLight intensity={1.5} />
            <spotLight position={[10, 20, 10]} intensity={2.5} color="#4fd1c5" />
            <directionalLight position={[-10, 0, -10]} intensity={1.5} color="#00ffff" />
            <pointLight position={[0, -10, 0]} intensity={1} color="#ffffff" />
            
            <InteractiveSphere />
          </Canvas>
        </div>
      </main>
    </div>
  );
}
