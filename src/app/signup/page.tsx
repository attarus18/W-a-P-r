'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useAuth, useUser } from "@/context/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import GoogleIcon from "@/components/auth/google-icon";
import FacebookIcon from "@/components/auth/facebook-icon";
import { signInWithOAuthProvider } from "@/lib/auth/oauth-native-login";

type SignupFormValues = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignupPage() {
  const { t } = useLanguage();
  const supabase = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] = useState(false);

  const signupSchema = z.object({
    email: z.string().email({ message: t('validation.invalid_email') }),
    password: z.string().min(6, { message: t('validation.password_min') }),
    confirmPassword: z.string()
  }).refine(data => data.password === data.confirmPassword, {
    message: t('validation.passwords_no_match'),
    path: ["confirmPassword"],
  });

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    }
  });
  
  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  const onSubmit: SubmitHandler<SignupFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({ email: data.email, password: data.password });
      if (error) throw error;
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Signup failed:", error);
      toast({
        variant: "destructive",
        title: t('signup.error_title'),
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setIsGoogleLoading(true);
    await signInWithOAuthProvider(
      'google',
      supabase,
      (message) => {
        console.error('Google signup failed:', message);
        toast({
          variant: 'destructive',
          title: t('signup.error_title'),
          description: message || t('signup.oauth_error_description'),
        });
        setIsGoogleLoading(false);
      },
      () => setIsGoogleLoading(false)
    );
  };

  const handleFacebookSignup = async () => {
    setIsFacebookLoading(true);
    await signInWithOAuthProvider(
      'facebook',
      supabase,
      (message) => {
        console.error('Facebook signup failed:', message);
        toast({
          variant: 'destructive',
          title: t('signup.error_title'),
          description: message || t('signup.oauth_error_description'),
        });
        setIsFacebookLoading(false);
      },
      () => setIsFacebookLoading(false)
    );
  };

  if (isUserLoading || user) {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center items-center mb-4">
                <img src="/logo.png" alt="WaxPro" className="h-16 w-16 rounded-full" />
            </div>
          <CardTitle className="text-2xl">{t('signup.title')}</CardTitle>
          <CardDescription>{t('signup.description')}</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email">{t('signup.email_label')}</Label>
                    <FormControl>
                      <Input id="email" type="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="password">{t('signup.password_label')}</Label>
                    <FormControl>
                      <Input id="password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="confirmPassword">{t('signup.confirm_password_label')}</Label>
                    <FormControl>
                      <Input id="confirmPassword" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : t('signup.signup_button')}
              </Button>
              <div className="text-center text-sm">
                {t('signup.have_account')}{" "}
                <Link href="/login" className="underline">
                  {t('signup.login')}
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
        <CardContent>
            <div className="relative my-4">
                <Separator />
                <span className="absolute left-1/2 -translate-x-1/2 -top-3 bg-card px-2 text-sm text-muted-foreground">{t('login.or_continue_with')}</span>
            </div>
            <Button variant="outline" className="w-full" onClick={handleGoogleSignup} disabled={isGoogleLoading}>
                {isGoogleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                {t('signup.continue_with_google')}
            </Button>
            {/* Bottone Facebook nascosto temporaneamente: l'app Facebook e' ancora
                in modalita' sviluppo (verifica business non completata), quindi il
                login fallirebbe per qualsiasi utente reale non aggiunto come tester. */}
        </CardContent>
      </Card>
    </div>
  );
}
