// Verification Script for CND Status Logic (Standard: Negativa=Good)

// Mock Data from InfoSimples
const cases = [
    { input: 'Constam débitos (teste)', expected_db: 'positiva', expected_ui: 'IRREGULAR (RED)' },
    { input: 'CERTIDÃO NEGATIVA DE DÉBITOS', expected_db: 'negativa', expected_ui: 'REGULAR (GREEN)' },
    { input: 'CERTIDÃO POSITIVA COM EFEITOS DE NEGATIVA', expected_db: 'negativa', expected_ui: 'REGULAR (GREEN)' },
    { input: 'SITUAÇÃO IRREGULAR', expected_db: 'positiva', expected_ui: 'IRREGULAR (RED)' },
    { input: 'REGULAR', expected_db: 'negativa', expected_ui: 'REGULAR (GREEN)' },
];

function determineStatus(sitInput, emittedAsInput) {
    const sit = sitInput ? sitInput.toLowerCase() : '';
    const emittedAs = emittedAsInput ? emittedAsInput.toLowerCase() : '';

    let isRegular = false;
    const regularKeywords = ['negativa', 'regular', 'não constam', 'sem pendências', 'em vigor'];

    if (regularKeywords.some(k => sit.includes(k) || emittedAs.includes(k))) {
        isRegular = true;
    }

    if (sit.includes('irregular') || emittedAs.includes('irregular')) {
        isRegular = false;
    }

    if (sit.includes('positiva') && sit.includes('efeitos de negativa')) {
        isRegular = true;
    }

    // Standard Mapping: Negativa = Good
    const finalSituacao = isRegular ? 'negativa' : 'positiva';

    // UI Logic
    let uiStatus = 'UNKNOWN';
    if (finalSituacao === 'negativa') uiStatus = 'REGULAR (GREEN)';
    else if (finalSituacao === 'positiva') uiStatus = 'IRREGULAR (RED)';

    return { isRegular, finalSituacao, uiStatus };
}

console.log('--- TESTING CND LOGIC (REVERTED TO STANDARD) ---');
let failed = false;
cases.forEach((c, i) => {
    const res = determineStatus(c.input, '');
    const pass = res.finalSituacao === c.expected_db;
    console.log(`[${i + 1}] Input: "${c.input}"`);
    console.log(`    Result: ${res.finalSituacao} (UI: ${res.uiStatus})`);
    console.log(`    Status: ${pass ? 'PASSED ✅' : 'FAILED ❌'}`);
    if (!pass) failed = true;
    console.log('---');
});

if (failed) process.exit(1);
