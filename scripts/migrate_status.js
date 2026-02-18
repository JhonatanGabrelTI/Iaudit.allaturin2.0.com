
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hxjcaofntfjrnosttldx.supabase.co';
const supabaseKey = 'sb_publishable_kjHXQTcZ2CxDMFskNqhKOg_08UW-PiL';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
    console.log('Starting migration...');

    // 1. Temporarily mark 'positiva' records as 'temp_regular'
    const { error: err1, count: count1 } = await supabase
        .from('consultas')
        .update({ situacao: 'temp_regular' })
        .eq('situacao', 'positiva')
        .select('', { count: 'exact' });

    if (err1) { console.error('Error step 1:', err1); return; }
    console.log(`Step 1: ${count1} 'positiva' records marked as 'temp_regular'`);

    // 2. Mark 'negativa' records as 'positiva' (Bad -> Irregular -> now mapped to 'positiva' keyword? WAIT)
    // ORIG: Negativa = Good. Positiva = Bad.
    // NEW: Positiva = Good. Negativa = Bad.
    // SO:
    // Old 'negativa' (Good) -> New 'positiva' (Good)
    // Old 'positiva' (Bad) -> New 'negativa' (Bad)

    const { error: err2, count: count2 } = await supabase
        .from('consultas')
        .update({ situacao: 'positiva' }) // Old Good -> New Good keyword
        .eq('situacao', 'negativa')
        .select('', { count: 'exact' });

    if (err2) { console.error('Error step 2:', err2); return; }
    console.log(`Step 2: ${count2} 'negativa' records updated to 'positiva'`);

    // 3. Mark 'temp_regular' (Old Bad) as 'negativa' (New Bad keyword)
    const { error: err3, count: count3 } = await supabase
        .from('consultas')
        .update({ situacao: 'negativa' })
        .eq('situacao', 'temp_regular')
        .select('', { count: 'exact' });

    if (err3) { console.error('Error step 3:', err3); return; }
    console.log(`Step 3: ${count3} 'temp_regular' records updated to 'negativa'`);

    console.log('Migration complete.');
}

migrate();
