import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Cliente, Consulta } from '@/types';
import {
    Users, FileCheck, AlertTriangle, Monitor, MessageSquare, FolderOpen,
    CheckSquare, Settings, TrendingUp, ShieldCheck, Clock, ArrowRight,
    AlertCircle, Bell, Activity, Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const modules = [
    { name: 'Monitoramento', desc: 'Consultas fiscais automatizadas', icon: Monitor, path: '/monitor', color: 'bg-blue-500' },
    { name: 'Clientes', desc: 'Cadastro e gestão de empresas', icon: Users, path: '/clientes', color: 'bg-emerald-500' },
    { name: 'Comunicação', desc: 'Comunicação centralizada', icon: MessageSquare, path: '/comunicacao', color: 'bg-purple-500' },
    { name: 'Documentos', desc: 'Gestão de documentos', icon: FolderOpen, path: '/documentos', color: 'bg-amber-500' },
    { name: 'Tarefas', desc: 'Gestão de tarefas', icon: CheckSquare, path: '/tarefas', color: 'bg-cyan-500' },
    { name: 'Configurações', desc: 'Ajustes do sistema', icon: Settings, path: '/configuracoes', color: 'bg-slate-500' },
];

const chartColors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444'];

export default function Dashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [consultas, setConsultas] = useState<Consulta[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        const [clientesRes, consultasRes] = await Promise.all([
            supabase.from('clientes').select('*').order('created_at', { ascending: false }),
            supabase.from('consultas').select('*').order('created_at', { ascending: false }).limit(500),
        ]);
        if (clientesRes.data) setClientes(clientesRes.data);
        if (consultasRes.data) setConsultas(consultasRes.data as Consulta[]);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 60 seconds
        const interval = setInterval(fetchData, 60000);
        return () => clearInterval(interval);
    }, []);

    // KPIs
    const totalClientes = clientes.length;
    const clientesAtivos = clientes.filter(c => c.ativo).length;

    const today = new Date().toISOString().split('T')[0];
    const consultasHoje = consultas.filter(c =>
        c.data_execucao && c.data_execucao.startsWith(today)
    ).length;

    const positivas = consultas.filter(c => c.situacao === 'positiva');
    // Treat as negative if it's concluded but NOT positive (covers 'negativa' and 'unknown')
    const negativas = consultas.filter(c => c.status === 'concluido' && c.situacao !== 'positiva');
    const erros = consultas.filter(c => c.status === 'erro' || c.situacao === 'erro');

    // Accurate success rate: (Total - Network Errors - API Errors) / Total
    const taxaSucesso = consultas.length > 0
        ? Math.round(((consultas.length - erros.length) / consultas.length) * 100) : 100;

    const certVencendo = clientes.filter(c => {
        if (!c.certificado_digital_validade) return false;
        const diff = new Date(c.certificado_digital_validade).getTime() - Date.now();
        return diff > 0 && diff < 30 * 24 * 60 * 60 * 1000;
    }).length;
    const certVencidos = clientes.filter(c => {
        if (!c.certificado_digital_validade) return false;
        return new Date(c.certificado_digital_validade).getTime() < Date.now();
    }).length;

    const alertCount = negativas.length + erros.length + certVencidos + certVencendo;

    // Chart data from real queries (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return d.toISOString().split('T')[0];
    });

    const weeklyData = last7Days.map(day => {
        const dayConsultas = consultas.filter(c => c.data_execucao?.startsWith(day));
        return {
            dia: new Date(day + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' }),
            consultas: dayConsultas.length,
            positivas: dayConsultas.filter(c => c.situacao === 'positiva').length,
            negativas: dayConsultas.filter(c => c.situacao === 'negativa').length,
        };
    });

    const regimeData = [
        { name: 'Simples', value: clientes.filter(c => c.regime_tributario === 'simples_nacional').length },
        { name: 'Lucro Presumido', value: clientes.filter(c => c.regime_tributario === 'lucro_presumido').length },
        { name: 'Lucro Real', value: clientes.filter(c => c.regime_tributario === 'lucro_real').length },
        { name: 'MEI', value: clientes.filter(c => c.regime_tributario === 'mei').length },
        { name: 'Outros', value: clientes.filter(c => !c.regime_tributario).length },
    ].filter(d => d.value > 0);

    const stats = [
        { label: 'Clientes Ativos', value: clientesAtivos, total: totalClientes, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Consultas Hoje', value: consultasHoje, icon: Activity, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Taxa de Sucesso', value: `${taxaSucesso}%`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Alertas', value: alertCount, icon: Bell, color: alertCount > 0 ? 'text-red-500' : 'text-slate-400', bg: alertCount > 0 ? 'bg-red-50' : 'bg-slate-50' },
    ];

    const alerts: { tipo: string; msg: string; color: string; icon: typeof AlertCircle }[] = [];
    negativas.slice(0, 5).forEach(c => {
        const nome = (c as any).cliente?.razao_social || 'Cliente';
        alerts.push({ tipo: c.tipo, msg: `${nome}: Irregular (${c.tipo})`, color: 'text-red-600', icon: AlertCircle });
    });
    clientes.filter(c => c.certificado_digital_validade && new Date(c.certificado_digital_validade) < new Date()).slice(0, 3).forEach(c => {
        alerts.push({ tipo: 'cert', msg: `${c.razao_social}: Certificado Digital vencido`, color: 'text-amber-600', icon: Clock });
    });
    erros.slice(0, 3).forEach(c => {
        alerts.push({ tipo: 'erro', msg: `Falha na consulta ${c.tipo} após 3 tentativas`, color: 'text-red-600', icon: AlertTriangle });
    });

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">
                        Olá, {user?.nome?.split(' ')[0] || 'Usuário'} 👋
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        Aqui está o resumo do seu escritório • atualização automática a cada 60s
                    </p>
                </div>
                <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50">
                    <TrendingUp className="w-3 h-3 mr-1" /> Sistema Operacional
                </Badge>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card key={stat.label} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-5">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                    <p className="text-3xl font-bold mt-1">{loading ? '—' : stat.value}</p>
                                    {'total' in stat && stat.total !== undefined && (
                                        <p className="text-xs text-muted-foreground mt-0.5">de {stat.total} total</p>
                                    )}
                                </div>
                                <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center`}>
                                    <stat.icon className={`w-6 h-6 ${stat.color}`} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
                <Card className="border-0 shadow-sm border-l-4 border-l-red-400">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Bell className="w-5 h-5 text-red-500" /> Alertas Recentes
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {alerts.slice(0, 6).map((a, i) => (
                                <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                                    <a.icon className={`w-4 h-4 ${a.color} shrink-0`} />
                                    <p className={`text-sm ${a.color}`}>{a.msg}</p>
                                </div>
                            ))}
                        </div>
                        {alerts.length > 6 && (
                            <Button variant="ghost" size="sm" className="mt-2" onClick={() => navigate('/monitor')}>
                                Ver todos os alertas →
                            </Button>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2 border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Consultas — Últimos 7 dias</CardTitle>
                        <CardDescription>Positivas vs Negativas por dia</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="dia" stroke="#94a3b8" fontSize={12} />
                                <YAxis stroke="#94a3b8" fontSize={12} />
                                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                <Bar dataKey="positivas" fill="#10b981" radius={[4, 4, 0, 0]} name="Positivas" />
                                <Bar dataKey="negativas" fill="#ef4444" radius={[4, 4, 0, 0]} name="Negativas" />
                            </BarChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Regimes Tributários</CardTitle>
                        <CardDescription>Distribuição dos clientes</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {regimeData.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-8">Sem dados</p>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={regimeData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                                            {regimeData.map((_entry, index) => (
                                                <Cell key={`cell-${index}`} fill={chartColors[index % chartColors.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {regimeData.map((item, i) => (
                                        <div key={item.name} className="flex items-center gap-2 text-xs">
                                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: chartColors[i] }} />
                                            <span className="text-muted-foreground">{item.name}</span>
                                            <span className="font-medium ml-auto">{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Modules & Clients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Modules */}
                <Card className="border-0 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Módulos do Sistema</CardTitle>
                        <CardDescription>Acesse rapidamente as funcionalidades</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {modules.map((mod) => (
                            <button
                                key={mod.name}
                                onClick={() => navigate(mod.path)}
                                className="flex items-center gap-4 w-full p-3 rounded-lg hover:bg-slate-50 transition-colors group text-left"
                            >
                                <div className={`w-10 h-10 rounded-lg ${mod.color} flex items-center justify-center shrink-0`}>
                                    <mod.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-slate-800">{mod.name}</p>
                                    <p className="text-xs text-slate-500">{mod.desc}</p>
                                </div>
                                <ArrowRight className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        ))}
                    </CardContent>
                </Card>

                {/* Recent Clients with status */}
                <Card className="border-0 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="text-lg">Clientes Recentes</CardTitle>
                            <CardDescription>Últimos clientes cadastrados</CardDescription>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => navigate('/clientes')}>
                            Ver todos
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {loading ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />
                                ))}
                            </div>
                        ) : clientes.length === 0 ? (
                            <div className="text-center py-8 text-slate-400">
                                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Nenhum cliente cadastrado</p>
                                <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/clientes')}>
                                    Cadastrar primeiro cliente
                                </Button>
                            </div>
                        ) : (
                            clientes.slice(0, 5).map((cliente) => (
                                <div key={cliente.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                        <span className="text-sm font-semibold text-emerald-700">
                                            {cliente.razao_social.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-slate-800 truncate">{cliente.razao_social}</p>
                                        <p className="text-xs text-slate-500">{cliente.cnpj}</p>
                                    </div>
                                    <Badge className={cliente.ativo ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-500 hover:bg-slate-100'}>
                                        {cliente.ativo ? 'Ativo' : 'Pausado'}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Storage */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <FolderOpen className="w-5 h-5 text-slate-400" />
                            <span className="text-sm font-medium text-slate-700">Armazenamento</span>
                        </div>
                        <span className="text-xs text-slate-500">2.4 GB / 10 GB</span>
                    </div>
                    <Progress value={24} className="h-2" />
                </CardContent>
            </Card>
        </div>
    );
}
