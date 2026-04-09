import { useState, useEffect, lazy, Suspense } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Preloader from "@/components/ui/Preloader";
import { Redirect } from "wouter";

// Lazy-load all pages — only the visited page is downloaded
const LandingPage = lazy(() => import("@/pages/landing"));
const WorkspacePage = lazy(() => import("@/pages/workspace"));
const AuthPage = lazy(() => import("@/pages/auth"));
const ContactPage = lazy(() => import("@/pages/contact"));
const ResourcesPage = lazy(() => import("@/pages/resources"));
const ArticlePage = lazy(() => import("@/pages/article"));
const ReportAnalysisPage = lazy(() => import("@/pages/report-analysis"));
const EstimateCostPage = lazy(() => import("@/pages/estimate-cost"));
const DataScientistPage = lazy(() => import("@/pages/data-scientist"));
const UseCasesPage = lazy(() => import("@/pages/use-cases"));
const FloorplanGenerationPage = lazy(() => import("@/pages/floorplan-generation"));
const NotFound = lazy(() => import("@/pages/not-found"));
import Demo3DPage from "@/pages/demo-three";

// Lazy-load Chatbot — it's 36KB and only needed when user clicks it
const Chatbot = lazy(() => import("@/components/ui/Chatbot"));

// Minimal full-page spinner for lazy route transitions
function PageFallback() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-accent-blue/30 border-t-accent-blue rounded-full animate-spin" />
        <p className="text-xs text-white/30 font-mono tracking-wider">Loading…</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/workspace" component={WorkspacePage} />
        <Route path="/contact" component={ContactPage} />
        <Route path="/blog">{() => <Redirect to="/resources?tab=blog" />}</Route>
        <Route path="/resources/:id" component={ArticlePage} />
        <Route path="/resources" component={ResourcesPage} />
        <Route path="/use-cases" component={UseCasesPage} />
        <Route path="/tools/floorplan-generation" component={FloorplanGenerationPage} />
        <Route path="/tools/report-analysis" component={ReportAnalysisPage} />
        <Route path="/tools/estimate-cost" component={EstimateCostPage} />
        <Route path="/tools/data-scientist" component={DataScientistPage} />
        <Route path="/demo-three" component={Demo3DPage} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AppContent() {
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowPreloader(false);
    }, 2200);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Preloader isVisible={showPreloader} text="Initializing ArchitectXpert" />
      <Router />
      <Suspense fallback={null}>
        <Chatbot />
      </Suspense>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AppContent />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
