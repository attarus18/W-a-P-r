'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useProducts, useSales } from '@/context/product-context';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLanguage } from '@/context/language-context';
import { TrendingUp, Package, Undo, Printer, LineChart, Calendar, Warehouse, Loader2 } from 'lucide-react';
import { useCurrency } from '@/context/currency-context';
import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, format } from 'date-fns';
import { enUS, it, es, fr, de } from 'date-fns/locale';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useUser } from '@/firebase';
import AccessDenied from '@/components/auth/access-denied';
import jsPDF from 'jspdf';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useSubscription } from '@/context/subscription-context';
import ProFeatureDialog from '@/components/auth/pro-feature-dialog';

type TimeRange = 'day' | 'week' | 'month' | 'year';

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
    const { subscription, isSubscriptionLoading, hasActiveSubscription } = useSubscription();

    const [timeRange, setTimeRange] = useState<TimeRange>('month');
    const [isPrinting, setIsPrinting] = useState(false);
    const { toast } = useToast();
    const isMobile = useIsMobile();

    const dateLocale = localeMap[language] || enUS;

    const { filteredSales, chartData } = useMemo(() => {
        const now = new Date();
        let startDate: Date;
        let endDate: Date = now;
        let formatString: string;

        switch (timeRange) {
            case 'day':
                startDate = startOfDay(now);
                endDate = endOfDay(now);
                formatString = 'HH:00';
                break;
            case 'week':
                startDate = startOfWeek(now, { weekStartsOn: 1 });
                endDate = endOfWeek(now, { weekStartsOn: 1 });
                formatString = 'EEE';
                break;
            case 'month':
                startDate = startOfMonth(now);
                endDate = endOfMonth(now);
                formatString = 'dd';
                break;
            case 'year':
            default:
                startDate = startOfYear(now);
                endDate = endOfYear(now);
                formatString = 'LLL';
                break;
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


        return { filteredSales: filtered, chartData: chart };

    }, [sales, timeRange, convert, dateLocale]);


    const reportData = useMemo(() => {
        return filteredSales.reduce((acc, s) => {
            acc.totalProfit += (s.salePrice - s.productionCost) * s.quantity;
            acc.totalSold += s.quantity;
            return acc;
        }, { totalProfit: 0, totalSold: 0 });
    }, [filteredSales]);
    
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

        const totalStock = products.reduce((acc, p) => acc + p.quantity, 0);

        return {
            perProductStats: stats,
            grandTotalProfit: totalProfit,
            grandTotalStock: totalStock,
        };
    }, [products, sales]);

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
            y += 30;

            // --- SUMMARY CARDS ---
            const cardWidth = (pageWidth / 2) - margin - 5;
            const cardHeight = 55;

            // Card 1: Total Profit
            doc.setDrawColor(primaryColor);
            doc.setLineWidth(1);
            doc.roundedRect(margin, y, cardWidth, cardHeight, 8, 8, 'S');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(mutedColor);
            doc.text(t('report.pdf.total_cumulative_profit').toUpperCase(), margin + 10, y + 18);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textColor);
            doc.text(formatCurrencyForPdf(grandTotalProfit), margin + 10, y + 38);

            // Card 2: Total Stock
            doc.setDrawColor(borderColor);
            doc.setFillColor(lightBgColor);
            doc.roundedRect(pageWidth - margin - cardWidth, y, cardWidth, cardHeight, 8, 8, 'FD');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(mutedColor);
            doc.text(t('report.pdf.total_stock_pieces').toUpperCase(), pageWidth - margin - cardWidth + 10, y + 18);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(textColor);
            doc.text(`${grandTotalStock} PZ`, pageWidth - margin - cardWidth + 10, y + 38);
            y += cardHeight + 25;

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

            if (isMobile) {
                const pdfBlob = doc.output('blob');
                const blobUrl = URL.createObjectURL(pdfBlob);
                const newWindow = window.open(blobUrl, '_blank');
                if (!newWindow) {
                     toast({
                        variant: "destructive",
                        title: t('report.pdf_error_title'),
                        description: t('report.pdf.popup_blocked'),
                    });
                }
            } else {
                doc.save('waxpro-inventory-report.pdf');
            }

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

    const noData = sales.length === 0;

    if (isSubscriptionLoading || salesLoading || productsLoading) {
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
            
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <h2 className="text-xl font-bold tracking-tight">{t('report.summary_title')}</h2>
                <ToggleGroup type="single" value={timeRange} onValueChange={(value: TimeRange) => value && setTimeRange(value)}>
                    <ToggleGroupItem value="day" aria-label={t('report.daily')}>{t('report.daily')}</ToggleGroupItem>
                    <ToggleGroupItem value="week" aria-label={t('report.weekly')}>{t('report.weekly')}</ToggleGroupItem>
                    <ToggleGroupItem value="month" aria-label={t('report.monthly')}>{t('report.monthly')}</ToggleGroupItem>
                    <ToggleGroupItem value="year" aria-label={t('report.yearly')}>{t('report.yearly')}</ToggleGroupItem>
                </ToggleGroup>
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
                                <div className="text-2xl font-bold">N/A</div>
                                <p className="text-xs text-muted-foreground">{t('report.returned_subtitle')}</p>
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
                                    <Calendar className="h-8 w-8 mr-2" />
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
