import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Settings, User, Bell, Plug, MessageSquare, Save,
    Loader2, Shield, Building2, Phone, Mail, Key, Briefcase,
} from 'lucide-react';
import { ConfigIntegracaoModal } from '@/components/ConfigIntegracaoModal';
import type { TipoCanalIntegracao } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';

export default function Configuracoes() {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);

    const [profile, setProfile] = useState({
        nome: '', email: '', empresa: '', cnpj: '', telefone: '',
    });

    const [notifications, setNotifications] = useState({
        email_consultas: true,
        email_tarefas: true,
        email_certificados: true,
        push_consultas: false,
        push_tarefas: true,
    });

    const [apiConfig, setApiConfig] = useState({
        infosimples_token: import.meta.env.VITE_INFOSIMPLES_TOKEN || '',
    });

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedCanal, setSelectedCanal] = useState<TipoCanalIntegracao>('email_smtp');

    const openConfig = (canal: TipoCanalIntegracao) => {
        setSelectedCanal(canal);
        setModalOpen(true);
    };

    useEffect(() => {
        if (user) {
            setProfile({
                nome: user.nome || '',
                email: user.email || '',
                empresa: user.empresa || '',
                cnpj: user.cnpj || '',
                telefone: user.telefone || '',
            });
        }
    }, [user]);

    const handleSaveProfile = async () => {
        if (!user) return;
        setSaving(true);
        const { error } = await supabase
            .from('usuarios')
            .update({
                nome: profile.nome,
                empresa: profile.empresa,
                cnpj: profile.cnpj,
                telefone: profile.telefone,
                updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);
        setSaving(false);
        if (error) toast.error('Erro: ' + error.message);
        else toast.success('Perfil atualizado!');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    <Settings className="w-7 h-7 text-slate-500" /> Configurações
                </h1>
                <p className="text-slate-500 text-sm mt-1">Ajustes do sistema e perfil</p>
            </div>

            <Tabs defaultValue="perfil" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="perfil" className="gap-2">
                        <User className="w-4 h-4" /> Perfil
                    </TabsTrigger>
                    <TabsTrigger value="notificacoes" className="gap-2">
                        <Bell className="w-4 h-4" /> Notificações
                    </TabsTrigger>
                    <TabsTrigger value="api" className="gap-2">
                        <Plug className="w-4 h-4" /> API
                    </TabsTrigger>
                    <TabsTrigger value="comunicacao" className="gap-2">
                        <MessageSquare className="w-4 h-4" /> Comunicação
                    </TabsTrigger>
                </TabsList>

                {/* Profile */}
                <TabsContent value="perfil">
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Informações do Perfil</CardTitle>
                            <CardDescription>Atualize suas informações pessoais e da empresa</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center gap-6">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white">
                                        {profile.nome?.charAt(0)?.toUpperCase() || 'U'}
                                    </span>
                                </div>
                                <div>
                                    <p className="text-lg font-semibold">{profile.nome || 'Usuário'}</p>
                                    <p className="text-sm text-muted-foreground">{profile.email}</p>
                                </div>
                            </div>

                            <Separator />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><User className="w-4 h-4" /> Nome</Label>
                                    <Input value={profile.nome} onChange={e => setProfile({ ...profile, nome: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Mail className="w-4 h-4" /> Email</Label>
                                    <Input value={profile.email} disabled className="bg-slate-50" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Building2 className="w-4 h-4" /> Empresa</Label>
                                    <Input value={profile.empresa} onChange={e => setProfile({ ...profile, empresa: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <Label className="flex items-center gap-2"><Shield className="w-4 h-4" /> CNPJ</Label>
                                    <Input value={profile.cnpj} onChange={e => setProfile({ ...profile, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                                </div>
                                <div className="space-y-2 md:col-span-2">
                                    <Label className="flex items-center gap-2"><Phone className="w-4 h-4" /> Telefone</Label>
                                    <Input value={profile.telefone} onChange={e => setProfile({ ...profile, telefone: e.target.value })} placeholder="(00) 00000-0000" />
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSaveProfile} disabled={saving}>
                                    {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Perfil</>}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Notifications */}
                <TabsContent value="notificacoes">
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Preferências de Notificação</CardTitle>
                            <CardDescription>Controle como e quando receber notificações</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="text-sm font-semibold mb-4">Email</h3>
                                <div className="space-y-4">
                                    {[
                                        { key: 'email_consultas', label: 'Consultas fiscais', desc: 'Receba alertas ao concluir consultas' },
                                        { key: 'email_tarefas', label: 'Tarefas e prazos', desc: 'Lembretes de tarefas e vencimentos' },
                                        { key: 'email_certificados', label: 'Certificados digitais', desc: 'Alertas de vencimento de certificados' },
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                                            <div>
                                                <p className="text-sm font-medium">{item.label}</p>
                                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                            </div>
                                            <Switch
                                                checked={(notifications as any)[item.key]}
                                                onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            <div>
                                <h3 className="text-sm font-semibold mb-4">Push Notifications</h3>
                                <div className="space-y-4">
                                    {[
                                        { key: 'push_consultas', label: 'Consultas em tempo real', desc: 'Notificações push para consultas' },
                                        { key: 'push_tarefas', label: 'Lembretes de tarefas', desc: 'Push para tarefas próximas do prazo' },
                                    ].map(item => (
                                        <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50">
                                            <div>
                                                <p className="text-sm font-medium">{item.label}</p>
                                                <p className="text-xs text-muted-foreground">{item.desc}</p>
                                            </div>
                                            <Switch
                                                checked={(notifications as any)[item.key]}
                                                onCheckedChange={(v) => setNotifications({ ...notifications, [item.key]: v })}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => toast.success('Notificações salvas!')}>
                                    <Save className="w-4 h-4 mr-2" /> Salvar Preferências
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* API */}
                <TabsContent value="api">
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Configurações de API</CardTitle>
                            <CardDescription>Gerencie tokens e integrações de API</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <Key className="w-4 h-4" /> Token API Infosimples
                                </Label>
                                <Input
                                    type="password"
                                    value={apiConfig.infosimples_token}
                                    onChange={e => setApiConfig({ ...apiConfig, infosimples_token: e.target.value })}
                                    placeholder="Seu token de API"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Token utilizado para consultas fiscais (CND Federal, CND Estadual, FGTS)
                                </p>
                            </div>

                            <Separator />

                            <div className="rounded-lg border p-4 bg-slate-50">
                                <h3 className="text-sm font-semibold mb-2">Endpoints Configurados</h3>
                                <div className="space-y-2 text-xs text-muted-foreground font-mono">
                                    <p>• CND Federal: api.infosimples.com/api/v2/consultas/receita-federal/pgfn/nova</p>
                                    <p>• CND Estadual: api.infosimples.com/api/v2/consultas/sefaz/pr/certidao-debitos</p>
                                    <p>• FGTS: api.infosimples.com/api/v2/consultas/caixa/regularidade</p>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={() => toast.success('Configurações de API salvas!')}>
                                    <Save className="w-4 h-4 mr-2" /> Salvar Configurações
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Communication */}
                <TabsContent value="comunicacao">
                    <Card className="border-0 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg">Configurações de Comunicação</CardTitle>
                            <CardDescription>Configure canais de comunicação</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Email SMTP */}
                                <Card className="border hover:border-blue-300 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                                <Mail className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">Email SMTP</p>
                                                <p className="text-xs text-muted-foreground">Servidor de email</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => openConfig('email_smtp')}>Configurar</Button>
                                    </CardContent>
                                </Card>

                                {/* WhatsApp Fiscal */}
                                <Card className="border hover:border-green-300 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                                                <Phone className="w-5 h-5 text-green-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">WhatsApp Fiscal</p>
                                                <p className="text-xs text-muted-foreground">Envio de CNDs e guias</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => openConfig('whatsapp_fiscal')}>Configurar</Button>
                                    </CardContent>
                                </Card>

                                {/* WhatsApp RH */}
                                <Card className="border hover:border-emerald-300 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                                                <Phone className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">WhatsApp RH</p>
                                                <p className="text-xs text-muted-foreground">Envio de holerites</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => openConfig('whatsapp_rh')}>Configurar</Button>
                                    </CardContent>
                                </Card>

                                {/* WhatsApp Business */}
                                <Card className="border hover:border-teal-300 transition-colors">
                                    <CardContent className="p-4">
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                                                <Briefcase className="w-5 h-5 text-teal-600" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">WhatsApp Business</p>
                                                <p className="text-xs text-muted-foreground">Atendimento geral</p>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" className="w-full" onClick={() => openConfig('whatsapp_business')}>Configurar</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <ConfigIntegracaoModal
                open={modalOpen}
                onOpenChange={setModalOpen}
                canal={selectedCanal}
            />
        </div>
    );
}
