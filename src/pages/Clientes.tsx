import { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { validarCNPJ, formatarCNPJ } from '@/lib/cnpj';
import Papa from 'papaparse';
import type { Cliente, Consulta, CsvClienteRow } from '@/types';
import {
    Users, Plus, Search, Edit2, Trash2, FileCheck, AlertTriangle,
    Clock, Building2, Mail, Phone, Loader2, Upload, FileSpreadsheet,
    X, ShieldCheck, Pause, Play, RefreshCw, Eye, Download,
    Calendar, Timer,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClientDetailsModal } from '@/components/ClientDetailsModal';
import { toast } from 'sonner';

const emptyCliente: Partial<Cliente> = {
    razao_social: '',
    nome_fantasia: '',
    cnpj: '',
    cpf: '',
    inscricao_estadual_pr: '',
    email: '',
    telefone: '',
    whatsapp: '',
    regime_tributario: '',
    certificado_digital_validade: '',
    procuracao_ecac_validade: '',
    periodicidade: 'quinzenal',
    dia_semana: undefined,
    dia_mes: undefined,
    horario: '08:00',
};



export default function Clientes() {
    const { user } = useAuth();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [dialogOpen, setDialogOpen] = useState(false);
    const [csvDialogOpen, setCsvDialogOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<Partial<Cliente>>(emptyCliente);

    // CSV upload state
    const [csvData, setCsvData] = useState<CsvClienteRow[]>([]);
    const [csvErrors, setCsvErrors] = useState<string[]>([]);
    const [csvPeriodicidade, setCsvPeriodicidade] = useState('quinzenal');
    const [csvHorario, setCsvHorario] = useState('08:00');
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const [clientesRes, consultasRes] = await Promise.all([
            supabase.from('clientes').select('*').order('razao_social'),
            supabase.from('consultas').select('*').order('created_at', { ascending: false }),
        ]);
        if (clientesRes.data) setClientes(clientesRes.data);
        if (consultasRes.data) setConsultas(consultasRes.data as Consulta[]);
        setLoading(false);
    };

    // ── CNPJ Status per type ──
    const getClienteCndStatus = useCallback((clienteId: string, tipo: string) => {
        const latest = consultas
            .filter(c => c.cliente_id === clienteId && c.tipo === tipo)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        if (!latest) return { icon: '⚪', label: 'Não consultada', color: 'bg-slate-100 text-slate-500' };
        if (latest.status === 'processando') return { icon: '🟡', label: 'Processando', color: 'bg-amber-100 text-amber-700' };
        if (latest.status === 'erro') return { icon: '🔴', label: 'Erro', color: 'bg-red-100 text-red-700' };
        if (latest.situacao === 'negativa') return { icon: '🔴', label: 'Irregular', color: 'bg-red-100 text-red-700' };
        if (latest.situacao === 'positiva') return { icon: '🟢', label: 'Regular', color: 'bg-emerald-100 text-emerald-700' };
        return { icon: '🟢', label: 'Regular', color: 'bg-emerald-100 text-emerald-700' };
    }, [consultas]);

    // ── CSV handling ──
    const handleFileUpload = (file: File) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext !== 'csv') {
            toast.error('Apenas arquivos CSV são suportados. Salve sua planilha como CSV.');
            return;
        }
        Papa.parse<Record<string, string>>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const rows: CsvClienteRow[] = [];
                const errors: string[] = [];

                results.data.forEach((row, i) => {
                    const cnpj = (row.cnpj || row.CNPJ || '').replace(/\D/g, '');
                    const razao = row.razao_social || row['Razão Social'] || row.razao || '';

                    if (!cnpj || !razao) {
                        errors.push(`Linha ${i + 2}: CNPJ ou Razão Social ausente`);
                        return;
                    }
                    if (!validarCNPJ(cnpj)) {
                        errors.push(`Linha ${i + 2}: CNPJ inválido (${formatarCNPJ(cnpj)})`);
                        return;
                    }
                    if (clientes.some(c => c.cnpj.replace(/\D/g, '') === cnpj)) {
                        errors.push(`Linha ${i + 2}: CNPJ já cadastrado (${formatarCNPJ(cnpj)})`);
                        return;
                    }

                    rows.push({
                        cnpj: formatarCNPJ(cnpj),
                        razao_social: razao.trim(),
                        inscricao_estadual_pr: row.inscricao_estadual_pr || row.ie_pr || row.IE_PR || '',
                        email: row.email || row.Email || '',
                        whatsapp: row.whatsapp || row.WhatsApp || row.telefone || '',
                    });
                });

                setCsvData(rows);
                setCsvErrors(errors);
                if (rows.length > 0) setCsvDialogOpen(true);
                else toast.error('Nenhum registro válido encontrado no arquivo');
            },
            error: () => toast.error('Erro ao ler arquivo CSV'),
        });
    };

    const handleCsvConfirm = async () => {
        if (!user) return;
        setUploading(true);
        const inserts = csvData.map(row => ({
            user_id: user.id,
            razao_social: row.razao_social,
            cnpj: row.cnpj,
            inscricao_estadual_pr: row.inscricao_estadual_pr || null,
            email: row.email || null,
            whatsapp: row.whatsapp || null,
            periodicidade: csvPeriodicidade,
            horario: csvHorario,
            ativo: true,
        }));

        const { error } = await supabase.from('clientes').insert(inserts);
        setUploading(false);
        if (error) {
            toast.error('Erro: ' + error.message);
        } else {
            toast.success(`${csvData.length} clientes cadastrados com sucesso!`);
            setCsvDialogOpen(false);
            setCsvData([]);
            setCsvErrors([]);
            fetchData();
        }
    };

    // Drag and drop
    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = () => setIsDragging(false);
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
    };

    // ── Save (single client) ──
    const handleSave = async () => {
        if (!form.razao_social || !form.cnpj) {
            toast.error('Razão Social e CNPJ são obrigatórios');
            return;
        }
        if (!validarCNPJ(form.cnpj)) {
            toast.error('CNPJ inválido. Verifique o dígito verificador.');
            return;
        }
        setSaving(true);
        const payload = {
            razao_social: form.razao_social,
            nome_fantasia: form.nome_fantasia || null,
            cnpj: formatarCNPJ(form.cnpj),
            cpf: form.cpf || null,
            inscricao_estadual_pr: form.inscricao_estadual_pr || null,
            email: form.email || null,
            telefone: form.telefone || null,
            whatsapp: form.whatsapp || null,
            regime_tributario: form.regime_tributario || null,
            certificado_digital_validade: form.certificado_digital_validade || null,
            procuracao_ecac_validade: form.procuracao_ecac_validade || null,
            periodicidade: form.periodicidade,
            dia_semana: form.dia_semana || null,
            dia_mes: form.dia_mes || null,
            horario: form.horario || '08:00',
            status_fiscal: (form.status_fiscal as any) || 'indefinido',
        };

        if (editId) {
            const { error } = await supabase
                .from('clientes')
                .update({ ...payload, updated_at: new Date().toISOString() })
                .eq('id', editId);
            if (error) toast.error('Erro: ' + error.message);
            else toast.success('Cliente atualizado!');
        } else {
            const { error } = await supabase
                .from('clientes')
                .insert({ ...payload, user_id: user!.id, ativo: true });
            if (error) toast.error('Erro: ' + error.message);
            else toast.success('Cliente cadastrado!');
        }
        setSaving(false);
        setDialogOpen(false);
        setEditId(null);
        setForm(emptyCliente);
        fetchData();
    };

    const handleEdit = (c: Cliente) => {
        // Prevent event propagation if triggered from row click
        setEditId(c.id);
        setForm({
            razao_social: c.razao_social,
            nome_fantasia: c.nome_fantasia || '',
            cnpj: c.cnpj,
            cpf: c.cpf || '',
            inscricao_estadual_pr: c.inscricao_estadual_pr || '',
            email: c.email || '',
            telefone: c.telefone || '',
            whatsapp: c.whatsapp || '',
            regime_tributario: c.regime_tributario || '',
            certificado_digital_validade: c.certificado_digital_validade || '',
            procuracao_ecac_validade: c.procuracao_ecac_validade || '',
            periodicidade: c.periodicidade || 'quinzenal',
            dia_semana: c.dia_semana || undefined,
            dia_mes: c.dia_mes || undefined,
            horario: c.horario || '08:00',
            status_fiscal: c.status_fiscal || 'indefinido',
        });
        setDialogOpen(true);
    };

    const handleViewDetails = (c: Cliente) => {
        setSelectedClientId(c.id);
        setDetailsOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
        const { error } = await supabase.from('clientes').delete().eq('id', id);
        if (error) toast.error('Erro: ' + error.message);
        else { toast.success('Cliente excluído'); fetchData(); }
    };

    const toggleAtivo = async (c: Cliente) => {
        const { error } = await supabase
            .from('clientes')
            .update({ ativo: !c.ativo, updated_at: new Date().toISOString() })
            .eq('id', c.id);
        if (error) toast.error('Erro: ' + error.message);
        else {
            toast.success(c.ativo ? 'Cliente pausado' : 'Cliente ativado');
            fetchData();
        }
    };

    const filtered = clientes.filter(c =>
        c.razao_social.toLowerCase().includes(search.toLowerCase()) ||
        c.cnpj.includes(search) ||
        (c.nome_fantasia?.toLowerCase().includes(search.toLowerCase()))
    );

    const ativos = clientes.filter(c => c.ativo).length;
    const certVencidos = clientes.filter(c =>
        c.certificado_digital_validade && new Date(c.certificado_digital_validade) < new Date()
    ).length;
    const certVencendo = clientes.filter(c => {
        if (!c.certificado_digital_validade) return false;
        const diff = new Date(c.certificado_digital_validade).getTime() - Date.now();
        return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    }).length;

    const getCertStatus = (date: string | undefined) => {
        if (!date) return { label: 'N/D', color: 'bg-slate-100 text-slate-500' };
        const d = new Date(date);
        const diff = d.getTime() - Date.now();
        if (diff < 0) return { label: 'Vencido', color: 'bg-red-100 text-red-700' };
        if (diff < 30 * 24 * 60 * 60 * 1000) return { label: 'Vencendo', color: 'bg-amber-100 text-amber-700' };
        return { label: 'Válido', color: 'bg-emerald-100 text-emerald-700' };
    };

    const periodicidadeLabel: Record<string, string> = {
        diario: 'Diário',
        semanal: 'Semanal',
        quinzenal: 'Quinzenal',
        mensal: 'Mensal',
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-7 h-7 text-emerald-500" /> Clientes
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie empresas e agendamentos de consultas</p>
                </div>
                <div className="flex gap-2">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0]); }}
                    />
                    <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                        <Upload className="w-4 h-4 mr-2" /> Upload CSV
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) { setEditId(null); setForm(emptyCliente); } }}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-500 hover:bg-emerald-600">
                                <Plus className="w-4 h-4 mr-2" /> Novo Cliente
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>{editId ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
                                <DialogDescription>Preencha os dados do cliente</DialogDescription>
                            </DialogHeader>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Razão Social *</Label>
                                    <Input value={form.razao_social} onChange={e => setForm({ ...form, razao_social: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome Fantasia</Label>
                                    <Input value={form.nome_fantasia} onChange={e => setForm({ ...form, nome_fantasia: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>CNPJ *</Label>
                                    <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" />
                                </div>

                                <div className="space-y-2">
                                    <Label>WhatsApp</Label>
                                    <Input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
                                </div>





                                {/* Scheduling */}
                                <div className="md:col-span-2 border-t pt-4 mt-2">
                                    <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                                        <Timer className="w-4 h-4" /> Agendamento de Consultas
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label>Periodicidade</Label>
                                            <Select value={form.periodicidade} onValueChange={v => setForm({ ...form, periodicidade: v as any })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="diario">Diário</SelectItem>
                                                    <SelectItem value="semanal">Semanal</SelectItem>
                                                    <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                                    <SelectItem value="mensal">Mensal</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        {form.periodicidade === 'semanal' && (
                                            <div className="space-y-2">
                                                <Label>Dia da Semana</Label>
                                                <Select value={form.dia_semana?.toString() || ''} onValueChange={v => setForm({ ...form, dia_semana: parseInt(v) })}>
                                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                                    <SelectContent>
                                                        {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'].map((d, i) => (
                                                            <SelectItem key={i} value={i.toString()}>{d}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        )}
                                        {form.periodicidade === 'mensal' && (
                                            <div className="space-y-2">
                                                <Label>Dia do Mês</Label>
                                                <Input type="number" min={1} max={31} value={form.dia_mes || ''} onChange={e => setForm({ ...form, dia_mes: parseInt(e.target.value) || undefined })} placeholder="1-31" />
                                            </div>
                                        )}
                                        <div className="space-y-2">
                                            <Label>Horário</Label>
                                            <Input type="time" value={form.horario} onChange={e => setForm({ ...form, horario: e.target.value })} />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-4">
                                <Button variant="outline" onClick={() => { setDialogOpen(false); setEditId(null); setForm(emptyCliente); }}>
                                    Cancelar
                                </Button>
                                <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSave} disabled={saving}>
                                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : editId ? 'Atualizar' : 'Cadastrar'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* CSV Upload Dialog */}
            <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Upload de Clientes em Lote
                        </DialogTitle>
                        <DialogDescription>
                            {csvData.length} registros válidos encontrados
                        </DialogDescription>
                    </DialogHeader>

                    {csvErrors.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm">
                            <p className="font-semibold text-amber-700 mb-1">⚠️ {csvErrors.length} avisos:</p>
                            <ul className="text-amber-600 text-xs space-y-0.5 max-h-24 overflow-y-auto">
                                {csvErrors.map((e, i) => <li key={i}>• {e}</li>)}
                            </ul>
                        </div>
                    )}

                    {/* Preview */}
                    <div className="rounded-lg border overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">#</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">CNPJ</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Razão Social</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">IE PR</th>
                                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Email</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {csvData.slice(0, 5).map((row, i) => (
                                    <tr key={i} className="hover:bg-slate-50">
                                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                                        <td className="px-3 py-2 font-mono text-xs">{row.cnpj}</td>
                                        <td className="px-3 py-2 font-medium">{row.razao_social}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{row.inscricao_estadual_pr || '—'}</td>
                                        <td className="px-3 py-2 text-muted-foreground">{row.email || '—'}</td>
                                    </tr>
                                ))}
                                {csvData.length > 5 && (
                                    <tr><td colSpan={5} className="text-center py-2 text-xs text-muted-foreground">
                                        ... e mais {csvData.length - 5} registros
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Scheduling for batch */}
                    <div className="border rounded-lg p-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                            <Timer className="w-4 h-4" /> Agendamento para todos
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Periodicidade</Label>
                                <Select value={csvPeriodicidade} onValueChange={v => setCsvPeriodicidade(v as any)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="diario">Diário</SelectItem>
                                        <SelectItem value="semanal">Semanal</SelectItem>
                                        <SelectItem value="quinzenal">Quinzenal</SelectItem>
                                        <SelectItem value="mensal">Mensal</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Horário</Label>
                                <Input type="time" value={csvHorario} onChange={e => setCsvHorario(e.target.value)} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => { setCsvDialogOpen(false); setCsvData([]); }}>
                            Cancelar
                        </Button>
                        <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleCsvConfirm} disabled={uploading}>
                            {uploading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importando...</> : `Importar ${csvData.length} Clientes`}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Drag & Drop zone */}
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                    }`}
                onClick={() => fileInputRef.current?.click()}
            >
                <Upload className={`w-8 h-8 mx-auto mb-2 ${isDragging ? 'text-emerald-500' : 'text-slate-400'}`} />
                <p className="text-sm font-medium text-slate-600">
                    Arraste um arquivo CSV aqui ou clique para selecionar
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Colunas: CNPJ (obrigatório), Razão Social (obrigatório), Email, WhatsApp
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total', value: clientes.length, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Ativos', value: ativos, icon: ShieldCheck, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Cert. Vencendo', value: certVencendo, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Cert. Vencidos', value: certVencidos, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
                ].map(s => (
                    <Card key={s.label} className="border-0 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
                                <s.icon className={`w-5 h-5 ${s.color}`} />
                            </div>
                            <div>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                                <p className="text-xl font-bold">{loading ? '—' : s.value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Buscar por nome, CNPJ..."
                    className="pl-10"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Table */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-0">
                    <div className="rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">CNPJ</th>
                                    <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">CND Estadual</th>
                                    <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">CND Federal</th>
                                    <th className="text-center px-3 py-3 font-medium text-muted-foreground text-xs">FGTS</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Agendamento</th>
                                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                                    <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    <tr><td colSpan={8} className="text-center py-8"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></td></tr>
                                ) : filtered.length === 0 ? (
                                    <tr><td colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</td></tr>
                                ) : (
                                    filtered.map(c => {
                                        const cndFed = getClienteCndStatus(c.id, 'cnd_federal');
                                        const cndPr = getClienteCndStatus(c.id, 'cnd_estadual');
                                        const fgts = getClienteCndStatus(c.id, 'fgts');
                                        return (
                                            <tr
                                                key={c.id}
                                                className={`hover:bg-slate-50 transition-colors cursor-pointer ${!c.ativo ? 'opacity-50' : ''}`}
                                                onClick={() => handleViewDetails(c)}
                                            >
                                                <td className="px-4 py-3">
                                                    <div>
                                                        <p className="font-medium text-blue-600 hover:underline">{c.razao_social}</p>
                                                        {c.nome_fantasia && <p className="text-xs text-muted-foreground">{c.nome_fantasia}</p>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.cnpj}</td>
                                                <td className="px-3 py-3 text-center">
                                                    <Badge className={`${cndPr.color} border-0 hover:${cndPr.color} whitespace-nowrap`}>
                                                        {cndPr.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Badge className={`${cndFed.color} border-0 hover:${cndFed.color} whitespace-nowrap`}>
                                                        {cndFed.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-3 text-center">
                                                    <Badge className={`${fgts.color} border-0 hover:${fgts.color} whitespace-nowrap`}>
                                                        {fgts.label}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="text-xs">
                                                        <Calendar className="w-3 h-3 mr-1" />
                                                        {periodicidadeLabel[c.periodicidade] || c.periodicidade}
                                                        {c.horario && ` • ${c.horario.slice(0, 5)}`}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge className={c.ativo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>
                                                        {c.ativo ? 'Ativo' : 'Pausado'}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" title={c.ativo ? 'Pausar' : 'Ativar'} onClick={() => toggleAtivo(c)}>
                                                            {c.ativo ? <Pause className="w-4 h-4 text-amber-500" /> : <Play className="w-4 h-4 text-emerald-500" />}
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(c)}>
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={() => handleDelete(c.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            <ClientDetailsModal
                clienteId={selectedClientId}
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
            />
        </div>
    );
}
