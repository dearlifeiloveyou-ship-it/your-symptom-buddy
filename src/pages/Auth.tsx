import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { emailSchema, passwordSchema, nameSchema, authRateLimiter, sanitizeText } from '@/lib/security';

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const validateInput = (name: string, value: string, isSignUp: boolean = false) => {
    const errors = { ...validationErrors };
    
    switch (name) {
      case 'email':
        const emailResult = emailSchema.safeParse(value);
        if (!emailResult.success) {
          errors.email = emailResult.error.errors[0].message;
        } else {
          delete errors.email;
        }
        break;
      case 'password':
        const passwordResult = passwordSchema.safeParse(value);
        if (!passwordResult.success) {
          errors.password = passwordResult.error.errors[0].message;
        } else {
          delete errors.password;
        }
        break;
      case 'fullName':
        if (isSignUp) {
          const nameResult = nameSchema.safeParse(value);
          if (!nameResult.success) {
            errors.fullName = nameResult.error.errors[0].message;
          } else {
            delete errors.fullName;
          }
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Validate inputs
    const emailResult = emailSchema.safeParse(email);
    const passwordResult = passwordSchema.safeParse(password);
    
    if (!emailResult.success || !passwordResult.success) {
      setError("Please check your email and password format.");
      setIsLoading(false);
      return;
    }

    // Rate limiting check
    if (!authRateLimiter.isAllowed(`signin_${email}`, 5, 300000)) {
      setError("Too many sign-in attempts. Please try again in 5 minutes.");
      setIsLoading(false);
      return;
    }

    const { error } = await signIn(email, password);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      authRateLimiter.reset(`signin_${email}`);
      toast({
        title: "Welcome back!",
        description: "You have successfully signed in."
      });
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;

    // Validate inputs
    const emailResult = emailSchema.safeParse(email);
    const passwordResult = passwordSchema.safeParse(password);
    const nameResult = nameSchema.safeParse(fullName);
    
    if (!emailResult.success || !passwordResult.success || !nameResult.success) {
      setError("Please check all fields and ensure they meet the requirements.");
      setIsLoading(false);
      return;
    }

    // Rate limiting check
    if (!authRateLimiter.isAllowed(`signup_${email}`, 3, 3600000)) {
      setError("Too many sign-up attempts. Please try again in 1 hour.");
      setIsLoading(false);
      return;
    }

    const sanitizedName = sanitizeText(fullName);
    const { error } = await signUp(email, password, sanitizedName);
    
    if (error) {
      setError(error.message);
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive"
      });
    } else {
      authRateLimiter.reset(`signup_${email}`);
      toast({
        title: "Welcome to MDSDR!",
        description: "Please check your email to confirm your account."
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">MDSDR.com</CardTitle>
          <CardDescription className="text-center">
            Your trusted health companion
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    onChange={(e) => validateInput('email', e.target.value)}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-destructive">{validationErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    onChange={(e) => validateInput('password', e.target.value)}
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-destructive">{validationErrors.password}</p>
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <Tabs defaultValue="free" className="w-full mb-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="free">Free Plan</TabsTrigger>
                  <TabsTrigger value="premium">Premium Plan</TabsTrigger>
                </TabsList>
                
                <TabsContent value="free" className="space-y-2 p-4 border rounded-lg">
                  <h3 className="font-semibold">Free Plan</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 3 symptom checks per month</li>
                    <li>• Basic health reports</li>
                    <li>• Community support</li>
                  </ul>
                </TabsContent>
                
                <TabsContent value="premium" className="space-y-2 p-4 border rounded-lg border-primary">
                  <h3 className="font-semibold text-primary">Premium Plan - $9.99/month</h3>
                  <ul className="text-sm space-y-1">
                    <li>• Unlimited symptom checks</li>
                    <li>• Detailed PDF health reports</li>
                    <li>• Symptom tracking & trends</li>
                    <li>• Priority support</li>
                    <li>• Family member profiles</li>
                    <li>• Export data to doctor</li>
                  </ul>
                </TabsContent>
              </Tabs>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    name="fullName"
                    type="text"
                    placeholder="Enter your full name"
                    required
                    onChange={(e) => validateInput('fullName', e.target.value, true)}
                  />
                  {validationErrors.fullName && (
                    <p className="text-sm text-destructive">{validationErrors.fullName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    required
                    onChange={(e) => validateInput('email', e.target.value, true)}
                  />
                  {validationErrors.email && (
                    <p className="text-sm text-destructive">{validationErrors.email}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Create a password (8+ chars, uppercase, lowercase, number)"
                    required
                    onChange={(e) => validateInput('password', e.target.value, true)}
                  />
                  {validationErrors.password && (
                    <p className="text-sm text-destructive">{validationErrors.password}</p>
                  )}
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up Free
                </Button>
              </form>
            </TabsContent>
          </Tabs>
          
          <div className="mt-6 text-center">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-sm text-muted-foreground"
            >
              ← Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}