'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LifeBuoy, X, CheckCircle2, Loader2 } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { useUser, useAuth } from '@/context/auth-context';
import { useToast } from '@/hooks/use-toast';
import AccessDenied from '@/components/auth/access-denied';

export default function SupportPage() {
  const { t } = useLanguage();
  const { user } = useUser();
  const supabase = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const goHome = () => router.push('/dashboard');

  if (!user) {
    return <AccessDenied featureName={t('navbar.support')} />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/support/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || t('support.error_description'));
      }
      setIsSent(true);
    } catch (error: any) {
      toast({ variant: 'destructive', title: t('support.error_title'), description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <Card>
        <CardHeader className="relative">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-8 w-8"
            onClick={goHome}
            aria-label={t('support.close_button')}
          >
            <X className="h-4 w-4" />
          </Button>
          <CardTitle className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5" />
            {t('support.title')}
          </CardTitle>
          <CardDescription>{t('support.description')}</CardDescription>
        </CardHeader>

        {isSent ? (
          <CardContent className="flex flex-col items-center text-center gap-4 py-8">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <p className="font-semibold">{t('support.success_title')}</p>
              <p className="text-sm text-muted-foreground">{t('support.success_description')}</p>
            </div>
            <Button onClick={goHome}>
              <X className="mr-2 h-4 w-4" />
              {t('support.close_button')}
            </Button>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="support-email">{t('settings.email_label')}</Label>
                <Input id="support-email" type="email" value={user.email ?? ''} disabled />
              </div>
              <div className="space-y-2">
                <Label htmlFor="support-message">{t('support.message_label')}</Label>
                <Textarea
                  id="support-message"
                  placeholder={t('support.message_placeholder')}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  rows={6}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isSending || !message.trim()}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('support.send_button')}
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
