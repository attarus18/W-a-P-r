'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

interface AccessDeniedProps {
    featureName: string;
}

export default function AccessDenied({ featureName }: AccessDeniedProps) {
    const { t } = useLanguage();

    return (
        <div className="flex items-center justify-center h-[60vh]">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                        <Lock className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>{t('access_denied.title')}</CardTitle>
                    <CardDescription>
                        {t('access_denied.description', { feature: featureName })}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        {t('access_denied.instructions')}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                    <Button asChild>
                        <Link href="/login">{t('login.login_button')}</Link>
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/signup">{t('login.register')}</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
