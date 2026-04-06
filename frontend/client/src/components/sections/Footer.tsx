import { Hexagon } from "lucide-react";
import { SiGithub, SiX, SiLinkedin } from "react-icons/si";

const footerLinks = {
  Product: [
    { label: "Studio", href: "/#studio" },
    { label: "Use Cases", href: "/use-cases" },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
  ],
  Company: [
    { label: "How It Works", href: "/#how-it-works" },
    { label: "Blog", href: "/resources?tab=blog" },
    { label: "Contact", href: "/contact" },
  ],
  Resources: [
    { label: "Documentation", href: "/resources" },
    { label: "Getting Started", href: "/workspace" },
    { label: "Report Analysis", href: "/tools/report-analysis" },
    { label: "Estimate Cost", href: "/tools/estimate-cost" },
  ],
};

export default function Footer() {
  return (
    <footer className="relative border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8" data-testid="footer">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <a href="/" className="flex items-center gap-2 mb-4" data-testid="link-footer-logo">
              <Hexagon className="w-6 h-6 text-accent-blue" strokeWidth={1.5} />
              <span className="font-display text-base font-semibold text-white">ArchitectXpert</span>
            </a>
            <p className="text-xs text-white/25 leading-relaxed mb-4">
              AI-powered architectural design for the next generation of builders.
            </p>
            <div className="flex items-center gap-3">
              <span className="text-white/10 cursor-default" aria-label="GitHub" data-testid="link-github">
                <SiGithub className="w-4 h-4" />
              </span>
              <span className="text-white/10 cursor-default" aria-label="Twitter" data-testid="link-twitter">
                <SiX className="w-4 h-4" />
              </span>
              <span className="text-white/10 cursor-default" aria-label="LinkedIn" data-testid="link-linkedin">
                <SiLinkedin className="w-4 h-4" />
              </span>
            </div>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">
                {category}
              </h4>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-xs text-white/20 hover:text-white/60 transition-colors duration-300"
                      data-testid={`link-footer-${link.label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-white/5 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[11px] text-white/15">
            2024 ArchitectXpert. All rights reserved.
          </p>
          <p className="text-[11px] text-white/15">
            Crafted with precision and artificial intelligence.
          </p>
        </div>
      </div>
    </footer>
  );
}
