import { useState, useMemo, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Clock, User, Tag, BookOpen, FileText } from "lucide-react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Link, useSearch } from "wouter";
import * as THREE from "three";
import Newsletter from "@/components/sections/Newsletter";
import { articles, categoryColors } from "@/data/articles";
import Navbar from "@/components/layout/Navbar";

const blogArticles = [
  {
    id: "getting-started",
    title: "Getting Started with AI-Powered Floor Plan Design",
    excerpt: "Learn how to use ArchitectXpert to generate your first floor plan in minutes. We'll walk you through the workspace, input parameters, and how to interpret your results.",
    category: "Tutorial",
    date: "Mar 5, 2026",
    readTime: "5 min read",
    featured: true,
  },
  {
    id: "understanding-floorplans",
    title: "Understanding Floor Plan Layouts: A Beginner's Guide",
    excerpt: "Floor plans can seem complex at first. This guide breaks down room types, dimensions, spatial flow, and how to read architectural drawings like a professional.",
    category: "Guide",
    date: "Mar 3, 2026",
    readTime: "8 min read",
    featured: true,
  },
  {
    id: "ai-architecture",
    title: "How AI is Transforming Architectural Design",
    excerpt: "Discover how artificial intelligence is changing the way architects and designers approach space planning, from neural layout engines to predictive design optimization.",
    category: "Industry",
    date: "Feb 28, 2026",
    readTime: "6 min read",
    featured: false,
  },
  {
    id: "room-dimensions",
    title: "Optimal Room Dimensions: What Size Should Each Room Be?",
    excerpt: "From bedrooms to kitchens, understanding standard room sizes helps you design functional spaces. Learn the recommended dimensions for every room type.",
    category: "Guide",
    date: "Feb 24, 2026",
    readTime: "7 min read",
    featured: false,
  },
  {
    id: "workspace-tips",
    title: "10 Tips for Getting Better Results in the Workspace",
    excerpt: "Maximize your AI-generated floor plans with these expert tips on writing requirements, choosing dimensions, and iterating on designs efficiently.",
    category: "Tutorial",
    date: "Feb 20, 2026",
    readTime: "4 min read",
    featured: false,
  },
  {
    id: "open-concept",
    title: "Open Concept vs. Traditional Layouts: Pros and Cons",
    excerpt: "Explore the trade-offs between open floor plans and traditional room-by-room layouts. Learn which approach works best for different home sizes and lifestyles.",
    category: "Guide",
    date: "Feb 15, 2026",
    readTime: "6 min read",
    featured: false,
  },
];

const blogCategoryColors: Record<string, string> = {
  Tutorial: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
  Guide: "text-green-400 bg-green-400/10 border-green-400/20",
  Industry: "text-gold bg-gold/10 border-gold/20",
};

function ResourceParticles({ count = 400 }: { count?: number }) {
  const mesh = useRef<THREE.Points>(null);
  const { viewport } = useThree();
  const mouse = useRef({ x: 0, y: 0 });

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  const basePositions = useMemo(() => new Float32Array(positions), [positions]);

  useFrame((state) => {
    if (!mesh.current) return;
    const time = state.clock.getElapsedTime();
    mouse.current.x = state.pointer.x * viewport.width * 0.3;
    mouse.current.y = state.pointer.y * viewport.height * 0.3;

    mesh.current.rotation.x = Math.sin(time * 0.05) * 0.1 + mouse.current.y * 0.02;
    mesh.current.rotation.y = Math.cos(time * 0.08) * 0.1 + mouse.current.x * 0.02;
    mesh.current.rotation.z = time * 0.02;

    const posArray = mesh.current.geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      posArray[i3 + 1] = basePositions[i3 + 1] + Math.sin(time * 0.3 + i * 0.1) * 0.3;
    }
    mesh.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={positions} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#3b82f6" transparent opacity={0.5} sizeAttenuation blending={THREE.AdditiveBlending} depthWrite={false} />
    </points>
  );
}

