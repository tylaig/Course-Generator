import { CourseProvider } from "@/context/CourseContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";

// Pages
import Home from "@/pages/home";
import Phase1 from "@/pages/phase1";
import Phase2 from "@/pages/phase2";
import Phase3 from "@/pages/phase3";
import Phase4 from "@/pages/phase4";
import Phase5 from "@/pages/phase5";
import NotFound from "@/pages/not-found";
import LMSView from "@/pages/LMSView";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CourseProvider>
          <div className="min-h-screen bg-neutral-50">
            <div className="flex flex-col min-h-screen">
              <main className="flex-1">
                <Switch>
                  <Route path="/" component={Home} />
                  <Route path="/phase1" component={Phase1} />
                  <Route path="/phase2" component={Phase2} />
                  <Route path="/phase3" component={Phase3} />
                  <Route path="/phase4" component={Phase4} />
                  <Route path="/phase5" component={Phase5} />
                  <Route path="/lms" component={LMSView} />
                  <Route component={NotFound} />
                </Switch>
              </main>
            </div>
          </div>
          <Toaster />
        </CourseProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}