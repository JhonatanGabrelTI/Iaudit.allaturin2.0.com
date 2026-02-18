import cron from 'node-cron';
import axios from 'axios';
import { query } from '../config/database';
import { BradescoAuthService } from '../services/BradescoAuthService';

export class ConciliacaoDiariaJob {
    // Run every day at 06:00 AM
    static start() {
        cron.schedule('0 6 * * *', async () => {
            console.log('[Job] Iniciando conciliação diária...');
            try {
                await this.processarConciliacao();
            } catch (error) {
                console.error('[Job] Erro na conciliação:', error);
            }
        });
    }

    static async processarConciliacao() {
        // 1. Get all active configurations
        const configs = await query('SELECT id, client_id FROM configuracoes_cobranca');

        for (const config of configs.rows) {
            const token = await BradescoAuthService.getAccessToken(config.id);
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const dateStr = yesterday.toISOString().split('T')[0]; // YYYY-MM-DD

            // 2. Fetch "Liquidated" titles from Bradesco (API Simulation)
            // Endpoint: /boleto/cobranca-lista/v1/listar
            // Params: { dataInicial: dateStr, dataFinal: dateStr, situacao: 'LIQUIDADO' }

            const response = await axios.get('https://proxy.api.prebanco.com.br/v1.1/boleto/lista', {
                headers: { Authorization: `Bearer ${token}` },
                params: {
                    dataInicial: dateStr,
                    dataFinal: dateStr,
                    situacao: '06' // Example status for Liquidated
                }
            });

            const liquidados = response.data.lista || [];

            // 3. Update local DB
            for (const item of liquidados) {
                await query(
                    `UPDATE boletos 
            SET status = 'PAGO', 
                metadata = jsonb_set(metadata, '{conciliacao}', metadata->'conciliacao' || $1::jsonb)
            WHERE nosso_numero = $2 AND status != 'PAGO'`,
                    [JSON.stringify({ date: new Date(), source: 'job_conciliacao' }), item.nossoNumero]
                );
            }
        }
    }
}
