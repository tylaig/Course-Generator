import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { TooltipProvider } from "./components/ui/tooltip";
import { Toaster } from "./components/ui/toaster";
import { CourseProvider } from "./context/CourseContext";

// Usando React.StrictMode para ajudar a detectar problemas potenciais
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CourseProvider>
          <App />
          <Toaster />
        </CourseProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
