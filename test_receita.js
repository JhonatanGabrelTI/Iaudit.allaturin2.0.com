
import axios from 'axios';

const token = 'sntc-QB4cRyQ19y-VgLlBZSwh_41YupJFE9g_-Ye'; // From .env
const cnpj = '20546887000125'; // master f
const url = 'https://api.infosimples.com/api/v2/consultas/receita-federal/pgfn/nova';

console.log(`Testing API: ${url}`);
console.log(`CNPJ: ${cnpj}`);

axios.post(url, {
    token,
    cnpj
}, { timeout: 60000 })
    .then(res => {
        console.log('Status Code:', res.status);
        if (res.data.data && res.data.data.length > 0) {
            const d = res.data.data[0];
            console.log('--- RESULT ---');
            console.log('Situacao:', d.situacao);
            console.log('Validade:', d.validade);
            console.log('Site Receipt:', d.site_receipt);
            console.log('Code:', res.data.code);
            console.log('Message:', res.data.code_message);
        } else {
            console.log('No data returned or empty data array.');
            console.log('Full Response:', JSON.stringify(res.data, null, 2));
        }
    })
    .catch(err => {
        console.error('Error:', err.message);
        if (err.response) {
            console.error('Response Data:', JSON.stringify(err.response.data, null, 2));
        }
    });
