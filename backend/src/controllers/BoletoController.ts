import { Request, Response } from 'express';
import { BradescoBoletoService } from '../services/BradescoBoletoService';
import { query } from '../config/database'; // Import query
import { z } from 'zod';

const boletoSchema = z.object({
    config_id: z.string().uuid().optional(), // Made optional
    nosso_numero: z.string().length(11).optional(), // Make optional and generate if needed? No, let's keep it required or generate. User's form input 'Automático'.
    valor: z.number().positive(),
    vencimento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    pagador: z.object({
        nome: z.string().min(1),
        doc: z.string().min(11).max(14),
        endereco: z.string(),
        cep: z.string(),
        cidade: z.string(),
        uf: z.string().length(2),
    }),
});

export class BoletoController {
    static async create(req: Request, res: Response) {
        try {
            const data = boletoSchema.parse(req.body);

            // Resolve config_id if missing
            if (!data.config_id) {
                const configRes = await query('SELECT id FROM configuracoes_cobranca LIMIT 1');
                if (configRes.rows.length === 0) {
                    return res.status(400).json({ error: 'Nenhuma configuração de cobrança encontrada.' });
                }
                data.config_id = configRes.rows[0].id;
            }

            // Generate nosso_numero if 'Automático' or missing
            if (!data.nosso_numero || data.nosso_numero === 'Automático') {
                // Simple generation: Date + Random. Real world would use sequential from DB.
                // Bradesco nosso_numero is 11 digits.
                const random = Math.floor(Math.random() * 90000) + 10000;
                const prefix = new Date().getTime().toString().slice(-6);
                data.nosso_numero = `${prefix}${random}`; // 6 + 5 = 11 digits
            }

            const result = await BradescoBoletoService.registrarBoleto(data as any);

            res.status(201).json(result);
        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: 'Validation Error', details: error.errors });
            }

            console.error(error);
            res.status(500).json({ error: 'Internal Server Error', message: error.message });
        }
    }

    static async list(req: Request, res: Response) {
        try {
            const result = await BradescoBoletoService.listarBoletos();
            res.json(result);
        } catch (error) {
            console.error('Error fetching boletos:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
