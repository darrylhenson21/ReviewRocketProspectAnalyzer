import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Rocket, Settings } from "lucide-react";
import { LeadInput } from "@/components/lead-input";
import { LoadingState } from "@/components/loading-state";
import { ResultsTable } from "@/components/results-table";
import { SettingsDrawer } from "@/components/SettingsDrawer";
import { ManualDataCorrection } from "@/components/manual-data-correction";
import { Button } from "@/components/ui/button";
import { BrandSettings, AnalyzeLeadsResponse } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getBrandSettings } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [analysisResults, setAnalysisResults] = useState<AnalyzeLeadsResponse | null>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(getBrandSettings());
  const [failedSearches, setFailedSearches] = useState<string[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [incompleteBusinesses, setIncompleteBusinesses] = useState<Array<{id: string, name: string, address: string, rating: number, reviewCount: number}>>([]);
  const { toast } = useToast();

  // AI Analysis mutation for automatic fallback
  const aiAnalysisMutation = useMutation({
    mutationFn: async (searches: string[]) => {
      const response = await apiRequest('/api/ai-analyze-failed-search', {
        method: 'POST',
        body: JSON.stringify({
          failedSearches: searches,
          searchAttempts: searches
        })
      });
      return response;
    },
    onSuccess: (data: any) => {
      setAiInsights(data.insights || "AI analysis completed. Please try different search terms or verify business names.");
      toast({
        title: "AI Analysis Complete",
        description: "Generated insights for failed searches automatically.",
      });
    },
    onError: (error) => {
      setAiInsights("AI analysis failed. Please verify business names and try again.");
    }
  });

  const analyzeMutation = useMutation({
    mutationFn: async ({ leads, competitors, businessCategory, manualBusinessData }: { 
      leads: string[], 
      competitors?: string[], 
      businessCategory?: string,
      manualBusinessData?: Array<{name: string, address: string, rating: number, reviewCount: number}>
    }) => {
      const response = await apiRequest('/api/analyze', { 
        method: 'POST',
        body: JSON.stringify({ 
          leads, 
          competitors: competitors || [], 
          businessCategory,
          manualBusinessData
        })
      });
      return response.json() as Promise<AnalyzeLeadsResponse>;
    },
    onSuccess: (data) => {
      setAnalysisResults(data);
      
      // Check for businesses with incomplete data (0 rating and 0 reviews) - these come from AI fallback
      const businessesWithIncompleteData = data.leads.filter(lead => 
        lead.rating === 0 && lead.reviewCount === 0
      ).map(lead => ({
        id: lead.id,
        name: lead.name,
        address: lead.address,
        rating: lead.rating,
        reviewCount: lead.reviewCount
      }));
      
      setIncompleteBusinesses(businessesWithIncompleteData);
      
      // If we have incomplete businesses, clear failed searches since AI found them
      if (businessesWithIncompleteData.length > 0) {
        setFailedSearches([]);
        setAiInsights(null);
        toast({
          title: "Businesses Found via AI",
          description: `Found ${businessesWithIncompleteData.length} business${businessesWithIncompleteData.length !== 1 ? 'es' : ''} that need manual rating/review data.`,
        });
        return; // Exit early to show manual input dialog
      }
      
      // Handle results and failed searches
      if (data.leads.length === 0) {
        // Keep the failed searches from input for AI analysis
        const currentFailedSearches = [...failedSearches];
        setFailedSearches(currentFailedSearches);
        
        // Automatically trigger AI fallback analysis
        if (currentFailedSearches.length > 0) {
          aiAnalysisMutation.mutate(currentFailedSearches);
        }
        
        toast({
          title: "Running AI Analysis",
          description: "No businesses found in Google Places. Automatically generating insights and suggestions...",
        });
      } else {
        // If some businesses were found, show success but keep track of any failures
        const successCount = data.leads.length;
        const failureCount = failedSearches.length - successCount;
        
        if (failureCount > 0) {
          // Keep only the failed searches for AI analysis
          const remainingFailedSearches = failedSearches.slice(successCount);
          setFailedSearches(remainingFailedSearches);
          
          toast({
            title: "Partial Analysis Complete", 
            description: `Found ${successCount} business${successCount !== 1 ? 'es' : ''}. ${failureCount} business${failureCount !== 1 ? 'es' : ''} couldn't be found.`,
          });
          
          // Auto-trigger AI analysis for remaining failed searches
          if (remainingFailedSearches.length > 0) {
            aiAnalysisMutation.mutate(remainingFailedSearches);
          }
        } else {
          setFailedSearches([]);
          toast({
            title: "Analysis Complete",
            description: `Successfully analyzed ${successCount} business${successCount !== 1 ? 'es' : ''}.`,
          });
        }
      }
    },
    onError: (error) => {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Failed to analyze leads. Please check your input and try again.",
        variant: "destructive",
      });
    },
  });

  // DOCX generation is now fully handled by DocxModal component

  const handleCorrectIncompleteData = (corrections: Array<{ id: string; name: string; rating: number; reviewCount: number }>) => {
    if (!analysisResults) return;
    
    // Create manual business data from corrections
    const manualBusinessData = corrections.map(correction => ({
      name: correction.name,
      address: analysisResults.leads.find(l => l.id === correction.id)?.address || 'Address not available',
      rating: correction.rating,
      reviewCount: correction.reviewCount
    }));
    
    // Re-run analysis with corrected data, including business category for competitor analysis
    analyzeMutation.mutate({ 
      leads: [], 
      competitors: [], 
      manualBusinessData,
      businessCategory: 'pest control' // Infer from business type for proper competitor analysis
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div 
                className="w-8 h-8 rounded-lg flex items-center justify-center mr-3"
                style={{ backgroundColor: brandSettings.primaryColor }}
              >
                <Rocket className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">{brandSettings.agencyName}</h1>
                <p className="text-sm text-slate-600">Prospect Analyzer</p>
              </div>
            </div>
            
            <SettingsDrawer>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Settings
              </Button>
            </SettingsDrawer>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LeadInput 
          onAnalyze={(leads, competitors, businessCategory, manualBusinessData) => {
            // Store input leads for tracking failed searches
            if (leads.length > 0) setFailedSearches([...leads]); 
            setIncompleteBusinesses([]); // Clear previous incomplete data
            setAiInsights(null); // Clear previous AI insights
            analyzeMutation.mutate({ 
              leads, 
              competitors, 
              businessCategory, 
              manualBusinessData: manualBusinessData?.map(b => ({
                ...b,
                address: b.address || 'Manual Entry'
              }))
            });
          }}
          isLoading={analyzeMutation.isPending}
        />

        {analyzeMutation.isPending && <LoadingState />}

        {analysisResults && !analyzeMutation.isPending && (
          <ResultsTable
            leads={analysisResults.leads}
            competitors={analysisResults.competitors}
            brandSettings={brandSettings}
            failedSearches={failedSearches}
            aiInsights={aiInsights}
            isAiAnalyzing={aiAnalysisMutation.isPending}
            incompleteBusinesses={incompleteBusinesses}
            onCorrectData={handleCorrectIncompleteData}
            isSubmittingCorrections={analyzeMutation.isPending}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600">
            <p className="text-sm">
              Powered by <span className="font-medium" style={{ color: brandSettings.primaryColor }}>{brandSettings.agencyName}</span> | 
              Transform your local business reviews into competitive advantages
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
