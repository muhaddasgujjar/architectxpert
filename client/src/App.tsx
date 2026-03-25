import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import Preloader from "@/components/ui/Preloader";
import Chatbot from "@/components/ui/Chatbot";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import WorkspacePage from "@/pages/workspace";
import AuthPage from "@/pages/auth";
import ContactPage from "@/pages/contact";
import { Redirect } from "wouter";

import ResourcesPage from "@/pages/resources";
import ArticlePage from "@/pages/article";
import ReportAnalysisPage from "@/pages/report-analysis";
import EstimateCostPage from "@/pages/estimate-cost";
import DataScientistPage from "@/pages/data-scientist";
import UseCasesPage from "@/pages/use-cases";
import FloorplanGenerationPage from "@/pages/floorplan-generation";

function Router() {
  return (
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
      <Route component={NotFound} />
    </Switch>
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
      <Chatbot />
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
