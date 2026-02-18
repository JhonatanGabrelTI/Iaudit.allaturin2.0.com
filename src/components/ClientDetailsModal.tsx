import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/lib/supabase';
import type { Cliente, Consulta } from '@/types';
import { Loader2, FileText, History, User, Building2, Calendar, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ClientDetailsModalProps {
    clienteId: string | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ClientDetailsModal({ clienteId, open, onOpenChange }: ClientDetailsModalProps) {
    const [cliente, setCliente] = useState<Cliente | null>(null);
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (open && clienteId) {
            loadData(clienteId);
        } else {
            setCliente(null);
            setConsultas([]);
        }
    }, [open, clienteId]);

    const loadData = async (id: string) => {
        setLoading(true);
        try {
            const [cls, cst] = await Promise.all([
                supabase.from('clientes').select('*').eq('id', id).single(),
                supabase.from('consultas').select('*').eq('cliente_id', id).order('created_at', { ascending: false })
            ]);

            if (cls.data) setCliente(cls.data);
            if (cst.data) setConsultas(cst.data as Consulta[]);
        } catch (error) {
            console.error('Erro ao carregar detalhes:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Building2 className="w-6 h-6 text-blue-600" />
                        {loading ? 'Carregando...' : cliente?.razao_social}
                    </DialogTitle>
                    <DialogDescription>
                        CNPJ: {cliente?.cnpj} • Status: {cliente?.ativo ? 'Ativo' : 'Inativo'}
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin w-8 h-8 text-blue-500" /></div>
                ) : cliente && (
                    <Tabs defaultValue="cadastro" className="mt-4">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="cadastro"><User className="w-4 h-4 mr-2" /> Dados Cadastrais</TabsTrigger>
                            <TabsTrigger value="consultas"><History className="w-4 h-4 mr-2" /> Histórico de Consultas</TabsTrigger>
                            <TabsTrigger value="raw"><FileText className="w-4 h-4 mr-2" /> Dados Brutos (JSON)</TabsTrigger>
                        </TabsList>

                        {/* DADOS CADASTRAIS */}
                        <TabsContent value="cadastro" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border p-4 rounded-lg bg-slate-50">
                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-slate-700">Identificação</h3>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-muted-foreground">Razão Social:</span> {cliente.razao_social}</p>
                                        <p><span className="text-muted-foreground">Nome Fantasia:</span> {cliente.nome_fantasia || '—'}</p>
                                        <p><span className="text-muted-foreground">CNPJ:</span> <span className="font-mono">{cliente.cnpj}</span></p>

                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-slate-700">Contato</h3>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-muted-foreground">Email:</span> {cliente.email || '—'}</p>

                                        <p><span className="text-muted-foreground">WhatsApp:</span> {cliente.whatsapp || '—'}</p>
                                    </div>
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-slate-700">Fiscal & Tributário</h3>
                                    <div className="space-y-1 text-sm">

                                        <p><span className="text-muted-foreground">Status Fiscal:</span>
                                            <Badge variant={cliente.status_fiscal === 'regular' ? 'default' : 'destructive'} className="ml-2">
                                                {cliente.status_fiscal || 'Indefinido'}
                                            </Badge>
                                        </p>
                                    </div>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-sm mb-2 text-slate-700">Agendamento</h3>
                                    <div className="space-y-1 text-sm">
                                        <p><span className="text-muted-foreground">Periodicidade:</span> {cliente.periodicidade}</p>
                                        <p><span className="text-muted-foreground">Horário:</span> {cliente.horario || '08:00'}</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* HISTÓRICO DE CONSULTAS */}
                        <TabsContent value="consultas">
                            <ScrollArea className="h-[400px] border rounded-md">
                                <div className="p-4 space-y-4">
                                    {consultas.length === 0 ? (
                                        <p className="text-center text-muted-foreground">Nenhuma consulta registrada.</p>
                                    ) : consultas.map(c => (
                                        <div key={c.id} className="flex items-start gap-4 p-3 border-b last:border-0 hover:bg-slate-50">
                                            <div className="mt-1">
                                                {c.status === 'concluido' ? (
                                                    c.situacao === 'positiva' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />
                                                ) : <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex justify-between">
                                                    <p className="font-medium text-sm">{c.tipo.toUpperCase().replace('_', ' ')}</p>
                                                    <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                                                </div>
                                                <p className="text-xs text-slate-600 mt-1">
                                                    Status: <span className="font-semibold">{c.status}</span> • Situação: <span className="font-semibold">{c.situacao || '—'}</span>
                                                </p>
                                                {c.mensagem_erro && (
                                                    <p className="text-xs text-red-600 mt-1 bg-red-50 p-1 rounded">Error: {c.mensagem_erro}</p>
                                                )}
                                                {c.pdf_url && (
                                                    <a href={c.pdf_url} target="_blank" className="text-xs text-blue-600 hover:underline mt-1 block">
                                                        Ver PDF
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {/* RAW JSON */}
                        <TabsContent value="raw">
                            <ScrollArea className="h-[400px] border rounded-md bg-slate-900 text-slate-50 p-4">
                                <pre className="text-xs font-mono">
                                    {JSON.stringify({ cliente, consultas }, null, 2)}
                                </pre>
                            </ScrollArea>
                        </TabsContent>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
