'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProducts, useSales, useReturns } from '@/context/product-context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/context/language-context';
import { TrendingUp, Package, Undo, Printer, LineChart, Calendar as CalendarIcon, Warehouse, Loader2, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { useCurrency } from '@/context/currency-context';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, addDays, addWeeks, addMonths, addYears, differenceInCalendarDays, format } from 'date-fns';
import { enUS, it, es, fr, de } from 'date-fns/locale';
import type { DateRange } from 'react-day-picker';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useUser } from '@/context/auth-context';
import AccessDenied from '@/components/auth/access-denied';
import jsPDF from 'jspdf';
import { savePdf } from '@/lib/pdf-utils';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/context/subscription-context';
import ProFeatureDialog from '@/components/auth/pro-feature-dialog';

type TimeRange = 'day' | 'week' | 'month' | 'year' | 'custom';

interface ProductStat {
  sold: number;
  profit: number;
  returned: number;
}

const localeMap = { en: enUS, it, es, fr, de };

export default function ReportPage() {
    const { user } = useUser();
    const { t, language } = useLanguage();
    const { formatCurrency, convert, currency } = useCurrency();
    const { products, isLoading: productsLoading } = useProducts();
    const { sales, isLoading: salesLoading } = useSales();
    const { returns, isLoading: returnsLoading } = useReturns();
    const { subscription, isSubscriptionLoading, hasActiveSubscription } = useSubscription();

    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [anchorDate, setAnchorDate] = useState<Date>(new Date());
    const [customRange, setCustomRange] = useState<DateRange | undefined>();
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [isPrinting, setIsPrinting] = useState(false);
    const { toast } = useToast();

    const dateLocale = localeMap[language] || enUS;

    const handleTimeRangeChange = (value: TimeRange) => {
        if (!value) return;
        setTimeRange(value);
        setAnchorDate(new Date());
        setCustomRange(undefined);
    };

    const shiftAnchor = (direction: 1 | -1) => {
        setAnchorDate(prev => {
            switch (timeRange) {
                case 'day': return addDays(prev, direction);
                case 'week': return addWeeks(prev, direction);
                case 'month': return addMonths(prev, direction);
                case 'year': return addYears(prev, direction);
                default: return prev;
            }
        });
    };

    const applyCustomRange = () => {
        if (!customRange?.from) return;
        setTimeRange('custom');
        setIsCalendarOpen(false);
    };

    const clearCustomRange = () => {
        setCustomRange(undefined);
        setTimeRange('month');
        setAnchorDate(new Date());
        setIsCalendarOpen(false);
    };

    const periodTitleKey = {
        day: 'report.pdf.title_daily',
        week: 'report.pdf.title_weekly',
        month: 'report.pdf.title_monthly',
        year: 'report.pdf.title_yearly',
        custom: 'report.pdf.title_custom',
    }[timeRange];

    const { filteredSales, periodRange, chartData, periodLabel, canGoNext } = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;
        let formatString: string;

        if (timeRange === 'custom' && customRange?.from) {
            startDate = startOfDay(customRange.from);
            endDate = endOfDay(customRange.to ?? customRange.from);
            const spanDays = differenceInCalendarDays(endDate, startDate);
            formatString = spanDays === 0 ? 'HH:00' : spanDays <= 31 ? 'dd/MM' : spanDays <= 366 ? 'LLL' : 'yyyy';
        } else {
            switch (timeRange) {
                case 'day':
                    startDate = startOfDay(anchorDate);
                    endDate = endOfDay(anchorDate);
                    formatString = 'HH:00';
                    break;
                case 'week':
                    startDate = startOfWeek(anchorDate, { weekStartsOn: 1 });
                    endDate = endOfWeek(anchorDate, { weekStartsOn: 1 });
                    formatString = 'EEE';
                    break;
                case 'month':
                    startDate = startOfMonth(anchorDate);
                    endDate = endOfMonth(anchorDate);
                    formatString = 'dd';
                    break;
                case 'year':
                default:
                    startDate = startOfYear(anchorDate);
                    endDate = endOfYear(anchorDate);
                    formatString = 'LLL';
                    break;
            }
        }

        const filtered = sales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= startDate && saleDate <= endDate;
        });

        const groupedByTime = filtered.reduce((acc, sale) => {
            const dateKey = format(new Date(sale.timestamp), formatString, { locale: dateLocale });
            if (!acc[dateKey]) {
                acc[dateKey] = { profit: 0, sold: 0 };
            }
            acc[dateKey].profit += (sale.salePrice - sale.productionCost) * sale.quantity;
            acc[dateKey].sold += sale.quantity;
            return acc;
        }, {} as Record<string, { profit: number, sold: number }>);

        const chart = Object.entries(groupedByTime).map(([name, data]) => ({
            name,
            profit: convert(data.profit),
            sold: data.sold
        }));

        let label: string;
        if (timeRange === 'custom' && customRange?.from) {
            const fromLabel = format(customRange.from, 'dd/MM/yyyy');
            const toLabel = customRange.to ? format(customRange.to, 'dd/MM/yyyy') : fromLabel;
            label = fromLabel === toLabel ? fromLabel : `${fromLabel} - ${toLabel}`;
        } else if (timeRange === 'week') {
            label = `${format(startDate, 'dd MMM', { locale: dateLocale })} - ${format(endDate, 'dd MMM yyyy', { locale: dateLocale })}`;
        } else if (timeRange === 'month') {
            label = format(anchorDate, 'MMMM yyyy', { locale: dateLocale });
        } else if (timeRange === 'year') {
            label = format(anchorDate, 'yyyy', { locale: dateLocale });
        } else {
            label = format(anchorDate, 'PPP', { locale: dateLocale });
        }

        const isCurrentPeriod = startDate <= now && now <= endDate;

        return { filteredSales: filtered, periodRange: { startDate, endDate }, chartData: chart, periodLabel: label, canGoNext: !isCurrentPeriod };

    }, [sales, timeRange, anchorDate, customRange, convert, dateLocale]);

    const filteredReturns = useMemo(() => {
        return returns.filter(ret => {
            const returnDate = new Date(ret.timestamp);
            return returnDate >= periodRange.startDate && returnDate <= periodRange.endDate;
        });
    }, [returns, periodRange]);

    const reportData = useMemo(() => {
        const base = filteredSales.reduce((acc, s) => {
            acc.totalProfit += (s.salePrice - s.productionCost) * s.quantity;
            acc.totalSold += s.quantity;
            return acc;
        }, { totalProfit: 0, totalSold: 0 });
        const totalReturned = filteredReturns.reduce((acc, r) => acc + r.quantity, 0);
        return { ...base, totalReturned };
    }, [filteredSales, filteredReturns]);

    const bestSeller = useMemo(() => {
        const soldByProduct = new Map<string, { sold: number; profit: number }>();
        filteredSales.forEach(sale => {
            const entry = soldByProduct.get(sale.productId) || { sold: 0, profit: 0 };
            entry.sold += sale.quantity;
            entry.profit += (sale.salePrice - sale.productionCost) * sale.quantity;
            soldByProduct.set(sale.productId, entry);
        });

        let bestId: string | null = null;
        let bestStats = { sold: 0, profit: 0 };
        soldByProduct.forEach((stats, productId) => {
            if (stats.sold > bestStats.sold) {
                bestId = productId;
                bestStats = stats;
            }
        });

        if (!bestId) return null;
        const product = products.find(p => p.id === bestId);
        return { name: product?.name ?? '—', sold: bestStats.sold, profit: bestStats.profit };
    }, [filteredSales, products]);

    const mostReturnedProduct = useMemo(() => {
        const returnedByProduct = new Map<string, number>();
        filteredReturns.forEach(ret => {
            returnedByProduct.set(ret.productId, (returnedByProduct.get(ret.productId) || 0) + ret.quantity);
        });

        let worstId: string | null = null;
        let worstQty = 0;
        returnedByProduct.forEach((qty, productId) => {
            if (qty > worstQty) {
                worstId = productId;
                worstQty = qty;
            }
        });

        if (!worstId) return null;
        const product = products.find(p => p.id === worstId);
        return { name: product?.name ?? '—', returned: worstQty };
    }, [filteredReturns, products]);


    const { perProductStats, grandTotalProfit, grandTotalStock } = useMemo(() => {
        const stats = new Map<string, ProductStat>();
        let totalProfit = 0;

        sales.forEach(sale => {
            const stat = stats.get(sale.productId) || { sold: 0, profit: 0, returned: 0 };
            const saleProfit = (sale.salePrice - sale.productionCost) * sale.quantity;

            stat.sold += sale.quantity;
            stat.profit += saleProfit;
            totalProfit += saleProfit;
            stats.set(sale.productId, stat);
        });

        returns.forEach(ret => {
            const stat = stats.get(ret.productId) || { sold: 0, profit: 0, returned: 0 };
            stat.returned += ret.quantity;
            stats.set(ret.productId, stat);
        });

        const totalStock = products.reduce((acc, p) => acc + p.quantity, 0);

        return {
            perProductStats: stats,
            grandTotalProfit: totalProfit,
            grandTotalStock: totalStock,
        };
    }, [products, sales, returns]);

    const handlePrint = async () => {
        setIsPrinting(true);
        try {
            const doc = new jsPDF({ orientation: 'p', unit: 'px', format: 'a4' });
            const pageHeight = doc.internal.pageSize.height;
            const pageWidth = doc.internal.pageSize.width;
            const margin = 30;
            let y = margin;

            // Colors & Fonts
            const primaryColor = '#f97316';
            const soldColor = '#0ea5e9';
            const textColor = '#111827';
            const mutedColor = '#6b7280';
            const borderColor = '#e5e7eb';
            const lightBgColor = '#f9fafb';
            const totalRowBgColor = '#fefce8';

            const formatCurrencyForPdf = (amount: number) => {
                const convertedAmount = convert(amount);
                return `${currency.symbol}${convertedAmount.toFixed(2)}`;
            };

            // --- HEADER ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(24);
            doc.setTextColor(primaryColor);
            doc.text('WAX PRO', pageWidth / 2, y, { align: 'center', charSpace: 2 });
            y += 15;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(mutedColor);
            doc.text(t('report.pdf.inventory_report').toUpperCase(), pageWidth / 2, y, { align: 'center', charSpace: 1 });
            y += 18;

            // --- PERIOD ---
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.setTextColor(textColor);
            doc.text(t(periodTitleKey).toUpperCase(), pageWidth / 2, y, { align: 'center' });
            y += 14;
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(mutedColor);
            doc.text(periodLabel, pageWidth / 2, y, { align: 'center' });
            y += 25;

            // --- PERIOD SUMMARY CARDS ---
            const summaryCardWidth = (pageWidth - (margin * 2) - 10) / 2;
            const summaryCardHeight = 50;
            const summaryCards = [
                { title: t('report.total_profit'), value: formatCurrencyForPdf(reportData.totalProfit), highlight: true },
                { title: t('report.total_sold'), value: `${reportData.totalSold}`, highlight: false },
                { title: t('report.total_returned'), value: `${reportData.totalReturned}`, highlight: false },
                { title: t('report.total_stock'), value: `${grandTotalStock} PZ`, highlight: false },
            ];

            summaryCards.forEach((card, index) => {
                const col = index % 2;
                const row = Math.floor(index / 2);
                const cardX = margin + col * (summaryCardWidth + 10);
                const cardY = y + row * (summaryCardHeight + 10);

                if (card.highlight) {
                    doc.setDrawColor(primaryColor);
                    doc.setLineWidth(1);
                    doc.roundedRect(cardX, cardY, summaryCardWidth, summaryCardHeight, 8, 8, 'S');
                } else {
                    doc.setDrawColor(borderColor);
                    doc.setFillColor(lightBgColor);
                    doc.roundedRect(cardX, cardY, summaryCardWidth, summaryCardHeight, 8, 8, 'FD');
                }

                doc.setFontSize(8);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(mutedColor);
                doc.text(card.title.toUpperCase(), cardX + 10, cardY + 16);

                doc.setFontSize(16);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(textColor);
                doc.text(card.value, cardX + 10, cardY + 36);
            });

            y += (summaryCardHeight + 10) * 2 + 10;

            // --- BEST SELLER & MOST RETURNED ---
            const highlightBoxWidth = (pageWidth - (margin * 2) - 10) / 2;
            const highlightBoxHeight = 45;
            if (y + highlightBoxHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }

            const drawHighlightBox = (x: number, title: string, name: string | undefined, metricValue: string) => {
                doc.setFillColor(totalRowBgColor);
                doc.roundedRect(x, y, highlightBoxWidth, highlightBoxHeight, 8, 8, 'F');
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(mutedColor);
                doc.text(title.toUpperCase(), x + 12, y + 16);

                if (name) {
                    doc.setFontSize(12);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(textColor);
                    doc.text(name, x + 12, y + 34);

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(primaryColor);
                    doc.text(metricValue, x + highlightBoxWidth - 12, y + 34, { align: 'right' });
                } else {
                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(mutedColor);
                    doc.text(t('report.no_data_for_period'), x + 12, y + 34);
                }
            };

            drawHighlightBox(
                margin,
                t('report.pdf.best_seller_title'),
                bestSeller?.name,
                bestSeller ? `${bestSeller.sold} ${t('report.pdf.units_sold')}` : ''
            );
            drawHighlightBox(
                margin + highlightBoxWidth + 10,
                t('report.pdf.most_returned_title'),
                mostReturnedProduct?.name,
                mostReturnedProduct ? `${mostReturnedProduct.returned} ${t('report.pdf.units_returned')}` : ''
            );

            y += highlightBoxHeight + 20;

            // --- PERFORMANCE CHART ---
            const chartSectionHeight = 170;
            if (y + chartSectionHeight > pageHeight - margin) {
                doc.addPage();
                y = margin;
            }

            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(mutedColor);
            doc.text(t('report.performance_title').toUpperCase(), margin, y);

            // Legend
            doc.setFillColor(primaryColor);
            doc.rect(pageWidth - margin - 150, y - 8, 8, 8, 'F');
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(mutedColor);
            doc.text(t('report.profit_legend'), pageWidth - margin - 138, y);
            doc.setFillColor(soldColor);
            doc.rect(pageWidth - margin - 70, y - 8, 8, 8, 'F');
            doc.text(t('report.sold_legend'), pageWidth - margin - 58, y);

            y += 15;

            if (chartData.length === 0) {
                doc.setFillColor(lightBgColor);
                doc.roundedRect(margin, y, pageWidth - (margin * 2), 60, 8, 8, 'F');
                doc.setFontSize(9);
                doc.setTextColor(mutedColor);
                doc.text(t('report.no_data_for_period'), pageWidth / 2, y + 33, { align: 'center' });
                y += 75;
            } else {
                const chartWidth = pageWidth - (margin * 2);
                const chartHeight = 110;
                const chartTop = y;
                const chartBottom = chartTop + chartHeight;

                doc.setDrawColor(borderColor);
                doc.line(margin, chartBottom, pageWidth - margin, chartBottom);

                const maxProfit = Math.max(...chartData.map(d => d.profit), 0) || 1;
                const maxSold = Math.max(...chartData.map(d => d.sold), 0) || 1;

                const groupWidth = chartWidth / chartData.length;
                const barWidth = Math.min(14, groupWidth * 0.32);
                const labelStep = Math.ceil(chartData.length / 15);

                chartData.forEach((d, index) => {
                    const groupCenter = margin + groupWidth * index + groupWidth / 2;
                    const profitBarHeight = Math.max((d.profit / maxProfit) * (chartHeight - 10), 0);
                    const soldBarHeight = Math.max((d.sold / maxSold) * (chartHeight - 10), 0);

                    doc.setFillColor(primaryColor);
                    doc.rect(groupCenter - barWidth - 1, chartBottom - profitBarHeight, barWidth, profitBarHeight, 'F');

                    doc.setFillColor(soldColor);
                    doc.rect(groupCenter + 1, chartBottom - soldBarHeight, barWidth, soldBarHeight, 'F');

                    if (index % labelStep === 0) {
                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(mutedColor);
                        doc.text(d.name, groupCenter, chartBottom + 10, { align: 'center' });
                    }
                });

                y = chartBottom + 25;
            }

            // --- TABLE ---
            const tableHeaderY = y;
            const tableRowHeight = 35;
            const col1X = margin;
            const col2X = margin + 200;
            const col3X = margin + 270;
            const col4X = pageWidth - margin;

            doc.setFillColor(lightBgColor);
            doc.rect(margin, y, pageWidth - (margin*2), 20, 'F');
            y += 14;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(mutedColor);
            doc.text(t('report.pdf.product').toUpperCase(), col1X + 5, y);
            doc.text(t('report.pdf.stock').toUpperCase(), col2X, y, { align: 'center' });
            doc.text(t('report.pdf.return_percentage').toUpperCase(), col3X, y, { align: 'center'});
            doc.text(`${t('report.pdf.profit').toUpperCase()} (${currency.symbol})`, col4X - 5, y, { align: 'right' });
            y = tableHeaderY + 25;

            doc.setDrawColor(borderColor);
            doc.line(margin, y, pageWidth - margin, y);
            y += 5;

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(textColor);

            products.forEach((product, index) => {
                if (y > pageHeight - margin - (tableRowHeight * 2)) {
                    doc.addPage();
                    y = margin;
                }
                const stats = perProductStats.get(product.id) || { sold: 0, profit: 0, returned: 0 };
                const returnPercentage = stats.sold > 0 ? (stats.returned / stats.sold) * 100 : 0;
                
                y += 15;

                doc.setFont('helvetica', 'bold');
                doc.text(product.name, col1X + 5, y);
                doc.setFontSize(8);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(mutedColor);
                doc.text(`${t('report.pdf.sold')}: ${stats.sold} | ${t('report.pdf.returned')}: ${stats.returned}`, col1X + 5, y + 10);
                
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(textColor);
                doc.text(product.quantity.toString(), col2X, y, { align: 'center' });

                doc.setTextColor(returnPercentage > 0 ? '#ef4444' : textColor);
                doc.text(`% ${returnPercentage.toFixed(1)}`, col3X, y, { align: 'center' });
                
                doc.setTextColor(primaryColor);
                doc.text(formatCurrencyForPdf(stats.profit), col4X - 5, y, { align: 'right' });
                y += tableRowHeight - 10;
                 doc.setDrawColor(borderColor);
                 doc.line(margin, y, pageWidth - margin, y);
                 y += 5;
            });
            
            // TOTAL ROW
            doc.setFillColor(totalRowBgColor);
            doc.rect(margin, y - 5, pageWidth - (margin*2), tableRowHeight -15, 'F');
            y += 8;
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textColor);
            doc.text(t('report.pdf.grand_total').toUpperCase(), col1X + 5, y);
            doc.text(grandTotalStock.toString(), col2X, y, { align: 'center' });
            doc.setTextColor(primaryColor);
            doc.text(formatCurrencyForPdf(grandTotalProfit), col4X - 5, y, { align: 'right' });
            y += tableRowHeight;
            
            // --- INFO NOTE ---
            if (y > pageHeight - margin - 40) {
                doc.addPage();
                y = margin;
            }
            doc.setFillColor(lightBgColor);
            doc.roundedRect(margin, y, pageWidth - (margin*2), 40, 8, 8, 'FD');
            y+=15;
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(mutedColor);
            doc.text(t('report.pdf.info_note_title').toUpperCase(), margin + 10, y);
            y+=10;
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(mutedColor);
            const noteText = doc.splitTextToSize(t('report.pdf.info_note_description'), pageWidth - (margin*2) - 20);
            doc.text(noteText, margin + 10, y);

            await savePdf(doc, 'waxpro-inventory-report.pdf');

        } catch (error) {
            console.error("Error generating PDF:", error);
            toast({
                variant: "destructive",
                title: t('report.pdf_error_title'),
                description: t('report.pdf_error_description'),
            });
        } finally {
            setIsPrinting(false);
        }
    };

    const handleShare = () => {
        const lines = [
            `${t(periodTitleKey)} - ${periodLabel}`,
            `${t('report.total_profit')}: ${formatCurrency(reportData.totalProfit)}`,
            `${t('report.total_sold')}: ${reportData.totalSold}`,
            `${t('report.total_returned')}: ${reportData.totalReturned}`,
        ];
        if (bestSeller) {
            lines.push(`${t('report.pdf.best_seller_title')}: ${bestSeller.name} (${bestSeller.sold} ${t('report.pdf.units_sold')})`);
        }
        if (mostReturnedProduct) {
            lines.push(`${t('report.pdf.most_returned_title')}: ${mostReturnedProduct.name} (${mostReturnedProduct.returned} ${t('report.pdf.units_returned')})`);
        }
        navigator.clipboard.writeText(lines.join('\n'));
        toast({
            title: t('report.share_toast_title'),
            description: t('report.share_toast_description'),
        });
    };

    const noData = sales.length === 0;

    if (isSubscriptionLoading || salesLoading || productsLoading || returnsLoading) {
        return (
            <div className="flex items-center justify-center h-[60vh]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    if (!user) {
        return <AccessDenied featureName={t('navbar.report')} />;
    }

    if (!hasActiveSubscription) {
        return <ProFeatureDialog />;
    }

    return (
        <div className="space-y-8 print:space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('report.title')}</h1>
                    <p className="text-muted-foreground">{t('report.description')}</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button onClick={handleShare} variant="outline" disabled={noData}>
                        <Share2 className="mr-2 h-4 w-4" />
                        {t('report.share_button')}
                    </Button>
                    <Button onClick={handlePrint} variant="outline" disabled={noData || isPrinting}>
                        {isPrinting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t('report.generating_pdf')}
                            </>
                        ) : (
                            <>
                                <Printer className="mr-2 h-4 w-4" />
                                {t('report.export_pdf')}
                            </>
                        )}
                    </Button>
                </div>
            </div>
            
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <h2 className="text-xl font-bold tracking-tight">{t('report.summary_title')}</h2>
                <div className="flex flex-wrap items-center gap-2">
                    <ToggleGroup type="single" value={timeRange === 'custom' ? undefined : timeRange} onValueChange={handleTimeRangeChange}>
                        <ToggleGroupItem value="day" aria-label={t('report.daily')}>{t('report.daily')}</ToggleGroupItem>
                        <ToggleGroupItem value="week" aria-label={t('report.weekly')}>{t('report.weekly')}</ToggleGroupItem>
                        <ToggleGroupItem value="month" aria-label={t('report.monthly')}>{t('report.monthly')}</ToggleGroupItem>
                        <ToggleGroupItem value="year" aria-label={t('report.yearly')}>{t('report.yearly')}</ToggleGroupItem>
                    </ToggleGroup>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant={timeRange === 'custom' ? 'default' : 'outline'}
                                size="icon"
                                aria-label={t('report.custom_range')}
                                title={t('report.custom_range')}
                            >
                                <CalendarIcon className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="range"
                                numberOfMonths={1}
                                locale={dateLocale}
                                selected={customRange}
                                onSelect={setCustomRange}
                                disabled={{ after: new Date() }}
                                defaultMonth={customRange?.from ?? anchorDate}
                            />
                            <div className="flex justify-end gap-2 p-3 border-t">
                                <Button variant="ghost" size="sm" onClick={clearCustomRange}>{t('report.reset_range')}</Button>
                                <Button size="sm" disabled={!customRange?.from} onClick={applyCustomRange}>{t('report.apply_range')}</Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>

            <div className="flex items-center justify-center gap-3 print:hidden">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => shiftAnchor(-1)}
                    disabled={timeRange === 'custom'}
                    aria-label={t('report.previous_period')}
                    title={t('report.previous_period')}
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium min-w-[160px] text-center capitalize">{periodLabel}</span>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => shiftAnchor(1)}
                    disabled={timeRange === 'custom' || !canGoNext}
                    aria-label={t('report.next_period')}
                    title={t('report.next_period')}
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {noData ? (
                 <div className="flex flex-col items-center justify-center text-center py-20 px-6 rounded-lg border-2 border-dashed border-border">
                    <LineChart className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">{t('report.no_data_title')}</h2>
                    <p className="text-muted-foreground mb-6 max-w-sm mx-auto">{t('report.no_data_description')}</p>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('report.total_profit')}</CardTitle>
                                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{formatCurrency(reportData.totalProfit)}</div>
                                <p className="text-xs text-muted-foreground">{t('report.profit_subtitle_period')}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('report.total_sold')}</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{reportData.totalSold}</div>
                                 <p className="text-xs text-muted-foreground">{t('report.sold_subtitle_period')}</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('report.total_returned')}</CardTitle>
                                <Undo className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{reportData.totalReturned}</div>
                                <p className="text-xs text-muted-foreground">{t('report.returned_subtitle_period')}</p>
                            </CardContent>
                        </Card>
                         <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">{t('report.total_stock')}</CardTitle>
                                <Warehouse className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{products.reduce((acc, p) => acc + p.quantity, 0)}</div>
                                <p className="text-xs text-muted-foreground">{t('report.stock_subtitle')}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>{t('report.performance_title')}</CardTitle>
                            <CardDescription>{t('report.performance_description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="pl-2">
                           {chartData.length === 0 ? (
                                <div className="flex items-center justify-center h-[350px] text-muted-foreground">
                                    <CalendarIcon className="h-8 w-8 mr-2" />
                                    <p>{t('report.no_data_for_period')}</p>
                                </div>
                           ) : (
                            <ResponsiveContainer width="100%" height={350}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                                    <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${currency.symbol}${value}`} />
                                    <YAxis yAxisId="right" orientation="right" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: 'hsl(var(--background))',
                                            borderColor: 'hsl(var(--border))',
                                            borderRadius: 'var(--radius)',
                                        }}
                                        formatter={(value: number, name) => name === 'profit' ? formatCurrency(value, false) : value}
                                    />
                                    <Legend iconSize={10} />
                                    <Bar yAxisId="left" dataKey="profit" name={t('report.profit_legend')} fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="sold" name={t('report.sold_legend')} fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                           )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
}
