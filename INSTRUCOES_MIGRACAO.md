# Instruções para Atualizar o Banco de Dados

O erro que você está vendo (`Could not find the 'ativo' column`) ocorre porque o código foi atualizado com novas funcionalidades, mas o banco de dados no Supabase ainda está com a estrutura antiga.

Como não tenho permissão de administrador (Service Role Key) para alterar a estrutura do banco automaticamente, você precisará executar este comando SQL manualmente no painel do Supabase.

## Passo a Passo

1. Acesse o **Dashboard do Supabase** do seu projeto.
2. No menu lateral, clique em **SQL Editor** (ícone de terminal `>_`).
3. Clique em **New query**.
4. Copie e cole TODO o código abaixo na área de texto.
5. Clique no botão **Run** (ou pressione `Ctrl+Enter`).

```sql
-- ============================================
-- ATUALIZAÇÃO DO BANCO DE DADOS (MIGRATION)
-- ============================================

-- 1. Atualizar Tabela CLIENTES
DO $$
BEGIN
    -- Adicionar coluna 'ativo'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'ativo') THEN
        ALTER TABLE clientes ADD COLUMN ativo BOOLEAN DEFAULT true;
    END IF;

    -- Adicionar coluna 'inscricao_estadual_pr'
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'inscricao_estadual_pr') THEN
        ALTER TABLE clientes ADD COLUMN inscricao_estadual_pr VARCHAR(20);
    END IF;

    -- Adicionar whatsapp
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'whatsapp') THEN
        ALTER TABLE clientes ADD COLUMN whatsapp VARCHAR(20);
    END IF;

    -- Adicionar novas colunas de agendamento
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'periodicidade') THEN
        ALTER TABLE clientes ADD COLUMN periodicidade VARCHAR(20) DEFAULT 'quinzenal';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'dia_semana') THEN
        ALTER TABLE clientes ADD COLUMN dia_semana INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'dia_mes') THEN
        ALTER TABLE clientes ADD COLUMN dia_mes INTEGER;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'clientes' AND column_name = 'horario') THEN
        ALTER TABLE clientes ADD COLUMN horario TIME DEFAULT '08:00:00';
    END IF;
END $$;

-- 2. Atualizar Tabela CONSULTAS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'situacao') THEN
        ALTER TABLE consultas ADD COLUMN situacao VARCHAR(20) CHECK (situacao IN ('positiva', 'negativa', 'atualizando', 'erro'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'pdf_url') THEN
        ALTER TABLE consultas ADD COLUMN pdf_url TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'mensagem_erro') THEN
        ALTER TABLE consultas ADD COLUMN mensagem_erro TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'data_validade') THEN
        ALTER TABLE consultas ADD COLUMN data_validade DATE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'consultas' AND column_name = 'tentativas') THEN
        ALTER TABLE consultas ADD COLUMN tentativas INTEGER DEFAULT 0;
    END IF;
END $$;

-- 3. Criar Tabela LOGS_EXECUCAO
CREATE TABLE IF NOT EXISTS logs_execucao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
  nivel VARCHAR(10) CHECK (nivel IN ('info', 'aviso', 'erro')),
  mensagem TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para logs
ALTER TABLE logs_execucao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver logs" ON logs_execucao;
CREATE POLICY "Ver logs" ON logs_execucao FOR SELECT USING (true);
DROP POLICY IF EXISTS "Criar logs" ON logs_execucao; 
CREATE POLICY "Criar logs" ON logs_execucao FOR INSERT WITH CHECK (true);

-- 4. Criar Tabela NOTIFICACOES
CREATE TABLE IF NOT EXISTS notificacoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
  canal VARCHAR(20) NOT NULL CHECK (canal IN ('email', 'whatsapp', 'sistema')),
  tipo VARCHAR(50) NOT NULL,
  mensagem TEXT NOT NULL,
  destinatario VARCHAR(255),
  enviado BOOLEAN DEFAULT false,
  lido BOOLEAN DEFAULT false,
  data_envio TIMESTAMP WITH TIME ZONE,
  data_leitura TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para notificacoes
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Ver notificacoes" ON notificacoes;
CREATE POLICY "Ver notificacoes" ON notificacoes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Criar notificacoes" ON notificacoes;
CREATE POLICY "Criar notificacoes" ON notificacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Atualizar notificacoes" ON notificacoes;
CREATE POLICY "Atualizar notificacoes" ON notificacoes FOR UPDATE USING (auth.uid() = user_id);
```

Após executar este comando e ver a mensagem "Success", volte ao IAudit e tente criar o cliente novamente. O erro deve desaparecer.
