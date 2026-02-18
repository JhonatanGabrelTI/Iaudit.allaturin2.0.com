
// Simulation of logic in MonitorHub.tsx
function determineStatus(sitInput, emitidaAsInput) {
    const sit = sitInput ? sitInput.toLowerCase() : '';
    const emitidaAs = emitidaAsInput ? emitidaAsInput.toLowerCase() : '';

    let isRegular = false;
    // Keywords for "Regular"
    // Copied exactly from MonitorHub.tsx
    const regularKeywords = ['negativa', 'regular', 'não constam', 'sem pendências', 'em vigor'];

    if (regularKeywords.some(k => sit.includes(k) || emitidaAs.includes(k))) {
        isRegular = true;
    }

    // CRITICAL FIX: "Irregular" contains "regular", so we must explicitly exclude it.
    if (sit.includes('irregular') || emitidaAs.includes('irregular')) {
        isRegular = false;
    }

    // Specific override for "Positiva com efeitos de Negativa" -> Regular
    if (sit.includes('positiva') && sit.includes('efeitos de negativa')) {
        isRegular = true;
    }

    // Logic: Positive = Good = Regular
    // Bad = Irregular = Negative
    const situacao = isRegular ? 'positiva' : 'negativa';
    return { isRegular, situacao, display: situacao === 'positiva' ? '🟢 Regular' : '🔴 Irregular' };
}

const testCases = [
    { type: 'CND Federal', scenario: 'Good - Certidão Negativa', sit: 'Certidão Negativa de Débitos', expected: '🟢 Regular' },
    { type: 'CND Federal', scenario: 'Good - Positiva com Efeitos de Negativa', sit: 'Certidão Positiva com Efeitos de Negativa', expected: '🟢 Regular' },
    { type: 'CND Federal', scenario: 'Bad - Com Pendências', sit: 'Com Pendências', expected: '🔴 Irregular' },
    { type: 'CND Federal', scenario: 'Bad - Constam Débitos', sit: 'Constam débitos relativos a...', expected: '🔴 Irregular' },

    { type: 'CND Estadual', scenario: 'Good - Negativa', sit: 'Certidão Negativa', expected: '🟢 Regular' },
    { type: 'CND Estadual', scenario: 'Bad - Positiva', sit: 'Certidão Positiva', expected: '🔴 Irregular' },
    { type: 'CND Estadual', scenario: 'Good - Não Constam', sit: 'Não constam débitos', expected: '🟢 Regular' },

    { type: 'FGTS', scenario: 'Good - Regular', sit: 'Regular', expected: '🟢 Regular' },
    { type: 'FGTS', scenario: 'Bad - Irregular', sit: 'Irregular', expected: '🔴 Irregular' },
    { type: 'FGTS', scenario: 'Bad - Não Cadastrado', sit: 'Não Cadastrado', expected: '🔴 Irregular' }, // Assume bad context? Or maybe logic needs update
    { type: 'FGTS', scenario: 'Good - Em Vigor', sit: 'Certificado em Vigor', expected: '🟢 Regular' },
];

console.log('--- Starting Verification ---');
let errors = 0;
testCases.forEach(test => {
    const result = determineStatus(test.sit, '');
    const pass = result.display === test.expected;
    console.log(`[${test.type}] ${test.scenario}`);
    console.log(`   Input: "${test.sit}"`);
    console.log(`   Result: ${result.display} | Expected: ${test.expected} -> ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (!pass) errors++;
});

console.log(`\nTotal Errors: ${errors}`);
