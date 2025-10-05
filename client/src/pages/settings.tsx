import { useState, useEffect } from "react";
import Sidebar from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/use-tenant";
import { authenticatedApiRequest } from "@/lib/auth";
import { PermissionGuard } from "@/components/ui/permission-guard";
import { PERMISSIONS } from "@/lib/permissions";
import { TenantSettings } from "@shared/schema";
import { 
  Settings, 
  Building2, 
  MessageSquare,
  Save,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const [settings, setSettings] = useState<TenantSettings>({
    companyName: "",
    address: "",
    phone: "",
    email: "",
    commissionRate: "5",
    currency: "INR",
    dateFormat: "DD/MM/YYYY",
    whatsapp: {
      enabled: false,
      creditBalance: 0,
      lowCreditThreshold: 50,
      scheduler: {
        enabled: true,
        preferredSendHour: 9,
        reminderFrequency: 'daily',
        sendOnWeekends: true
      }
    }
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveCreditBalance, setLiveCreditBalance] = useState<number | null>(null);
  const [creditLoading, setCreditLoading] = useState(false);

  const { toast } = useToast();
  const { tenant, isLoading } = useTenant();

  // Fetch live credit balance
  const fetchCreditBalance = async () => {
    if (!settings.whatsapp?.enabled) return;
    
    setCreditLoading(true);
    try {
      const response = await authenticatedApiRequest("GET", "/api/whatsapp/credits");
      const result = await response.json();
      if (result.success) {
        setLiveCreditBalance(result.data.balance);
      }
    } catch (error) {
      console.error("Failed to fetch credit balance:", error);
    } finally {
      setCreditLoading(false);
    }
  };

  // Load tenant settings on component mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!tenant) return;
      
      setLoading(true);
      try {
        const response = await authenticatedApiRequest("GET", "/api/tenants/current/settings");
        const tenantSettings = await response.json();
        
        // Map tenant settings to form state with defaults
        setSettings({
          companyName: tenantSettings.companyName || tenant.name || "",
          address: tenantSettings.address || "",
          phone: tenantSettings.phone || "",
          email: tenantSettings.email || "",
          commissionRate: tenantSettings.commissionRate || "5",
          currency: tenantSettings.currency || "INR",
          dateFormat: tenantSettings.dateFormat || "DD/MM/YYYY",
          whatsapp: {
            enabled: tenantSettings.whatsapp?.enabled ?? false,
            creditBalance: tenantSettings.whatsapp?.creditBalance ?? 0,
            lowCreditThreshold: tenantSettings.whatsapp?.lowCreditThreshold ?? 50,
            scheduler: {
              enabled: tenantSettings.whatsapp?.scheduler?.enabled ?? true,
              preferredSendHour: tenantSettings.whatsapp?.scheduler?.preferredSendHour ?? 9,
              reminderFrequency: tenantSettings.whatsapp?.scheduler?.reminderFrequency || 'daily',
              sendOnWeekends: tenantSettings.whatsapp?.scheduler?.sendOnWeekends ?? true
            }
          }
        });
      } catch (error) {
        console.error("Failed to load settings:", error);
        toast({
          title: "Error loading settings",
          description: "Failed to load organization settings. Using defaults.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (tenant && !isLoading) {
      loadSettings();
    }
  }, [tenant, isLoading, toast]);

  // Fetch credit balance when WhatsApp is enabled
  useEffect(() => {
    if (settings.whatsapp?.enabled) {
      fetchCreditBalance();
    }
  }, [settings.whatsapp?.enabled]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Defense-in-depth: Clone and strip creditBalance before sending
      const payload = JSON.parse(JSON.stringify(settings));
      if (payload.whatsapp) delete payload.whatsapp.creditBalance;
      
      await authenticatedApiRequest("PUT", "/api/tenants/current/settings", payload);
      toast({
        title: "Settings saved",
        description: "Organization settings have been updated successfully",
      });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error saving settings",
        description: "Failed to save organization settings. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleWhatsAppSettingChange = (key: string, value: any) => {
    const defaultWhatsApp = {
      enabled: false,
      creditBalance: 0,
      lowCreditThreshold: 50,
      scheduler: {
        enabled: true,
        preferredSendHour: 9,
        reminderFrequency: 'daily' as const,
        sendOnWeekends: true
      }
    };

    if (key.startsWith('scheduler.')) {
      const schedulerKey = key.replace('scheduler.', '');
      setSettings(prev => ({
        ...prev,
        whatsapp: {
          ...defaultWhatsApp,
          ...prev.whatsapp,
          scheduler: {
            ...defaultWhatsApp.scheduler,
            ...prev.whatsapp?.scheduler,
            [schedulerKey]: value
          }
        }
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        whatsapp: {
          ...defaultWhatsApp,
          ...prev.whatsapp,
          [key]: value
        }
      }));
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground">Organization Settings</h2>
              <p className="text-sm text-muted-foreground">
                Configure your organization preferences and business settings
              </p>
            </div>
            <PermissionGuard permission={PERMISSIONS.MANAGE_SETTINGS}>
              <Button 
                onClick={handleSave} 
                className="gap-2" 
                data-testid="button-save-settings"
                disabled={saving || loading}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </PermissionGuard>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 space-y-6">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Loading organization settings...</span>
            </div>
          )}

          {!loading && (
          <>
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Company Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={settings.companyName}
                  onChange={(e) => handleSettingChange("companyName", e.target.value)}
                  data-testid="input-company-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => handleSettingChange("address", e.target.value)}
                  data-testid="textarea-address"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={settings.phone}
                    onChange={(e) => handleSettingChange("phone", e.target.value)}
                    data-testid="input-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleSettingChange("email", e.target.value)}
                    data-testid="input-email"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Business Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Business Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="commissionRate">Default Commission Rate (%)</Label>
                  <Input
                    id="commissionRate"
                    type="number"
                    step="0.01"
                    value={settings.commissionRate}
                    onChange={(e) => handleSettingChange("commissionRate", e.target.value)}
                    data-testid="input-commission-rate"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select 
                    value={settings.currency} 
                    onValueChange={(value) => handleSettingChange("currency", value)}
                  >
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                      <SelectItem value="USD">US Dollar ($)</SelectItem>
                      <SelectItem value="EUR">Euro (€)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dateFormat">Date Format</Label>
                  <Select 
                    value={settings.dateFormat} 
                    onValueChange={(value) => handleSettingChange("dateFormat", value)}
                  >
                    <SelectTrigger data-testid="select-date-format">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* WhatsApp Management */}
          <PermissionGuard permission={PERMISSIONS.MANAGE_SETTINGS}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  WhatsApp Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Enable WhatsApp Section */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable WhatsApp Integration</Label>
                    <p className="text-sm text-muted-foreground">
                      Enable WhatsApp messaging for invoices and payment reminders
                    </p>
                  </div>
                  <Switch
                    checked={settings.whatsapp?.enabled ?? false}
                    onCheckedChange={(checked) => handleWhatsAppSettingChange("enabled", checked)}
                    data-testid="switch-whatsapp-enabled"
                  />
                </div>

                {settings.whatsapp?.enabled && (
                  <>
                    <Separator />
                    
                    {/* Credit Information Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="creditBalance">Credit Balance (Read-only)</Label>
                        <Input
                          id="creditBalance"
                          type="number"
                          value={liveCreditBalance !== null ? liveCreditBalance : (settings.whatsapp?.creditBalance ?? 0)}
                          disabled
                          data-testid="input-credit-balance"
                        />
                        <p className="text-xs text-muted-foreground">
                          {creditLoading ? "Loading current balance..." : "Credits are managed through transactions"}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lowCreditThreshold">Low Credit Threshold</Label>
                        <Input
                          id="lowCreditThreshold"
                          type="number"
                          min="1"
                          value={settings.whatsapp?.lowCreditThreshold ?? 50}
                          onChange={(e) => {
                            const value = e.currentTarget.valueAsNumber;
                            if (!isNaN(value) && value >= 1) {
                              handleWhatsAppSettingChange("lowCreditThreshold", value);
                            }
                          }}
                          data-testid="input-low-credit-threshold"
                        />
                      </div>
                    </div>

                    <Separator />
                    
                    {/* Scheduler Settings Section */}
                    <div className="space-y-4">
                      <Label className="text-sm font-medium">Automatic Reminder Scheduler</Label>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Enable Automatic Reminders</Label>
                          <p className="text-sm text-muted-foreground">
                            Automatically send payment reminders to vendors and retailers
                          </p>
                        </div>
                        <Switch
                          checked={settings.whatsapp?.scheduler?.enabled ?? true}
                          onCheckedChange={(checked) => handleWhatsAppSettingChange("scheduler.enabled", checked)}
                          data-testid="switch-scheduler-enabled"
                        />
                      </div>

                      {settings.whatsapp?.scheduler?.enabled && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="preferredSendHour">Preferred Send Hour (0-23)</Label>
                            <Input
                              id="preferredSendHour"
                              type="number"
                              min="0"
                              max="23"
                              value={settings.whatsapp?.scheduler?.preferredSendHour ?? 9}
                              onChange={(e) => {
                                const value = e.currentTarget.valueAsNumber;
                                if (!isNaN(value) && value >= 0 && value <= 23) {
                                  handleWhatsAppSettingChange("scheduler.preferredSendHour", value);
                                }
                              }}
                              data-testid="input-preferred-hour"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="reminderFrequency">Reminder Frequency</Label>
                            <Select 
                              value={settings.whatsapp?.scheduler?.reminderFrequency ?? 'daily'} 
                              onValueChange={(value) => handleWhatsAppSettingChange("scheduler.reminderFrequency", value)}
                            >
                              <SelectTrigger data-testid="select-reminder-frequency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label>Send on Weekends</Label>
                            </div>
                            <Switch
                              checked={settings.whatsapp?.scheduler?.sendOnWeekends ?? true}
                              onCheckedChange={(checked) => handleWhatsAppSettingChange("scheduler.sendOnWeekends", checked)}
                              data-testid="switch-send-weekends"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </PermissionGuard>
          </>
          )}
        </main>
      </div>
    </div>
  );
}