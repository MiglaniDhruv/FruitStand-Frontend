import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/lib/auth";
import { Apple } from "lucide-react";

interface LoginProps {
  redirectTo?: string;
}

export default function Login({ redirectTo }: LoginProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  });
  const [pageTitle, setPageTitle] = useState("APMC System");
  const [pageDescription, setPageDescription] = useState("Commission Merchant Accounting System");
  const { toast } = useToast();

  useEffect(() => {
    const match = typeof window !== 'undefined' ? window.location.pathname.match(/^\/([^\/]+)\/login\/?$/) : null;
    const slugFromUrl = match?.[1];

    const storedSlug = localStorage.getItem('currentTenantSlug');
    const effectiveSlug = slugFromUrl || storedSlug || null;

    if (slugFromUrl && storedSlug !== slugFromUrl) {
      localStorage.setItem('currentTenantSlug', slugFromUrl);
    }

    if (effectiveSlug) {
      setPageTitle('Organization Login');
      setPageDescription(`Login to ${effectiveSlug} organization`);
    } else {
      // Show error if no tenant context is available
      setPageTitle('Missing Organization Context');
      setPageDescription('Please access this page through a valid organization link');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await authService.login(formData.username, formData.password);
      
      let finalRedirectTo = redirectTo || result.redirectTo;
      if (!finalRedirectTo) {
        const match = window.location.pathname.match(/^\/([^\/]+)\/login\/?$/);
        const slug = match?.[1] || localStorage.getItem('currentTenantSlug');
        finalRedirectTo = slug ? `/${slug}/dashboard` : '/';
      }
      
      toast({
        title: "Login successful",
        description: "Welcome to APMC System",
      });
      
      // Force a full page reload to ensure AuthProvider re-initializes with fresh token
      window.location.assign(finalRedirectTo);
    } catch (error) {
      let description = 'Invalid credentials';
      if (error instanceof Error) {
        const raw = error.message;
        // Try to extract JSON payload after status prefix
        const idx = raw.indexOf(':');
        const maybeJson = idx >= 0 ? raw.slice(idx + 1).trim() : raw;
        try {
          const parsed = JSON.parse(maybeJson);
          if (parsed?.message) description = parsed.message;
          if (parsed?.code === 'TENANT_NOT_FOUND') description = 'Organization not found.';
          if (parsed?.code === 'INVALID_TENANT_CONTEXT') description = 'Invalid organization context. Please use the correct login link.';
          if (parsed?.error === 'You are not authorized to access this organization') description = parsed.error;
        } catch {}
      }
      toast({ title: 'Login failed', description, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-lg flex items-center justify-center">
              <Apple className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">{pageTitle}</CardTitle>
          <CardDescription>{pageDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                type="text"
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter your username"
                required
                data-testid="input-username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
                data-testid="input-password"
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
