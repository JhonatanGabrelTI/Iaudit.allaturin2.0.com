import axios from 'axios';
import { query } from '../config/database';

interface TokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

export class BradescoAuthService {
    private static tokenCache: { [clientId: string]: { token: string; expiresAt: number } } = {};

    static async getAccessToken(configId: string): Promise<string> {
        // 1. Fetch credentials from DB
        const result = await query(
            'SELECT client_id, client_secret, certificado_pfx, certificado_senha FROM configuracoes_cobranca WHERE id = $1',
            [configId]
        );

        if (result.rows.length === 0) {
            throw new Error(`Configuração não encontrada para ID: ${configId}`);
        }

        const { client_id, client_secret /*, certificado_pfx, certificado_senha */ } = result.rows[0];

        // 2. Check Cache
        const now = Date.now();
        if (this.tokenCache[client_id] && this.tokenCache[client_id].expiresAt > now + 30000) { // 30s buffer
            return this.tokenCache[client_id].token;
        }

        // 3. Request new token from Bradesco
        try {
            // NOTE: Using sandbox/generic endpoint. In PROD, use mutual TLS (MTLS) with PFX if required.
            // Bradesco API typically requires MTLS certificate for authentication.
            // This implementation assumes a standard OAuth2 flow or external proxy handling MTLS.

            const auth = Buffer.from(`${client_id}:${client_secret}`).toString('base64');

            const response = await axios.post<TokenResponse>(
                'https://proxy.api.prebanco.com.br/auth/server/v1.1/token', // Sandbox URL
                'grant_type=client_credentials',
                {
                    headers: {
                        'Authorization': `Basic ${auth}`,
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    // httpsAgent: new https.Agent({ pfx: fs.readFileSync(certificado_pfx), passphrase: ... }) // Uncomment for MTLS
                }
            );

            const { access_token, expires_in } = response.data;

            this.tokenCache[client_id] = {
                token: access_token,
                expiresAt: now + (expires_in * 1000)
            };

            return access_token;
        } catch (error: any) {
            console.error('Erro ao obter token Bradesco:', error.response?.data || error.message);
            throw new Error('Falha na autenticação com o Bradesco');
        }
    }
}
