import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Calendar, Clock, Tag } from "lucide-react";
import PageParticles from "@/components/ui/PageParticles";
import Navbar from "@/components/layout/Navbar";

const articles = [
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

const categoryColors: Record<string, string> = {
  Tutorial: "text-accent-blue bg-accent-blue/10 border-accent-blue/20",
  Guide: "text-green-400 bg-green-400/10 border-green-400/20",
  Industry: "text-accent-gold bg-accent-gold/10 border-accent-gold/20",
};

export default function BlogPage() {
  const featured = articles.filter((a) => a.featured);
  const rest = articles.filter((a) => !a.featured);

  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden">
      <Navbar />
      <PageParticles count={250} />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.a
          href="/"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors mb-8"
          data-testid="link-blog-back"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to home</span>
        </motion.a>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12"
        >
          <h1 className="text-4xl sm:text-5xl font-display font-bold mb-4">
            <span className="gradient-text">Blog &</span>{" "}
            <span className="gradient-text-blue">Articles</span>
          </h1>
          <p className="text-white/40 text-base max-w-xl">
            Guides, tutorials, and insights to help you make the most of AI-powered architectural design.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {featured.map((article, i) => (
            <motion.a
              key={article.id}
              href={`/blog#${article.id}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1, duration: 0.6 }}
              className="glass-panel-strong rounded-2xl p-6 group cursor-pointer hover:border-white/10 transition-all duration-300 relative overflow-hidden block"
              data-testid={`card-article-${article.id}`}
            >
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent-blue/5 rounded-full blur-[80px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${categoryColors[article.category]}`}>
                    <Tag className="w-2.5 h-2.5" />
                    {article.category}
                  </span>
                  <span className="text-[10px] font-mono text-accent-gold uppercase tracking-wider">Featured</span>
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
            </motion.a>
          ))}
        </div>

        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="text-xs font-mono text-white/30 uppercase tracking-wider mb-6"
        >
          All Articles
        </motion.h3>

        <div className="space-y-4">
          {rest.map((article, i) => (
            <motion.a
              key={article.id}
              href={`/blog#${article.id}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.08, duration: 0.5 }}
              className="glass-panel rounded-xl p-5 group cursor-pointer hover:border-white/10 transition-all duration-300 flex flex-col sm:flex-row sm:items-center gap-4 block"
              data-testid={`card-article-${article.id}`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border ${categoryColors[article.category]}`}>
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
            </motion.a>
          ))}
        </div>
      </div>
    </div>
  );
}
