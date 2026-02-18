import axios from 'axios';

const TOKEN = 'sntc-QB4cRyQ19y-VgLlBZSwh_41YupJFE9g_-Ye';
const CNPJ_TEST = '05718417000108'; // Apple

async function testToken() {
    console.log(`Testing Token: ${TOKEN}`);
    console.log('Endpoint: Receita Federal PGFN');

    try {
        const response = await axios.post(
            'https://api.infosimples.com/api/v2/consultas/receita-federal/pgfn/nova',
            {
                token: TOKEN,
                cnpj: CNPJ_TEST,
                timeout: 600
            },
            { timeout: 10000 }
        );

        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        if (axios.isAxiosError(error)) {
            console.error('API Error Status:', error.response?.status);
            console.error('API Error Data:', JSON.stringify(error.response?.data, null, 2));
        } else {
            console.error('Error:', error.message);
        }
    }
}

testToken();
