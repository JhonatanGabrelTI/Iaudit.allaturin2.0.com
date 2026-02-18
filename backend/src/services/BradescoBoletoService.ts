import axios from 'axios';
import { BradescoAuthService } from './BradescoAuthService';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

interface BoletoPayload {
    config_id: string; // Internal ID to fetch creds
    nosso_numero: string; // 11 digits
    valor: number;
    vencimento: string; // YYYY-MM-DD
    pagador: {
        nome: string;
        doc: string; // CPF/CNPJ
        endereco: string;
        cep: string;
        cidade: string;
        uf: string;
    };
}

export class BradescoBoletoService {
    private static API_URL = 'https://proxy.api.prebanco.com.br/v1.1'; // Sandbox URL

    static async registrarBoleto(boletoData: BoletoPayload) {
        const { config_id } = boletoData;
        const internalId = uuidv4();

        // 1. Get Config
        const configResult = await query(
            'SELECT agencia, conta, carteira, negociacao FROM configuracoes_cobranca WHERE id = $1',
            [config_id]
        );

        if (configResult.rows.length === 0) {
            throw new Error('Configuração de boleto não encontrada');
        }

        const config = configResult.rows[0];

        // 2. Persist INITIAL Status (PENDENTE)
        // This ensures the user sees the attempt in the list even if API fails
        await query(
            `INSERT INTO boletos (
                id, configuracao_id, nosso_numero, seu_numero, valor, data_vencimento, 
                pagador_nome, pagador_doc, status, 
                pagador_endereco, pagador_cep, pagador_cidade, pagador_uf,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDENTE', $9, $10, $11, $12, NOW(), NOW())`,
            [
                internalId, config_id, boletoData.nosso_numero, internalId, boletoData.valor, boletoData.vencimento,
                boletoData.pagador.nome, boletoData.pagador.doc,
                boletoData.pagador.endereco, boletoData.pagador.cep, boletoData.pagador.cidade, boletoData.pagador.uf
            ]
        );

        try {
            // 3. Get Token
            const token = await BradescoAuthService.getAccessToken(config_id);

            // 4. Prepare Payload
            const payload = {
                agencia: config.agencia,
                conta: config.conta,
                carteira: config.carteira,
                negociacao: config.negociacao,
                nossoNumero: boletoData.nosso_numero,
                valorTitulo: boletoData.valor.toFixed(2).replace('.', ''),
                dataVencimento: boletoData.vencimento,
                pagador: {
                    nome: boletoData.pagador.nome.substring(0, 40),
                    numeroDocumento: boletoData.pagador.doc.replace(/\D/g, ''),
                    tipoDocumento: boletoData.pagador.doc.length > 11 ? '2' : '1',
                    endereco: boletoData.pagador.endereco.substring(0, 40),
                    cep: boletoData.pagador.cep.replace(/\D/g, ''),
                    cidade: boletoData.pagador.cidade.substring(0, 20),
                    uf: boletoData.pagador.uf
                },
            };

            // 5. Call API
            const response = await axios.post(
                `${this.API_URL}/boleto/registro`,
                payload,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );

            // 6. Update to REGISTRADO
            await query(
                `UPDATE boletos SET status = 'REGISTRADO', linha_digitavel = $1, codigo_barras = $2, json_retorno = $3, updated_at = NOW() WHERE id = $4`,
                [response.data.linhaDigitavel, response.data.codigoBarras, response.data, internalId]
            );

            return {
                id: internalId,
                status: 'REGISTRADO',
                linhaDigitavel: response.data.linhaDigitavel
            };

        } catch (error: any) {
            console.error('Erro ao registrar boleto (API):', error.response?.data || error.message);
            const errorMsg = JSON.stringify(error.response?.data || error.message);

            // Update to ERRO
            await query(
                `UPDATE boletos SET status = 'ERRO', metadata = jsonb_build_object('error', $1), updated_at = NOW() WHERE id = $2`,
                [errorMsg, internalId]
            );

            // Return the object with Error status so client knows it was saved but failed
            return {
                id: internalId,
                status: 'ERRO',
                message: 'Falha na comunicação com o banco. O boleto foi salvo como ERRO. Verifique os dados e tente novamente.'
            };
        }
    }

    static async listarBoletos() {
        try {
            const result = await query(
                `SELECT * FROM boletos ORDER BY created_at DESC LIMIT 100`
            );
            return result.rows;
        } catch (error) {
            console.error('Erro ao listar boletos:', error);
            throw error;
        }
    }
}
