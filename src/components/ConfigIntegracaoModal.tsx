import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { TipoCanalIntegracao, ConfigIntegracao } from '@/types';

interface ConfigIntegracaoModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canal: TipoCanalIntegracao;
    onSave?: () => void;
}

const canalLabels: Record<TipoCanalIntegracao, string> = {
    email_smtp: 'Email SMTP',
    whatsapp_fiscal: 'WhatsApp Fiscal',
    whatsapp_rh: 'WhatsApp RH',
    whatsapp_business: 'WhatsApp Business',
};

const defaultConfigs: Record<TipoCanalIntegracao, Record<string, any>> = {
    email_smtp: { host: '', port: 587, user: '', pass: '', secure: false }, // pass will be empty on load if exists
    whatsapp_fiscal: { api_url: '', api_token: '', session_id: '' },
    whatsapp_rh: { api_url: '', api_token: '', session_id: '' },
    whatsapp_business: { api_url: '', api_token: '', session_id: '' },
};

export function ConfigIntegracaoModal({ open, onOpenChange, canal, onSave }: ConfigIntegracaoModalProps) {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [ativo, setAtivo] = useState(true);

    useEffect(() => {
        if (open && user) {
            fetchConfig();
        } else {
            setFormData({});
            setConfigId(null);
        }
    }, [open, canal, user]);

    const fetchConfig = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('configuracoes_integracao')
            .select('*')
            .eq('user_id', user!.id)
            .eq('canal', canal)
            .single();

        if (data) {
            setConfigId(data.id);
            setAtivo(data.ativo);
            // Don't show password/token fully if it exists, maybe placeholder?
            // For now, just load it. In a real app, we might mask it.
            setFormData(data.config);
        } else {
            setFormData(defaultConfigs[canal]);
            setConfigId(null);
            setAtivo(true);
        }
        setLoading(false);
    };

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);

        const payload = {
            user_id: user.id,
            canal,
            config: formData,
            ativo,
            updated_at: new Date().toISOString(),
        };

        let result;
        if (configId) {
            result = await supabase
                .from('configuracoes_integracao')
                .update(payload)
                .eq('id', configId);
        } else {
            result = await supabase
                .from('configuracoes_integracao')
                .insert(payload);
        }

        setSaving(false);
        if (result.error) {
            toast.error('Erro ao salvar: ' + result.error.message);
        } else {
            toast.success('Configuração salva com sucesso!');
            onOpenChange(false);
            if (onSave) onSave();
        }
    };

    const handleDelete = async () => {
        if (!configId || !confirm('Tem certeza? Isso removerá a integração.')) return;
        setSaving(true);
        const { error } = await supabase.from('configuracoes_integracao').delete().eq('id', configId);
        setSaving(false);
        if (error) toast.error('Erro: ' + error.message);
        else {
            toast.success('Removido com sucesso!');
            onOpenChange(false);
            if (onSave) onSave();
        }
    };

    const updateField = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Configurar {canalLabels[canal]}</DialogTitle>
                    <DialogDescription>
                        Preencha os dados de conexão para ativar esta integração using generic properties.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="py-8 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                ) : (
                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border">
                            <div className="flex items-center gap-2">
                                {ativo ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <AlertCircle className="w-4 h-4 text-slate-400" />}
                                <Label className="cursor-pointer" htmlFor="active-mode">Integração Ativa</Label>
                            </div>
                            <Switch id="active-mode" checked={ativo} onCheckedChange={setAtivo} />
                        </div>

                        {canal === 'email_smtp' && (
                            <>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="col-span-2 space-y-2">
                                        <Label>Host SMTP</Label>
                                        <Input value={formData.host || ''} onChange={e => updateField('host', e.target.value)} placeholder="smtp.exemplo.com" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Porta</Label>
                                        <Input type="number" value={formData.port || ''} onChange={e => updateField('port', parseInt(e.target.value))} placeholder="587" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>Usuário / Email</Label>
                                    <Input value={formData.user || ''} onChange={e => updateField('user', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Senha</Label>
                                    <Input type="password" value={formData.pass || ''} onChange={e => updateField('pass', e.target.value)} />
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    <Switch id="secure-ssl" checked={formData.secure || false} onCheckedChange={v => updateField('secure', v)} />
                                    <Label htmlFor="secure-ssl">Usar SSL/TLS</Label>
                                </div>
                            </>
                        )}

                        {canal.startsWith('whatsapp') && (
                            <>
                                <div className="space-y-2">
                                    <Label>URL da API (Base URL)</Label>
                                    <Input value={formData.api_url || ''} onChange={e => updateField('api_url', e.target.value)} placeholder="https://api.exemplo.com" />
                                </div>
                                <div className="space-y-2">
                                    <Label>API Token / Key</Label>
                                    <Input type="password" value={formData.api_token || ''} onChange={e => updateField('api_token', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Nome da Sessão / Instância</Label>
                                    <Input value={formData.session_id || ''} onChange={e => updateField('session_id', e.target.value)} placeholder="minha-sessao" />
                                </div>
                            </>
                        )}

                        <div className="flex justify-between mt-6">
                            {configId ? (
                                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Remover
                                </Button>
                            ) : <div></div>}
                            <Button className="bg-emerald-500 hover:bg-emerald-600" onClick={handleSave} disabled={saving}>
                                {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Configuração</>}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
