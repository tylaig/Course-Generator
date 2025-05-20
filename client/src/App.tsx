import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Phase1 from "@/pages/phase1";
import Phase2 from "@/pages/phase2";
import Phase3 from "@/pages/phase3";
import Phase4 from "@/pages/phase4";
import Phase5 from "@/pages/phase5";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/phase1" component={Phase1} />
          <Route path="/phase2" component={Phase2} />
          <Route path="/phase3" component={Phase3} />
          <Route path="/phase4" component={Phase4} />
          <Route path="/phase5" component={Phase5} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

export default App;
