import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandSettings, brandSettingsSchema } from "@shared/schema";
import { getBrandSettings, saveBrandSettings } from "@/lib/settings";
import { useToast } from "@/hooks/use-toast";
import { Palette, Save, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [brandSettings, setBrandSettings] = useState<BrandSettings>(getBrandSettings());
  const [savingBrand, setSavingBrand] = useState(false);
  const { toast } = useToast();



  const handleBrandSettingsChange = (field: keyof BrandSettings, value: string) => {
    setBrandSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBrandSettings = async () => {
    setSavingBrand(true);
    try {
      const validated = brandSettingsSchema.parse(brandSettings);
      saveBrandSettings(validated);
      toast({
        title: "Settings Saved",
        description: "Brand settings have been updated successfully.",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Please check your settings and try again.",
        variant: "destructive",
      });
    } finally {
      setSavingBrand(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Brand Settings</h1>
          <p className="text-muted-foreground">
            Customize your agency branding for reports and communications
          </p>
        </div>
      </div>



      {/* Brand Customization */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Palette className="h-5 w-5" />
              <CardTitle>Brand Customization</CardTitle>
            </div>
            <Button 
              onClick={handleSaveBrandSettings} 
              disabled={savingBrand}
              variant="default"
              size="sm"
            >
              {savingBrand ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Brand Settings
            </Button>
          </div>
          <CardDescription>
            Customize agency branding for reports and communications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Agency Name */}
            <div className="space-y-2">
              <Label htmlFor="agencyName">Agency Name</Label>
              <Input
                id="agencyName"
                value={brandSettings.agencyName}
                onChange={(e) => handleBrandSettingsChange('agencyName', e.target.value)}
                placeholder="Your Agency Name"
              />
              <p className="text-xs text-muted-foreground">
                Appears on reports and email templates
              </p>
            </div>

            {/* Primary Color */}
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex space-x-2">
                <Input
                  id="primaryColor"
                  type="color"
                  value={brandSettings.primaryColor}
                  onChange={(e) => handleBrandSettingsChange('primaryColor', e.target.value)}
                  className="w-16 h-10 p-1 border rounded"
                />
                <Input
                  value={brandSettings.primaryColor}
                  onChange={(e) => handleBrandSettingsChange('primaryColor', e.target.value)}
                  placeholder="#0ea5e9"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Brand color for headers, buttons, and accents
              </p>
            </div>

            {/* Contact Email */}
            <div className="space-y-2">
              <Label htmlFor="contactEmail">Contact Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={brandSettings.contactEmail || ''}
                onChange={(e) => handleBrandSettingsChange('contactEmail', e.target.value)}
                placeholder="contact@youragency.com"
              />
              <p className="text-xs text-muted-foreground">
                Contact information for reports
              </p>
            </div>

            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                value={brandSettings.phoneNumber || ''}
                onChange={(e) => handleBrandSettingsChange('phoneNumber', e.target.value)}
                placeholder="(555) 123-4567"
              />
              <p className="text-xs text-muted-foreground">
                Phone number for client contact
              </p>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={brandSettings.website || ''}
                onChange={(e) => handleBrandSettingsChange('website', e.target.value)}
                placeholder="https://youragency.com"
              />
              <p className="text-xs text-muted-foreground">
                Agency website URL
              </p>
            </div>

            {/* Calendar Link */}
            <div className="space-y-2">
              <Label htmlFor="calendarLink">Calendar Booking Link</Label>
              <Input
                id="calendarLink"
                type="url"
                value={brandSettings.calendarLink || ''}
                onChange={(e) => handleBrandSettingsChange('calendarLink', e.target.value)}
                placeholder="https://calendly.com/youragency"
              />
              <p className="text-xs text-muted-foreground">
                Calendly or other booking system link
              </p>
            </div>
          </div>

          {/* Brand Preview */}
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-3">Brand Preview</h4>
            <div className="p-4 border rounded-lg bg-muted/50">
              <div 
                className="flex items-center justify-between p-4 rounded-md text-white"
                style={{ backgroundColor: brandSettings.primaryColor }}
              >
                <h3 className="font-bold text-lg">{brandSettings.agencyName}</h3>
                <div className="text-sm opacity-90">Business Analysis Report</div>
              </div>
              <div className="mt-3 p-3 bg-white rounded border">
                <p className="text-sm text-muted-foreground">
                  Report generated by <strong>{brandSettings.agencyName}</strong>
                </p>
                {brandSettings.contactEmail && (
                  <p className="text-sm text-muted-foreground">
                    Contact: {brandSettings.contactEmail}
                  </p>
                )}
                {brandSettings.phoneNumber && (
                  <p className="text-sm text-muted-foreground">
                    Phone: {brandSettings.phoneNumber}
                  </p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>


    </div>
  );
}