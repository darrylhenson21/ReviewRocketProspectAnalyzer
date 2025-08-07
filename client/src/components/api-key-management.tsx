import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequestJson } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Plus, Eye, EyeOff, AlertCircle, CheckCircle, Key, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const apiKeyFormSchema = z.object({
  keyType: z.enum(['google_places', 'openai']),
  keyValue: z.string().min(1, "API key is required"),
});

type ApiKeyFormData = z.infer<typeof apiKeyFormSchema>;

interface ApiKey {
  id: string;
  keyType: string;
  keyValue: string;
  isActive: string;
  createdAt: string;
  updatedAt: string;
}

export function ApiKeyManagement() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [showKeyValue, setShowKeyValue] = useState<{ [key: string]: boolean }>({});
  const [testingKeys, setTestingKeys] = useState<{ [key: string]: boolean }>({});
  const [googleKey, setGoogleKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: apiKeys = [], isLoading } = useQuery<ApiKey[]>({
    queryKey: ['/api/keys'],
  });

  const form = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: {
      keyType: 'google_places',
      keyValue: '',
    },
  });

  const addKeyMutation = useMutation({
    mutationFn: (data: ApiKeyFormData) => apiRequestJson('/api/keys', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/keys'] });
      toast({
        title: "Success",
        description: "API key added successfully",
      });
      form.reset();
      setShowAddForm(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add API key",
        variant: "destructive",
      });
    },
  });

  const deleteKeyMutation = useMutation({
    mutationFn: (keyId: string) => apiRequestJson(`/api/keys/${keyId}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/keys'] });
      toast({
        title: "Success",
        description: "API key removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove API key",
        variant: "destructive",
      });
    },
  });

  const testKeyMutation = useMutation({
    mutationFn: ({ keyType, keyValue }: { keyType: string; keyValue: string }) =>
      apiRequestJson('/api/keys/test', {
        method: 'POST',
        body: JSON.stringify({ keyType, keyValue }),
      }),
    onSuccess: (data: any, variables) => {
      setTestingKeys(prev => ({ ...prev, [`${variables.keyType}_${variables.keyValue}`]: false }));
      if (data.valid) {
        toast({
          title: "Valid Key",
          description: data.message,
        });
      } else {
        toast({
          title: "Invalid Key",
          description: data.message,
          variant: "destructive",
        });
      }
    },
    onError: (error: any, variables) => {
      setTestingKeys(prev => ({ ...prev, [`${variables.keyType}_${variables.keyValue}`]: false }));
      toast({
        title: "Test Failed",
        description: error.message || "Failed to test API key",
        variant: "destructive",
      });
    },
  });

  const handleTestKey = (keyType: string, keyValue: string) => {
    const testKey = `${keyType}_${keyValue}`;
    setTestingKeys(prev => ({ ...prev, [testKey]: true }));
    testKeyMutation.mutate({ keyType, keyValue });
  };

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeyValue(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const maskKey = (key: string) => {
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '•'.repeat(key.length - 8) + key.substring(key.length - 4);
  };

  const getKeyTypeDisplay = (keyType: string) => {
    switch (keyType) {
      case 'google_places':
        return { name: 'Google Places API', color: 'bg-blue-100 text-blue-800' };
      case 'openai':
        return { name: 'OpenAI API', color: 'bg-green-100 text-green-800' };
      default:
        return { name: keyType, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // Check which key types are missing
  const hasGooglePlaces = apiKeys.some(key => key.keyType === 'google_places');
  const hasOpenAI = apiKeys.some(key => key.keyType === 'openai');
  const missingKeys = [];
  if (!hasGooglePlaces) missingKeys.push('Google Places API');
  if (!hasOpenAI) missingKeys.push('OpenAI API');

  return (
    <div className="space-y-4">
      {/* Status Alert */}
      {missingKeys.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Missing API Keys:</strong> {missingKeys.join(', ')}. 
            Add these keys to enable full functionality.
          </AlertDescription>
        </Alert>
      )}

      {/* Current API Keys */}
      <div className="space-y-3">
        {apiKeys.length > 0 ? (
          apiKeys.map((apiKey) => {
            const keyDisplay = getKeyTypeDisplay(apiKey.keyType);
            const testKey = `${apiKey.keyType}_${apiKey.keyValue}`;
            const isTesting = testingKeys[testKey];
            
            return (
              <Card key={apiKey.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Key className="h-4 w-4 text-gray-500" />
                    <div>
                      <Badge className={keyDisplay.color}>{keyDisplay.name}</Badge>
                      <div className="flex items-center space-x-2 mt-1">
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          {showKeyValue[apiKey.id] ? apiKey.keyValue : maskKey(apiKey.keyValue)}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleKeyVisibility(apiKey.id)}
                          className="h-6 w-6 p-0"
                        >
                          {showKeyValue[apiKey.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestKey(apiKey.keyType, apiKey.keyValue)}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <CheckCircle className="h-3 w-3" />
                      )}
                      Test
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteKeyMutation.mutate(apiKey.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <Key className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No API keys configured</p>
          </div>
        )}
      </div>

      {/* Add New Key Form */}
      {showAddForm ? (
        <Card className="p-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => addKeyMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="keyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select API Key Type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="google_places">Google Places API</SelectItem>
                        <SelectItem value="openai">OpenAI API</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="keyValue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>API Key</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Enter your API key" />
                    </FormControl>
                    <FormDescription>
                      Your API key will be stored securely and encrypted.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2">
                <Button 
                  type="submit" 
                  disabled={addKeyMutation.isPending}
                  className="flex-1"
                >
                  {addKeyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Add Key
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowAddForm(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </Card>
      ) : (
        <Button 
          onClick={() => setShowAddForm(true)} 
          className="w-full"
          variant="outline"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New API Key
        </Button>
      )}
    </div>
  );
}