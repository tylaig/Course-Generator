import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import CourseList from "@/pages/course-list";
import Phase1 from "@/pages/phase1";
import Phase2 from "@/pages/phase2-working";
import Phase3 from "@/pages/phase3";
import Phase4 from "@/pages/phase4";
import Phase5 from "@/pages/phase5";
import LMSView from "@/pages/LMSView";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Sidebar from "@/components/layout/Sidebar";
import { CourseProvider } from "@/context/CourseContext"; 
import { useToast } from "@/hooks/use-toast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

function App() {
  const { toast } = useToast();
  const [isContextReady, setIsContextReady] = useState(false);
  
  useEffect(() => {
    // Verificar se o contexto está pronto
    setTimeout(() => {
      setIsContextReady(true);
    }, 1000);
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      <CourseProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="flex flex-1">
            {isContextReady && <Sidebar />}
            <main className={`flex-1 ${isContextReady ? 'ml-60' : ''} pt-4 px-6 pb-6`}>
              {isContextReady ? (
                <Switch>
                  <Route path="/" component={Home} />
                  <Route path="/courses" component={CourseList} />
                  <Route path="/new-course" component={Home} />
                  <Route path="/phase1" component={Phase1} />
                  <Route path="/phase2" component={Phase2} />
                  <Route path="/phase3" component={Phase3} />
                  <Route path="/phase4" component={Phase4} />
                  <Route path="/phase5" component={Phase5} />
                  <Route path="/lms-view" component={LMSView} />
                  <Route component={NotFound} />
                </Switch>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-gray-600">Carregando o ambiente pedagógico...</p>
                  </div>
                </div>
              )}
            </main>
          </div>
          <Footer />
        </div>
      </CourseProvider>
    </QueryClientProvider>
  );
}

export default App;
