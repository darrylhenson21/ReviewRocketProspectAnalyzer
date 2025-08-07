import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, FileText, AlertCircle, Brain } from "lucide-react";
import { Lead, Competitor, BrandSettings } from "@shared/schema";
import { EmailTemplateModal } from "./email-template-modal";
import { DocxModal } from "./docx-modal";
import { ManualDataCorrection } from "./manual-data-correction";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface IncompleteBusinessData {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
}

interface ResultsTableProps {
  leads: Lead[];
  competitors: { [leadId: string]: Competitor[] };
  brandSettings: BrandSettings;
  failedSearches?: string[];
  aiInsights?: string | null;
  isAiAnalyzing?: boolean;
  incompleteBusinesses?: IncompleteBusinessData[];
  onCorrectData?: (corrections: Array<{ id: string; name: string; rating: number; reviewCount: number }>) => void;
  isSubmittingCorrections?: boolean;
}

export function ResultsTable({ 
  leads, 
  competitors, 
  brandSettings, 
  failedSearches = [], 
  aiInsights, 
  isAiAnalyzing = false,
  incompleteBusinesses = [],
  onCorrectData,
  isSubmittingCorrections = false
}: ResultsTableProps) {
  const [localAiInsights, setLocalAiInsights] = useState<string | null>(null);

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
      setLocalAiInsights(data.insights || "AI analysis completed. Consider trying different search terms or using manual business data entry.");
    },
    onError: (error) => {

      setLocalAiInsights("AI analysis failed. Please try again or use manual business data entry.");
    }
  });

  const handleAIAnalysis = () => {
    if (failedSearches.length > 0) {
      setLocalAiInsights(null);
      aiAnalysisMutation.mutate(failedSearches);
    }
  };
  const getScoreBadgeVariant = (score: string) => {
    switch (score) {
      case 'A':
        return 'default';
      case 'B':
        return 'secondary';
      case 'C':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getScoreBadgeClass = (score: string) => {
    switch (score) {
      case 'A':
        return 'score-badge-a';
      case 'B':
        return 'score-badge-b';
      case 'C':
        return 'score-badge-c';
      default:
        return 'score-badge-c';
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />);
    }
    
    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-3 h-3 fill-yellow-400/50 text-yellow-400" />);
    }
    
    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-3 h-3 text-slate-300" />);
    }
    
    return stars;
  };

  // Don't show "No Results Found" if we have incomplete businesses - they'll be handled above
  if (leads.length === 0 && incompleteBusinesses.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No Results Found</h3>
          <p className="text-slate-600 mb-4">The businesses you searched for couldn't be found in Google Places API.</p>
          
          {/* Manual AI Analysis Button */}
          {failedSearches.length > 0 && (
            <div className="mb-6">
              <Button
                onClick={handleAIAnalysis}
                disabled={isAiAnalyzing || aiAnalysisMutation.isPending}
                className="bg-purple-600 hover:bg-purple-700 text-white font-medium flex items-center space-x-2"
              >
                <Brain className="w-4 h-4" />
                <span>{isAiAnalyzing || aiAnalysisMutation.isPending ? 'AI Analyzing...' : 'Run AI Analysis'}</span>
              </Button>
              <p className="text-xs text-slate-500 mt-2">Let AI analyze why "{failedSearches[0]}" couldn't be found</p>
            </div>
          )}

          {/* AI Insights Display - show either automatic or manual insights */}
          {(aiInsights || localAiInsights) && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-left max-w-2xl mx-auto mb-4">
              <h4 className="font-medium text-purple-900 mb-2">🧠 {aiInsights ? 'Automatic AI Analysis:' : 'AI Analysis Results:'}</h4>
              <p className="text-sm text-purple-800">{aiInsights || localAiInsights}</p>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left max-w-lg mx-auto">
            <h4 className="font-medium text-blue-900 mb-2">💡 What to do next:</h4>
            <ol className="text-sm text-blue-800 space-y-2 list-decimal pl-4">
              <li><strong>Review AI insights above:</strong> Check the automatic analysis for suggestions and alternative search strategies</li>
              <li><strong>Try simpler search terms:</strong> Use just the business name without "LLC", "Inc", or location details</li>
              <li><strong>Check exact listing name:</strong> Some businesses are listed differently in Google Places than in Google Search</li>
              <li><strong>Manual entry works perfectly:</strong> Use the Manual Business Data section below - enter the business details you found and generate reports normally</li>
            </ol>
            <div className="mt-3 p-2 bg-blue-100 rounded border-l-4 border-blue-400">
              <p className="text-xs text-blue-700"><strong>AI Powered:</strong> The system automatically analyzes failed searches and provides intelligent suggestions.</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if any businesses have incomplete data
  const businessesWithIncompleteData = leads.filter(lead => {
    // Assuming we'll add a flag to detect incomplete data
    return lead.rating === 0 && lead.reviewCount === 0;
  });

  return (
    <div className="space-y-8">
      {/* Incomplete Business Data Section - Shows ABOVE analysis results */}
      {incompleteBusinesses.length > 0 && onCorrectData && (
        <ManualDataCorrection
          incompleteBusinesses={incompleteBusinesses}
          onCorrectData={onCorrectData}
          isSubmitting={isSubmittingCorrections}
        />
      )}

      <Card className="shadow-sm border border-slate-200">
        <div className="px-6 py-4 border-b border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-slate-800">Analysis Results</h3>
            <div className="flex items-center space-x-4 text-sm text-slate-600">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                <span>A-Grade</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                <span>B-Grade</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>C-Grade</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Reviews</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Score</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Gap Analysis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-slate-900">{lead.name}</div>
                      <div className="text-sm text-slate-500">{lead.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-slate-900 mr-2">{(lead.rating || 0).toFixed(1)}</span>
                      <div className="flex space-x-1">
                        {renderStars(lead.rating || 0)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-900">{lead.reviewCount || 0}</span>
                    <span className="text-xs text-slate-500 ml-1">reviews</span>
                  </td>
                  <td className="px-6 py-4">
                    <Badge 
                      variant={getScoreBadgeVariant(lead.score)}
                      className={`${getScoreBadgeClass(lead.score)} text-xs font-medium`}
                    >
                      {lead.score}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-600">
                      <span className={lead.gapAnalysis.startsWith('+') ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                        {lead.gapAnalysis}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <DocxModal
                        leadId={lead.id}
                        leadName={lead.name}
                        brandSettings={brandSettings}
                      />
                      <EmailTemplateModal 
                        leadId={lead.id}
                        leadName={lead.name}
                        brandSettings={brandSettings}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Competitor Analysis Preview for first lead */}
      {leads.length > 0 && competitors[leads[0].id] && competitors[leads[0].id].length > 0 && (
        <Card className="shadow-sm border border-slate-200">
          <CardContent className="p-6">
            <h4 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
              <FileText className="text-primary mr-2" />
              Competitor Analysis Sample ({leads[0].name})
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {competitors[leads[0].id].slice(0, 3).map((competitor, index) => (
                <div key={competitor.id} className="bg-slate-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-slate-800 truncate">{competitor.name}</h5>
                    <span className="text-xs text-slate-500">{(competitor.distance / 1000).toFixed(1)} km</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{competitor.rating.toFixed(1)}</span>
                    <div className="flex space-x-1">
                      {renderStars(competitor.rating)}
                    </div>
                    <span className="text-xs text-slate-500">({competitor.reviewCount} reviews)</span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800 flex items-start">
                <span className="text-amber-600 mr-2 mt-0.5">⚠️</span>
                <span>
                  <strong>Gap Insight:</strong> {leads[0].gapAnalysis.includes('fewer') 
                    ? `${leads[0].name} has fewer reviews than nearby competitors, reducing trust and local SEO visibility. Consider implementing a review acquisition strategy.`
                    : `${leads[0].name} has more reviews than nearby competitors, providing a competitive advantage in local search.`
                  }
                </span>
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
