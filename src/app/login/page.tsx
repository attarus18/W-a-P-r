
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
import ForgotPasswordDialog from "@/components/auth/forgot-password-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { t } = useLanguage();
  const supabase = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isGuestAlertOpen, setIsGuestAlertOpen] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    }
  });

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  const onSubmit: SubmitHandler<LoginFormValues> = async (data) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: data.email, password: data.password });
      if (error) throw error;
      router.push('/dashboard');
    } catch (error: any) {
      console.error("Login failed:", error);
      toast({
        variant: "destructive",
        title: t('login.error_title'),
        description: error.message || t('login.error_description'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const continueAsGuest = () => {
    router.push('/dashboard');
  };
  
  if (isUserLoading) {
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
          <CardTitle className="text-2xl">{t('login.title')}</CardTitle>
          <CardDescription>{t('login.description')}</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <Label htmlFor="email">{t('login.email_label')}</Label>
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
                    <div className="flex items-center">
                      <Label htmlFor="password">{t('login.password_label')}</Label>
                      <ForgotPasswordDialog open={isForgotPasswordOpen} onOpenChange={setIsForgotPasswordOpen}>
                        <Button variant="link" type="button" onClick={() => setIsForgotPasswordOpen(true)} className="ml-auto inline-block text-xs underline p-0 h-auto">
                          {t('login.forgot_password')}
                        </Button>
                      </ForgotPasswordDialog>
                    </div>
                    <FormControl>
                      <Input id="password" type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : t('login.login_button')}
              </Button>
              <div className="text-center text-sm">
                {t('login.no_account')}{" "}
                <Link href="/signup" className="underline">
                  {t('login.register')}
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
            <Button variant="outline" className="w-full" onClick={() => setIsGuestAlertOpen(true)}>
                {t('login.continue_as_guest')}
            </Button>
        </CardContent>
      </Card>
      
       <AlertDialog open={isGuestAlertOpen} onOpenChange={setIsGuestAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('login.guest_alert_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('login.guest_alert_description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.alert_cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={continueAsGuest}>{t('login.guest_alert_continue')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
