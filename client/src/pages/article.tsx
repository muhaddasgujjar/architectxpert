import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Clock, User, Tag, BookOpen } from "lucide-react";
import { Link, useRoute } from "wouter";
import { articles, categoryColors } from "@/data/articles";
import Newsletter from "@/components/sections/Newsletter";
import PageParticles from "@/components/ui/PageParticles";
import Navbar from "@/components/layout/Navbar";

export default function ArticlePage() {
  const [, params] = useRoute("/resources/:id");
  const article = useMemo(() => articles.find((a) => a.id === params?.id), [params?.id]);

  if (!article) {
    return (
      <div className="min-h-screen bg-obsidian flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-display font-bold text-white mb-4">Article not found</h1>
          <Link href="/resources" className="text-accent-blue hover:underline text-sm" data-testid="link-back-to-resources">
            Back to Resources
          </Link>
        </div>
      </div>
    );
  }

  const colorClass = categoryColors[article.category] || categoryColors.Tutorial;

  return (
    <div className="min-h-screen bg-obsidian relative overflow-hidden">
      <Navbar />
      <PageParticles count={200} />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-accent-gold/5 rounded-full blur-3xl" />
        <div className="noise-overlay" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-10"
        >
          <Link
            href="/resources"
            className="inline-flex items-center gap-2 text-sm text-white/40 hover:text-white/70 transition-colors"
            data-testid="link-article-back"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Resources</span>
          </Link>
        </motion.div>

        <motion.article
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-5">
              <span className={`inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full border ${colorClass}`}>
                <Tag className="w-2.5 h-2.5" />
                {article.category}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight" data-testid="text-article-title">
              {article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-5 text-xs text-white/30 font-mono border-b border-white/5 pb-6">
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                {article.author}
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" />
                {article.date}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {article.readTime}
              </span>
            </div>
          </div>

          <div className="space-y-6 mb-16">
            {article.content.map((paragraph, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.04, duration: 0.5 }}
                className="text-sm sm:text-base text-white/45 leading-relaxed"
                data-testid={`text-article-paragraph-${i}`}
              >
                {paragraph}
              </motion.p>
            ))}
          </div>

          <div className="border-t border-white/5 pt-8 mb-12">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-accent-blue/10 border border-accent-blue/20 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-accent-blue" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/70">Written by</p>
                <p className="text-base font-display font-semibold text-white" data-testid="text-article-author">{article.author}</p>
              </div>
            </div>
          </div>
        </motion.article>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.7 }}
        >
          <Newsletter />
        </motion.div>
      </div>
    </div>
  );
}
