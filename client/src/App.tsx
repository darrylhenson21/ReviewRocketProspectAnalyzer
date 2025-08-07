import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { KeyWizard } from "@/components/KeyWizard";
import Home from "@/pages/home";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import Navigation from "./components/navigation";

// Console branding easter egg
console.log(
  "%cBuilt with ❤️ by Lee Cole & Gloria Gunn – https://ezprofitsoftware.com/lazy-marketers-dream-come-true/",
  "color:#1d4ed8;font-weight:bold;font-size:14px"
);

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <KeyWizard>
          <Router />
        </KeyWizard>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
