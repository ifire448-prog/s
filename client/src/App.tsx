import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { FancyParticles, AnimatedBackground } from "@/components/fancy-particles";
import ForYou from "@/pages/for-you";
import Explore from "@/pages/explore";
import Upload from "@/pages/upload";
import Search from "@/pages/search";
import VideoDetail from "@/pages/video-detail";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={ForYou} />
      <Route path="/explore" component={Explore} />
      <Route path="/upload" component={Upload} />
      <Route path="/search" component={Search} />
      <Route path="/video/:id" component={VideoDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

export default function App() {
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties} defaultOpen={true}>
          <AnimatedBackground />
          <FancyParticles count={20} />
          <div className="flex h-screen w-full bg-background relative">
            <AppSidebar />
            <main className="flex-1 overflow-hidden pb-16 md:pb-0">
              <Router />
            </main>
            <MobileNav />
          </div>
        </SidebarProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
