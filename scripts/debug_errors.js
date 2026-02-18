import axios from 'axios';

const TOKEN = 'sntc-QB4cRyQ19y-VgLlBZSwh_41YupJFE9g_-Ye';
const CNPJ_APPLE = '05718417000108';

async function testEndpoints() {
    console.log(`Testing with Token: ...${TOKEN.slice(-4)}\n`);

    // 1. Test FGTS (Should go to Caixa)
    console.log('--- Testing FGTS ---');
    try {
        const res = await axios.post(
            'https://api.infosimples.com/api/v2/consultas/caixa/regularidade',
            { token: TOKEN, cnpj: CNPJ_APPLE, timeout: 600 }
        );
        console.log('FGTS Status:', res.data.code, res.data.message);
        if (res.data.code !== 200) console.log('FGTS Data:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('FGTS Error:', e.response?.status, e.response?.data);
    }

    // 2. Test Estadual PR (Requires IE?)
    console.log('\n--- Testing CND Estadual (PR) ---');
    try {
        const res = await axios.post(
            'https://api.infosimples.com/api/v2/consultas/sefaz/pr/certidao-debitos',
            { token: TOKEN, cnpj: CNPJ_APPLE, timeout: 600 }
        );
        console.log('Estadual Status:', res.data.code, res.data.message);
        if (res.data.code !== 200) console.log('Estadual Data:', JSON.stringify(res.data, null, 2));
    } catch (e) {
        console.log('Estadual Error:', e.response?.status, e.response?.data);
    }
}

testEndpoints();
