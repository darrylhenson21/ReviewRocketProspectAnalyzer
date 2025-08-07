import { Card, CardContent } from "@/components/ui/card";

export function LoadingState() {
  return (
    <Card className="mb-8">
      <CardContent className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <h3 className="text-lg font-medium text-slate-800 mb-2">Analyzing Prospects...</h3>
        <p className="text-slate-600">Fetching review data and competitor analysis from Google Places</p>
      </CardContent>
    </Card>
  );
}
