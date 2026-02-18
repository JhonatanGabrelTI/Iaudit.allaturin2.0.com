# iAudit Backend - Módulo de Cobrança (Bradesco)

Este módulo é responsável pela integração segura com a API do Banco Bradesco, geração de boletos e processamento em background.

## Estrutura

- `src/config`: Configurações de banco de dados e variáveis de ambiente.
- `src/controllers`: Endpoints da API REST.
- `src/services`: Lógica de negócios (Auth Bradesco, Boletos).
- `src/jobs`: Tarefas agendadas (Conciliação, Notificações).
- `src/utils`: Utilitários (Gerador de PDF, etc).

## Configuração

1.  Copie o arquivo de exemplo:
    ```bash
    cp .env.example .env
    ```
2.  Configure as variáveis no `.env`:
    - `DATABASE_URL`: URL de conexão com o Supabase (PostgreSQL).
    - `PORT`: Porta do servidor (padrão 3001).

## Instalação e Execução

1.  Instale as dependências:
    ```bash
    npm install
    ```

2.  Para desenvolvimento (com hot-reload):
    ```bash
    npm run dev
    ```

3.  Para produção (build e start):
    ```bash
    npm run build
    npm start
    ```

## Banco de Dados

Certifique-se de aplicar a migration SQL no Supabase:
- `supabase/migrations/20240217000000_create_cobranca.sql`

## API Endpoints

- `POST /api/boletos`: Registrar novo boleto.
- `POST /api/webhooks/bradesco`: Receber notificações do banco.
