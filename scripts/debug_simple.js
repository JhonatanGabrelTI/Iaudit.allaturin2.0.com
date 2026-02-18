import axios from 'axios';

const TOKEN = 'sntc-QB4cRyQ19y-VgLlBZSwh_41YupJFE9g_-Ye';
const CNPJ_APPLE = '05718417000108';

async function testSimple() {
    console.log(`Token Ends: ...${TOKEN.slice(-4)}`);

    // FGTS
    try {
        const res = await axios.post(
            'https://api.infosimples.com/api/v2/consultas/caixa/regularidade',
            { token: TOKEN, cnpj: CNPJ_APPLE, timeout: 5000 } // Increased timeout
        );
        console.log(`FGTS: ${res.data.code} - ${res.data.message || 'OK'}`);
    } catch (e) {
        console.log(`FGTS Error: ${e.response?.data?.code || e.code} - ${e.response?.data?.message || e.message}`);
    }

    // Estadual PR
    try {
        const res = await axios.post(
            'https://api.infosimples.com/api/v2/consultas/sefaz/pr/certidao-debitos',
            { token: TOKEN, cnpj: CNPJ_APPLE, timeout: 5000 }
        );
        console.log(`Estadual: ${res.data.code} - ${res.data.message || 'OK'}`);
    } catch (e) {
        console.log(`Estadual Error: ${e.response?.data?.code || e.code} - ${e.response?.data?.message || e.message}`);
    }
}

testSimple();
