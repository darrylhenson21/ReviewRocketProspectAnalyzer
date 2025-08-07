import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Search, Info, Lightbulb, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useQuery } from '@tanstack/react-query';
import { AnalyzeLeadsRequest } from '@shared/schema';



interface BusinessDiscoveryAnalysis {
  suggestions: string[];
  insights: string;
  nextSteps: string[];
}

interface DiscoveryInsights {
  originalInput: string;
  analysis: BusinessDiscoveryAnalysis;
}

interface LeadInputProps {
  onAnalyze: (leads: string[], competitors?: string[], businessCategory?: string, manualBusinessData?: AnalyzeLeadsRequest['manualBusinessData']) => void;
  isLoading: boolean;
}

export function LeadInput({ onAnalyze, isLoading }: LeadInputProps) {
  const [input, setInput] = useState("");
  const [businessCity, setBusinessCity] = useState("");
  const [businessState, setBusinessState] = useState("");
  const [competitorInput, setCompetitorInput] = useState("");
  const [businessCategory, setBusinessCategory] = useState("");

  const [failedSearches, setFailedSearches] = useState<string[]>([]);

  // Get smart business discovery suggestions for failed searches
  const { data: discoveryInsights } = useQuery<DiscoveryInsights>({
    queryKey: ['/api/business-discovery', failedSearches.join(',')],
    queryFn: async () => {
      if (failedSearches.length === 0) return null;
      const businessInput = failedSearches[0]; // Use first failed search

      const response = await fetch('/api/business-discovery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessInput,
          previousAttempts: ["Google Places API search"]
        })
      });
      if (!response.ok) throw new Error('Failed to fetch discovery insights');
      const result = await response.json();

      return result;
    },
    enabled: failedSearches.length > 0,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleAnalyze = () => {
    if (!input.trim()) {
      alert('Please enter a business name to analyze');
      return;
    }

    // Combine business name with city and state for precise location targeting
    let searchQuery = input.trim();
    if (businessCity.trim() && businessState.trim()) {
      searchQuery = `${input.trim()}, ${businessCity.trim()}, ${businessState.trim()}`;
    } else if (businessCity.trim()) {
      searchQuery = `${input.trim()}, ${businessCity.trim()}`;
    }

    const leads = [searchQuery];
    
    const competitors = competitorInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    // Trigger discovery insights for search attempts
    setFailedSearches(leads);
    
    onAnalyze(
      leads, 
      competitors.length > 0 ? competitors : undefined,
      businessCategory.trim() || undefined,
      undefined // Remove manual business data - automatic fallback handles this
    );
  };



  return (
    <Card className="mb-8 shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Analyze Your Prospects</h2>
          <p className="text-slate-600 mb-3">An intelligent lead scoring and reporting tool that analyzes a prospect's online reputation, ranks their review health against local competitors, and creates professional marketing reports to warm up leads and accelerate sales.</p>
          <p className="text-slate-500 text-sm"><strong>Important:</strong> Enter the exact business name and location for precise targeting. This prevents matching wrong businesses with duplicate names across different cities.</p>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Business Name</label>
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="w-full border-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter exact business name (e.g., 'Advantage Pest Control')"
            />
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <Info className="w-3 h-3 mr-1" />
              Use exact business name from Google Maps without location details.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">City</label>
              <Input 
                value={businessCity}
                onChange={(e) => setBusinessCity(e.target.value)}
                className="w-full border-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., Waco"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">State</label>
              <Input 
                value={businessState}
                onChange={(e) => setBusinessState(e.target.value)}
                className="w-full border-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="e.g., TX"
                maxLength={2}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Business Category (Optional)</label>
            <Input
              value={businessCategory}
              onChange={(e) => setBusinessCategory(e.target.value)}
              className="w-full border-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="e.g., roofing contractors, pest control, dentists, restaurants..."
            />
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <Info className="w-3 h-3 mr-1" />
              Helps find relevant competitors. If left blank, system will auto-detect from business name.
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Competitor Businesses (Optional - For More Accurate Analysis)
            </label>
            <p className="text-sm text-slate-600 mb-2">
              <strong>Copy exact competitor names from Google Places/Maps</strong> for accurate data. One per line.
            </p>
            <Textarea 
              value={competitorInput}
              onChange={(e) => setCompetitorInput(e.target.value)}
              rows={4}
              className="w-full resize-none border-slate-300 focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder={`Enter competitor business names and locations for targeted analysis:

Best Pizza Place, New York NY
Tony's Italian, New York NY
Local Bistro, New York NY`}
            />
            <p className="text-xs text-slate-500 mt-1 flex items-center">
              <Info className="w-3 h-3 mr-1" />
              Manual competitor input provides more targeted analysis than automatic discovery.
            </p>
          </div>


          
          {/* AI-Powered Business Discovery Insights */}
          {discoveryInsights && discoveryInsights.analysis && (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <Lightbulb className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>Smart Discovery Insights:</strong> {discoveryInsights.analysis.insights}
                </AlertDescription>
              </Alert>
              
              {/* Note: Automatic fallback now handles this automatically */}
              {input.trim() && (
                <Alert className="border-green-200 bg-green-50">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    <strong>Automatic Fallback Enabled</strong>
                    <p className="text-sm mt-1">When Google Places API can't find a business, our system automatically creates intelligent entries with smart defaults based on the business category.</p>
                  </AlertDescription>
                </Alert>
              )}
              
              {discoveryInsights.analysis.suggestions && discoveryInsights.analysis.suggestions.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    <strong>Alternative Search Strategies:</strong>
                    <ul className="mt-2 list-disc pl-5 space-y-1">
                      {discoveryInsights.analysis.suggestions.map((suggestion: string, index: number) => (
                        <li key={index} className="text-sm">{suggestion}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <div className="flex justify-end">
            <Button 
              onClick={handleAnalyze}
              disabled={isLoading || !input.trim()}
              className="bg-primary hover:bg-primary/90 text-white font-medium flex items-center space-x-2"
            >
              <Search className="w-4 h-4" />
              <span>Analyze Leads</span>
            </Button>
          </div>
          
          {businessCity.trim() && businessState.trim() && (
            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-xs text-green-700 flex items-center">
                <Info className="w-3 h-3 mr-1" />
                <strong>Location targeting enabled:</strong> Will search for "{input.trim()}" specifically in {businessCity.trim()}, {businessState.trim()}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
