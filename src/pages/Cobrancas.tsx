import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    LayoutDashboard, Plus, FileText, Settings,
    Search, DollarSign, CheckCircle2, AlertCircle, Clock
} from 'lucide-react';
import { billingService, type Boleto } from '@/services/billingService';
import { toast } from 'sonner';

export default function Cobrancas() {
    const [boletos, setBoletos] = useState<Boleto[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTab, setCurrentTab] = useState('dashboard');

    // Form State
    const [formData, setFormData] = useState({
        pagadorNome: '',
        doc: '',
        vencimento: '',
        valor: '',
        nossoNumero: '',
        endereco: 'Rua Desconhecida, 0', // Default/Mock for now as UI doesn't have it
        cep: '00000000',
        cidade: 'Curitiba',
        uf: 'PR'
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        const data = await billingService.list();
        setBoletos(data);
        setLoading(false);
    };

    const handleEmitirBoleto = async () => {
        // Validation
        if (!formData.pagadorNome || !formData.doc || !formData.vencimento || !formData.valor) {
            toast.error('Preencha todos os campos obrigatórios.');
            return;
        }

        try {
            const payload = {
                config_id: '', // Backend will pick default
                nosso_numero: formData.nossoNumero || 'Automático',
                valor: parseFloat(formData.valor),
                vencimento: formData.vencimento,
                pagador: {
                    nome: formData.pagadorNome,
                    doc: formData.doc,
                    endereco: formData.endereco,
                    cep: formData.cep,
                    cidade: formData.cidade,
                    uf: formData.uf
                }
            };

            await billingService.create(payload as any);
            toast.success('Boleto enviado! Se houver erro na API, ele aparecerá como Falha na lista.');

            // Clear form
            setFormData({ ...formData, pagadorNome: '', doc: '', valor: '', nossoNumero: '' });
            setCurrentTab('titulos');

        } catch (error: any) {
            console.error(error);
            // If the error is 400 (Validation), show details
            if (error.response?.status === 400 && error.response?.data?.details) {
                const issues = error.response.data.details.map((d: any) => `${d.path.join('.')}: ${d.message}`).join(', ');
                toast.error(`Erro de validação: ${issues}`);
            } else if (error.response?.status === 400 && error.response?.data?.error) {
                toast.error(`Erro: ${error.response.data.error}`);
            } else {
                toast.error('Erro ao emitir boleto. Verifique os dados.');
            }
        } finally {
            // ALWAYS refresh the list, because even on error, we might have saved a draft/error state
            await loadData();
        }
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão de Cobranças</h1>
                <p className="text-muted-foreground mt-2">
                    Emissão e controle de boletos bancários (Bradesco)
                </p>
            </div>

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 lg:w-[600px] mb-8">
                    <TabsTrigger value="dashboard"><LayoutDashboard className="w-4 h-4 mr-2" /> Visão Geral</TabsTrigger>
                    <TabsTrigger value="titulos"><FileText className="w-4 h-4 mr-2" /> Boletos</TabsTrigger>
                    <TabsTrigger value="emitir"><Plus className="w-4 h-4 mr-2" /> Nova Cobrança</TabsTrigger>
                    <TabsTrigger value="config"><Settings className="w-4 h-4 mr-2" /> Configurações</TabsTrigger>
                </TabsList>

                {/* DASHBOARD TAB */}
                <TabsContent value="dashboard" className="space-y-6">
                    {/* ... (Keep existing dashboard cards) ... */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Total Emitido (Mês)</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">R$ 45.231,89</div>
                                <p className="text-xs text-muted-foreground">+20.1% relação mês anterior</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Recebido</CardTitle>
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">R$ 32.450,00</div>
                                <p className="text-xs text-muted-foreground">71% da carteira</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Em Atraso</CardTitle>
                                <AlertCircle className="h-4 w-4 text-red-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">R$ 2.350,00</div>
                                <p className="text-xs text-muted-foreground">5% da carteira</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">A Vencer</CardTitle>
                                <Clock className="h-4 w-4 text-blue-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">R$ 10.431,89</div>
                                <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* TITULOS TAB */}
                <TabsContent value="titulos">
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle>Boletos Gerados</CardTitle>
                                    <CardDescription>Gerencie seus títulos registrados.</CardDescription>
                                </div>
                                <div className="relative w-64">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="Buscar por cliente ou número..." className="pl-8" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 border-b">
                                        <tr>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Nosso Número</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Pagador</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Vencimento</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Valor</th>
                                            <th className="px-4 py-3 font-medium text-muted-foreground">Status</th>
                                            <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {loading ? (
                                            <tr><td colSpan={6} className="p-4 text-center">Carregando...</td></tr>
                                        ) : boletos.length === 0 ? (
                                            <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum boleto encontrado.</td></tr>
                                        ) : (
                                            boletos.map((boleto) => (
                                                <tr key={boleto.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono">{boleto.nosso_numero}</td>
                                                    <td className="px-4 py-3">{boleto.pagador_nome}</td>
                                                    <td className="px-4 py-3">{new Date(boleto.vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                                    <td className="px-4 py-3">R$ {Number(boleto.valor).toFixed(2)}</td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant={boleto.status === 'PAGO' ? 'default' : boleto.status === 'REGISTRADO' ? 'outline' : 'secondary'}>
                                                            {boleto.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Button variant="ghost" size="sm">PDF</Button>
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

                {/* EMISSAO TAB */}
                <TabsContent value="emitir">
                    <Card>
                        <CardHeader>
                            <CardTitle>Nova Cobrança Manual</CardTitle>
                            <CardDescription>Preencha os dados para registrar um novo boleto.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Pagador (Nome / Razão Social)</Label>
                                    <Input
                                        placeholder="Ex: João da Silva"
                                        value={formData.pagadorNome}
                                        onChange={(e) => setFormData({ ...formData, pagadorNome: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>CPF / CNPJ</Label>
                                    <Input
                                        placeholder="000.000.000-00"
                                        value={formData.doc}
                                        onChange={(e) => setFormData({ ...formData, doc: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label>Vencimento</Label>
                                    <Input
                                        type="date"
                                        value={formData.vencimento}
                                        onChange={(e) => setFormData({ ...formData, vencimento: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Valor (R$)</Label>
                                    <Input
                                        type="number"
                                        placeholder="0,00"
                                        value={formData.valor}
                                        onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nosso Número (Opcional)</Label>
                                    <Input
                                        placeholder="Automático"
                                        value={formData.nossoNumero}
                                        onChange={(e) => setFormData({ ...formData, nossoNumero: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end">
                                <Button className="w-40" onClick={handleEmitirBoleto}>
                                    <Plus className="w-4 h-4 mr-2" /> Emitir Boleto
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* CONFIG TAB */}
                <TabsContent value="config">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações Bradesco</CardTitle>
                            <CardDescription>Gerencie credenciais e regras de cobrança.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 bg-amber-50 text-amber-800 rounded-md text-sm mb-4">
                                ⚠️ As credenciais são armazenadas de forma segura no backend e não são expostas aqui.
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Client ID (API)</Label>
                                    <Input type="password" value="************************" disabled />
                                </div>
                                <div className="space-y-2">
                                    <Label>Client Secret</Label>
                                    <Input type="password" value="************************" disabled />
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4">
                                <div className="space-y-2">
                                    <Label>Agência</Label>
                                    <Input placeholder="0000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Conta</Label>
                                    <Input placeholder="0000000" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Carteira</Label>
                                    <Input placeholder="09" />
                                </div>
                            </div>
                            <div className="pt-4">
                                <Button variant="outline">Testar Conexão</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
