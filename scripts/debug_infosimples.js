import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../.env') });

const TOKEN = process.env.VITE_INFOSIMPLES_TOKEN;

if (!TOKEN) {
    console.error('CRITICAL: VITE_INFOSIMPLES_TOKEN not found in .env');
    process.exit(1);
}

const CNPJ_APPLE = '05718417000108'; // Apple Computer Brasil

async function debugApi() {
    console.log(`Using Token: ${TOKEN.substring(0, 5)}...`);
    console.log(`Querying CND Federal for CNPJ: ${CNPJ_APPLE}...`);

    try {
        const response = await axios.post(
            'https://api.infosimples.com/api/v2/consultas/receita-federal/pgfn/nova',
            {
                token: TOKEN,
                cnpj: CNPJ_APPLE,
                timeout: 600
            },
            {
                timeout: 60000
            }
        );

        console.log('\n--- RESPONSE STATUS ---');
        console.log(response.status, response.statusText);

        console.log('\n--- RESPONSE DATA ---');
        console.log(JSON.stringify(response.data, null, 2));

        // Check our parsing logic
        console.log('\n--- PARSING LOGIC CHECK ---');
        const data = response.data;
        const code = data?.code;

        if (code && code >= 600) {
            console.log(`FAIL: Code ${code} indicating error.`);
        } else if (data?.data?.[0]) {
            console.log('SUCCESS: data.data[0] exists.');
            const item = data.data[0];
            const sit = (item.situacao || item.certidao || item.mensagem || '').toLowerCase();
            const emitida = (item.emitida_as || '').toLowerCase();
            console.log(`Situacao: "${sit}"`);
            console.log(`Emitida As: "${emitida}"`);
        } else {
            console.log('FAIL: data.data[0] is MISSING.');
        }

    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('\nAXIOS ERROR:', error.message);
            console.error('Response Data:', error.response?.data);
            console.error('Response Status:', error.response?.status);
        } else {
            console.error('\nERROR:', error);
        }
    }
}

debugApi();
