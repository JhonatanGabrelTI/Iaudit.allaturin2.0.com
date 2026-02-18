import puppeteer from 'puppeteer';

export class PDFGenerator {
    static async generateBoletoPDF(htmlContent: string): Promise<Buffer> {
        const browser = await puppeteer.launch({
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        try {
            const page = await browser.newPage();
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
                margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' }
            });

            return pdfBuffer;
        } finally {
            await browser.close();
        }
    }

    // Placeholder for HTML template generation
    // In a real scenario, use Handlebars or EJS with the boleto data
    static getBoletoTemplate(data: any): string {
        return `
      <html>
        <body>
          <h1>Boleto Bancário</h1>
          <p>Nosso Número: ${data.nosso_numero}</p>
          <p>Valor: R$ ${data.valor}</p>
          <p>Linha Digitável: ${data.linha_digitavel}</p>
          <!-- Add full FEBRABAN layout here -->
        </body>
      </html>
    `;
    }
}
