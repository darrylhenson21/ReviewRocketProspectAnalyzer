import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { KeyStatus, getKeyStatus, saveKeys, removeKey, clearAllKeys, validateKeys } from '@/utils/keys';
import { Settings, Key, Eye, EyeOff, CheckCircle, AlertTriangle, Trash2, Loader2, ExternalLink } from 'lucide-react';

interface SettingsDrawerProps {
  children: React.ReactNode;
}

/**
 * Advanced key management for power users
 * Live status display, individual management, bulk operations
 */
export function SettingsDrawer({ children }: SettingsDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus>({ google: false, openai: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({ google: false, openai: false });
  const [validating, setValidating] = useState({ google: false, openai: false });
  const [removing, setRemoving] = useState({ google: false, openai: false });
  const [clearingAll, setClearingAll] = useState(false);
  
  const [showKeys, setShowKeys] = useState({ google: false, openai: false });
  const [googleKey, setGoogleKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  
  const { toast } = useToast();

  // Load status when drawer opens
  useEffect(() => {
    if (isOpen) {
      loadKeyStatus();
    }
  }, [isOpen]);

  const loadKeyStatus = async () => {
    setLoading(true);
    try {
      const status = await getKeyStatus();
      setKeyStatus(status);
    } catch (error) {

      toast({
        title: "Error",
        description: "Failed to load key status",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKey = async (keyType: 'google' | 'openai') => {
    const keyValue = keyType === 'google' ? googleKey : openaiKey;
    
    if (!keyValue.trim()) {
      toast({
        title: "Error",
        description: "Please enter an API key",
        variant: "destructive",
      });
      return;
    }

    setSaving(prev => ({ ...prev, [keyType]: true }));
    
    try {
      const keysToSave = keyType === 'google' 
        ? { GOOGLE_PLACES_API_KEY: keyValue.trim() }
        : { OPENAI_API_KEY: keyValue.trim() };

      await saveKeys(keysToSave);
      
      // Clear input and refresh status
      if (keyType === 'google') setGoogleKey('');
      if (keyType === 'openai') setOpenaiKey('');
      
      await loadKeyStatus();
      
      toast({
        title: "Success",
        description: `${keyType === 'google' ? 'Google Places' : 'OpenAI'} API key saved successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to save ${keyType === 'google' ? 'Google Places' : 'OpenAI'} key`,
        variant: "destructive",
      });
    } finally {
      setSaving(prev => ({ ...prev, [keyType]: false }));
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
          title: "Valid Key",
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

  const handleRemoveKey = async (keyType: 'google' | 'openai') => {
    setRemoving(prev => ({ ...prev, [keyType]: true }));
    
    try {
      await removeKey(keyType);
      await loadKeyStatus();
      
      toast({
        title: "Success",
        description: `${keyType === 'google' ? 'Google Places' : 'OpenAI'} API key removed successfully`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to remove ${keyType === 'google' ? 'Google Places' : 'OpenAI'} key`,
        variant: "destructive",
      });
    } finally {
      setRemoving(prev => ({ ...prev, [keyType]: false }));
    }
  };

  const handleClearAllKeys = async () => {
    setClearingAll(true);
    
    try {
      await clearAllKeys();
      await loadKeyStatus();
      
      // Clear all inputs
      setGoogleKey('');
      setOpenaiKey('');
      
      toast({
        title: "Success",
        description: "All API keys cleared successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear API keys",
        variant: "destructive",
      });
    } finally {
      setClearingAll(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {children}
      </SheetTrigger>
      <SheetContent className="w-[500px] sm:w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>API Key Management</span>
          </SheetTitle>
          <SheetDescription>
            Manage your API keys for Google Places and OpenAI services
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Status Overview */}
              <div className="flex space-x-4">
                <Badge variant={keyStatus.google ? "default" : "secondary"}>
                  {keyStatus.google ? "✓" : "✗"} Google Places
                </Badge>
                <Badge variant={keyStatus.openai ? "default" : "secondary"}>
                  {keyStatus.openai ? "✓" : "✗"} OpenAI
                </Badge>
              </div>

              {/* Google Places Key Management */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Google Places API</CardTitle>
                    <Badge variant={keyStatus.google ? "default" : "outline"}>
                      {keyStatus.google ? "Active" : "Not Configured"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Required for business data lookup and competitor analysis
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="google-key-settings">API Key</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="google-key-settings"
                        type={showKeys.google ? "text" : "password"}
                        value={googleKey}
                        onChange={(e) => setGoogleKey(e.target.value)}
                        placeholder="AIza..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowKeys(prev => ({ ...prev, google: !prev.google }))}
                      >
                        {showKeys.google ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveKey('google')}
                      disabled={saving.google || !googleKey.trim()}
                    >
                      {saving.google ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Save
                    </Button>
                    
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
                      Test
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Get Key
                    </Button>
                    
                    {keyStatus.google && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveKey('google')}
                        disabled={removing.google}
                        className="text-red-600 hover:text-red-700"
                      >
                        {removing.google ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* OpenAI Key Management */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">OpenAI API</CardTitle>
                    <Badge variant={keyStatus.openai ? "default" : "outline"}>
                      {keyStatus.openai ? "Active" : "Not Configured"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    Required for AI-powered insights and report generation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="openai-key-settings">API Key</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="openai-key-settings"
                        type={showKeys.openai ? "text" : "password"}
                        value={openaiKey}
                        onChange={(e) => setOpenaiKey(e.target.value)}
                        placeholder="sk-proj-..."
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowKeys(prev => ({ ...prev, openai: !prev.openai }))}
                      >
                        {showKeys.openai ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleSaveKey('openai')}
                      disabled={saving.openai || !openaiKey.trim()}
                    >
                      {saving.openai ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      ) : null}
                      Save
                    </Button>
                    
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
                      Test
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Get Key
                    </Button>
                    
                    {keyStatus.openai && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveKey('openai')}
                        disabled={removing.openai}
                        className="text-red-600 hover:text-red-700"
                      >
                        {removing.openai ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-1" />
                        )}
                        Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Bulk Operations */}
              {(keyStatus.google || keyStatus.openai) && (
                <Card className="border-red-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm text-red-600">Danger Zone</CardTitle>
                    <CardDescription className="text-xs">
                      Irreversible actions that will remove all API keys
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 border-red-200"
                          disabled={clearingAll}
                        >
                          {clearingAll ? (
                            <Loader2 className="h-3 w-3 animate-spin mr-1" />
                          ) : (
                            <AlertTriangle className="h-3 w-3 mr-1" />
                          )}
                          Clear All Keys
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear All API Keys</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove all saved API keys from your account. 
                            You will need to re-enter them to continue using the application.
                            This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={handleClearAllKeys}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Clear All Keys
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}