import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { publicApiRequest } from "@/lib/auth";
import { Textarea } from "@/components/ui/textarea";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { 
  Apple, 
  ShoppingCart, 
  Store, 
  Package, 
  BookOpen, 
  Building2, 
  MessageCircle,
  Truck,
  Scale,
  Receipt,
  Wallet,
  BarChart3,
  Search,
  ArrowRight,
  Loader2,
  AlertCircle,
  Check,
  Copy,
  Mail,
  Phone,
  MapPin,
  Monitor,
  FileText,
  TrendingUp,
  Users
} from "lucide-react";

export default function LandingPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [tenantSlug, setTenantSlug] = useState("");
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    message: ""
  });
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);

  // Placeholder click handlers
  const handleGetStarted = () => {
    document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLogin = () => {
    document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleViewDemo = () => {
    document.getElementById('demo')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTenantLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous errors
    setValidationError(null);
    
    // Validate input
    const trimmedSlug = tenantSlug.trim().toLowerCase();
    if (!trimmedSlug) {
      setValidationError("Please enter an organization code");
      return;
    }
    
    setIsValidating(true);
    
    try {
      // Call public API to validate tenant slug
      const response = await publicApiRequest(
        "GET",
        `/api/tenants/slug/${trimmedSlug}`
      );
      
      const tenantData = await response.json();
      
      // Success - navigate to tenant login page
      if (tenantData.slug) {
        // Store slug in localStorage for convenience
        localStorage.setItem('currentTenantSlug', tenantData.slug);
        
        toast({
          title: "Organization found",
          description: `Redirecting to ${tenantData.name} login...`,
        });
        
        // Navigate to tenant login
        setLocation(`/${tenantData.slug}/login`);
      }
    } catch (error) {
      // Handle errors
      let errorMessage = "Unable to find organization. Please check the code and try again.";
      
      if (error instanceof Error) {
        const errorText = error.message;
        
        // Check for 404 - tenant not found
        if (errorText.includes('404')) {
          errorMessage = "Organization not found. Please verify your organization code.";
        }
        // Check for network errors
        else if (errorText.includes('Failed to fetch') || errorText.includes('NetworkError')) {
          errorMessage = "Network error. Please check your connection and try again.";
        }
      }
      
      setValidationError(errorMessage);
      
      toast({
        title: "Lookup failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!contactForm.name.trim() || !contactForm.email.trim() || !contactForm.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmittingContact(true);
    
    // Simulate form submission (replace with actual API call in production)
    setTimeout(() => {
      toast({
        title: "Message Sent!",
        description: "Thank you for contacting us. We'll get back to you soon.",
      });
      
      // Reset form
      setContactForm({ name: "", email: "", message: "" });
      setIsSubmittingContact(false);
    }, 1000);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
  };

  return (
    <div className="min-h-screen w-full bg-background">
      {/* Header Section */}
      <header className="sticky top-0 z-50 flex justify-between items-center px-6 py-4 border-b border-border bg-card">
        <div className="flex items-center space-x-2">
          <Apple className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">FruitStand</span>
        </div>
        
        <nav className="hidden md:flex items-center space-x-6">
          <a href="#home" className="text-foreground hover:text-primary transition-colors">Home</a>
          <a href="#features" className="text-foreground hover:text-primary transition-colors">Features</a>
          <a href="#demo" className="text-foreground hover:text-primary transition-colors">Demo</a>
          <a href="#pricing" className="text-foreground hover:text-primary transition-colors">Pricing</a>
          <a href="#contact" className="text-foreground hover:text-primary transition-colors">Contact</a>
        </nav>

        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => document.getElementById('login')?.scrollIntoView({ behavior: 'smooth' })}>
            Login
          </Button>
          <Button onClick={handleGetStarted}>
            Get Started
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main>
        {/* Hero Section */}
        <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
          {/* Fruit-themed gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-green-50 to-yellow-50 dark:from-orange-950/20 dark:via-green-950/20 dark:to-yellow-950/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(251,146,60,0.1),transparent_50%),radial-gradient(circle_at_70%_60%,rgba(34,197,94,0.1),transparent_50%),radial-gradient(circle_at_50%_80%,rgba(250,204,21,0.1),transparent_50%)]" />
          
          {/* Content */}
          <div className="relative z-10 max-w-5xl">
            {/* Badge/Label */}
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-primary/10 border border-primary/20">
              <Apple className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">APMC Fruit Market Solution</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-orange-600 via-green-600 to-yellow-600 bg-clip-text text-transparent dark:from-orange-400 dark:via-green-400 dark:to-yellow-400">
              Commission Merchant
              <br />
              Accounting System
            </h1>
            
            {/* Subheading */}
            <p className="text-xl md:text-2xl text-muted-foreground mb-4 max-w-3xl mx-auto">
              Streamline your APMC fruit market operations with complete business management
            </p>
            <p className="text-base md:text-lg text-muted-foreground/80 mb-10 max-w-2xl mx-auto">
              Multi-tenant platform for purchase tracking, sales management, inventory control, and financial ledgers
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={handleGetStarted}
                className="text-base px-8 py-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                Get Started
                <Apple className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={handleViewDemo}
                className="text-base px-8 py-6 border-2 hover:bg-primary/5 transition-all duration-300"
              >
                View Demo
                <BarChart3 className="ml-2 h-5 w-5" />
              </Button>
            </div>
            
            {/* Trust indicators */}
            <div className="mt-12 flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span>Multi-Tenant</span>
              </div>
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                <span>Real-Time Stock</span>
              </div>
              <div className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                <span>Invoice Management</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 px-4 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Complete Business Management
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Everything you need to run your fruit commission business efficiently
              </p>
            </div>
            
            {/* Feature Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1: Purchase Management */}
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-orange-500">
                <CardHeader>
                  <div className="w-14 h-14 rounded-lg bg-orange-100 dark:bg-orange-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <ShoppingCart className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <CardTitle className="text-xl">Purchase Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Track purchases from vendors with automatic commission calculations (8.5%), labour charges, and freight management. Complete vendor relationship tracking.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature 2: Sales Management */}
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-green-500">
                <CardHeader>
                  <div className="w-14 h-14 rounded-lg bg-green-100 dark:bg-green-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Store className="h-7 w-7 text-green-600 dark:text-green-400" />
                  </div>
                  <CardTitle className="text-xl">Sales & Invoicing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Generate sales invoices for retailers with item breakdowns, weight tracking, and flexible payment terms. Share invoices via WhatsApp instantly.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature 3: Stock Management */}
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-blue-500">
                <CardHeader>
                  <div className="w-14 h-14 rounded-lg bg-blue-100 dark:bg-blue-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Package className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-xl">Real-Time Inventory</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Monitor stock levels in real-time with crate, box, and kg tracking. Automated IN/OUT movements with low stock alerts and crate lending system.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature 4: Financial Ledgers */}
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-purple-500">
                <CardHeader>
                  <div className="w-14 h-14 rounded-lg bg-purple-100 dark:bg-purple-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <BookOpen className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                  </div>
                  <CardTitle className="text-xl">Financial Ledgers</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Comprehensive cashbook and bankbook with running balances. Track payments across Cash, Bank, UPI, and Cheque with expense categorization.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature 5: Multi-Tenant Architecture */}
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-yellow-500">
                <CardHeader>
                  <div className="w-14 h-14 rounded-lg bg-yellow-100 dark:bg-yellow-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Building2 className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <CardTitle className="text-xl">Multi-Tenant Platform</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Complete data isolation for multiple organizations. Role-based access control with Admin, Operator, and Accountant permissions.
                  </p>
                </CardContent>
              </Card>
              
              {/* Feature 6: WhatsApp Integration */}
              <Card className="group hover:shadow-xl transition-all duration-300 hover:scale-105 border-l-4 border-l-teal-500">
                <CardHeader>
                  <div className="w-14 h-14 rounded-lg bg-teal-100 dark:bg-teal-950 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MessageCircle className="h-7 w-7 text-teal-600 dark:text-teal-400" />
                  </div>
                  <CardTitle className="text-xl">WhatsApp Integration</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    Share invoices and payment reminders directly via WhatsApp. Automated messaging with credit tracking and delivery notifications.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Tenant Selector Section */}
        <section id="login" className="py-20 px-4 bg-muted/30">
          <div className="max-w-2xl mx-auto">
            <Card className="border-2">
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl md:text-3xl">Access Your Organization</CardTitle>
                <p className="text-muted-foreground mt-2">
                  Enter your organization code to access the login page
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleTenantLookup} className="space-y-4">
                  {/* Error Alert */}
                  {validationError && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>{validationError}</AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Input Field */}
                  <div className="space-y-2">
                    <Label htmlFor="tenant-slug" className="text-base">
                      Organization Code
                    </Label>
                    <Input
                      id="tenant-slug"
                      type="text"
                      placeholder="e.g., mumbai-fruits"
                      value={tenantSlug}
                      onChange={(e) => {
                        setTenantSlug(e.target.value);
                        // Clear error when user starts typing
                        if (validationError) setValidationError(null);
                      }}
                      disabled={isValidating}
                      className="text-base h-12"
                      autoComplete="off"
                    />
                    <p className="text-sm text-muted-foreground">
                      Don't know your code? Contact your organization administrator.
                    </p>
                  </div>
                  
                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-12 text-base"
                    disabled={isValidating || !tenantSlug.trim()}
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Validating...
                      </>
                    ) : (
                      <>
                        Continue to Login
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
                
                {/* Help Text */}
                <div className="mt-6 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    New to the platform?{" "}
                    <a href="#contact" className="text-primary hover:underline font-medium">
                      Contact us to get started
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Demo Credentials Section */}
        <section id="demo" className="py-20 px-4 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Try Our Demo</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explore the platform with pre-configured demo organizations. Each tenant has complete sample data to test all features.
              </p>
            </div>
            
            {/* Demo Tenant Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Mumbai Fruits */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2">Mumbai Fruit Market</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">mumbai-fruits</code>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300 text-xs font-semibold rounded-full">
                      Established
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    15 purchases, 12 sales invoices, comprehensive transaction history
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Test Users:
                      </p>
                      <div className="space-y-2 pl-6">
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">admin@mumbaifruits.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("admin@mumbaifruits.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">operator@mumbaifruits.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("operator@mumbaifruits.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">accounts@mumbaifruits.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("accounts@mumbaifruits.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={() => setLocation("/mumbai-fruits/login")}
                    >
                      Try Mumbai Fruits
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Pune Fresh */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2">Pune Fresh Produce</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">pune-fresh</code>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 text-xs font-semibold rounded-full">
                      Growing
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    8 purchases, 6 sales invoices, developing business operations
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Test Users:
                      </p>
                      <div className="space-y-2 pl-6">
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">admin@punefresh.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("admin@punefresh.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">operator@punefresh.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("operator@punefresh.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">accounts@punefresh.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("accounts@punefresh.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={() => setLocation("/pune-fresh/login")}
                    >
                      Try Pune Fresh
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              {/* Nashik Organic */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300">
                <CardHeader className="border-b border-border pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl mb-2">Nashik Organic Hub</CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4" />
                        <code className="px-2 py-1 bg-muted rounded text-xs font-mono">nashik-organic</code>
                      </div>
                    </div>
                    <div className="px-3 py-1 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-full">
                      New
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">
                    3 purchases, 2 sales invoices, starting business operations
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    <div className="text-sm">
                      <p className="font-medium mb-2 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Test Users:
                      </p>
                      <div className="space-y-2 pl-6">
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">admin@nashikorganic.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("admin@nashikorganic.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">operator@nashikorganic.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("operator@nashikorganic.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between group">
                          <div>
                            <p className="text-xs font-mono">accounts@nashikorganic.com</p>
                            <p className="text-xs text-muted-foreground">password123</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => copyToClipboard("accounts@nashikorganic.com", "Username")}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full mt-4"
                      onClick={() => setLocation("/nashik-organic/login")}
                    >
                      Try Nashik Organic
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Info Banner */}
            <div className="mt-12 max-w-3xl mx-auto">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  All demo tenants are pre-populated with sample data including vendors, items, invoices, payments, and financial records. Feel free to explore all features without any restrictions.
                </AlertDescription>
              </Alert>
            </div>
          </div>
        </section>

        {/* Screenshots Section */}
        <section id="screenshots" className="py-20 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">See It In Action</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Explore the key features and interfaces of our comprehensive accounting system
              </p>
            </div>
            
            {/* Feature Preview Carousel */}
            <div className="relative px-12">
              <Carousel
                opts={{
                  align: "start",
                  loop: true,
                }}
                className="w-full"
              >
                <CarouselContent>
                  {/* Dashboard Preview */}
                  <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                    <Card className="border-2 h-full">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center mb-6 shadow-lg">
                          <Monitor className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Dashboard Overview</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Real-time KPIs, recent transactions, low stock alerts, and quick actions at a glance. Monitor your business performance instantly.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  {/* Purchase Management Preview */}
                  <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                    <Card className="border-2 h-full">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mb-6 shadow-lg">
                          <ShoppingCart className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Purchase Management</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Track vendor purchases with automatic commission calculations, freight charges, and complete payment history.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  {/* Sales Invoicing Preview */}
                  <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                    <Card className="border-2 h-full">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-6 shadow-lg">
                          <FileText className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Sales Invoicing</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Generate professional invoices with item breakdowns, weight tracking, and instant WhatsApp sharing capabilities.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  {/* Stock Tracking Preview */}
                  <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                    <Card className="border-2 h-full">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center mb-6 shadow-lg">
                          <Package className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Stock Tracking</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Real-time inventory monitoring with crate, box, and kg tracking. Automated stock movements and low stock alerts.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  {/* Financial Ledgers Preview */}
                  <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                    <Card className="border-2 h-full">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-500 to-yellow-600 flex items-center justify-center mb-6 shadow-lg">
                          <BookOpen className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Financial Ledgers</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Comprehensive cashbook and bankbook with running balances. Track all payment modes and expense categories.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                  
                  {/* Reports & Analytics Preview */}
                  <CarouselItem className="md:basis-1/2 lg:basis-1/3">
                    <Card className="border-2 h-full">
                      <CardContent className="flex flex-col items-center justify-center p-8 text-center h-full">
                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mb-6 shadow-lg">
                          <TrendingUp className="h-10 w-10 text-white" />
                        </div>
                        <h3 className="text-xl font-bold mb-3">Reports & Analytics</h3>
                        <p className="text-muted-foreground leading-relaxed">
                          Detailed business insights with sales reports, purchase analysis, and financial summaries for informed decisions.
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </div>
            
            {/* Feature Count */}
            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                Swipe to explore all features • 6 core modules • Fully integrated system
              </p>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20 px-4 bg-background">
          <div className="max-w-7xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose the plan that fits your business size. All plans include core features with no hidden fees.
              </p>
            </div>
            
            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Basic Plan */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center pb-8">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-950">
                      <Apple className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">Basic</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">₹2,999</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">Perfect for small businesses</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Up to 100 invoices/month</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">5 user accounts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Purchase & sales management</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Stock tracking</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Basic financial ledgers</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Email support</span>
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline">
                    Get Started
                  </Button>
                </CardContent>
              </Card>
              
              {/* Professional Plan (Featured) */}
              <Card className="border-2 border-primary hover:shadow-2xl transition-all duration-300 relative">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
                <CardHeader className="text-center pb-8 pt-8">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                      <Store className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">Professional</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">₹5,999</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">For growing businesses</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Unlimited invoices</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">15 user accounts</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">All Basic features</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">WhatsApp integration (500 msgs/month)</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Advanced reports & analytics</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Crate lending system</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Priority support</span>
                    </li>
                  </ul>
                  <Button className="w-full">
                    Get Started
                  </Button>
                </CardContent>
              </Card>
              
              {/* Enterprise Plan */}
              <Card className="border-2 hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center pb-8">
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-950">
                      <Building2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl mb-2">Enterprise</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">Custom</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">For large organizations</p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Unlimited everything</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Unlimited users</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">All Professional features</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Unlimited WhatsApp messages</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Custom integrations</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">Dedicated account manager</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                      <span className="text-sm">24/7 phone support</span>
                    </li>
                  </ul>
                  <Button className="w-full" variant="outline">
                    Contact Sales
                  </Button>
                </CardContent>
              </Card>
            </div>
            
            {/* Pricing Note */}
            <div className="mt-12 text-center">
              <p className="text-sm text-muted-foreground">
                All plans include free updates and data backups. No setup fees. Cancel anytime.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Section */}
        <section id="contact" className="py-20 px-4 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {/* Contact Info */}
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Get In Touch</h2>
                <p className="text-lg text-muted-foreground mb-8">
                  Have questions about our platform? We're here to help. Reach out to our team and we'll get back to you as soon as possible.
                </p>
                
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Email Us</h3>
                      <p className="text-muted-foreground">support@fruitstand.com</p>
                      <p className="text-sm text-muted-foreground">We'll respond within 24 hours</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Call Us</h3>
                      <p className="text-muted-foreground">+91 98765 43210</p>
                      <p className="text-sm text-muted-foreground">Mon-Fri, 9am-6pm IST</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <MapPin className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">Visit Us</h3>
                      <p className="text-muted-foreground">APMC Market Complex</p>
                      <p className="text-sm text-muted-foreground">Mumbai, Maharashtra 400001</p>
                    </div>
                  </div>
                </div>
                
                {/* Social Links */}
                <div className="mt-8 pt-8 border-t border-border">
                  <p className="text-sm font-medium mb-4">Follow us on social media</p>
                  <div className="flex gap-4">
                    <Button size="icon" variant="outline">
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                    <Button size="icon" variant="outline">
                      <Mail className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {/* Contact Form */}
              <div>
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle>Send us a message</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      Fill out the form below and we'll get back to you shortly
                    </p>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                      {/* Name Field */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-name">Name</Label>
                        <Input
                          id="contact-name"
                          type="text"
                          placeholder="Your full name"
                          value={contactForm.name}
                          onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                          disabled={isSubmittingContact}
                          required
                        />
                      </div>
                      
                      {/* Email Field */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-email">Email</Label>
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="your.email@example.com"
                          value={contactForm.email}
                          onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                          disabled={isSubmittingContact}
                          required
                        />
                      </div>
                      
                      {/* Message Field */}
                      <div className="space-y-2">
                        <Label htmlFor="contact-message">Message</Label>
                        <Textarea
                          id="contact-message"
                          placeholder="Tell us about your requirements..."
                          rows={5}
                          value={contactForm.message}
                          onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                          disabled={isSubmittingContact}
                          required
                        />
                      </div>
                      
                      {/* Submit Button */}
                      <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmittingContact}
                      >
                        {isSubmittingContact ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            Send Message
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-6 text-center text-sm text-muted-foreground">
        <div className="max-w-7xl mx-auto px-4">
          <p>&copy; 2025 FruitStand. All rights reserved.</p>
          <div className="flex justify-center space-x-4 mt-2">
            <a href="#privacy" className="hover:text-primary">Privacy Policy</a>
            <a href="#terms" className="hover:text-primary">Terms of Service</a>
            <a href="#support" className="hover:text-primary">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}