import { Request, Response } from 'express';
import { query } from '../config/database';

export class WebhookController {
    static async handleBradesco(req: Request, res: Response) {
        // 1. Logs the raw payload
        const payload = req.body;
        const notificationId = payload.notificationId || 'unknown'; // Example field

        console.log(`[Webhook] Recebido notification: ${notificationId}`);

        try {
            // 2. Persist audit log
            await query(
                'INSERT INTO webhooks_recebidos (payload, received_at) VALUES ($1, NOW())',
                [JSON.stringify(payload)]
            );

            // 3. Process business logic (update boleto status)
            // Example payload structure: { nossoNumero: '...', status: 'PAGO', valorPago: 100.00 }
            if (payload.nossoNumero && payload.status) {
                await query(
                    `UPDATE boletos 
           SET status = $1, 
               metadata = jsonb_set(metadata, '{webhook_history}', metadata->'webhook_history' || $2::jsonb)
           WHERE nosso_numero = $3`,
                    [payload.status, JSON.stringify({ event: payload, date: new Date() }), payload.nossoNumero]
                );
            }

            // 4. Acknowledge (Bradesco expects 200 OK)
            res.status(200).send('OK');
        } catch (error) {
            console.error('[Webhook] Erro ao processar:', error);
            res.status(500).send('Internal Error');
        }
    }
}
