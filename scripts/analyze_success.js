import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function analyzeSuccess() {
    console.log('Fetching successful consultations (status=concluido)...');

    // Fetch last 10 successful ones
    const { data: consultas, error } = await supabase
        .from('consultas')
        .select(`
            id,
            created_at,
            status,
            situacao,
            resultado,
            cliente:clientes(razao_social)
        `)
        .eq('status', 'concluido')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${consultas.length} successful records.\n`);

    for (const c of consultas) {
        const rawRes = c.resultado?.data?.[0] || {};
        const situacaoText = rawRes.situacao || rawRes.certidao || 'N/A';
        console.log(`[${c.situacao.toUpperCase()}] Client: ${c.cliente?.razao_social}`);
        console.log(`   API Text: "${situacaoText}"`);
        console.log('---------------------------------------------------');
    }
}

analyzeSuccess();
