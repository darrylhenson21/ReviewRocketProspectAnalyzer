import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Star, CheckCircle, Info } from "lucide-react";
import { Alert, AlertDescription } from '@/components/ui/alert';

interface IncompleteBusinessData {
  id: string;
  name: string;
  address: string;
  rating: number;
  reviewCount: number;
}

interface ManualDataCorrectionProps {
  incompleteBusinesses: IncompleteBusinessData[];
  onCorrectData: (corrections: Array<{ id: string; name: string; rating: number; reviewCount: number }>) => void;
  isSubmitting: boolean;
}

export function ManualDataCorrection({ 
  incompleteBusinesses, 
  onCorrectData, 
  isSubmitting 
}: ManualDataCorrectionProps) {
  const [corrections, setCorrections] = useState<Record<string, { rating: string; reviewCount: string }>>({});

  const handleRatingChange = (businessId: string, rating: string) => {
    setCorrections(prev => ({
      ...prev,
      [businessId]: {
        ...prev[businessId],
        rating
      }
    }));
  };

  const handleReviewCountChange = (businessId: string, reviewCount: string) => {
    setCorrections(prev => ({
      ...prev,
      [businessId]: {
        ...prev[businessId],
        reviewCount
      }
    }));
  };

  const handleSubmit = () => {
    const validCorrections = incompleteBusinesses
      .map(business => ({
        id: business.id,
        name: business.name,
        rating: parseFloat(corrections[business.id]?.rating || '0') || 0,
        reviewCount: parseInt(corrections[business.id]?.reviewCount || '0') || 0
      }))
      .filter(correction => correction.rating > 0 || correction.reviewCount > 0);

    if (validCorrections.length === 0) {
      alert('Please enter rating and review count for at least one business.');
      return;
    }

    onCorrectData(validCorrections);
  };

  if (incompleteBusinesses.length === 0) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center space-x-2 text-amber-800">
          <Info className="h-5 w-5" />
          <span>Incomplete Business Data Detected</span>
        </CardTitle>
        <Alert className="mt-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            The following businesses were found via AI but have incomplete rating/review data. This typically happens because AI can identify businesses but cannot extract accurate review metrics. Please enter the correct rating and review count to generate accurate reports.
          </AlertDescription>
        </Alert>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium text-amber-900 mb-2">How to Find Accurate Data:</h4>
          <div className="text-sm text-amber-800 space-y-2">
            <div className="flex items-start space-x-2">
              <Star className="h-4 w-4 mt-0.5 text-amber-600" />
              <div>
                <strong>Google Maps:</strong> Search for the business and check the rating (1-5 stars) and total review count
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Star className="h-4 w-4 mt-0.5 text-amber-600" />
              <div>
                <strong>Business Website:</strong> Many businesses display their Google rating on their website
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <Star className="h-4 w-4 mt-0.5 text-amber-600" />
              <div>
                <strong>Multiple Sources:</strong> Cross-reference data from different platforms for accuracy
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {incompleteBusinesses.map((business) => (
            <div key={business.id} className="bg-white p-4 rounded-lg border border-amber-200">
              <div className="mb-3">
                <h4 className="font-medium text-gray-900">{business.name}</h4>
                <p className="text-sm text-gray-600">{business.address}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`rating-${business.id}`} className="text-sm font-medium text-gray-700">
                    Current Rating (1.0 - 5.0)
                  </Label>
                  <Input
                    id={`rating-${business.id}`}
                    type="number"
                    min="1.0"
                    max="5.0"
                    step="0.1"
                    placeholder="e.g., 4.5"
                    value={corrections[business.id]?.rating || ''}
                    onChange={(e) => handleRatingChange(business.id, e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor={`reviews-${business.id}`} className="text-sm font-medium text-gray-700">
                    Number of Reviews
                  </Label>
                  <Input
                    id={`reviews-${business.id}`}
                    type="number"
                    min="0"
                    placeholder="e.g., 287"
                    value={corrections[business.id]?.reviewCount || ''}
                    onChange={(e) => handleReviewCountChange(business.id, e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <Button 
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isSubmitting ? 'Updating Analysis...' : 'Update Analysis with Correct Data'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}