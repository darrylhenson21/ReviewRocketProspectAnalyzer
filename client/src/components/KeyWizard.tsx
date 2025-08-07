import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { KeyStatus, getKeyStatus, saveKeys, validateKeys } from '@/utils/keys';
import { Key, ExternalLink, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface KeyWizardProps {
  children: React.ReactNode;
}

/**
 * Setup wizard for first-time users
 * Blocking modal that prevents app use until OpenAI key is configured
 */
export function KeyWizard({ children }: KeyWizardProps) {
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({ google: false, openai: false });
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState({ google: false, openai: false });
  
  const [googleKey, setGoogleKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  
  const { toast } = useToast();

  // Check key status on mount
  useEffect(() => {
    checkKeyStatus();
  }, []);

  const checkKeyStatus = async () => {
    setLoading(true);
    try {
      const status = await getKeyStatus();
      setKeyStatus(status);
      
      // Critical Business Logic: Only OpenAI is required
      const hasRequiredKeys = status.openai;
      setShowModal(!hasRequiredKeys);
    } catch (error) {

      setShowModal(true); // Show modal on error to be safe
    } finally {
      setLoading(false);
    }
  };

  const handleValidateKey = async (keyType: 'google' | 'openai') => {
    const keyValue = keyType === 'google' ? googleKey : openaiKey;
    
    if (!keyValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key to validate",
        variant: "destructive",
      });
      return;
    }

    setValidating(prev => ({ ...prev, [keyType]: true }));
    
    try {
      const validationData = keyType === 'google' 
        ? { GOOGLE_PLACES_API_KEY: keyValue }
        : { OPENAI_API_KEY: keyValue };
        
      const result = await validateKeys(validationData);
      const serviceResult = result.results.find((r: any) => r.service === keyType);
      
      if (serviceResult?.valid) {
        toast({
          title: "Success",
          description: `${keyType === 'google' ? 'Google Places' : 'OpenAI'} API key is valid`,
        });
      } else {
        toast({
          title: "Invalid Key",
          description: serviceResult?.message || 'API key validation failed',
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: `Failed to validate ${keyType === 'google' ? 'Google Places' : 'OpenAI'} API key`,
        variant: "destructive",
      });
    } finally {
      setValidating(prev => ({ ...prev, [keyType]: false }));
    }
  };

  const handleSaveKeys = async () => {
    if (!openaiKey.trim()) {
      toast({
        title: "Required Key Missing",
        description: "OpenAI API key is required to continue",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const keysToSave: any = { OPENAI_API_KEY: openaiKey.trim() };
      
      if (googleKey.trim()) {
        keysToSave.GOOGLE_PLACES_API_KEY = googleKey.trim();
      }

      await saveKeys(keysToSave);
      
      // Refresh status
      await checkKeyStatus();
      
      toast({
        title: "Success",
        description: "API keys saved successfully",
      });

      // Clear inputs
      setGoogleKey('');
      setOpenaiKey('');
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save API keys",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Critical Business Logic: Only require OpenAI key
  const hasRequiredKeys = keyStatus.openai;
  
  if (!hasRequiredKeys) {
    return (
      <Dialog open={showModal} onOpenChange={() => {}}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Key className="h-5 w-5" />
              <span>API Key Setup Required</span>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="flex space-x-4">
              <Badge variant={keyStatus.openai ? "default" : "destructive"}>
                {keyStatus.openai ? "✓" : "✗"} OpenAI (Required)
              </Badge>
              <Badge variant={keyStatus.google ? "default" : "secondary"}>
                {keyStatus.google ? "✓" : "✗"} Google Places (Recommended)
              </Badge>
            </div>

            {/* OpenAI Key Setup */}
            <Card className="border-l-4 border-l-red-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-red-600">OpenAI API Key (Required)</CardTitle>
                <CardDescription className="text-xs">
                  Required for AI-powered business insights and report generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="openai-key">API Key</Label>
                  <Input
                    id="openai-key"
                    type="password"
                    value={openaiKey}
                    onChange={(e) => setOpenaiKey(e.target.value)}
                    placeholder="sk-proj-..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleValidateKey('openai')}
                    disabled={validating.openai || !openaiKey.trim()}
                  >
                    {validating.openai ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    Test Key
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Get API Key
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Google Places Key Setup */}
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm text-blue-600">Google Places API Key (Recommended)</CardTitle>
                <CardDescription className="text-xs">
                  Required for business data lookup and competitor analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="google-key">API Key</Label>
                  <Input
                    id="google-key"
                    type="password"
                    value={googleKey}
                    onChange={(e) => setGoogleKey(e.target.value)}
                    placeholder="AIza..."
                  />
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleValidateKey('google')}
                    disabled={validating.google || !googleKey.trim()}
                  >
                    {validating.google ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    )}
                    Test Key
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Get API Key
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                onClick={handleSaveKeys}
                disabled={saving || !openaiKey.trim()}
                className="flex-1"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Save Keys & Continue
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
              <AlertCircle className="h-4 w-4 inline mr-1" />
              <strong>Note:</strong> Only the OpenAI API key is required to start using the application. 
              Google Places API enhances business data lookup but can be added later in Settings.
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Allow app use when required keys are present
  return <>{children}</>;
}