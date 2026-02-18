import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeResults() {
    console.log('Fetching recent consultations...');

    // Fetch last 50 consultations
    const { data: consultas, error } = await supabase
        .from('consultas')
        .select(`
            id,
            created_at,
            status,
            situacao,
            tipo,
            mensagem_erro,
            resultado,
            cliente:clientes(razao_social, cnpj)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error('Error fetching:', error);
        return;
    }

    console.log(`Found ${consultas.length} recent records.\n`);

    for (const c of consultas) {
        const clientName = c.cliente?.razao_social || 'Unknown';
        const rawRes = c.resultado?.data?.[0] || {};
        const rawSit = rawRes.situacao || rawRes.certidao || rawRes.mensagem || c.resultado?.error || 'N/A';
        const rawEmitida = rawRes.emitida_as || 'N/A';

        console.log('---------------------------------------------------');
        console.log(`Client: ${clientName} (${c.tipo})`);
        console.log(`Status DB: ${c.status} | Situacao DB: ${c.situacao}`);
        console.log(`Error Msg: ${c.mensagem_erro || 'None'}`);
        console.log(`Raw API Status: "${JSON.stringify(rawSit).substring(0, 100)}..."`);
        console.log(`Raw API EmitidaAs: "${rawEmitida}"`);

        let analysis = 'UNKNOWN';
        if (c.status === 'erro') analysis = 'API/System Error -> Defaults to Irregular';
        else if (c.situacao === 'negativa') analysis = 'Classified as Negative (Irregular)';
        else if (c.situacao === 'positiva') analysis = 'Classified as Positive (Regular)';

        console.log(`Analysis: ${analysis}`);
    }
}

analyzeResults();
