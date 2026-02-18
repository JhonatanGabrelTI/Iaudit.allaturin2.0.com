const TOKEN = 'sntc-QB4cRyQ19y-VgLlBZSwh_41YupJFE9g_-Ye';
const CNPJ = '20.546.887/0001-25';

async function run() {
    try {
        const response = await fetch('https://api.infosimples.com/api/v2/consultas/receita-federal/pgfn/nova', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: TOKEN,
                cnpj: CNPJ.replace(/\D/g, '')
            })
        });

        const data = await response.json();
        console.log('CODE:', data.code);
        if (data.data && data.data[0]) {
            console.log('KEYS:', Object.keys(data.data[0]).join(', '));
            const s = JSON.stringify(data.data[0]);
            console.log('FULL:', s.substring(0, 500));
        } else {
            console.log('NO DATA');
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}

run();
