import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastContext';
import { ConfirmModal } from '../ui/ConfirmModal';
import { generateFinanceMovementContent, DEFAULT_AI_CONFIG, AIConfig } from '../../lib/ai';
import { AIEngineSelector } from '../ai/AIEngineSelector';
import {
    Plus, DollarSign, TrendingUp, TrendingDown, PieChart as PieChartIcon,
    Calendar, FileText, Upload, Trash2, ArrowLeft, Wallet, AlertCircle,
    CheckCircle, X, Loader2, Image as ImageIcon, ChevronDown, Sparkles, Bot, LayoutGrid, Edit, Search
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList, AreaChart, Area, ReferenceLine, ComposedChart, Line } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

// Interfaces
interface FinancialTransaction {
    id: string;
    activity_id: string;
    title: string;
    type: 'income' | 'expense';
    category: string;
    amount: number;
    description: string;
    evidence_urls: string[];
    report_url?: string;
    transaction_date: string;
    created_by: string;
}

interface Activity {
    id: string;
    title: string;
    description: string;
    initial_budget: number;
    status: 'active' | 'completed';
    created_at: string;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
const STITCH_BLUE = '#3B82F6';
const STITCH_GREEN = '#10B981';
const STITCH_RED = '#EF4444';
const STITCH_DARK_CARD = '#0D0D0D';
const STITCH_BORDER = '#262626';
const STITCH_INPUT = '#151515';

export function FinanceView() {
    const { user } = useAuth();
    const { showToast } = useToast();
    const location = useLocation();
    const [view, setView] = useState<'global_dashboard' | 'activity_detail'>('global_dashboard');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [activities, setActivities] = useState<Activity[]>([]);
    const [allTransactions, setAllTransactions] = useState<FinancialTransaction[]>([]);
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
    const [loading, setLoading] = useState(true);
    const [usersMap, setUsersMap] = useState<Record<string, string>>({});
    const [signatories, setSignatories] = useState({
        director: 'Edwar Jhanpiere Sáenz Tello',
        subdirector: 'Gresia Julissa Victorio Tirado'
    });

    // Modals & Forms
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<FinancialTransaction | null>(null);
    const [viewingTransaction, setViewingTransaction] = useState<FinancialTransaction | null>(null);
    const [transactionForm, setTransactionForm] = useState<Partial<FinancialTransaction>>({
        type: 'expense',
        amount: 0,
        evidence_urls: []
    });
    const [uploading, setUploading] = useState(false);
    const [openMenu, setOpenMenu] = useState<'monthly' | 'annual' | null>(null);
    const [selectedDay, setSelectedDay] = useState<number | 'all'>('all');
    const [selectedMonth, setSelectedMonth] = useState<number | 'all'>('all'); // Default to 'all' (Annual View)
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // AI Assistant States
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [aiConfig, setAiConfig] = useState<AIConfig>(DEFAULT_AI_CONFIG);
    const [searchTerm, setSearchTerm] = useState('');

    // Delete Confirmation State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);

    // Get unique categories
    const categories = Array.from(new Set(allTransactions.map(t => t.category)));

    useEffect(() => {
        fetchData();
    }, []);

    // Handle pre-fill from Orchestrator
    useEffect(() => {
        if (location.state?.action === 'create' && location.state?.data) {
            const data = location.state.data;
            setTransactionForm(prev => ({
                ...prev,
                title: data.description || '',
                description: data.description || '',
                amount: data.amount || 0,
                type: data.type || 'expense',
                category: data.category || ''
            }));
            setShowTransactionModal(true);
            // Clear navigation state
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch Activities
            const { data: activitiesData, error: activitiesError } = await supabase
                .from('financial_activities')
                .select('*')
                .order('created_at', { ascending: false });

            if (activitiesError) throw activitiesError;
            setActivities(activitiesData || []);

            // Fetch Transactions
            const { data: transactionsData, error: transactionsError } = await supabase
                .from('financial_transactions')
                .select('*')
                .order('transaction_date', { ascending: false });

            if (transactionsError) throw transactionsError;
            setAllTransactions(transactionsData || []);

            // Fetch Users for Map and Signatories
            const { data: usersData } = await supabase
                .from('profiles')
                .select('id, "fullName", role');

            if (usersData) {
                const map: Record<string, string> = {};
                usersData.forEach(u => {
                    map[u.id] = (u as any).fullName;
                });
                setUsersMap(map);

                // Fetch Signatories from usersData (optimization: re-use fetched users)
                const director = usersData.find(u => u.role?.toLowerCase().includes('director'));
                const subdirector = usersData.find(u => u.role?.toLowerCase().includes('subdirector'));

                setSignatories({
                    director: (director as any)?.fullName || 'Edwar Jhanpiere Sáenz Tello',
                    subdirector: (subdirector as any)?.fullName || 'Gresia Julissa Victorio Tirado'
                });
            }

        } catch (error) {
            console.error('Error fetching finance data:', error);
        } finally {
            setLoading(false);
        }
    };

    // AI Assistant Function
    const handleGenerateFinance = async () => {
        if (!aiPrompt.trim()) return;

        setIsGenerating(true);
        try {
            const generated = await generateFinanceMovementContent(aiPrompt, aiConfig);
            if (generated) {
                setTransactionForm(prev => ({
                    ...prev,
                    title: generated.description,
                    description: generated.description,
                    type: generated.type,
                    amount: generated.amount,
                    category: generated.category
                }));
                setShowAiModal(false);
                setAiPrompt('');
            }
        } catch (error) {
            console.error('Error generating finance content:', error);
            showToast({
                type: 'error',
                title: 'Error de IA',
                message: 'Error al generar contenido con IA. Intenta de nuevo.'
            });
        } finally {
            setIsGenerating(false);
        }
    };

    // Filter transactions by month, day, and category
    const filteredTransactions = allTransactions.filter(t => {
        const tDate = new Date(t.transaction_date + 'T00:00:00'); // Fix timezone issue

        const isYearMatch = tDate.getFullYear() === currentDate.getFullYear();
        const isMonthMatch = selectedMonth === 'all'
            ? true // Show all months if 'all' is selected
            : tDate.getMonth() === selectedMonth;

        const isDayMatch = selectedDay === 'all'
            ? true
            : tDate.getDate() === selectedDay;

        const isCategoryMatch = selectedCategory === 'all'
            ? true
            : t.category === selectedCategory;

        const isSearchMatch = searchTerm.trim() === ''
            ? true
            : (t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               t.category?.toLowerCase().includes(searchTerm.toLowerCase()));

        return isYearMatch && isMonthMatch && isDayMatch && isCategoryMatch && isSearchMatch;
    });

    // Calculate Previous Balance (Accumulated from previous years)
    const previousBalance = allTransactions
        .filter(t => {
            const tDate = new Date(t.transaction_date + 'T00:00:00'); // Fix timezone issue
            return tDate.getFullYear() < currentDate.getFullYear();
        })
        .reduce((acc, t) => {
            const amount = Number(t.amount);
            return t.type === 'income' ? acc + amount : acc - amount;
        }, 0);

    const handleFileUpload = async (files: FileList | null, type: 'evidence' | 'report') => {
        if (!files || files.length === 0) return;
        setUploading(true);

        try {
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `finance/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('evidence')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('evidence')
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrl);
            }

            if (type === 'evidence') {
                setTransactionForm(prev => ({
                    ...prev,
                    evidence_urls: [...(prev.evidence_urls || []), ...uploadedUrls]
                }));
            } else {
                setTransactionForm(prev => ({
                    ...prev,
                    report_url: uploadedUrls[0]
                }));
            }

        } catch (error) {
            console.error('Error uploading file:', error);
            showToast({
                type: 'error',
                title: 'Error de Carga',
                message: 'No se pudo subir la evidencia al servidor.'
            });
        } finally {
            setUploading(false);
        }
    };

    const handleSaveTransaction = async () => {
        try {
            if (!transactionForm.title || !transactionForm.amount || !transactionForm.category || !transactionForm.description) {
                showToast({
                    type: 'warning',
                    title: 'Campos incompletos',
                    message: 'Por favor completa los campos obligatorios (Título, Monto, Categoría, Descripción)'
                });
                return;
            }

            // Auto-assign to the first active activity if not specified (since we hid activity selection)
            // Or create a default "General" activity if none exists?
            // For now, let's assume there is at least one activity or we use the first one found.
            let activityId = transactionForm.activity_id;
            if (!activityId && activities.length > 0) {
                activityId = activities[0].id;
            } else if (!activityId) {
                showToast({
                    type: 'error',
                    title: 'Error de Configuración',
                    message: 'No hay actividades registradas. Contacta al soporte.'
                });
                return;
            }

            const transactionData = {
                activity_id: activityId,
                title: transactionForm.title,
                type: transactionForm.type,
                category: transactionForm.category,
                amount: transactionForm.amount,
                description: transactionForm.description,
                evidence_urls: transactionForm.evidence_urls,
                report_url: transactionForm.report_url,
                transaction_date: transactionForm.transaction_date || new Date().toISOString().split('T')[0],
                created_by: user?.id
            };

            if (editingTransaction) {
                const { error } = await supabase
                    .from('financial_transactions')
                    .update(transactionData)
                    .eq('id', editingTransaction.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('financial_transactions')
                    .insert([transactionData]);
                if (error) throw error;
            }

            setShowTransactionModal(false);
            setTransactionForm({ type: 'expense', amount: 0, evidence_urls: [] });
            setEditingTransaction(null);
            
            showToast({
                type: 'success',
                title: 'Transacción Guardada',
                message: editingTransaction ? 'El movimiento ha sido actualizado.' : 'El movimiento ha sido registrado exitosamente.'
            });
            
            fetchData();
        } catch (error) {
            console.error('Error saving transaction:', error);
            showToast({
                type: 'error',
                title: 'Error',
                message: 'Error al guardar el movimiento financiero.'
            });
        }
    };

    const confirmDeleteTransaction = (id: string) => {
        setTransactionToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const handleDeleteTransaction = async () => {
        if (!transactionToDelete) return;

        try {
            const { error } = await supabase
                .from('financial_transactions')
                .delete()
                .eq('id', transactionToDelete);

            if (error) throw error;
            
            showToast({
                type: 'success',
                title: 'Movimiento Eliminado',
                message: 'El registro ha sido borrado del sistema.'
            });
            
            fetchData();
        } catch (error) {
            console.error('Error deleting transaction:', error);
            showToast({
                type: 'error',
                title: 'Error',
                message: 'No se pudo eliminar el movimiento.'
            });
        } finally {
            setIsDeleteModalOpen(false);
            setTransactionToDelete(null);
        }
    };

    const handleEditTransaction = (transaction: FinancialTransaction) => {
        setEditingTransaction(transaction);
        setTransactionForm(transaction);
        setShowTransactionModal(true);
    };


    const loadLogoData = async () => {
        try {
            const response = await fetch('/certificates/logo-revista/logo-revista-ACS.png');
            const blob = await response.blob();
            return new Promise<{ data: string, width: number, height: number }>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const data = reader.result as string;
                    const img = new Image();
                    img.onload = () => {
                        resolve({ data, width: img.naturalWidth, height: img.naturalHeight });
                    };
                    img.src = data;
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Error loading logo:", e);
            return null;
        }
    };

    // PDF Generation
    const generatePDF = async () => {
        try {
            const doc = new jsPDF();
            const logoInfo = await loadLogoData();

            if (logoInfo) {
                const targetWidth = 45;
                const scaledHeight = (targetWidth * logoInfo.height) / logoInfo.width;
                doc.addImage(logoInfo.data, 'PNG', 14, 10, targetWidth, scaledHeight);
            }

            // Header - Shift down for logo
            doc.setFont('times', 'bold');
            doc.setFontSize(16);
            doc.text('REPORTE DEL SISTEMA SGR', 105, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.text('EQUIPO DE COMUNICACIÓN Y MARKETING', 105, 30, { align: 'center' });
            doc.text('REVISTA ALTERNATIVAS EN CIENCIAS SOCIALES', 105, 40, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('times', 'normal');
            doc.text(`Reporte Mensual: ${currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}`, 105, 55, { align: 'center' });

            let currentY = 70;

            // Capture Charts
            const chartElement = document.getElementById('charts-container');
            if (chartElement) {
                try {
                    const canvas = await html2canvas(chartElement, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = 180;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    doc.addImage(imgData, 'PNG', 15, currentY, imgWidth, imgHeight);
                    currentY += imgHeight + 10;
                } catch (err) {
                    console.error("Error capturing charts:", err);
                    doc.text('(No se pudo incluir la gráfica en este reporte)', 14, currentY + 10);
                    currentY += 20;
                }
            } else {
                currentY += 10;
            }

            // Summary
            doc.setFont('times', 'bold');
            doc.text('Resumen Financiero:', 14, currentY);
            currentY += 10;
            doc.setFont('times', 'normal');
            doc.text(`Total Ingresos: S/ ${monthlyIncome.toFixed(2)}`, 14, currentY);
            currentY += 7;
            doc.text(`Total Gastos: S/ ${monthlyExpenses.toFixed(2)}`, 14, currentY);
            currentY += 7;
            doc.text(`Balance: S/ ${(monthlyIncome - monthlyExpenses).toFixed(2)}`, 14, currentY);
            currentY += 15;

            // Transactions Table
            autoTable(doc, {
                startY: currentY,
                head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Responsable']],
                body: filteredTransactions.map(t => [
                    new Date(t.transaction_date).toLocaleDateString(),
                    t.type === 'income' ? 'Ingreso' : 'Gasto',
                    t.category,
                    t.description,
                    `S/ ${Number(t.amount).toFixed(2)}`,
                    (usersMap && usersMap[t.created_by]) || 'Sistema'
                ]),
                styles: { font: 'times' },
                headStyles: { fillColor: [41, 128, 185] },
            });

            // Signatures
            const finalY = (doc as any).lastAutoTable.finalY + 30;

            doc.setFont('times', 'bold');
            doc.text('Atentamente,', 105, finalY, { align: 'center' });

            // Director Signature
            doc.text(signatories.director.toUpperCase(), 105, finalY + 20, { align: 'center' });
            doc.setFont('times', 'normal');
            doc.text('Director de Comunicación y Marketing', 105, finalY + 25, { align: 'center' });
            doc.text('Revista Alternativas en Ciencias Sociales', 105, finalY + 30, { align: 'center' });

            // Subdirector Signature
            doc.setFont('times', 'bold');
            doc.text(signatories.subdirector.toUpperCase(), 105, finalY + 50, { align: 'center' });
            doc.setFont('times', 'normal');
            doc.text('Subdirectora del Equipo de Comunicación y Marketing', 105, finalY + 55, { align: 'center' });
            doc.text('Revista Alternativas en Ciencias Sociales', 105, finalY + 60, { align: 'center' });

            doc.save(`Reporte_Financiero_${currentDate.getMonth() + 1}_${currentDate.getFullYear()}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            showToast({
                type: 'error',
                title: 'Error de PDF',
                message: 'No se pudo generar el reporte PDF. Revisa la consola.'
            });
        }
    };

    // Generate Word Report
    const generateWordReport = async (type: 'monthly' | 'annual') => {
        const titleText = type === 'monthly'
            ? `Reporte Mensual: ${currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}`
            : `Reporte Anual: ${currentDate.getFullYear()}`;

        const transactionsToReport = type === 'monthly' ? filteredTransactions : allTransactions.filter(t => new Date(t.transaction_date).getFullYear() === currentDate.getFullYear());

        const income = transactionsToReport.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const expenses = transactionsToReport.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);

        const logoInfo = await loadLogoData();
        let logoBuffer = null;
        let logoWidth = 100;
        let logoHeight = 40;

        if (logoInfo) {
            logoBuffer = Uint8Array.from(atob(logoInfo.data.split(',')[1]), c => c.charCodeAt(0));
            // Escalar para Word (mantener proporción)
            logoWidth = 120; // pt
            logoHeight = (logoWidth * logoInfo.height) / logoInfo.width;
        }

        const doc = new Document({
            sections: [{
                properties: {},
                children: [
                    // Logo if exists
                    ...(logoBuffer ? [
                        new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [
                                new ImageRun({
                                    data: logoBuffer as Uint8Array,
                                    transformation: { width: logoWidth, height: logoHeight }
                                } as any)
                            ]
                        })
                    ] : []),
                    // Header
                    new Paragraph({
                        text: "REPORTE DEL SISTEMA SGR",
                        heading: HeadingLevel.HEADING_1,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        run: { font: "Times New Roman", bold: true, size: 32 }
                    }),
                    new Paragraph({
                        text: "EQUIPO DE COMUNICACIÓN Y MARKETING",
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        run: { font: "Times New Roman", bold: true, size: 28 }
                    }),
                    new Paragraph({
                        text: "REVISTA ALTERNATIVAS EN CIENCIAS SOCIALES",
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                        run: { font: "Times New Roman", bold: true, size: 28 }
                    }),
                    new Paragraph({
                        text: titleText,
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 400 },
                        run: { font: "Times New Roman", size: 24 }
                    }),

                    // Summary
                    new Paragraph({
                        text: "Resumen Financiero",
                        heading: HeadingLevel.HEADING_2,
                        run: { font: "Times New Roman", bold: true, size: 24 }
                    }),
                    new Paragraph({ text: `Total Ingresos: S/ ${income.toFixed(2)}`, run: { font: "Times New Roman", size: 24 } }),
                    new Paragraph({ text: `Total Gastos: S/ ${expenses.toFixed(2)}`, run: { font: "Times New Roman", size: 24 } }),
                    new Paragraph({ text: `Balance: S/ ${(income - expenses).toFixed(2)}`, spacing: { after: 400 }, run: { font: "Times New Roman", size: 24 } }),

                    // Table
                    new Table({
                        width: { size: 100, type: WidthType.PERCENTAGE },
                        rows: [
                            new TableRow({
                                children: ['Fecha', 'Tipo', 'Categoría', 'Monto', 'Responsable'].map(header =>
                                    new TableCell({
                                        children: [new Paragraph({ text: header, run: { font: "Times New Roman", bold: true } })],
                                        shading: { fill: "2980B9", color: "white" }
                                    })
                                )
                            }),
                            ...transactionsToReport.map(t => new TableRow({
                                children: [
                                    new Date(t.transaction_date).toLocaleDateString(),
                                    t.type === 'income' ? 'Ingreso' : 'Gasto',
                                    t.category,
                                    `S/ ${Number(t.amount).toFixed(2)}`,
                                    (usersMap && usersMap[t.created_by]) || 'Sistema'
                                ].map(text => new TableCell({
                                    children: [new Paragraph({ text, run: { font: "Times New Roman" } })]
                                }))
                            }))
                        ]
                    }),

                    // Signatures
                    new Paragraph({
                        text: "Atentamente,",
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 400, after: 200 },
                        run: { font: "Times New Roman", bold: true, size: 24 }
                    }),

                    // Director
                    new Paragraph({ text: signatories.director.toUpperCase(), alignment: AlignmentType.CENTER, run: { font: "Times New Roman", bold: true } }),
                    new Paragraph({ text: "Director de Comunicación y Marketing", alignment: AlignmentType.CENTER, run: { font: "Times New Roman" } }),
                    new Paragraph({ text: "Revista Alternativas en Ciencias Sociales", alignment: AlignmentType.CENTER, spacing: { after: 400 }, run: { font: "Times New Roman" } }),

                    // Subdirector
                    new Paragraph({ text: signatories.subdirector.toUpperCase(), alignment: AlignmentType.CENTER, run: { font: "Times New Roman", bold: true } }),
                    new Paragraph({ text: "Subdirectora del Equipo de Comunicación y Marketing", alignment: AlignmentType.CENTER, run: { font: "Times New Roman" } }),
                    new Paragraph({ text: "Revista Alternativas en Ciencias Sociales", alignment: AlignmentType.CENTER, run: { font: "Times New Roman" } }),
                ]
            }]
        });

        Packer.toBlob(doc).then(blob => {
            saveAs(blob, `Reporte_Financiero_${type}_${currentDate.getTime()}.docx`);
        });
    };

    // Generate Annual PDF Report
    const generateAnnualReport = async () => {
        try {
            const doc = new jsPDF();
            const year = currentDate.getFullYear();
            const logoInfo = await loadLogoData();

            if (logoInfo) {
                const targetWidth = 45;
                const scaledHeight = (targetWidth * logoInfo.height) / logoInfo.width;
                doc.addImage(logoInfo.data, 'PNG', 14, 10, targetWidth, scaledHeight);
            }

            // Header
            doc.setFont('times', 'bold');
            doc.setFontSize(16);
            doc.text('REPORTE DEL SISTEMA SGR', 105, 20, { align: 'center' });
            doc.setFontSize(14);
            doc.text('EQUIPO DE COMUNICACIÓN Y MARKETING', 105, 30, { align: 'center' });
            doc.text('REVISTA ALTERNATIVAS EN CIENCIAS SOCIALES', 105, 40, { align: 'center' });

            doc.setFontSize(12);
            doc.setFont('times', 'normal');
            doc.text(`Reporte Anual: ${year}`, 105, 55, { align: 'center' });

            let currentY = 70;

            // Capture Charts
            const chartElement = document.getElementById('charts-container');
            if (chartElement) {
                try {
                    const canvas = await html2canvas(chartElement, { scale: 2 });
                    const imgData = canvas.toDataURL('image/png');
                    const imgWidth = 180;
                    const imgHeight = (canvas.height * imgWidth) / canvas.width;

                    doc.addImage(imgData, 'PNG', 15, currentY, imgWidth, imgHeight);
                    currentY += imgHeight + 10;
                } catch (err) {
                    console.error("Error capturing charts:", err);
                    doc.text('(No se pudo incluir la gráfica en este reporte)', 14, currentY + 10);
                    currentY += 20;
                }
            } else {
                currentY += 10;
            }

            // Stats
            const annualTransactions = allTransactions.filter(t => {
                const tDate = new Date(t.transaction_date + 'T00:00:00');
                return tDate.getFullYear() === year;
            });

            const income = annualTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
            const expenses = annualTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);

            doc.setFont('times', 'bold');
            doc.text('Resumen Anual:', 14, currentY);
            currentY += 10;
            doc.setFont('times', 'normal');
            doc.text(`Total Ingresos: S/ ${income.toFixed(2)}`, 14, currentY);
            currentY += 7;
            doc.text(`Total Gastos: S/ ${expenses.toFixed(2)}`, 14, currentY);
            currentY += 7;
            doc.text(`Balance Anual: S/ ${(income - expenses).toFixed(2)}`, 14, currentY);
            currentY += 15;

            // Table
            autoTable(doc, {
                startY: currentY,
                head: [['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Responsable']],
                body: annualTransactions.map(t => [
                    new Date(t.transaction_date).toLocaleDateString(),
                    t.type === 'income' ? 'Ingreso' : 'Gasto',
                    t.category,
                    t.description,
                    `S/ ${Number(t.amount).toFixed(2)}`,
                    (usersMap && usersMap[t.created_by]) || 'Sistema'
                ]),
                styles: { font: 'times' },
                headStyles: { fillColor: [41, 128, 185] },
            });

            // Signatures
            const finalY = (doc as any).lastAutoTable.finalY + 30;

            doc.setFont('times', 'bold');
            doc.text('Atentamente,', 105, finalY, { align: 'center' });

            // Director Signature
            doc.text(signatories.director.toUpperCase(), 105, finalY + 20, { align: 'center' });
            doc.setFont('times', 'normal');
            doc.text('Director de Comunicación y Marketing', 105, finalY + 25, { align: 'center' });
            doc.text('Revista Alternativas en Ciencias Sociales', 105, finalY + 30, { align: 'center' });

            // Subdirector Signature
            doc.setFont('times', 'bold');
            doc.text(signatories.subdirector.toUpperCase(), 105, finalY + 50, { align: 'center' });
            doc.setFont('times', 'normal');
            doc.text('Subdirectora del Equipo de Comunicación y Marketing', 105, finalY + 55, { align: 'center' });
            doc.text('Revista Alternativas en Ciencias Sociales', 105, finalY + 60, { align: 'center' });

            doc.save(`reporte_anual_${year}.pdf`);
        } catch (error) {
            console.error('Error generating annual report:', error);
            showToast({
                type: 'error',
                title: 'Error de Reporte',
                message: 'Error al generar el reporte PDF Anual.'
            });
        }
    };

    // Calculate Global Stats (Income, Expenses, Balance) based on FILTERED transactions
    const calculateGlobalStats = () => {
        const monthlyIncome = filteredTransactions
            .filter(t => t.type === 'income')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);

        const monthlyExpenses = filteredTransactions
            .filter(t => t.type === 'expense')
            .reduce((acc, curr) => acc + Number(curr.amount), 0);

        // Global Balance includes previous years' accumulated balance
        // If we are filtering by specific month/day, previousBalance is still strictly "years before current year"
        // But for "Year to Date" logic within the year, we might need to handle months before selected month if purely cumulative?
        // For simplicity and matching user request "2026 counts 2025", we just add previousBalance to the net of current view.
        // Wait, if I view "March 2026", "Balance" usually means "Balance at end of March".
        // The current code calculates income/expense just for the view.
        // If I want "Total Money Available", it should be previousBalance + (Income - Expense of current year UP TO now? Or just current view?)

        // User request: "appear the 38 because 38 was collected in 2025".
        // So for 2026 view (Annual), Balance = 38 + 0 = 38.

        return {
            monthlyIncome,
            monthlyExpenses,
            globalBalance: previousBalance + (monthlyIncome - monthlyExpenses)
        };
    };

    // Chart Data
    // Chart Data
    const getChartData = () => {
        const expensesByCategory: Record<string, number> = {};
        filteredTransactions
            .filter(t => t.type === 'expense')
            .forEach(t => {
                expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + Number(t.amount);
            });

        return Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
    };

    const getIncomeChartData = () => {
        const incomeByCategory: Record<string, number> = {};
        filteredTransactions
            .filter(t => t.type === 'income')
            .forEach(t => {
                incomeByCategory[t.category] = (incomeByCategory[t.category] || 0) + Number(t.amount);
            });

        return Object.entries(incomeByCategory).map(([name, value]) => ({ name, value }));
    };

    const getBalanceChartData = () => {
        const { monthlyIncome, monthlyExpenses, globalBalance } = calculateGlobalStats();
        return [
            { name: 'Ingresos', amount: monthlyIncome, fill: '#10B981' }, // green-500
            { name: 'Gastos', amount: monthlyExpenses, fill: '#EF4444' },  // red-500
            { name: 'Saldo', amount: globalBalance, fill: '#3B82F6' } // blue-500
        ];
    };

    const getTrendData = () => {
        const isAnnual = selectedMonth === 'all';
        const data = [];
        let runningBalance = previousBalance; // Start with carryover
        // Note: For annual view, this is correct (starts at previous year end).
        // For monthly view, we technically need balance up to start of month.
        // Let's adjust for monthly view below.

        if (!isAnnual && selectedMonth !== 'all') {
            // Add transactions from current year BEFORE selected month
            const currentYearPreMonthBalance = allTransactions
                .filter(t => {
                    const tDate = new Date(t.transaction_date + 'T00:00:00');
                    return tDate.getFullYear() === currentDate.getFullYear() && tDate.getMonth() < (selectedMonth as number);
                })
                .reduce((acc, t) => {
                    const amount = Number(t.amount);
                    return t.type === 'income' ? acc + amount : acc - amount;
                }, 0);
            runningBalance += currentYearPreMonthBalance;
        }

        let accIncome = 0;
        let accExpenses = 0;

        if (isAnnual) {
            // ANNUAL MODE: Group by Month (0-11)
            const monthlyStats: Record<number, { net: number, income: number, expense: number }> = {};

            // Initialize all months
            for (let i = 0; i < 12; i++) {
                monthlyStats[i] = { net: 0, income: 0, expense: 0 };
            }

            filteredTransactions.forEach(t => {
                const month = new Date(t.transaction_date + 'T00:00:00').getMonth();
                const amount = Number(t.amount);
                if (t.type === 'income') {
                    monthlyStats[month].income += amount;
                    monthlyStats[month].net += amount;
                } else {
                    monthlyStats[month].expense += amount;
                    monthlyStats[month].net -= amount;
                }
            });

            const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

            for (let i = 0; i < 12; i++) {
                const stats = monthlyStats[i];
                runningBalance += stats.net;
                accIncome += stats.income;
                accExpenses += stats.expense;

                data.push({
                    day: monthNames[i], // Use month name as X-axis key
                    balance: runningBalance,
                    income: accIncome,
                    expense: accExpenses,
                    formattedDate: monthNames[i]
                });
            }

        } else {
            // MONTHLY MODE: Group by Day (1-31)
            const daysInMonth = new Date(currentDate.getFullYear(), (selectedMonth as number) + 1, 0).getDate();
            const dailyStats: Record<number, { net: number, income: number, expense: number }> = {};

            // Initialize
            for (let i = 1; i <= daysInMonth; i++) {
                dailyStats[i] = { net: 0, income: 0, expense: 0 };
            }

            filteredTransactions.forEach(t => {
                const day = new Date(t.transaction_date + 'T00:00:00').getDate();
                const amount = Number(t.amount);

                if (t.type === 'income') {
                    dailyStats[day].income += amount;
                    dailyStats[day].net += amount;
                } else {
                    dailyStats[day].expense += amount;
                    dailyStats[day].net -= amount;
                }
            });

            for (let i = 1; i <= daysInMonth; i++) {
                const stats = dailyStats[i];
                runningBalance += stats.net;
                accIncome += stats.income;
                accExpenses += stats.expense;

                data.push({
                    day: i,
                    balance: runningBalance,
                    income: accIncome,
                    expense: accExpenses,
                    formattedDate: `${i}/${(selectedMonth as number) + 1}`
                });
            }
        }
        return data;
    };

    const trendData = getTrendData();
    const isPositiveTrend = trendData.length > 0 && trendData[trendData.length - 1].balance >= 0;
    const trendColor = isPositiveTrend ? '#10B981' : '#EF4444'; // Green or Red

    const { monthlyIncome, monthlyExpenses, globalBalance } = calculateGlobalStats();

    const changeMonth = (increment: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + increment);
        setCurrentDate(newDate);
    };

    return (
        <div className="p-2 md:p-3 max-w-6xl mx-auto space-y-3 md:space-y-4 min-h-screen bg-black text-exec-slate custom-scrollbar">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 pb-6 border-b border-exec-border gap-6">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter leading-none flex items-center gap-4">
                        <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                            <Wallet className="w-6 h-6 text-exec-blue" />
                        </div>
                        <span>Gestión <span className="text-exec-blue">Financiera</span></span>
                    </h1>
                    <p className="text-[10px] uppercase font-bold tracking-widest text-gray-500 mt-1">
                        Panel de control financiero y auditoría de activos institucionales.
                    </p>
                </div>
                {view === 'global_dashboard' && (
                    <div className="flex items-center gap-2">
                        {/* Date Selectors Group */}
                        <div className="flex items-center gap-1.5 bg-[#0D0D0D] px-3 py-1.5 rounded-none border border-exec-border shadow-2xl h-[40px]">
                            <select
                                className="bg-transparent border-none text-[10px] font-bold text-gray-400 uppercase tracking-widest outline-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
                                value={selectedMonth === 'all' ? 'all' : selectedMonth}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    setSelectedMonth(val === 'all' ? 'all' : parseInt(val));
                                    if (val !== 'all') {
                                        const newDate = new Date(currentDate);
                                        newDate.setMonth(parseInt(val));
                                        setCurrentDate(newDate);
                                    }
                                }}
                            >
                                <option value="all" className="bg-[#0D0D0D]">Todo el Año</option>
                                {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((month, index) => (
                                    <option key={index} value={index} className="bg-[#0D0D0D]">{month}</option>
                                ))}
                            </select>

                            <div className="w-px h-4 bg-exec-border mx-1"></div>

                            <select
                                className="bg-transparent border-none text-[10px] font-bold text-gray-400 uppercase tracking-widest outline-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
                                value={currentDate.getFullYear()}
                                onChange={(e) => {
                                    const newDate = new Date(currentDate);
                                    newDate.setFullYear(parseInt(e.target.value));
                                    setCurrentDate(newDate);
                                }}
                            >
                                {Array.from({ length: 2030 - 2023 + 1 }, (_, i) => 2023 + i).map(year => (
                                    <option key={year} value={year} className="bg-[#0D0D0D]">{year}</option>
                                ))}
                            </select>

                            {selectedMonth !== 'all' && (
                                <>
                                    <div className="w-px h-4 bg-exec-border mx-1"></div>
                                    <select
                                        className="bg-transparent border-none text-[10px] font-bold text-gray-400 uppercase tracking-widest outline-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
                                        value={selectedDay}
                                        onChange={(e) => setSelectedDay(e.target.value === 'all' ? 'all' : parseInt(e.target.value))}
                                    >
                                        <option value="all" className="bg-[#0D0D0D]">Todo el mes</option>
                                        {Array.from({ length: new Date(currentDate.getFullYear(), (selectedMonth as number) + 1, 0).getDate() }, (_, i) => i + 1).map(day => (
                                            <option key={day} value={day} className="bg-[#0D0D0D]">Día {day}</option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>

                        {/* Report Exporting Controls */}
                        <div className="flex items-center gap-2">
                            {/* Reports Group Block */}
                            <div className="flex items-center gap-1.5 bg-[#0D0D0D] px-3 py-1.5 rounded-none border border-exec-border shadow-2xl h-[40px]">
                                {/* Monthly Report */}
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenu(openMenu === 'monthly' ? null : 'monthly')}
                                        className="flex items-center gap-2 px-2 py-1 text-gray-400 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest h-full"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-exec-blue" />
                                        <span>Mes</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'monthly' ? 'rotate-180' : ''}`} />
                                    </button>

                                    {openMenu === 'monthly' && (
                                        <div className="absolute right-0 mt-2 w-48 bg-[#0D0D0D] border border-exec-border rounded-none shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <button
                                                onClick={() => { generatePDF(); setOpenMenu(null); }}
                                                className="w-full text-left px-4 py-3 hover:bg-[#151515] flex items-center gap-3 transition-colors border-b border-exec-border"
                                            >
                                                <FileText className="w-4 h-4 text-red-500" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descargar PDF</span>
                                            </button>
                                            <button
                                                onClick={() => { generateWordReport('monthly'); setOpenMenu(null); }}
                                                className="w-full text-left px-4 py-3 hover:bg-[#151515] flex items-center gap-3 transition-colors"
                                            >
                                                <FileText className="w-4 h-4 text-exec-blue" />
                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Descargar Word</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="w-px h-4 bg-exec-border mx-1"></div>

                                {/* Annual Report */}
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenu(openMenu === 'annual' ? null : 'annual')}
                                        className="flex items-center gap-2 px-2 py-1 text-gray-400 hover:text-white transition-all text-[10px] font-bold uppercase tracking-widest h-full"
                                    >
                                        <FileText className="w-3.5 h-3.5 text-exec-blue" />
                                        <span>Anual</span>
                                        <ChevronDown className={`w-3 h-3 transition-transform ${openMenu === 'annual' ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openMenu === 'annual' && (
                                        <div className="absolute right-0 mt-2 w-48 bg-[#0D0D0D] border border-exec-border rounded-none shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            <button
                                                onClick={() => { generateAnnualReport(); setOpenMenu(null); }}
                                                className="w-full text-left px-4 py-3 hover:bg-[#151515] flex items-center gap-3 transition-colors border-b border-exec-border"
                                            >
                                                <FileText className="w-4 h-4 text-red-500" />
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Descargar PDF</span>
                                            </button>
                                            <button
                                                onClick={() => { generateWordReport('annual'); setOpenMenu(null); }}
                                                className="w-full text-left px-4 py-3 hover:bg-[#151515] flex items-center gap-3 transition-colors"
                                            >
                                                <FileText className="w-4 h-4 text-exec-blue" />
                                                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Descargar Word</span>
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="w-px h-6 bg-exec-border mx-1"></div>

                            <button
                                onClick={() => setShowAiModal(true)}
                                className="flex items-center gap-2 px-4 py-1.5 bg-white hover:bg-gray-100 text-black rounded-none transition-all text-[10px] font-bold uppercase tracking-widest shadow-lg h-[40px] group"
                            >
                                <Bot className="w-4 h-4 text-exec-blue group-hover:animate-pulse" />
                                <span>IA</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {
                view === 'global_dashboard' ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Global Summary Cards */}
                        <div className="flex flex-wrap gap-4 justify-center">
                            <div className="flex-none w-full sm:w-[280px] bg-[#0A0A0A]/80 backdrop-blur-sm border border-white/[0.05] p-4 rounded-none hover:border-green-500/40 hover:bg-[#0D0D0D] transition-all group relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 blur-[30px] -mr-10 -mt-10 group-hover:bg-green-500/20 transition-colors"></div>
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="mt-1.5">
                                        <TrendingUp className="w-4 h-4 text-green-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.18em] truncate">Ingresos ({currentDate.toLocaleString('es-ES', { month: 'long' })})</h3>
                                            <span className="text-[7px] font-bold text-green-500 uppercase tracking-widest bg-green-500/10 px-1.5 py-0.5 rounded-none shrink-0">Mensual</span>
                                        </div>
                                        <p className="text-lg font-bold text-white tracking-tighter leading-none">S/ {monthlyIncome.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                             <div className="flex-none w-full sm:w-[280px] bg-[#0A0A0A]/80 backdrop-blur-sm border border-white/[0.05] p-4 rounded-none hover:border-red-500/40 hover:bg-[#0D0D0D] transition-all group relative overflow-hidden shadow-2xl">
                                <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 blur-[30px] -mr-10 -mt-10 group-hover:bg-red-500/20 transition-colors"></div>
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="mt-1.5">
                                        <TrendingDown className="w-4 h-4 text-red-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.18em] truncate">Gastos ({currentDate.toLocaleString('es-ES', { month: 'long' })})</h3>
                                            <span className="text-[7px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded-none shrink-0">Mensual</span>
                                        </div>
                                        <p className="text-lg font-bold text-white tracking-tighter leading-none">S/ {monthlyExpenses.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>

                             <div className={`flex-none w-full sm:w-[280px] bg-[#0A0A0A]/80 backdrop-blur-sm border p-4 rounded-none transition-all group relative overflow-hidden shadow-2xl ${globalBalance < 0 ? 'border-red-500/50 hover:border-red-500' : 'border-white/[0.05] hover:border-exec-blue/40 hover:bg-[#0D0D0D]'}`}>
                                <div className={`absolute top-0 right-0 w-20 h-20 blur-[30px] -mr-10 -mt-10 transition-colors ${globalBalance < 0 ? 'bg-red-500/20' : 'bg-exec-blue/10 group-hover:bg-exec-blue/20'}`}></div>
                                <div className="flex items-start gap-4 relative z-10">
                                    <div className="mt-1.5">
                                        <Wallet className={`w-4 h-4 ${globalBalance < 0 ? 'text-red-400' : 'text-exec-blue'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="text-[9px] font-bold text-gray-500 uppercase tracking-[0.18em] truncate">Saldo Global</h3>
                                            <div className="flex items-center gap-1 shrink-0">
                                                {globalBalance < 0 && (
                                                    <span className="text-[7px] font-bold text-red-500 uppercase tracking-widest bg-red-500/10 px-1.5 py-0.5 rounded-none flex items-center gap-0.5">
                                                        <AlertCircle className="w-1.5 h-1.5" />
                                                        Déficit
                                                    </span>
                                                )}
                                                <span className={`text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-none ${globalBalance < 0 ? 'text-red-500 bg-red-500/10' : 'text-exec-blue bg-exec-blue/10'}`}>Estado</span>
                                            </div>
                                        </div>
                                        <p className={`text-lg font-bold tracking-tighter leading-none ${globalBalance < 0 ? 'text-red-400' : 'text-white'}`}>
                                            S/ {globalBalance.toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Advanced Financial Dashboard Grid */}
                        {/* Advanced Financial Dashboard Grid (2x2) */}
                        <div id="charts-container" className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-4">
                            {/* 1. Main Trend Chart */}
                            <div className="bg-[#0D0D0D] border border-exec-border p-6 lg:p-8 rounded-none shadow-2xl flex flex-col h-full">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-exec-blue" />
                                            Evolución del Flujo
                                        </h3>
                                    </div>
                                </div>

                                <div className="h-[300px] w-full mt-auto">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#0088FF" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#0088FF" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                                            <XAxis
                                                dataKey="day"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                                                tickFormatter={(value) => `$${value}`}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: '#0D0D0D',
                                                    border: '1px solid #262626',
                                                    borderRadius: '0px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Area type="monotone" dataKey="balance" fill="url(#colorBalance)" stroke="#0088FF" strokeWidth={3} />
                                            <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={false} />
                                            <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} dot={false} />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 2. Balance Bar Chart (Restored) */}
                            <div className="bg-[#0D0D0D] border border-[#262626] p-6 lg:p-8 rounded-sm shadow-2xl flex flex-col h-full">
                                <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                    <PieChartIcon className="w-4 h-4 text-blue-400" />
                                    Balance Financiero
                                </h3>
                                <div className="h-[300px] w-full mt-auto">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={getBalanceChartData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#262626" />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                                            />
                                            <Tooltip
                                                formatter={(value) => `S/ ${Number(value).toFixed(2)}`}
                                                cursor={{ fill: '#151515' }}
                                                contentStyle={{
                                                    backgroundColor: '#0D0D0D',
                                                    border: '1px solid #262626',
                                                    borderRadius: '2px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Bar dataKey="amount" radius={[2, 2, 0, 0]} barSize={40}>
                                                {getBalanceChartData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                                ))}
                                                <LabelList
                                                    dataKey="amount"
                                                    position="top"
                                                    formatter={(value) => `S/ ${Number(value)}`}
                                                    style={{ fill: '#525252', fontSize: 10, fontWeight: 'bold' }}
                                                />
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 3. Income Pie Chart */}
                            <div className="bg-[#0D0D0D] p-6 lg:p-8 rounded-sm shadow-2xl flex flex-col justify-center h-full">
                                <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em] mb-6 flex items-center justify-center gap-2">
                                    <TrendingUp className="w-4 h-4 text-green-400" />
                                    Distribución de Ingresos
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={getIncomeChartData()}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {getIncomeChartData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => `S/ ${Number(value).toFixed(2)}`}
                                                contentStyle={{
                                                    backgroundColor: '#0D0D0D',
                                                    border: '1px solid #262626',
                                                    borderRadius: '2px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend
                                                layout="horizontal"
                                                verticalAlign="bottom"
                                                align="center"
                                                wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* 4. Expense Pie Chart */}
                            <div className="bg-[#0D0D0D] p-6 lg:p-8 rounded-sm shadow-2xl flex flex-col justify-center h-full">
                                <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em] mb-6 flex items-center justify-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-red-400" />
                                    Distribución de Gastos
                                </h3>
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={getChartData()}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {getChartData().map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip
                                                formatter={(value) => `S/ ${Number(value).toFixed(2)}`}
                                                contentStyle={{
                                                    backgroundColor: '#0D0D0D',
                                                    border: '1px solid #262626',
                                                    borderRadius: '2px',
                                                    fontSize: '10px',
                                                    fontWeight: 'bold',
                                                    textTransform: 'uppercase',
                                                    letterSpacing: '0.1em'
                                                }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend
                                                layout="horizontal"
                                                verticalAlign="bottom"
                                                align="center"
                                                wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Transactions List */}
                            <div className="lg:col-span-3 bg-[#0D0D0D] rounded-sm shadow-2xl overflow-hidden">
                                <div className="p-6 md:p-8 border-b border-[#262626]/40 flex justify-between items-center bg-[#0A0A0A]">
                                    <div>
                                        <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2.5">
                                            <LayoutGrid className="w-4 h-4 text-blue-400" />
                                            Libro Auxiliar / Movimientos
                                        </h3>
                                    </div>
                                        <div className="flex items-center gap-4">
                                            {/* Intelligent Search Bar */}
                                            <div className="relative group/search">
                                                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                                                    <Search className="w-3.5 h-3.5 text-gray-500 group-focus-within/search:text-blue-400 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    placeholder="Buscar movimiento..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="bg-[#151515] border border-[#262626] text-[10px] font-bold text-white uppercase tracking-widest pl-9 pr-8 py-2 rounded-sm outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/20 transition-all w-[180px] md:w-[240px] placeholder:text-gray-600"
                                                />
                                                {searchTerm && (
                                                    <button 
                                                        onClick={() => setSearchTerm('')}
                                                        className="absolute inset-y-0 right-2 flex items-center text-gray-500 hover:text-white transition-colors"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                                <div className="absolute -top-1 -right-1">
                                                    <div className="relative">
                                                        <Sparkles className="w-2.5 h-2.5 text-blue-400/40 animate-pulse" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 bg-[#151515] px-3 py-2 rounded-none border border-exec-border">
                                                <select
                                                    className="bg-transparent border-none text-[10px] font-bold text-gray-400 uppercase tracking-widest outline-none focus:ring-0 cursor-pointer hover:text-white transition-colors"
                                                    value={selectedCategory}
                                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                                >
                                                    <option value="all" className="bg-[#0D0D0D]">Todas las Categorías</option>
                                                    {categories.map(cat => (
                                                        <option key={cat} value={cat} className="bg-[#0D0D0D]">{cat}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setEditingTransaction(null);
                                                    setTransactionForm({ title: '', type: 'expense', amount: 0, evidence_urls: [] });
                                                    setShowTransactionModal(true);
                                                }}
                                                className="px-6 py-2.5 bg-exec-blue hover:bg-blue-500 text-white rounded-none transition-all text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(0,136,255,0.2)]"
                                            >
                                                <Plus className="w-4 h-4" /> Registrar Movimiento
                                            </button>
                                        </div>
                                </div>
                                <div className="divide-y divide-[#262626]">
                                    {filteredTransactions.map(t => (
                                        <div key={t.id} className="p-4 md:p-6 hover:bg-[#151515] transition-all flex flex-col md:flex-row md:items-center justify-between group border-l-2 border-transparent hover:border-exec-blue gap-4">
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className={`p-2.5 rounded-none border ${t.type === 'income' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                    }`}>
                                                    {t.type === 'income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white uppercase tracking-tight mb-1 group-hover:text-exec-blue transition-colors">{t.title}</p>
                                                    <p className="text-xs text-gray-500 mb-3 line-clamp-1">{t.description}</p>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest bg-[#1A1A1A] px-2 py-1 rounded-none border border-exec-border">{t.category}</span>
                                                        <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">{t.transaction_date}</span>
                                                        <span className="w-1 h-1 bg-[#262626] rounded-full"></span>
                                                        <span className="text-[10px] font-bold text-exec-blue/70 uppercase tracking-widest">{(usersMap && usersMap[t.created_by]) || 'Usuario'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-8">
                                                <div className="text-right">
                                                    <p className={`text-lg font-bold tracking-tighter ${t.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                                        {t.type === 'income' ? '+' : '-'} S/ {Number(t.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <button
                                                        onClick={() => setViewingTransaction(t)}
                                                        className="text-[10px] font-bold text-exec-blue hover:text-blue-400 uppercase tracking-widest mt-2 flex items-center justify-end gap-2 transition-colors"
                                                    >
                                                        Ver Comprobante <FileText className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                {/* Edit/Delete Actions (Visible to Directors/Advisors or Owner) */}
                                                {(user?.role?.toLowerCase().includes('director') || user?.role?.toLowerCase().includes('asesor') || user?.id === t.created_by) && (
                                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => handleEditTransaction(t)}
                                                            className="p-1.5 text-gray-400 hover:text-exec-blue hover:bg-exec-blue/10 rounded-none border border-transparent hover:border-exec-blue/20 transition-all"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => confirmDeleteTransaction(t.id)}
                                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-none border border-transparent hover:border-red-500/20 transition-all"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {filteredTransactions.length === 0 && (
                                        <div className="p-8 text-center text-gray-500">
                                            No hay movimientos en este mes.
                                        </div>
                                    )}
                                </div>
                            </div>


                        </div >
                    </div >
                ) : (
                    // Legacy Activity Detail View (Hidden by default now)
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <button
                            onClick={() => {
                                setView('global_dashboard');
                                setSelectedActivity(null);
                            }}
                            className="flex items-center gap-2 text-gray-500 hover:text-indigo-600 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" /> Volver al Dashboard Global
                        </button>
                        {/* ... (Keep existing activity detail view logic if needed, or simplify) ... */}
                        {/* For now, I'll just show a simplified message or the old view if user really wants to drill down. 
                        But user asked for Global Dashboard. I'll keep the old view logic but accessible via the "Actividades Activas" list.
                    */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800 shadow-sm">
                            <h2 className="text-2xl font-bold mb-4">{selectedActivity?.title}</h2>
                            <p className="text-gray-500 mb-6">{selectedActivity?.description}</p>
                            {/* Re-use the transaction list logic but filtered for this activity? 
                            Actually, the global dashboard is better. I'll just redirect to global dashboard with a filter? 
                            No, let's keep it simple. If they click an activity, they see the old view.
                        */}
                            <p className="text-center text-gray-500">Detalles de actividad disponibles en el Dashboard Global filtrando por fecha.</p>
                        </div>
                    </div>
                )
            }


            {showTransactionModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0D0D0D] border border-exec-border rounded-none w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* Modal Header */}
                        <div className="p-8 border-b border-exec-border bg-[#0A0A0A] flex justify-between items-center">
                            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                                    <Plus className="w-4 h-4 text-exec-blue" />
                                </div>
                                {editingTransaction ? 'Editar Movimiento' : 'Registrar Nuevo Movimiento'}
                            </h3>
                            <button onClick={() => setShowTransactionModal(false)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-8">
                            {/* Type Toggle */}
                            <div className="flex gap-4 p-1 bg-[#151515] rounded-none border border-exec-border">
                                <button
                                    className={`flex-1 py-3 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all ${transactionForm.type === 'expense' ? 'bg-[#262626] text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.1)]' : 'text-gray-500 hover:text-gray-300'}`}
                                    onClick={() => setTransactionForm({ ...transactionForm, type: 'expense' })}
                                >
                                    Egreso / Gasto
                                </button>
                                <button
                                    className={`flex-1 py-3 rounded-none text-[10px] font-bold uppercase tracking-widest transition-all ${transactionForm.type === 'income' ? 'bg-[#262626] text-green-400 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'text-gray-500 hover:text-gray-300'}`}
                                    onClick={() => setTransactionForm({ ...transactionForm, type: 'income' })}
                                >
                                    Ingreso / Capital
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Título del Movimiento</label>
                                    <input
                                        type="text"
                                        className="w-full bg-[#151515] border border-exec-border rounded-none p-3 text-sm text-white focus:border-exec-blue/50 focus:ring-1 focus:ring-exec-blue/20 transition-all outline-none"
                                        placeholder="Ej: Pago de Hosting"
                                        value={transactionForm.title || ''}
                                        onChange={e => setTransactionForm({ ...transactionForm, title: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Fecha</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[#151515] border border-exec-border rounded-none p-3 text-sm text-white focus:border-exec-blue/50 focus:ring-1 focus:ring-exec-blue/20 transition-all outline-none"
                                        value={transactionForm.transaction_date || new Date().toISOString().split('T')[0]}
                                        onChange={e => setTransactionForm({ ...transactionForm, transaction_date: e.target.value })}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Monto (S/)</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                        <input
                                            type="number"
                                            className="w-full bg-[#151515] border border-exec-border rounded-none pl-10 p-3 text-sm text-white focus:border-exec-blue/50 focus:ring-1 focus:ring-exec-blue/20 transition-all outline-none"
                                            placeholder="0.00"
                                            value={transactionForm.amount || ''}
                                            onChange={e => setTransactionForm({ ...transactionForm, amount: Number(e.target.value) })}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Categoría</label>
                                    <select
                                        className="w-full bg-[#151515] border border-exec-border rounded-none p-3 text-sm text-white focus:border-exec-blue/50 outline-none cursor-pointer"
                                        value={transactionForm.category || ''}
                                        onChange={e => setTransactionForm({ ...transactionForm, category: e.target.value })}
                                    >
                                        <option value="" className="bg-[#0A0A0A]">Seleccionar Categoría</option>
                                        {transactionForm.type === 'income' ? (
                                            <>
                                                <option value="Cuota Mensual" className="bg-[#0A0A0A]">Cuota Mensual</option>
                                                <option value="Donación" className="bg-[#0A0A0A]">Donación</option>
                                                <option value="Evento" className="bg-[#0A0A0A]">Evento</option>
                                                <option value="Otros" className="bg-[#0A0A0A]">Otros</option>
                                            </>
                                        ) : (
                                            <>
                                                <option value="Alimentos" className="bg-[#0A0A0A]">Alimentos</option>
                                                <option value="Transporte" className="bg-[#0A0A0A]">Transporte</option>
                                                <option value="Materiales" className="bg-[#0A0A0A]">Materiales</option>
                                                <option value="Servicios" className="bg-[#0A0A0A]">Servicios</option>
                                                <option value="Otros" className="bg-[#0A0A0A]">Otros</option>
                                            </>
                                        )}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Descripción Detallada</label>
                                <textarea
                                    className="w-full bg-[#151515] border border-exec-border rounded-none p-4 text-sm text-white focus:border-exec-blue/50 focus:ring-1 focus:ring-exec-blue/20 transition-all outline-none min-h-[100px] resize-none"
                                    placeholder="Ingrese los detalles del movimiento..."
                                    value={transactionForm.description || ''}
                                    onChange={e => setTransactionForm({ ...transactionForm, description: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Evidencia (Opcional)</label>
                                    <div className="relative group/upload">
                                        <input
                                            type="file"
                                            multiple
                                            accept="image/*"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={(e) => handleFileUpload(e.target.files, 'evidence')}
                                            disabled={uploading}
                                        />
                                        <div className="border border-dashed border-exec-border group-hover/upload:border-exec-blue/50 group-hover/upload:bg-exec-blue/5 rounded-none p-6 text-center transition-all">
                                            {uploading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-exec-blue" /> : <Upload className="w-5 h-5 mx-auto text-gray-600 group-hover/upload:text-exec-blue" />}
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-3">Subir Imágenes</p>
                                        </div>
                                    </div>
                                    {transactionForm.evidence_urls && transactionForm.evidence_urls.length > 0 && (
                                        <div className="flex gap-2 mt-4 overflow-x-auto pb-2 custom-scrollbar">
                                            {transactionForm.evidence_urls.map((url, i) => (
                                                <div key={i} className="relative w-12 h-12 flex-shrink-0 group">
                                                    <img src={url} alt="" className="w-full h-full object-cover rounded-sm border border-[#262626]" />
                                                    <button
                                                        onClick={() => setTransactionForm(prev => ({
                                                            ...prev,
                                                            evidence_urls: prev.evidence_urls?.filter((_, idx) => idx !== i)
                                                        }))}
                                                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <X className="w-2 h-2" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-4">Informe PDF (Opcional)</label>
                                    <div className="relative group/upload">
                                        <input
                                            type="file"
                                            accept=".pdf"
                                            className="absolute inset-0 opacity-0 cursor-pointer z-10"
                                            onChange={(e) => handleFileUpload(e.target.files, 'report')}
                                            disabled={uploading}
                                        />
                                        <div className="border border-dashed border-exec-border group-hover/upload:border-exec-blue/50 group-hover/upload:bg-exec-blue/5 rounded-none p-6 text-center transition-all">
                                            {transactionForm.report_url ? (
                                                <CheckCircle className="w-5 h-5 mx-auto text-green-500" />
                                            ) : (
                                                <FileText className="w-5 h-5 mx-auto text-gray-600 group-hover/upload:text-exec-blue" />
                                            )}
                                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-3">
                                                {transactionForm.report_url ? 'PDF Cargado' : 'Subir Informe'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-8 border-t border-exec-border bg-[#0A0A0A]">
                            <button
                                onClick={handleSaveTransaction}
                                disabled={uploading}
                                className="w-full py-4 bg-exec-blue hover:bg-blue-500 text-white rounded-none transition-all text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,136,255,0.2)] disabled:opacity-50"
                            >
                                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                {editingTransaction ? 'Guardar Cambios Ejecutivos' : 'Finalizar Registro'}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {viewingTransaction && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
                    <div className="bg-[#0D0D0D] border border-[#262626] rounded-sm w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        {/* Detail Header */}
                        <div className="p-8 border-b border-[#262626] bg-[#0A0A0A] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-sm border ${viewingTransaction.type === 'income' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`}>
                                    {viewingTransaction.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                                </div>
                                <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Detalles del Comprobante</h3>
                            </div>
                            <button onClick={() => setViewingTransaction(null)} className="p-2 text-gray-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Detail Body */}
                        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar space-y-10">
                            <div>
                                <h1 className="text-2xl font-bold text-white uppercase tracking-tight mb-2">{viewingTransaction.title}</h1>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-[#151515] px-3 py-1 rounded-sm border border-[#262626]">{viewingTransaction.category}</span>
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{viewingTransaction.transaction_date}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div>
                                    <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-4">Descripción del Movimiento</h4>
                                    <p className="text-sm text-gray-400 leading-relaxed bg-[#151515]/50 p-4 border border-[#262626] rounded-sm italic">
                                        "{viewingTransaction.description}"
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-4">Análisis Financiero</h4>
                                    <div className="bg-[#151515] border border-[#262626] p-6 rounded-sm space-y-4 shadow-xl relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 blur-[30px]"></div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Estado</span>
                                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm ${viewingTransaction.type === 'income' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                                {viewingTransaction.type === 'income' ? 'Ingreso Bruto' : 'Gasto Aprobado'}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Monto</span>
                                            <span className="text-xl font-bold text-white tracking-tighter">
                                                S/ {Number(viewingTransaction.amount).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                            </span>
                                        </div>
                                        <div className="pt-4 border-t border-[#262626] flex justify-between items-center">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Registrado por</span>
                                            <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">{(usersMap && usersMap[viewingTransaction.created_by]) || 'Usuario'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {viewingTransaction.report_url && (
                                <div className="pt-4">
                                    <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-4">Documentación Oficial (PDF)</h4>
                                    <a
                                        href={viewingTransaction.report_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-4 p-4 bg-[#151515] border border-[#262626] rounded-sm hover:border-red-500/30 group transition-all"
                                    >
                                        <div className="p-3 bg-red-500/10 text-red-400 rounded-sm border border-red-500/20 group-hover:bg-red-500/20 transition-all">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-white uppercase tracking-widest">Comprobante de Pago</p>
                                            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Haga clic para abrir en nueva pestaña</p>
                                        </div>
                                    </a>
                                </div>
                            )}

                            <div>
                                <h4 className="text-[10px] font-bold text-blue-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Evidencia Fotográfica ({viewingTransaction.evidence_urls?.length || 0})
                                </h4>
                                {viewingTransaction.evidence_urls && viewingTransaction.evidence_urls.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                        {viewingTransaction.evidence_urls.map((url, i) => (
                                            <a
                                                key={i}
                                                href={url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block aspect-video rounded-sm overflow-hidden border border-[#262626] hover:border-blue-500/30 transition-all shadow-xl group"
                                            >
                                                <img src={url} alt={`Evidencia ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-[#151515] border border-dashed border-[#262626] rounded-sm text-center">
                                        <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest italic">No se ha adjunado evidencia visual.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* AI Assistant Modal */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[150] flex items-center justify-center p-4">
                    <div className="bg-[#0D0D0D] border border-exec-border rounded-none w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-exec-border bg-[#0A0A0A] flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-exec-blue/10 rounded-none border border-exec-blue/20">
                                    <span className="material-symbols-outlined text-exec-blue text-[20px]">smart_toy</span>
                                </div>
                                <h3 className="text-[11px] font-bold text-white uppercase tracking-[0.2em]">Asistente IA Financiero</h3>
                            </div>
                            <button onClick={() => setShowAiModal(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">
                                    ¿Qué movimiento deseas registrar?
                                </label>
                                <textarea
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    placeholder="Ej: Se compraron 50 folios para la revista por S/ 120.00 pagados en efectivo..."
                                    className="w-full h-32 bg-[#151515] border border-exec-border rounded-none p-4 text-sm text-white placeholder:text-gray-700 focus:outline-none focus:border-exec-blue/50 transition-all resize-none shadow-inner"
                                />
                            </div>

                            <AIEngineSelector 
                                config={aiConfig}
                                onConfigChange={setAiConfig}
                            />

                            <button
                                onClick={handleGenerateFinance}
                                disabled={isGenerating || !aiPrompt.trim()}
                                className="w-full py-4 bg-white hover:bg-gray-100 text-black rounded-none transition-all text-[11px] font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-[0_0_20px_rgba(0,0,0,0.5)] disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin text-exec-blue" />
                                        <span>Procesando Datos...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="material-symbols-outlined text-exec-blue text-[18px]">smart_toy</span>
                                        <span>Generar Movimiento</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleDeleteTransaction}
                title="Confirmar Eliminación"
                message="¿Estás seguro de eliminar este movimiento financiero? Esta acción es irreversible y afectará los reportes globales."
                confirmText="Eliminar Registro"
                variant="danger"
            />
        </div>
    );
}
