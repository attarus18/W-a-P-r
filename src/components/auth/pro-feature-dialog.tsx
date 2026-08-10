'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import Link from "next/link";
import { useLanguage } from "@/context/language-context";

export default function ProFeatureDialog() {
    const { t } = useLanguage();

    return (
        <div className="flex items-center justify-center h-[60vh]">
            <Card className="max-w-md w-full text-center">
                <CardHeader>
                    <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit">
                        <Zap className="h-8 w-8 text-primary" />
                    </div>
                    <CardTitle>{t('pro_feature.title')}</CardTitle>
                    <CardDescription>
                        {t('pro_feature.description')}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        {t('pro_feature.instructions')}
                    </p>
                </CardContent>
                <CardFooter className="flex justify-center gap-4">
                    <Button asChild>
                        <Link href="/pricing">{t('pro_feature.upgrade_button')}</Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}

    