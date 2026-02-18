import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Cliente, Tarefa } from '@/types';
import {
    CheckSquare, Plus, Clock, AlertTriangle, CheckCircle2,
    Loader2, Calendar, Flag, User, Building2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function TaskHub() {
    const { user } = useAuth();
    const [tarefas, setTarefas] = useState<Tarefa[]>([]);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);

    const [form, setForm] = useState({
        titulo: '', descricao: '', responsavel: '', departamento: '',
        prazo: '', prioridade: 'media', cliente_id: '',
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        const [tarefasRes, clientesRes] = await Promise.all([
            supabase.from('tarefas').select('*, cliente:clientes(razao_social)').order('prazo'),
            supabase.from('clientes').select('id, razao_social').eq('status', 'ativo').order('razao_social'),
        ]);
        if (tarefasRes.data) setTarefas(tarefasRes.data as unknown as Tarefa[]);
        if (clientesRes.data) setClientes(clientesRes.data as Cliente[]);
        setLoading(false);
    };

    const handleSave = async () => {
        if (!form.titulo || !form.responsavel || !form.departamento || !form.prazo) {
            toast.error('Preencha todos os campos obrigatórios');
            return;
        }
        setSaving(true);
        const { error } = await supabase.from('tarefas').insert({
            user_id: user!.id,
            titulo: form.titulo,
            descricao: form.descricao || null,
            responsavel: form.responsavel,
            departamento: form.departamento,
            prazo: form.prazo,
            prioridade: form.prioridade,
            cliente_id: form.cliente_id || null,
        });
        setSaving(false);
        if (error) toast.error('Erro: ' + error.message);
        else {
            toast.success('Tarefa criada!');
            setDialogOpen(false);
            setForm({ titulo: '', descricao: '', responsavel: '', departamento: '', prazo: '', prioridade: 'media', cliente_id: '' });
            fetchData();
        }
    };

    const toggleStatus = async (tarefa: Tarefa) => {
        const next = tarefa.status === 'concluida' ? 'pendente' : tarefa.status === 'pendente' ? 'em_andamento' : 'concluida';
        await supabase.from('tarefas').update({ status: next }).eq('id', tarefa.id);
        fetchData();
    };

    const today = new Date().toISOString().split('T')[0];
    const pendentes = tarefas.filter(t => t.status === 'pendente');
    const emAndamento = tarefas.filter(t => t.status === 'em_andamento');
    const concluidas = tarefas.filter(t => t.status === 'concluida');
    const atrasadas = tarefas.filter(t => t.prazo < today && t.status !== 'concluida');
    const paraHoje = tarefas.filter(t => t.prazo === today && t.status !== 'concluida');

    const stats = [
        { label: 'Total', value: tarefas.length, icon: CheckSquare, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Pendentes', value: pendentes.length, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'Em Andamento', value: emAndamento.length, icon: Loader2, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'Concluídas', value: concluidas.length, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'Atrasadas', value: atrasadas.length, icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    ];

    const getStatusBadge = (status: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            pendente: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700' },
            em_andamento: { label: 'Em Andamento', cls: 'bg-blue-100 text-blue-700' },
            concluida: { label: 'Concluída', cls: 'bg-emerald-100 text-emerald-700' },
            atrasada: { label: 'Atrasada', cls: 'bg-red-100 text-red-700' },
        };
        const s = map[status] || map.pendente;
        return <Badge className={`${s.cls} hover:${s.cls}`}>{s.label}</Badge>;
    };

    const getPriorityBadge = (p: string) => {
        const map: Record<string, { label: string; cls: string }> = {
            alta: { label: 'Alta', cls: 'bg-red-100 text-red-700' },
            media: { label: 'Média', cls: 'bg-amber-100 text-amber-700' },
            baixa: { label: 'Baixa', cls: 'bg-emerald-100 text-emerald-700' },
        };
        const s = map[p] || map.media;
        return <Badge className={`${s.cls} hover:${s.cls}`}><Flag className="w-3 h-3 mr-1" />{s.label}</Badge>;
    };

    const renderTable = (items: Tarefa[]) => (
        <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
                <thead className="bg-slate-50">
                    <tr>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Tarefa</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Responsável</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prazo</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Prioridade</th>
                        <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                        <th className="text-right px-4 py-3 font-medium text-muted-foreground">Ação</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {items.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma tarefa</td></tr>
                    ) : items.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-3">
                                <div>
                                    <p className="font-medium">{t.titulo}</p>
                                    {(t as any).cliente?.razao_social && (
                                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                            <Building2 className="w-3 h-3" /> {(t as any).cliente.razao_social}
                                        </p>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 py-3">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                    <User className="w-3 h-3" /> {t.responsavel}
                                </span>
                            </td>
                            <td className="px-4 py-3">
                                <span className={`flex items-center gap-1 ${t.prazo < today && t.status !== 'concluida' ? 'text-red-600 font-medium' : 'text-muted-foreground'}`}>
                                    <Calendar className="w-3 h-3" />
                                    {new Date(t.prazo + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </span>
                            </td>
                            <td className="px-4 py-3">{getPriorityBadge(t.prioridade)}</td>
                            <td className="px-4 py-3">{getStatusBadge(t.status)}</td>
                            <td className="px-4 py-3 text-right">
                                <Button variant="ghost" size="sm" onClick={() => toggleStatus(t)}>
                                    {t.status === 'concluida' ? 'Reabrir' : t.status === 'pendente' ? 'Iniciar' : 'Concluir'}
                                </Button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <CheckSquare className="w-7 h-7 text-blue-500" /> Tarefas
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Gerencie suas tarefas e pendências</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-500 hover:bg-emerald-600">
                            <Plus className="w-4 h-4 mr-2" /> Nova Tarefa
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Nova Tarefa</DialogTitle>
                            <DialogDescription>Crie uma nova tarefa ou obrigação</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Título *</Label>
                                <Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição</Label>
                                <Input value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Responsável *</Label>
                                    <Input value={form.responsavel} onChange={e => setForm({ ...form, responsavel: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Departamento *</Label>
                                    <Input value={form.departamento} onChange={e => setForm({ ...form, departamento: e.target.value })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Prazo *</Label>
                                    <Input type="date" value={form.prazo} onChange={e => setForm({ ...form, prazo: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Prioridade</Label>
                                    <Select value={form.prioridade} onValueChange={v => setForm({ ...form, prioridade: v })}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="baixa">Baixa</SelectItem>
                                            <SelectItem value="media">Média</SelectItem>
                                            <SelectItem value="alta">Alta</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Cliente (opcional)</Label>
                                <Select value={form.cliente_id} onValueChange={v => setForm({ ...form, cliente_id: v })}>
                                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                                    <SelectContent>
                                        {clientes.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.razao_social}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <Button className="w-full bg-emerald-500 hover:bg-emerald-600" onClick={handleSave} disabled={saving}>
                                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : 'Criar Tarefa'}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
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

            {/* Tabs */}
            <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                    <Tabs defaultValue="todas">
                        <TabsList className="mb-4">
                            <TabsTrigger value="todas">Todas ({tarefas.length})</TabsTrigger>
                            <TabsTrigger value="pendentes">Pendentes ({pendentes.length})</TabsTrigger>
                            <TabsTrigger value="hoje">Para Hoje ({paraHoje.length})</TabsTrigger>
                            <TabsTrigger value="atrasadas">Atrasadas ({atrasadas.length})</TabsTrigger>
                        </TabsList>
                        <TabsContent value="todas">{renderTable(tarefas)}</TabsContent>
                        <TabsContent value="pendentes">{renderTable(pendentes)}</TabsContent>
                        <TabsContent value="hoje">{renderTable(paraHoje)}</TabsContent>
                        <TabsContent value="atrasadas">{renderTable(atrasadas)}</TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
