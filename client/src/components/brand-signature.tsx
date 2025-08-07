import { Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const BRAND_URL = "https://ezprofitsoftware.com/lazy-marketers-dream-come-true/";
const DEVELOPERS = "Lee Cole & Gloria Gunn";

export function BrandSignature() {
  return (
    <div className="flex items-center space-x-2">
      <a 
        href={BRAND_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-semibold text-blue-500 hover:underline whitespace-nowrap"
      >
        🚀 by <span className="font-bold">{DEVELOPERS}</span>
      </a>
      
      <Dialog>
        <DialogTrigger asChild>
          <button className="text-blue-500 hover:text-blue-600 p-1">
            <Info className="w-4 h-4" />
          </button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold mb-2">
              Review Rocket Prospect Analyzer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">© 2025 LinkedSure LLC</p>
            <p className="text-sm text-gray-600">
              Built for the Review Rocket reputation marketing suite.
            </p>
            <p>
              <a 
                className="text-blue-500 underline text-sm"
                href={BRAND_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                Get updates, bonuses & tutorials
              </a>
            </p>
            <div className="pt-2 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Personal license for buyers of Review Rocket Prospect Analyzer only.
                Redistribution or resale is prohibited without written authorization.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}