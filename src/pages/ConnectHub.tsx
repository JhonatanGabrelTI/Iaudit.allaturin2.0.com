import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Notificacao, TipoCanalIntegracao } from '@/types';
import {
    MessageSquare, Send, Search, Paperclip, Phone,
    Mail, Bell, CheckCheck, Clock, Eye, Filter,
    Inbox, ArrowUpRight, Briefcase,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { ConfigIntegracaoModal } from '@/components/ConfigIntegracaoModal';

export default function ConnectHub() {
    const { user } = useAuth();
    const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Config state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCanal, setSelectedCanal] = useState<TipoCanalIntegracao>('email_smtp');
    const [configStatus, setConfigStatus] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (user) {
            fetchData();
            fetchConfigs();
        }
    }, [user]);

    const fetchConfigs = async () => {
        if (!user) return;
        const { data } = await supabase
            .from('configuracoes_integracao')
            .select('canal, ativo')
            .eq('user_id', user.id);

        const status: Record<string, boolean> = {};
        data?.forEach(d => {
            if (d.ativo) status[d.canal] = true;
        });
        setConfigStatus(status);
    };

    const fetchData = async () => {
        const { data } = await supabase
            .from('notificacoes')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);
        if (data) setNotificacoes(data);
        setLoading(false);
    };

    const enviadas = notificacoes.filter(n => n.enviado);
    const lidas = notificacoes.filter(n => n.lido);
    const whatsapp = notificacoes.filter(n => n.canal === 'whatsapp');
    const email = notificacoes.filter(n => n.canal === 'email');
    const sistema = notificacoes.filter(n => n.canal === 'sistema');

    const filtered = notificacoes.filter(n =>
        n.mensagem.toLowerCase().includes(search.toLowerCase()) ||
        n.tipo.toLowerCase().includes(search.toLowerCase()) ||
        n.destinatario?.toLowerCase().includes(search.toLowerCase())
    );

    const getCanalBadge = (canal: string) => {
        const map: Record<string, { label: string; cls: string; icon: typeof Mail }> = {
            email: { label: 'Email', cls: 'bg-blue-100 text-blue-700', icon: Mail },
            whatsapp: { label: 'WhatsApp', cls: 'bg-green-100 text-green-700', icon: Phone },
            sistema: { label: 'Sistema', cls: 'bg-purple-100 text-purple-700', icon: Bell },
        };
        const s = map[canal] || map.sistema;
        return (
            <Badge className={`${s.cls} hover:${s.cls}`}>
                <s.icon className="w-3 h-3 mr-1" />{s.label}
            </Badge>
        );
    };

    const getStatusIcon = (n: Notificacao) => {
        if (n.lido) return <CheckCheck className="w-4 h-4 text-blue-500" />;
        if (n.enviado) return <CheckCheck className="w-4 h-4 text-slate-400" />;
        return <Clock className="w-4 h-4 text-amber-400" />;
    };

    const stats = [
        { label: 'Total', value: notificacoes.length, icon: Inbox, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Enviadas', value: enviadas.length, icon: Send, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'WhatsApp', value: whatsapp.length, icon: Phone, color: 'text-green-500', bg: 'bg-green-50' },
        { label: 'Email', value: email.length, icon: Mail, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Lidas', value: lidas.length, icon: Eye, color: 'text-purple-500', bg: 'bg-purple-50' },
    ];

    const openConfig = (canal: TipoCanalIntegracao) => {
        setSelectedCanal(canal);
        setModalOpen(true);
    };

    const integrations = [
        { id: 'whatsapp_fiscal', name: 'WhatsApp Fiscal', icon: Phone, color: 'bg-green-500' },
        { id: 'whatsapp_rh', name: 'WhatsApp RH', icon: Phone, color: 'bg-emerald-500' },
        { id: 'whatsapp_business', name: 'WhatsApp Business', icon: Briefcase, color: 'bg-teal-500' },
        { id: 'email_smtp', name: 'Email SMTP', icon: Mail, color: 'bg-blue-500' },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="w-7 h-7 text-blue-500" /> Comunicação
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie integrações de mensagens e notificações</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                {stats.map(s => (
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

            {/* Integration Status Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {integrations.map(ch => {
                    const isConnected = configStatus[ch.id];
                    return (
                        <Card key={ch.id} className="border-0 shadow-sm">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-lg ${ch.color} flex items-center justify-center`}>
                                    <ch.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">{ch.name}</p>
                                    <Button
                                        variant="link"
                                        className="p-0 h-auto text-xs text-muted-foreground hover:text-slate-900"
                                        onClick={() => openConfig(ch.id as TipoCanalIntegracao)}
                                    >
                                        Configurar
                                    </Button>
                                </div>
                                <Badge variant="outline" className={isConnected ? 'border-emerald-300 text-emerald-600 bg-emerald-50' : 'border-amber-300 text-amber-600 bg-amber-50'}>
                                    {isConnected ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                    placeholder="Buscar por mensagem, tipo ou destinatário..."
                    className="pl-10"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            {/* Log Tabs */}
            <Tabs defaultValue="todas">
                <TabsList>
                    <TabsTrigger value="todas">Todas ({notificacoes.length})</TabsTrigger>
                    <TabsTrigger value="whatsapp">WhatsApp ({whatsapp.length})</TabsTrigger>
                    <TabsTrigger value="email">Email ({email.length})</TabsTrigger>
                    <TabsTrigger value="sistema">Sistema ({sistema.length})</TabsTrigger>
                </TabsList>

                {(['todas', 'whatsapp', 'email', 'sistema'] as const).map(tab => {
                    const items = tab === 'todas'
                        ? filtered
                        : filtered.filter(n => n.canal === tab);

                    return (
                        <TabsContent key={tab} value={tab}>
                            <Card className="border-0 shadow-sm">
                                <CardHeader>
                                    <CardTitle className="text-lg">Log de Notificações</CardTitle>
                                    <CardDescription>Histórico de envios e status de leitura</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {items.length === 0 ? (
                                        <div className="text-center py-12 text-muted-foreground">
                                            <Inbox className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                            <p className="text-sm">Nenhuma notificação encontrada</p>
                                            <p className="text-xs mt-1">Notificações serão geradas automaticamente ao processar consultas</p>
                                        </div>
                                    ) : (
                                        <div className="rounded-lg border overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-slate-50">
                                                    <tr>
                                                        <th className="text-center px-3 py-3 font-medium text-muted-foreground w-10"></th>
                                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Canal</th>
                                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tipo</th>
                                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Mensagem</th>
                                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Destinatário</th>
                                                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data Envio</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {items.map(n => (
                                                        <tr key={n.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="px-3 py-3 text-center">{getStatusIcon(n)}</td>
                                                            <td className="px-4 py-3">{getCanalBadge(n.canal)}</td>
                                                            <td className="px-4 py-3">
                                                                <Badge variant="outline" className="text-xs">{n.tipo}</Badge>
                                                            </td>
                                                            <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">{n.mensagem}</td>
                                                            <td className="px-4 py-3 text-muted-foreground text-xs">{n.destinatario || '—'}</td>
                                                            <td className="px-4 py-3 text-muted-foreground text-xs">
                                                                {n.data_envio ? new Date(n.data_envio).toLocaleString('pt-BR') : '—'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    );
                })}
            </Tabs>

            <ConfigIntegracaoModal
                open={modalOpen}
                onOpenChange={(open) => {
                    setModalOpen(open);
                    if (!open) fetchConfigs(); // Refresh status on close
                }}
                canal={selectedCanal}
                onSave={fetchConfigs}
            />
        </div>
    );
}
