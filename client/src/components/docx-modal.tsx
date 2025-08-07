import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Eye, Loader2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface DocxModalProps {
  leadId: string;
  leadName: string;
  brandSettings: {
    agencyName: string;
    primaryColor: string;
  };
}

export function DocxModal({ leadId, leadName, brandSettings }: DocxModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [docxPreview, setDocxPreview] = useState<string | null>(null);
  const { toast } = useToast();

  // Generate DOCX and get preview
  const generateDocxMutation = useMutation({
    mutationFn: async () => {


      const response = await fetch('/api/docx', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          brandSettings,
        })
      });



      if (!response.ok) {
        const errorText = await response.text();
        console.error('DOCX API error response:', errorText);
        throw new Error(`DOCX generation failed: ${response.status} - ${errorText}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error('Generated DOCX is empty');
      }

      return blob;
    },
    onSuccess: (blob) => {
      
      // Create a preview message
      const previewText = `Word Report Generated Successfully!\n\nBusiness: ${leadName}\nReport Size: ${(blob.size / 1024).toFixed(1)} KB\nFormat: Microsoft Word (.docx)\n\nThis comprehensive report includes:\n• Business analysis and competitive positioning\n• Market opportunity insights\n• Strategic recommendations\n• Professional formatting for client presentation\n\nClick "Download Report" below to save the file to your device.`;
      
      setDocxPreview(previewText);
      
      // Store the blob for download with better filename handling
      const url = URL.createObjectURL(blob);
      const sanitizedName = leadName
        .replace(/[^a-zA-Z0-9\s\-_.]/g, '') // Keep letters, numbers, spaces, hyphens, underscores, dots
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
      
      const filename = `${sanitizedName || 'business'}-report.docx`;
      
      (window as any).currentDocxBlob = { 
        url, 
        filename,
        blob: blob // Store original blob as backup
      };
      
      toast({
        title: "Word Report Ready",
        description: "Report generated successfully and ready for download.",
      });
    },
    onError: (error) => {
      console.error('DOCX generation error:', error);
      toast({
        title: "Report Generation Failed",
        description: `Failed to generate Word report: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async () => {
    try {
      const blobData = (window as any).currentDocxBlob;
      if (!blobData) {
        throw new Error("No report data available. Please generate the report first.");
      }


      
      // Method 1: Try direct blob download with enhanced error detection
      try {
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobData.url;
        link.download = blobData.filename;
        link.setAttribute('download', blobData.filename);
        
        // Add to DOM
        document.body.appendChild(link);
        
        // Test if the download attribute is supported
        const isDownloadSupported = 'download' in link;

        
        if (!isDownloadSupported) {
          throw new Error('Download attribute not supported by browser');
        }
        
        // Create a more reliable click event
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: true
        });
        
        // Single click method to prevent duplicate downloads
        link.click();
        
        // Cleanup after delay
        setTimeout(() => {
          try {
            if (document.body.contains(link)) {
              document.body.removeChild(link);
            }
          } catch (e) {
            // Silent cleanup
          }
        }, 2000);

        // Show success message
        toast({
          title: "Download Started",
          description: `${blobData.filename} download initiated successfully.`,
        });
        
        // Return successfully - don't fall through to other methods
        return;
        
      } catch (linkError) {

        toast({
          title: "Direct Download Failed",
          description: "Trying alternative download method...",
          variant: "destructive",
        });
      }
      
      // Method 2: Try creating a temporary download link with user interaction
      try {

        
        // Create a visible button for user to click (some browsers require user interaction)
        const downloadButton = document.createElement('button');
        downloadButton.textContent = `Click to Download ${blobData.filename}`;
        downloadButton.style.cssText = `
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10000;
          padding: 12px 24px;
          background: #22c55e;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        `;
        
        downloadButton.onclick = () => {
          const link = document.createElement('a');
          link.href = blobData.url;
          link.download = blobData.filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          document.body.removeChild(downloadButton);
          
          toast({
            title: "Download Started",
            description: "File download initiated successfully!",
          });
        };
        
        document.body.appendChild(downloadButton);
        
        // Auto-remove button after 10 seconds
        setTimeout(() => {
          if (document.body.contains(downloadButton)) {
            document.body.removeChild(downloadButton);
          }
        }, 10000);
        
        toast({
          title: "Manual Download Required",
          description: "Click the green download button that appeared on screen.",
        });
        
        return;
        
      } catch (buttonError) {

      }
      
      // Method 3: Try window.open as fallback
      try {
        console.log('Trying window.open method...');
        const newWindow = window.open(blobData.url, '_blank');
        if (newWindow) {
          newWindow.document.title = blobData.filename;
          toast({
            title: "Report Opened",
            description: "Report opened in new tab. Use Ctrl+S (or Cmd+S on Mac) to save the file.",
          });
          return;
        }
      } catch (windowError) {

      }
      
      // Method 3: Try server-side download endpoint
      try {

        
        const serverDownloadUrl = `/api/docx-download/${leadId}?filename=${encodeURIComponent(blobData.filename)}`;
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = serverDownloadUrl;
        link.download = blobData.filename;
        
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          try {
            document.body.removeChild(link);
          } catch (e) {
            console.warn('Server link cleanup failed:', e);
          }
        }, 1000);
        
        toast({
          title: "Trying Alternative Download",
          description: "Attempting download via server. If this fails, please try a different browser.",
        });
        
        return;
        
      } catch (serverError) {

      }
      
      // Method 4: Copy download URL to clipboard as last resort
      try {
        await navigator.clipboard.writeText(blobData.url);
        toast({
          title: "Download URL Copied",
          description: "Download URL copied to clipboard. Paste in address bar to download.",
        });
      } catch (clipboardError) {
        console.warn('Clipboard copy failed:', clipboardError);
        
        // Final fallback: Show download URL in alert
        const downloadUrl = blobData.url;
        alert(`Please copy this URL to download your report:\n\n${downloadUrl}`);
      }
      
    } catch (error) {
      console.error('Download failed completely:', error);
      toast({
        title: "Download Failed",
        description: error instanceof Error ? error.message : "Unable to download report. Please try regenerating.",
        variant: "destructive",
      });
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    setDocxPreview(null);
    // Clean up any existing blob URLs
    cleanupBlobData();
    // Auto-generate when modal opens
    generateDocxMutation.mutate();
  };

  const cleanupBlobData = () => {
    const blobData = (window as any).currentDocxBlob;
    if (blobData?.url) {
      try {
        URL.revokeObjectURL(blobData.url);
      } catch (e) {
        // Silent cleanup
      }
      delete (window as any).currentDocxBlob;
    }
  };

  const handleCloseModal = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
      // Clean up blob data when modal closes
      setTimeout(cleanupBlobData, 1000); // Delay cleanup in case user is downloading
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCloseModal}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          onClick={handleOpenModal}
          className="bg-primary hover:bg-primary/90 text-white text-xs font-medium"
        >
          <FileText className="w-3 h-3 mr-1" />
          Generate Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-primary" />
            <span>Word Report for {leadName}</span>
            <Badge variant="secondary" className="text-xs">
              DOCX Format
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {generateDocxMutation.isPending && (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
                <p className="text-sm text-slate-600">Generating personalized Word report...</p>
                <p className="text-xs text-slate-500 mt-1">This may take a few seconds</p>
              </div>
            </div>
          )}

          {docxPreview && (
            <div className="space-y-4">
              <div className="bg-slate-50 border rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Eye className="w-5 h-5 text-slate-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-900 mb-2">Report Preview</h4>
                    <pre className="text-sm text-slate-700 whitespace-pre-wrap font-mono bg-white p-3 rounded border">
                      {docxPreview}
                    </pre>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="text-sm text-slate-600">
                  <p>Ready for download • Microsoft Word format</p>
                  <p className="text-xs text-slate-500">Compatible with Word, Google Docs, and other editors</p>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => handleCloseModal(false)}
                    size="sm"
                  >
                    Close
                  </Button>
                  <Button
                    onClick={handleDownload}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    size="sm"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>
            </div>
          )}

          {generateDocxMutation.isError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-red-600 text-xs">!</span>
                </div>
                <div>
                  <h4 className="font-medium text-red-900">Generation Failed</h4>
                  <p className="text-sm text-red-700 mt-1">
                    Unable to generate the Word report. Please try again or contact support if the issue persists.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateDocxMutation.mutate()}
                    className="mt-3 text-red-600 border-red-300 hover:bg-red-50"
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}