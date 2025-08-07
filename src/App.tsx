import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/hooks/useAuth";
import { lazy, Suspense } from "react";
const Landing = lazy(() => import("./pages/Landing"));
const Auth = lazy(() => import("./pages/Auth"));
const About = lazy(() => import("./pages/About"));
const SymptomLibrary = lazy(() => import("./pages/SymptomLibrary"));
const Trust = lazy(() => import("./pages/Trust"));
const ProfileSelection = lazy(() => import("./pages/ProfileSelection"));
const SymptomInput = lazy(() => import("./pages/SymptomInput"));
const Interview = lazy(() => import("./pages/Interview"));
const Results = lazy(() => import("./pages/Results"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const TrackSymptoms = lazy(() => import("./pages/TrackSymptoms"));
const PremiumFeatures = lazy(() => import("./pages/PremiumFeatures"));
const Disclaimer = lazy(() => import("./pages/Disclaimer"));
const Privacy = lazy(() => import("./pages/Privacy"));
const Terms = lazy(() => import("./pages/Terms"));
const NotFound = lazy(() => import("./pages/NotFound"));
const HealthProfile = lazy(() => import("./pages/HealthProfile"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-background">
                  <div
                    className="h-10 w-10 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin"
                    aria-label="Loading"
                  />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/about" element={<About />} />
                <Route path="/symptom-library" element={<SymptomLibrary />} />
                <Route path="/trust" element={<Trust />} />
                <Route path="/profile-selection" element={<ProfileSelection />} />
                <Route path="/symptom-input" element={<SymptomInput />} />
                <Route path="/interview" element={<Interview />} />
                <Route path="/results" element={<Results />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/track-symptoms" element={<TrackSymptoms />} />
                <Route path="/health-profile" element={<HealthProfile />} />
                <Route path="/premium" element={<PremiumFeatures />} />
                <Route path="/disclaimer" element={<Disclaimer />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
