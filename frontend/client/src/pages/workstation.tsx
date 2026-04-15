import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { WorkstationProvider } from "@/lib/WorkstationContext";
import Preloader from "@/components/ui/Preloader";
import TopToolbar from "@/components/workstation/TopToolbar";
import LeftPanel from "@/components/workstation/LeftPanel";
import Canvas from "@/components/workstation/Canvas";
import RightPanel from "@/components/workstation/RightPanel";
import StatusBar from "@/components/workstation/StatusBar";

function WorkstationLayout() {
  return (
    <div className="h-screen w-screen flex flex-col bg-[#0a0a0f] overflow-hidden">
      {/* Top toolbar */}
      <TopToolbar />

      {/* Main area: left panel + canvas + right panel */}
      <div className="flex-1 flex overflow-hidden">
        <LeftPanel />
        <Canvas />
        <RightPanel />
      </div>

      {/* Bottom status bar */}
      <StatusBar />
    </div>
  );
}

export default function WorkstationPage() {
  const [, navigate] = useLocation();
  const { user, isLoading: authLoading } = useAuth();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    const timer = setTimeout(() => setPageLoading(false), 1200);
    return () => clearTimeout(timer);
  }, []);

  if (authLoading || !user) {
    return <Preloader isVisible={true} text="Checking credentials" />;
  }

  return (
    <>
      <Preloader isVisible={pageLoading} text="Initializing Workstation" />
      <WorkstationProvider>
        <WorkstationLayout />
      </WorkstationProvider>
    </>
  );
}
