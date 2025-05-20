import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Phase1 from "@/pages/phase1";
import Phase2 from "@/pages/phase2";
import Phase3 from "@/pages/phase3";
import Phase4 from "@/pages/phase4";
import Phase5 from "@/pages/phase5";
import LMSView from "@/pages/LMSView";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CourseProvider } from "@/context/CourseContext"; 
import { useToast } from "@/hooks/use-toast";

function App() {
  const { toast } = useToast();
  const [isContextReady, setIsContextReady] = useState(false);
  
  useEffect(() => {
    // Verificar se o contexto está pronto
    setTimeout(() => {
      setIsContextReady(true);
    }, 500);
  }, []);
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {isContextReady ? (
          <Switch>
            <Route path="/" component={Home} />
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
            <p>Carregando...</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

export default App;
