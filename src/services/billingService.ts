import axios from 'axios';

// Assume backend is running on localhost:3001 for now
// In production, this should be an environment variable
const API_URL = 'http://localhost:3001/api';

export interface Boleto {
    id: string;
    nosso_numero: string;
    valor: number;
    vencimento: string;
    pagador_nome: string;
    status: 'PENDENTE' | 'REGISTRADO' | 'PAGO' | 'BAIXADO' | 'PROTESTADO' | 'ERRO';
    link_pdf?: string;
}

export interface NovoBoletoPayload {
    config_id: string;
    nosso_numero: string;
    valor: number;
    vencimento: string;
    pagador: {
        nome: string;
        doc: string;
        endereco: string;
        cep: string;
        cidade: string;
        uf: string;
    };
}

export const billingService = {
    // Listar todos os boletos
    list: async (): Promise<Boleto[]> => {
        try {
            const response = await axios.get(`${API_URL}/boletos`);
            return response.data;
        } catch (error) {
            console.error('Error fetching boletos:', error);
            return [];
        }
    },

    // Criar novo boleto
    create: async (payload: NovoBoletoPayload) => {
        const response = await axios.post(`${API_URL}/boletos`, payload);
        return response.data;
    },

    // Get Dashboard Stats (Mocked for now)
    getStats: async () => {
        return {
            total: 150,
            pago: 120,
            vencido: 5,
            pendente: 25,
            volumeTotal: 45000.00
        };
    }
};
