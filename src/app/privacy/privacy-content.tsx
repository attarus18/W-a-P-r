'use client';

import Link from 'next/link';
import { useLanguage } from '@/context/language-context';

export default function PrivacyContent() {
  const { t } = useLanguage();

  const settingsPath = `${t('navbar.settings')} → ${t('settings.danger_zone_title')} → ${t('settings.delete_account_button')}`;
  const settingsDangerZonePath = `${t('navbar.settings')} → ${t('settings.danger_zone_title')}`;
  const deletionPrefill = t('privacy.data_deletion_request_text');

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <div>
          <Link href="/dashboard" className="text-sm text-primary hover:underline">&larr; {t('privacy.back_link')}</Link>
          <h1 className="text-3xl font-bold tracking-tight mt-4">{t('privacy.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('privacy.last_updated')}</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s1_title')}</h2>
          <p>
            {t('privacy.s1_body')}{' '}
            <Link href="/support" className="text-primary hover:underline">waxpro.app@gmail.com</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s2_title')}</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>{t('privacy.s2_account_label')}</strong> {t('privacy.s2_account_body')}</li>
            <li><strong>{t('privacy.s2_appdata_label')}</strong> {t('privacy.s2_appdata_body')}</li>
            <li><strong>{t('privacy.s2_subscription_label')}</strong> {t('privacy.s2_subscription_body')}</li>
            <li><strong>{t('privacy.s2_ai_label')}</strong> {t('privacy.s2_ai_body')}</li>
            <li><strong>{t('privacy.s2_support_label')}</strong> {t('privacy.s2_support_body')}</li>
            <li><strong>{t('privacy.s2_ads_label')}</strong> {t('privacy.s2_ads_body')}</li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s3_title')}</h2>
          <p>{t('privacy.s3_intro')}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>{t('privacy.s3_item1')}</li>
            <li>{t('privacy.s3_item2')}</li>
            <li>{t('privacy.s3_item3')}</li>
            <li>{t('privacy.s3_item4')}</li>
            <li>{t('privacy.s3_item5')}</li>
            <li>{t('privacy.s3_item6')}</li>
          </ul>
          <p>{t('privacy.s3_outro')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s4_title')}</h2>
          <p>{t('privacy.s4_intro')}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Supabase</strong> — {t('privacy.s4_supabase')}</li>
            <li><strong>Cloudflare</strong> — {t('privacy.s4_cloudflare')}</li>
            <li><strong>Google</strong> — {t('privacy.s4_google')}</li>
            <li><strong>Meta (Facebook)</strong> — {t('privacy.s4_meta')}</li>
            <li><strong>Resend</strong> — {t('privacy.s4_resend')}</li>
          </ul>
          <p>{t('privacy.s4_outro')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s5_title')}</h2>
          <p>{t('privacy.s5_body', { path: settingsPath })}</p>
        </section>

        <section id="data-deletion" className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s6_title')}</h2>
          <p>{t('privacy.s6_intro')}</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>{t('privacy.s6_app_label')}</strong>{' '}
              {t('privacy.s6_app_body', { path: settingsDangerZonePath, button: t('settings.delete_account_button') })}
            </li>
            <li>
              <strong>{t('privacy.s6_email_label')}</strong>{' '}
              {t('privacy.s6_email_body_before')}{' '}
              <Link href={`/support?prefill=${encodeURIComponent(deletionPrefill)}`} className="text-primary hover:underline">
                waxpro.app@gmail.com
              </Link>{' '}
              {t('privacy.s6_email_body_after')}
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s7_title')}</h2>
          <p>
            {t('privacy.s7_body')}{' '}
            <Link href="/support" className="text-primary hover:underline">waxpro.app@gmail.com</Link>.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s8_title')}</h2>
          <p>{t('privacy.s8_body')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s9_title')}</h2>
          <p>{t('privacy.s9_body')}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">{t('privacy.s10_title')}</h2>
          <p>{t('privacy.s10_body')}</p>
        </section>

        <section className="space-y-3 pt-4 border-t">
          <h2 className="text-xl font-semibold">{t('privacy.contacts_title')}</h2>
          <p>
            {t('privacy.contacts_body')}{' '}
            <Link href="/support" className="text-primary hover:underline">waxpro.app@gmail.com</Link>.
          </p>
        </section>
      </div>
    </div>
  );
}