function ParticleBackground() {
  const webglSupported = useMemo(() => {
    try {
      const canvas = document.createElement("canvas");
      return !!(canvas.getContext("webgl") || canvas.getContext("webgl2"));
    } catch {
      return false;
    }
  }, []);

  if (!webglSupported) {
    return (
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-blue/5 via-transparent to-gold/3" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-0 pointer-events-none">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        style={{ background: "transparent" }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => { gl.setClearColor(0x000000, 0); }}
      >
        <ambientLight intensity={0.1} />
        <ResourceParticles count={400} />
      </Canvas>
    </div>
  );
}

type TabType = "resources" | "blog";

export default function ResourcesPage() {
  const searchStr = useSearch();
  const params = new URLSearchParams(searchStr);
  const initialTab = params.get("tab") === "blog" ? "blog" : "resources";
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden">
      <Navbar />
      <ParticleBackground />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            data-testid="link-resources-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to home</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-center"
        >
          <div className="inline-flex items-center gap-2 glass-panel rounded-full px-4 py-1.5 mb-6">
            <BookOpen className="w-3.5 h-3.5 text-accent-blue" />
            <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Resources & Blog</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-display font-bold mb-4">
            <span className="gradient-text">Learn &</span>{" "}
            <span className="gradient-text-blue">Grow</span>
          </h1>
          <p className="text-white/40 text-base max-w-xl mx-auto">
            Guides, tutorials, and expert insights to help you master AI-powered architectural design.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex items-center justify-center gap-2 mb-12"
        >
          <button
            onClick={() => setActiveTab("resources")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === "resources"
                ? "bg-accent-blue/15 border border-accent-blue/30 text-accent-blue"
                : "glass-panel text-white/50 hover:text-white/70"
            }`}
            data-testid="button-tab-resources"
          >
            <BookOpen className="w-4 h-4" />
            Resources
          </button>
          <button
            onClick={() => setActiveTab("blog")}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
              activeTab === "blog"
                ? "bg-accent-blue/15 border border-accent-blue/30 text-accent-blue"
                : "glass-panel text-white/50 hover:text-white/70"
            }`}
            data-testid="button-tab-blog"
          >
            <FileText className="w-4 h-4" />
            Blog
          </button>
        </motion.div>

        {activeTab === "resources" && (
          <div className="space-y-6 mb-20">
            {articles.map((article, i) => (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08, duration: 0.6 }}
              >
                <Link
                  href={`/resources/${article.id}`}
                  className="glass-panel-strong rounded-2xl p-6 sm:p-8 group cursor-pointer hover:border-white/10 transition-all duration-300 block relative overflow-hidden"
                  data-testid={`card-resource-${article.id}`}
                >
                  <div className="absolute top-0 right-0 w-48 h-48 bg-accent-blue/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative flex flex-col md:flex-row md:items-start gap-5">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${categoryColors[article.category] || categoryColors.Tutorial}`}>
                          <Tag className="w-2.5 h-2.5" />
                          {article.category}
                        </span>
                      </div>

                      <h2 className="text-lg sm:text-xl font-display font-semibold text-white mb-3 group-hover:text-accent-blue transition-colors duration-300">
                        {article.title}
                      </h2>

                      <p className="text-sm text-white/35 leading-relaxed mb-4">
                        {article.excerpt}
                      </p>

                      <div className="flex flex-wrap items-center gap-4 text-[11px] text-white/25 font-mono">
                        <span className="flex items-center gap-1.5">
                          <User className="w-3 h-3" />
                          {article.author}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {article.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {article.readTime}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs text-accent-blue opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex-shrink-0 mt-2 md:mt-0">
                      <span>Read article</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}

        {activeTab === "blog" && (
          <div className="mb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
              {blogArticles.filter((a) => a.featured).map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.1, duration: 0.6 }}
                  className="glass-panel-strong rounded-2xl p-6 group cursor-pointer hover:border-white/10 transition-all duration-300 relative overflow-hidden"
                  data-testid={`card-blog-${article.id}`}
                >
                  <div className="absolute top-0 right-0 w-40 h-40 bg-accent-blue/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${blogCategoryColors[article.category]}`}>
                        <Tag className="w-2.5 h-2.5" />
                        {article.category}
                      </span>
                      <span className="text-[10px] font-mono text-gold uppercase tracking-wider">Featured</span>
                    </div>

                    <h2 className="text-xl font-display font-semibold text-white mb-3 group-hover:text-accent-blue transition-colors duration-300">
                      {article.title}
                    </h2>

                    <p className="text-sm text-white/35 leading-relaxed mb-5">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-[11px] text-white/25 font-mono">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{article.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
                      </div>
                      <span className="text-xs text-accent-blue flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        Read more <ArrowRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <h3 className="text-xs font-mono text-white/30 uppercase tracking-wider mb-6">All Articles</h3>

            <div className="space-y-4">
              {blogArticles.filter((a) => !a.featured).map((article, i) => (
                <motion.div
                  key={article.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.5 }}
                  className="glass-panel rounded-xl p-5 group cursor-pointer hover:border-white/10 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4"
                  data-testid={`card-blog-${article.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${blogCategoryColors[article.category]}`}>
                        <Tag className="w-2.5 h-2.5" />
                        {article.category}
                      </span>
                    </div>
                    <h3 className="text-base font-display font-medium text-white mb-1.5 group-hover:text-accent-blue transition-colors duration-300">
                      {article.title}
                    </h3>
                    <p className="text-xs text-white/30 leading-relaxed line-clamp-2">
                      {article.excerpt}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-white/20 font-mono flex-shrink-0">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{article.date}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.7 }}
        >
          <Newsletter />
        </motion.div>
      </div>
    </div>
  );
}
