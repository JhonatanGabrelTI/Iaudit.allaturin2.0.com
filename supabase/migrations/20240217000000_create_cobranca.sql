-- Create configuracoes_cobranca table
CREATE TABLE IF NOT EXISTS configuracoes_cobranca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE, -- Optional link to internal client/tenant
  
  -- Bradesco OAuth Credentials
  client_id TEXT NOT NULL,
  client_secret TEXT NOT NULL,
  certificado_pfx TEXT, -- Path or Base64
  certificado_senha TEXT,
  
  -- Banking Details
  agencia TEXT NOT NULL,
  conta TEXT NOT NULL,
  carteira TEXT NOT NULL DEFAULT '09',
  negociacao TEXT NOT NULL, -- 18 digits usually
  
  -- Business Rules
  juros_percentual NUMERIC(5,2) DEFAULT 0.00,
  multa_percentual NUMERIC(5,2) DEFAULT 0.00,
  dias_protesto INTEGER DEFAULT 0, -- 0 = No protest
  dias_baixa_automatica INTEGER DEFAULT 0,
  
  -- Notification Templates
  template_mensagem_wpp TEXT,
  template_email TEXT
);

-- Create boletos table
CREATE TABLE IF NOT EXISTS boletos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  configuracao_id UUID REFERENCES configuracoes_cobranca(id),
  cliente_id UUID REFERENCES clientes(id), -- The payer (can be null if external)
  
  -- Boleto Details
  nosso_numero TEXT NOT NULL, -- Bank's unique ID
  seu_numero TEXT NOT NULL, -- Internal unique ID
  valor NUMERIC(10,2) NOT NULL,
  data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
  data_vencimento DATE NOT NULL,
  
  -- Payer Snapshot (Historical data integrity)
  pagador_nome TEXT NOT NULL,
  pagador_doc TEXT NOT NULL, -- CPF/CNPJ
  pagador_endereco TEXT,
  pagador_cidade TEXT,
  pagador_uf TEXT,
  pagador_cep TEXT,
  
  -- Status & Bank Data
  status TEXT NOT NULL CHECK (status IN ('PENDENTE', 'REGISTRADO', 'PAGO', 'BAIXADO', 'PROTESTADO', 'ERRO')),
  linha_digitavel TEXT,
  codigo_barras TEXT,
  url_pdf TEXT,
  qr_code_pix TEXT, -- If available
  
  -- Transaction & Audit
  tx_id TEXT, -- Bank transaction ID
  json_retorno JSONB, -- Full API response
  metadata JSONB DEFAULT '{}'::jsonb -- Logs, webhooks history
);

-- Create webhooks_recebidos table for audit
CREATE TABLE IF NOT EXISTS webhooks_recebidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at TIMESTAMPTZ DEFAULT NOW(),
  payload JSONB NOT NULL,
  processado BOOLEAN DEFAULT FALSE,
  erro_processamento TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_boletos_nosso_numero ON boletos(nosso_numero);
CREATE INDEX IF NOT EXISTS idx_boletos_seu_numero ON boletos(seu_numero);
CREATE INDEX IF NOT EXISTS idx_boletos_status ON boletos(status);
CREATE INDEX IF NOT EXISTS idx_boletos_vencimento ON boletos(data_vencimento);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_configuracoes_cobranca_updated_at
    BEFORE UPDATE ON configuracoes_cobranca
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boletos_updated_at
    BEFORE UPDATE ON boletos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
