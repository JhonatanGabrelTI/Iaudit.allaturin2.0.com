import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import type { Cliente, Consulta, TipoConsulta } from '@/types';
import {
    Monitor, Search, Plus, FileCheck, Clock, AlertCircle, CheckCircle2,
    Loader2, RefreshCw, PlayCircle, Zap, Download, Eye,
} from 'lucide-react';
import { ClientDetailsModal } from '@/components/ClientDetailsModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge as UiBadge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const INFOSIMPLES_TOKEN = import.meta.env.VITE_INFOSIMPLES_TOKEN;
const RATE_LIMIT_MS = 3000; // 3 seconds between queries

const consultaTypes: { id: TipoConsulta; name: string; desc: string; color: string; bg: string }[] = [
    { id: 'cnd_federal', name: 'CND Federal', desc: 'Certidão Negativa de Débitos Federais', color: 'bg-blue-500', bg: 'bg-blue-50' },
    { id: 'cnd_estadual', name: 'CND Estadual', desc: 'Certidão de Débitos Estaduais', color: 'bg-purple-500', bg: 'bg-purple-50' },
    { id: 'fgts', name: 'FGTS', desc: 'Regularidade do FGTS', color: 'bg-amber-500', bg: 'bg-amber-50' },
];

const apiEndpoints: Record<TipoConsulta, string> = {
    cnd_federal: '/infosimples/api/v2/consultas/receita-federal/pgfn/nova',
    cnd_estadual: '/infosimples/api/v2/consultas/sefaz/pr/certidao-debitos',
    fgts: '/infosimples/api/v2/consultas/caixa/regularidade',
};

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Helper to convert DD/MM/YYYY to YYYY-MM-DD
const parseDate = (dateStr: string | null): string | null => {
    if (!dateStr) return null;
    // Check if already in YYYY-MM-DD (ISO)
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr;

    // Try DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return null; // Invalid or unknown format
};

