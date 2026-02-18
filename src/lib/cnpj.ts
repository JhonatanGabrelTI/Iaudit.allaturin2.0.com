/**
 * Validate a CNPJ number (Brazilian company registration)
 * Checks format and verification digits
 */
export function validarCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1+$/.test(cleaned)) return false; // all same digit

    const calc = (digits: string, weights: number[]) =>
        digits.split('').reduce((sum, d, i) => sum + parseInt(d) * weights[i], 0);

    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

    let r = calc(cleaned.substring(0, 12), w1) % 11;
    const d1 = r < 2 ? 0 : 11 - r;
    if (parseInt(cleaned.charAt(12)) !== d1) return false;

    r = calc(cleaned.substring(0, 13), w2) % 11;
    const d2 = r < 2 ? 0 : 11 - r;
    if (parseInt(cleaned.charAt(13)) !== d2) return false;

    return true;
}

/**
 * Format CNPJ: 00000000000000 -> 00.000.000/0000-00
 */
export function formatarCNPJ(cnpj: string): string {
    const c = cnpj.replace(/\D/g, '');
    if (c.length !== 14) return cnpj;
    return `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`;
}

/**
 * Mask CNPJ for display: 00.XXX.XXX/0001-XX
 */
export function mascaraCNPJ(cnpj: string): string {
    const c = cnpj.replace(/\D/g, '');
    if (c.length !== 14) return cnpj;
    return `${c.slice(0, 2)}.XXX.XXX/${c.slice(8, 12)}-XX`;
}
