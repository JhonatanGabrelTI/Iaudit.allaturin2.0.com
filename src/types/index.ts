export interface User {
    id: string;
    email: string;
    nome: string;
    empresa?: string;
    cnpj?: string;
    telefone?: string;
    perfil?: 'admin' | 'operador';
    created_at: string;
    updated_at: string;
}

export interface Cliente {
    id: string;
    user_id: string;
    razao_social: string;
    nome_fantasia?: string;
    cnpj: string;
    cpf?: string;
    inscricao_estadual_pr?: string;
    email?: string;
    telefone?: string;
    whatsapp?: string;
    regime_tributario?: string;
    certificado_digital_validade?: string;
    procuracao_ecac_validade?: string;
    // Agendamento
    periodicidade: 'diario' | 'semanal' | 'quinzenal' | 'mensal';
    dia_semana?: number;
    dia_mes?: number;
    horario?: string;
    // Controle
    ativo: boolean;
    status_fiscal?: 'regular' | 'irregular' | 'indefinido';
    created_at: string;
    updated_at: string;
}

export interface Consulta {
    id: string;
    user_id: string;
    cliente_id: string;
    tipo: TipoConsulta;
    status: 'pendente' | 'processando' | 'concluido' | 'erro';
    situacao?: 'positiva' | 'negativa' | 'atualizando' | 'erro' | null;
    resultado?: Record<string, unknown>;
    pdf_url?: string;
    mensagem_erro?: string;
    data_validade?: string;
    data_agendamento?: string;
    data_execucao?: string;
    tentativas: number;
    created_at: string;
    updated_at: string;
    cliente?: Pick<Cliente, 'razao_social' | 'cnpj'>;
}

export interface Tarefa {
    id: string;
    user_id: string;
    cliente_id?: string;
    titulo: string;
    descricao?: string;
    responsavel: string;
    departamento: string;
    prazo: string;
    status: 'pendente' | 'em_andamento' | 'concluida' | 'atrasada';
    prioridade: 'baixa' | 'media' | 'alta';
    auto_concluir?: boolean;
    created_at: string;
    updated_at: string;
    cliente?: Pick<Cliente, 'razao_social'>;
}

export interface LogExecucao {
    id: string;
    consulta_id: string;
    nivel: 'info' | 'aviso' | 'erro';
    mensagem: string;
    payload?: Record<string, unknown>;
    created_at: string;
}

export interface Notificacao {
    id: string;
    user_id: string;
    cliente_id?: string;
    consulta_id?: string;
    canal: 'email' | 'whatsapp' | 'sistema';
    tipo: string;
    mensagem: string;
    destinatario?: string;
    enviado: boolean;
    lido: boolean;
    data_envio?: string;
    data_leitura?: string;
    created_at: string;
}

export interface Mensagem {
    id: string;
    remetente: string;
    conteudo: string;
    timestamp: string;
    lida: boolean;
}

export interface Conversa {
    id: string;
    nome: string;
    ultimaMensagem: string;
    timestamp: string;
    naoLidas: number;
    avatar?: string;
    tipo: 'chat' | 'email' | 'whatsapp';
}

export type TipoConsulta = 'cnd_federal' | 'cnd_estadual' | 'fgts';

export interface ConsultaResultado {
    sucesso: boolean;
    mensagem: string;
    dados?: Record<string, unknown>;
    pdf_url?: string;
}

// CSV upload type
export interface CsvClienteRow {
    cnpj: string;
    razao_social: string;
    inscricao_estadual_pr?: string;
    email?: string;
    whatsapp?: string;
}

export type TipoCanalIntegracao = 'email_smtp' | 'whatsapp_fiscal' | 'whatsapp_rh' | 'whatsapp_business';

export interface ConfigIntegracao {
    id: string;
    user_id: string;
    canal: TipoCanalIntegracao;
    config: Record<string, string | number | boolean>;
    ativo: boolean;
    created_at: string;
    updated_at: string;
}