export default function MonitorHub() {
    const { user } = useAuth();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(true);
    const [executing, setExecuting] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedCliente, setSelectedCliente] = useState('');
    const [selectedTipo, setSelectedTipo] = useState<TipoConsulta | 'todos' | ''>('');
    const [statusFilter, setStatusFilter] = useState<'todos' | 'regular' | 'irregular'>('todos');
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

    // DEBUG: Show active token snippet
    const tokenEnding = INFOSIMPLES_TOKEN ? INFOSIMPLES_TOKEN.slice(-4) : 'NONE';


    // Batch state
    const [batchRunning, setBatchRunning] = useState(false);
    const [batchProgress, setBatchProgress] = useState(0);
    const [batchTotal, setBatchTotal] = useState(0);
    const [batchLog, setBatchLog] = useState<string[]>([]);

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        // Cleanup stuck processing records (older than 10 mins)
        try {
            const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
            await supabase
                .from('consultas')
                .update({
                    status: 'erro',
                    situacao: 'erro',
                    mensagem_erro: 'Timeout (processo interrompido)',
                    resultado: { error: 'Timeout detectado no client-side' }
                })
                .eq('status', 'processando')
                .lt('created_at', tenMinsAgo);
        } catch (e) {
            console.error('Erro ao limpar stale records:', e);
        }

        const [clientesRes, consultasRes] = await Promise.all([
            supabase.from('clientes').select('*').eq('ativo', true).order('razao_social'),
            supabase.from('consultas').select('*, cliente:clientes(razao_social, cnpj)').order('created_at', { ascending: false }).limit(200),
        ]);
        if (clientesRes.data) setClientes(clientesRes.data);
        if (consultasRes.data) setConsultas(consultasRes.data as unknown as Consulta[]);
        setLoading(false);
    };

    const handleViewDetails = (c: Cliente) => {
        setSelectedClientId(c.id);
        setDetailsOpen(true);
    };

    // ── Single Query ──
    const executeConsulta = async () => {
        if (!selectedCliente || !selectedTipo) {
            toast.error('Selecione o cliente e o tipo de consulta');
            return;
        }

        const targetClients = selectedCliente === 'todos'
            ? clientes.filter(c => c.ativo)
            : clientes.filter(c => c.id === selectedCliente);

        const targetTypes: TipoConsulta[] = selectedTipo === 'todos'
            ? ['cnd_federal', 'cnd_estadual', 'fgts']
            : [selectedTipo as TipoConsulta];

        if (targetClients.length === 0) return;

        setDialogOpen(false);
        setSelectedCliente('');
        setSelectedTipo('');

        // Use batch execution if multiple operations
        if (targetClients.length > 1 || targetTypes.length > 1) {
            await executeBatch(targetClients, targetTypes);
        } else {
            // Single execution (keeping original UX for single items)
            setExecuting(true);
            await executeSingleConsulta(targetClients[0], targetTypes[0]);
            setExecuting(false);
            fetchData();
        }
    };

    const executeSingleConsulta = async (cliente: Cliente, tipo: TipoConsulta, retryCount = 0): Promise<void> => {
        // Create record in DB
        const { data: consulta, error: insertError } = await supabase
            .from('consultas')
            .insert({
                user_id: user!.id,
                cliente_id: cliente.id,
                tipo,
                status: 'processando',
                tentativas: retryCount + 1,
            })
            .select()
            .single();

        if (insertError) {
            console.error('Erro ao criar consulta:', insertError);
            toast.error('Erro ao criar consulta: ' + insertError.message);
            return;
        }
        console.log('Consulta criada:', consulta);

        // Force status update to ensuring UI shows "Processando"
        await supabase.from('consultas').update({ status: 'processando' }).eq('id', consulta.id);

        try {
            if (!INFOSIMPLES_TOKEN) {
                toast.error('Token InfoSimples não configurado (.env)');
                setExecuting(false);
                return;
            }

            console.log('Using Token ending in:', INFOSIMPLES_TOKEN?.slice(-4));
            const body: Record<string, string> = {
                token: INFOSIMPLES_TOKEN.trim(),
                cnpj: cliente.cnpj.replace(/\D/g, ''),
            };
            if (tipo === 'cnd_estadual') {
                if (!cliente.inscricao_estadual_pr) {
                    await supabase.from('consultas').update({
                        status: 'erro', // Use 'erro' so it falls into the custom badge logic below (checked by message)
                        situacao: 'erro',
                        mensagem_erro: 'Sem Inscrição Estadual (N/A)',
                        resultado: { message: 'Consulta ignorada: Inscrição Estadual não cadastrada.' }
                    }).eq('id', consulta.id);
                    toast.info(`ℹ️ ${cliente.razao_social}: CND Estadual ignorada (Sem I.E.)`);
                    return;
                }
                body.inscricao_estadual = cliente.inscricao_estadual_pr;
            }

            // Increase timeout for FGTS/Caixa
            if (tipo === 'fgts') {
                body.timeout = '120'; // 2 minutes
            } else {
                body.timeout = '60';
            }

            const response = await axios.post(apiEndpoints[tipo], body, { timeout: 60000 });
            const data = response.data;

            // Determine situacao
            let situacao: 'positiva' | 'negativa' | 'erro' = 'erro'; // Default to error/unknown to be safe
            const code = data?.code;
            if (code && code >= 600) situacao = 'erro';
            else if (data?.data?.[0]) {
                const item = data.data[0];

                // Integrity Check: CNPJ
                const responseCnpj = item.cnpj ? item.cnpj.replace(/\D/g, '') : '';
                const requestCnpj = cliente.cnpj.replace(/\D/g, '');

                if (responseCnpj && responseCnpj !== requestCnpj) {
                    throw new Error(`Integridade falhou: CNPJ retornado (${responseCnpj}) diferente do solicitado (${requestCnpj})`);
                }

                // Normalization
                const rawSit = item.situacao || item.certidao || item.mensagem || '';
                const sit = rawSit.toLowerCase();
                const emitidaAs = item.emitida_as ? item.emitida_as.toLowerCase() : '';
                const header = item.cabecalho ? item.cabecalho.toLowerCase() : '';

                console.log(`[CND Analysis] Client: ${cliente.razao_social} | Type: ${tipo}`);
                console.log(`Raw Status: "${rawSit}" | Emitida As: "${emitidaAs}" | Header: "${header}"`);

                // Robust Status Logic
                // We want:
                // Regular (Good) -> 'positiva' in DB
                // Irregular (Bad) -> 'negativa' in DB

                let isRegular = false;

                // Keywords that indicate REGULARITY (Good Standing)
                // "Certidão Negativa" = Good
                // "Certidão Positiva com Efeitos de Negativa" = Good
                // "Regularidade do FGTS" = Good (if status says 'regular')
                const regularKeywords = [
                    'negativa',
                    'não constam',
                    'sem pendências',
                    'em vigor',
                    'regular' // Be careful, sometimes "irregular" contains "regular"
                ];

                // Check for Positive with Effects of Negative (Special Good Case)
                const isPositivaComEfeitos = sit.includes('efeitos de negativa') || emitidaAs.includes('efeitos de negativa');

                // Check if it matches any regular keywords
                if (regularKeywords.some(k => sit.includes(k) || emitidaAs.includes(k) || header.includes(k))) {
                    isRegular = true;
                }

                // Explicit override for "Positiva com efeitos"
                if (isPositivaComEfeitos) isRegular = true;

                // CRITICAL INVALIDATION: Keywords that indicate IRREGULARITY (Bad Standing)
                // "Certidão Positiva" (without effects) = Bad
                // "Irregular" = Bad
                // "Constam" = Bad
                const irregularKeywords = ['irregular', 'constam', 'pendente', 'suspensa'];

                // If it explicitly says irregular, it is irregular.
                // Note: "irregular" contains "regular", so we check this AFTER to override.
                if (irregularKeywords.some(k => sit.includes(k) || emitidaAs.includes(k))) {
                    isRegular = false;
                }

                // Special handling for "Certidão Positiva" WITHOUT "efeitos de negativa"
                // If it says "positiva" AND does NOT match "efeitos de negativa", it is bad.
                if ((sit.includes('positiva') || emitidaAs.includes('positiva')) && !isPositivaComEfeitos) {
                    isRegular = false;
                }

                console.log(`Final Decision: ${isRegular ? 'REGULAR (positiva)' : 'IRREGULAR (negativa)'}`);

                // Map to DB Status
                // Regular (Good) = 'positiva'
                // Irregular (Bad) = 'negativa'
                situacao = isRegular ? 'positiva' : 'negativa';
            }

            const pdfUrl = data?.data?.[0]?.site_receipt || data?.data?.[0]?.pdf_url || null;
            const validadeStr = data?.data?.[0]?.validade || null;
            const dataValidade = parseDate(validadeStr);

            const { error: updateError } = await supabase
                .from('consultas')
                .update({
                    status: situacao === 'erro' ? 'erro' : 'concluido',
                    situacao,
                    resultado: data,
                    pdf_url: pdfUrl,
                    data_validade: dataValidade,
                    data_execucao: new Date().toISOString(),
                    status: situacao === 'erro' ? 'erro' : 'concluido',
                    situacao,
                    resultado: data,
                    pdf_url: pdfUrl,
                    data_validade: dataValidade,
                    data_execucao: new Date().toISOString(),
                    mensagem_erro: situacao === 'erro'
                        ? (code === 603 ? 'Saldo Insuficiente' : code === 604 ? 'Timeout/Instabilidade Gov.' : code === 612 ? 'Caixa Indisponível' : code === 615 ? 'Dados Inválidos (I.E.)' : (code ? `Erro API ${code}` : 'Falha na análise'))
                        : null,
                })
                .eq('id', consulta.id);

            if (situacao === 'positiva') {
                toast.success(`✅ ${cliente.razao_social}: Regular (CND Positiva)!`);
            } else if (situacao === 'negativa') {
                toast.warning(`⚠️ ${cliente.razao_social}: Irregular (CND Negativa)!`);
            } else {
                let errorMsg = 'Erro na análise';
                if (code === 603) errorMsg = 'Saldo Insuficiente (InfoSimples)';
                else if (code === 604) errorMsg = 'Site do Gov. Instável/Timeout';
                else if (code === 612) errorMsg = 'Site da Caixa (FGTS) Indisponível';
                else if (code === 615) errorMsg = 'Dados Inválidos (Verifique I.E.)';
                else if (code) errorMsg = `Erro na API (Código ${code})`;

                toast.error(`❌ ${cliente.razao_social}: ${errorMsg}`);
            }

        } catch (err: any) {
            let msg = err instanceof Error ? err.message : 'Erro desconhecido';
            if (axios.isAxiosError(err)) {
                const status = err.response?.status;
                const apiMsg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message;
                if (apiMsg) msg = `${status ? `(${status}) ` : ''}${apiMsg}`;
                else if (status === 404) msg = '(404) Endpoint não encontrado (Verifique Proxy)';
                else if (status === 401 || status === 403) msg = '(401) Erro de Token/Auth';
            }

            // Retry logic
            if (retryCount < 2) {
                await supabase.from('consultas').delete().eq('id', consulta.id);
                await supabase.from('logs_execucao').insert({
                    consulta_id: consulta.id,
                    nivel: 'aviso',
                    mensagem: `Tentativa ${retryCount + 1} falhou para ${cliente.razao_social}. Retentando...`,
                    payload: { error: msg },
                });
                await sleep(5000); // 5sec before retry
                return executeSingleConsulta(cliente, tipo, retryCount + 1);
            }

            await supabase
                .from('consultas')
                .update({
                    status: 'erro',
                    situacao: 'erro',
                    resultado: { error: msg },
                    data_execucao: new Date().toISOString(),
                    mensagem_erro: msg,
                })
                .eq('id', consulta.id);

            await supabase.from('logs_execucao').insert({
                consulta_id: consulta.id,
                nivel: 'erro',
                mensagem: `Consulta ${tipo} para ${cliente.razao_social} falhou após 3 tentativas`,
                payload: { error: msg },
            });

            toast.error(`❌ Erro: ${cliente.razao_social} - ${msg}`);
        }

        // Update master client status
        const types: TipoConsulta[] = ['cnd_federal', 'cnd_estadual', 'fgts'];
        const { data: recent } = await supabase
            .from('consultas')
            .select('tipo, situacao, created_at')
            .eq('cliente_id', cliente.id)
            .order('created_at', { ascending: false })
            .limit(20);

        let newStatus = 'regular';
        if (recent) {
            for (const t of types) {
                const latest = recent.find(r => r.tipo === t);
                // Logic: anything NOT 'positiva' is treated as Irregular (Bad) per user request
                // This covers 'negativa', 'erro', and potential unknowns/nulls
                if (latest && latest.situacao !== 'positiva') {
                    newStatus = 'irregular';
                    break;
                }
            }
        }

        await supabase.from('clientes').update({ status_fiscal: newStatus }).eq('id', cliente.id);

        // Re-fetch to update UI
        fetchData();
    };

    // ── Force single client query ──
    const forceConsulta = async (cliente: Cliente, tipo: TipoConsulta) => {
        toast.info(`🔄 Consultando ${tipo} para ${cliente.razao_social}...`);
        await executeSingleConsulta(cliente, tipo);
        fetchData();
    };

    // ── Clear History ──
    const clearHistory = async () => {
        if (!confirm('Tem certeza? Isso apagará todo o histórico de consultas (o banco não será afetado).')) return;

        const { error } = await supabase
            .from('consultas')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all rows

        if (error) {
            toast.error('Erro ao limpar histórico: ' + error.message);
        } else {
            toast.success('Histórico limpo com sucesso!');
            fetchData();
        }
    };

    // ── Batch Query All ──
    const executeBatch = async (targetClients: Cliente[], tipos: TipoConsulta[]) => {
        const activeClients = targetClients.filter(c => c.ativo);
        if (activeClients.length === 0) {
            toast.error('Nenhum cliente ativo encontrado');
            return;
        }

        setBatchRunning(true);
        const total = activeClients.length * tipos.length;
        setBatchTotal(total);
        setBatchProgress(0);
        setBatchLog([]);
        let completed = 0;

        for (const cliente of activeClients) {
            for (const tipo of tipos) {
                setBatchLog(prev => [...prev, `🔄 ${cliente.razao_social} — ${tipo}`]);
                try {
                    await executeSingleConsulta(cliente, tipo);
                    setBatchLog(prev => [...prev, `✅ ${cliente.razao_social} — ${tipo}`]);
                } catch {
                    setBatchLog(prev => [...prev, `❌ ${cliente.razao_social} — ${tipo}`]);
                }
                completed++;
                setBatchProgress(Math.round((completed / total) * 100));
                // Rate limiting
                if (completed < total) await sleep(RATE_LIMIT_MS);
            }
        }

        setBatchRunning(false);
        toast.success(`Lote concluído! ${completed}/${total} consultas processadas.`);
        fetchData();
    };

    // ── Status helpers ──
    const getStatusBadge = (c: Consulta) => {
        // Logic: specific check for Success (Regular)
        if (c.status === 'concluido' && c.situacao === 'positiva')
            return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100"><CheckCircle2 className="w-3 h-3 mr-1" /> Regular</Badge>;

        if (c.status === 'erro')
            return (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Badge className={`cursor-help ${c.mensagem_erro?.includes('N/A') ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-red-100 text-red-700 hover:bg-red-100'}`}>
                                {c.mensagem_erro?.includes('N/A') ? <AlertCircle className="w-3 h-3 mr-1" /> : <AlertCircle className="w-3 h-3 mr-1" />}
                                {c.mensagem_erro?.includes('N/A') ? 'N/A' : 'Irregular'}
                            </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="max-w-[300px] break-words text-xs">
                                {c.mensagem_erro || (c.resultado as any)?.error || 'Erro desconhecido'}
                            </p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            );

        // Logic: anything concluded but NOT Positive = Irregular (Bad)
        if (c.status === 'concluido' && c.situacao === 'negativa')
            return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertCircle className="w-3 h-3 mr-1" /> Irregular</Badge>;

        if (c.status === 'processando')
            return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processando</Badge>;

        return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-200">N/C</Badge>;
    };

    const getTipoLabel = (tipo: string) => {
        const t = consultaTypes.find(ct => ct.id === tipo);
        return t?.name || tipo;
    };

    // Client monitoring panel
    const getClienteStatus = useCallback((clienteId: string, tipo: TipoConsulta) => {
        const latest = consultas
            .filter(c => c.cliente_id === clienteId && c.tipo === tipo)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

        if (!latest) return { icon: '⚪', label: 'N/C', color: 'bg-slate-100 text-slate-500' };
        if (latest.status === 'processando') return { icon: '🟡', label: 'Processando', color: 'bg-blue-100 text-blue-700' };

        if (latest.situacao === 'positiva' && latest.status === 'concluido') {
            return { icon: '🟢', label: 'Regular', status: 'regular', color: 'bg-emerald-100 text-emerald-700' };
        }

        if (latest.status === 'erro') return { icon: '🔴', label: 'Irregular', color: 'bg-red-100 text-red-700' };

        return { icon: '🔴', label: 'Irregular', status: 'irregular', color: 'bg-red-100 text-red-700' };
    }, [consultas]);

    const getLastDate = (clienteId: string, tipo: TipoConsulta) => {
        const latest = consultas
            .filter(c => c.cliente_id === clienteId && c.tipo === tipo && c.data_execucao)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
        return latest?.data_execucao
            ? new Date(latest.data_execucao).toLocaleDateString('pt-BR')
            : '—';
    };

    const concluidas = consultas.filter(c => c.status === 'concluido');
    const erros = consultas.filter(c => c.status === 'erro');
    const positivas = consultas.filter(c => c.situacao === 'positiva');
    const negativas = consultas.filter(c => c.situacao === 'negativa');
    const taxaSucesso = consultas.length > 0 ? Math.round((concluidas.length / consultas.length) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Monitoramento</h2>
                    <p className="text-muted-foreground">
                        Consultas fiscais automatizadas com rate limiting
                        <Badge variant="outline" className="ml-2 text-xs font-mono text-slate-400">
                            Token: ...{tokenEnding}
                        </Badge>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        disabled={batchRunning}
                        onClick={() => executeBatch(clientes, ['cnd_federal', 'cnd_estadual', 'fgts'])}
                    >
                        <Zap className="w-4 h-4 mr-2" />
                        {batchRunning ? 'Executando...' : 'Consultar Todos'}
                    </Button>
                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-500 hover:bg-emerald-600">
                                <Plus className="w-4 h-4 mr-2" /> Nova Consulta
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Nova Consulta Fiscal</DialogTitle>
                                <DialogDescription>Selecione o cliente e o tipo de consulta para executar</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Cliente</Label>
                                    <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o cliente" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos" className="font-semibold text-emerald-600">
                                                Selecionar Todos ({clientes.length})
                                            </SelectItem>
                                            {clientes.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.razao_social} ({c.cnpj})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Tipo de Consulta</Label>
                                    <Select value={selectedTipo} onValueChange={(v) => setSelectedTipo(v as TipoConsulta | 'todos')}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o tipo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="todos" className="font-semibold text-emerald-600">
                                                Todas as Consultas
                                            </SelectItem>
                                            {consultaTypes.map(ct => (
                                                <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <Button
                                    className="w-full bg-emerald-500 hover:bg-emerald-600"
                                    onClick={executeConsulta}
                                    disabled={executing}
                                >
                                    {executing ? (
                                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executando...</>
                                    ) : (
                                        <><Search className="w-4 h-4 mr-2" /> Executar Consulta</>
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Batch Progress */}
            {batchRunning && (
                <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-emerald-50">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-700">
                                <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
                                Executando lote... {batchProgress}%
                            </p>
                            <span className="text-xs text-muted-foreground">
                                {Math.round(batchProgress * batchTotal / 100)}/{batchTotal}
                            </span>
                        </div>
                        <Progress value={batchProgress} className="h-2" />
                        <div className="mt-2 max-h-24 overflow-y-auto text-xs text-muted-foreground space-y-0.5">
                            {batchLog.slice(-5).map((log, i) => <p key={i}>{log}</p>)}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {[
                    { label: 'Total', value: consultas.length, icon: FileCheck, color: 'text-blue-500', bg: 'bg-blue-50' },
                    { label: 'Regular', value: positivas.length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                    { label: 'Irregular', value: negativas.length, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
                    { label: 'Erros', value: erros.length, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
                    { label: 'Sucesso', value: `${taxaSucesso}%`, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
                ].map(s => (
                    <Card key={s.label} className="border-0 shadow-sm">
                        <CardContent className="p-4 flex items-center gap-3">
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

            <Tabs defaultValue="painel">
                <TabsList>
                    <TabsTrigger value="painel">🖥️ Painel de Monitoramento</TabsTrigger>
                    <TabsTrigger value="historico">📋 Histórico ({consultas.length})</TabsTrigger>
                </TabsList>

                {/* Monitoring Panel */}
                <TabsContent value="painel">
                    <Card className="border-0 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg">Status por Cliente</CardTitle>
                                <CardDescription>
                                    Visão geral das certidões de cada cliente • 🟢 Regular • 🔴 Irregular • 🟡 Atualizando • ⚪ Não consultada
                                </CardDescription>
                            </div>
                            <div className="w-[200px]">
                                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filtrar por Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="regular">Regular</SelectItem>
                                        <SelectItem value="irregular">Irregular (Pendentes)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">CNPJ</th>
                                            <th className="text-center px-3 py-3 font-medium text-muted-foreground">CND Estadual</th>
                                            <th className="text-center px-3 py-3 font-medium text-muted-foreground">CND Federal</th>
                                            <th className="text-center px-3 py-3 font-medium text-muted-foreground">FGTS</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Última Consulta</th>
                                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {clientes.length === 0 ? (
                                            <tr><td colSpan={7} className="text-center py-8 text-muted-foreground">Nenhum cliente ativo</td></tr>
                                        ) : clientes.filter(c => {
                                            if (statusFilter === 'todos') return true;
                                            const fed = getClienteStatus(c.id, 'cnd_federal');
                                            const pr = getClienteStatus(c.id, 'cnd_estadual');
                                            const fg = getClienteStatus(c.id, 'fgts');
                                            const hasIrregular = fed.status === 'irregular' || pr.status === 'irregular' || fg.status === 'irregular';
                                            if (statusFilter === 'irregular') return hasIrregular;
                                            return !hasIrregular; // regular
                                        }).map(c => {
                                            const fed = getClienteStatus(c.id, 'cnd_federal');
                                            const pr = getClienteStatus(c.id, 'cnd_estadual');
                                            const fg = getClienteStatus(c.id, 'fgts');
                                            return (
                                                <tr
                                                    key={c.id}
                                                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                                                    onClick={() => handleViewDetails(c)}
                                                >
                                                    <td className="px-4 py-3 font-medium">{c.razao_social}</td>
                                                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{c.cnpj}</td>
                                                    <td className="px-3 py-3 text-center">
                                                        <Badge className={`${pr.color} border-0 hover:${pr.color} whitespace-nowrap`}>
                                                            {pr.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <Badge className={`${fed.color} border-0 hover:${fed.color} whitespace-nowrap`}>
                                                            {fed.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-3 py-3 text-center">
                                                        <Badge className={`${fg.color} border-0 hover:${fg.color} whitespace-nowrap`}>
                                                            {fg.label}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">
                                                        {getLastDate(c.id, 'cnd_federal')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs h-7"
                                                                disabled={batchRunning}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    forceConsulta(c, 'cnd_federal');
                                                                    forceConsulta(c, 'cnd_estadual');
                                                                    forceConsulta(c, 'fgts');
                                                                }}
                                                            >
                                                                <RefreshCw className="w-3 h-3 mr-1" /> Consultar
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* History */}
                <TabsContent value="historico">
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg">Histórico de Consultas</CardTitle>
                                    <CardDescription>Todas as consultas realizadas</CardDescription>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="destructive" size="sm" onClick={clearHistory}>
                                        <AlertCircle className="w-3 h-3 mr-1" /> Limpar Histórico
                                    </Button>
                                    <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                                        <CheckCircle2 className="w-3 h-3 mr-1" /> {positivas.length}
                                    </Badge>
                                    <Badge variant="outline" className="text-red-600 border-red-200">
                                        <AlertCircle className="w-3 h-3 mr-1" /> {negativas.length}
                                    </Badge>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-lg border overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Cliente</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Situação</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tentativas</th>
                                            <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                                            <th className="text-right px-4 py-3 font-medium text-muted-foreground">PDF</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {consultas.length === 0 ? (
                                            <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma consulta encontrada</td></tr>
                                        ) : (
                                            consultas.map(c => (
                                                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                                                    <td className="px-4 py-3 font-medium">
                                                        {c.cliente?.razao_social || '—'}
                                                    </td>
                                                    <td className="px-4 py-3">{getTipoLabel(c.tipo)}</td>
                                                    <td className="px-4 py-3">{getStatusBadge(c)}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{c.tentativas || 1}</td>
                                                    <td className="px-4 py-3 text-muted-foreground text-xs">
                                                        {c.data_execucao
                                                            ? new Date(c.data_execucao).toLocaleString('pt-BR')
                                                            : new Date(c.created_at).toLocaleDateString('pt-BR')}
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        {c.pdf_url ? (
                                                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                                                <a href={c.pdf_url} target="_blank" rel="noopener noreferrer">
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <ClientDetailsModal
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                clienteId={selectedClientId}
            />
        </div>
    );
}
