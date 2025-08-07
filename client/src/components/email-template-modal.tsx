import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Copy, Check } from "lucide-react";
import { BrandSettings, EmailTemplateResponse } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface EmailTemplateModalProps {
  leadId: string;
  leadName: string;
  brandSettings: BrandSettings;
}

export function EmailTemplateModal({ leadId, leadName, brandSettings }: EmailTemplateModalProps) {
  const [open, setOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const emailMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/email-template', {
        method: 'POST',
        body: JSON.stringify({
          leadId,
          brandSettings
        })
      });
      return response.json() as Promise<EmailTemplateResponse>;
    },
    onError: (error) => {
      toast({
        title: "Generation Failed",
        description: "Failed to generate email templates. Please try again.",
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy to clipboard. Please copy manually.",
        variant: "destructive",
      });
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !emailMutation.data && !emailMutation.isPending) {
      emailMutation.mutate();
    }
  };

  const CopyButton = ({ text, field }: { text: string; field: string }) => (
    <Button
      variant="outline"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="ml-2"
    >
      {copiedField === field ? (
        <Check className="w-4 h-4" />
      ) : (
        <Copy className="w-4 h-4" />
      )}
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Mail className="w-4 h-4 mr-2" />
          Generate Email
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Prospecting Email Templates for {leadName}</DialogTitle>
          <DialogDescription>
            Copy and paste these templates for your outreach campaigns
          </DialogDescription>
        </DialogHeader>

        {emailMutation.isPending && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-sm text-slate-600">Generating personalized email templates...</p>
            </div>
          </div>
        )}

        {emailMutation.data && (
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </TabsTrigger>
              <TabsTrigger value="dm" className="flex items-center">
                <MessageSquare className="w-4 h-4 mr-2" />
                DM Message
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="subject">Subject Line</Label>
                  <CopyButton text={emailMutation.data.subject} field="Subject Line" />
                </div>
                <Input
                  id="subject"
                  value={emailMutation.data.subject}
                  readOnly
                  className="font-medium"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="email-body">Email Body</Label>
                  <CopyButton text={emailMutation.data.emailBody} field="Email Body" />
                </div>
                <Textarea
                  id="email-body"
                  value={emailMutation.data.emailBody}
                  readOnly
                  rows={15}
                  className="resize-none text-sm"
                />
              </div>
            </TabsContent>

            <TabsContent value="dm" className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="dm-message">Direct Message (Social Media/LinkedIn)</Label>
                  <CopyButton text={emailMutation.data.dmMessage} field="DM Message" />
                </div>
                <Textarea
                  id="dm-message"
                  value={emailMutation.data.dmMessage}
                  readOnly
                  rows={8}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Optimized for LinkedIn, Facebook, or other social media platforms
                </p>
              </div>
            </TabsContent>
          </Tabs>
        )}

        {emailMutation.error && (
          <div className="text-center py-4">
            <p className="text-red-600 mb-2">Failed to generate email templates</p>
            <Button
              variant="outline"
              onClick={() => emailMutation.mutate()}
              disabled={emailMutation.isPending}
            >
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}