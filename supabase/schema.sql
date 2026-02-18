-- ============================================
-- IAudit v1.0 - Schema Completo
-- ============================================

-- TABELA DE USUÁRIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  empresa VARCHAR(255),
  cnpj VARCHAR(18),
  telefone VARCHAR(20),
  perfil VARCHAR(20) DEFAULT 'operador' CHECK (perfil IN ('admin', 'operador')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE CLIENTES (empresas gerenciadas)
CREATE TABLE IF NOT EXISTS clientes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  
  -- Dados cadastrais
  razao_social VARCHAR(255) NOT NULL,
  nome_fantasia VARCHAR(255),
  cnpj VARCHAR(18) NOT NULL,
  cpf VARCHAR(14),
  inscricao_estadual_pr VARCHAR(20),
  email VARCHAR(255),
  telefone VARCHAR(20),
  whatsapp VARCHAR(20),
  regime_tributario VARCHAR(50),
  certificado_digital_validade DATE,
  procuracao_ecac_validade DATE,
  
  -- Configuração de agendamento
  periodicidade VARCHAR(20) DEFAULT 'quinzenal' CHECK (periodicidade IN ('diario', 'semanal', 'quinzenal', 'mensal')),
  dia_semana INTEGER,          -- 0=domingo..6=sábado (se semanal)
  dia_mes INTEGER,             -- 1-31 (se mensal)
  horario TIME DEFAULT '08:00:00',
  
  -- Controle
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_cnpj ON clientes(cnpj);
CREATE INDEX IF NOT EXISTS idx_clientes_ativo ON clientes(ativo);
CREATE INDEX IF NOT EXISTS idx_clientes_user ON clientes(user_id);

-- TABELA DE CONSULTAS
CREATE TABLE IF NOT EXISTS consultas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE NOT NULL,

  -- Tipo e status
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('cnd_federal', 'cnd_estadual', 'fgts', 'pgdas', 'dctfw')),
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'erro')),

  -- Resultado
  situacao VARCHAR(20) CHECK (situacao IN ('positiva', 'negativa', 'atualizando', 'erro')),
  resultado JSONB,
  pdf_url TEXT,
  mensagem_erro TEXT,
  data_validade DATE,

  -- Datas
  data_agendamento TIMESTAMP WITH TIME ZONE,
  data_execucao TIMESTAMP WITH TIME ZONE,

  -- Retry
  tentativas INTEGER DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultas_empresa ON consultas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_tipo_status ON consultas(tipo, status);
CREATE INDEX IF NOT EXISTS idx_consultas_data ON consultas(data_execucao);

-- TABELA DE LOGS DE EXECUÇÃO
CREATE TABLE IF NOT EXISTS logs_execucao (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id UUID REFERENCES consultas(id) ON DELETE CASCADE,
  nivel VARCHAR(10) CHECK (nivel IN ('info', 'aviso', 'erro')),
  mensagem TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_logs_consulta ON logs_execucao(consulta_id);

-- TABELA DE TAREFAS
CREATE TABLE IF NOT EXISTS tarefas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES usuarios(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES clientes(id) ON DELETE CASCADE,
  titulo VARCHAR(255) NOT NULL,
  descricao TEXT,
  responsavel VARCHAR(255) NOT NULL,
  departamento VARCHAR(100) NOT NULL,
  prazo DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluida', 'atrasada')),
  prioridade VARCHAR(20) DEFAULT 'media' CHECK (prioridade IN ('baixa', 'media', 'alta')),
  auto_concluir BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- TABELA DE NOTIFICAÇÕES ENVIADAS
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

CREATE INDEX IF NOT EXISTS idx_notificacoes_cliente ON notificacoes(cliente_id);

-- ============================================
-- POLÍTICAS RLS
-- ============================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultas ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE logs_execucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificacoes ENABLE ROW LEVEL SECURITY;

-- Usuarios
CREATE POLICY "Permitir cadastro" ON usuarios FOR INSERT WITH CHECK (true);
CREATE POLICY "Ver proprio" ON usuarios FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Atualizar proprio" ON usuarios FOR UPDATE USING (auth.uid() = id);

-- Clientes
CREATE POLICY "Ver clientes" ON clientes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar clientes" ON clientes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar clientes" ON clientes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar clientes" ON clientes FOR DELETE USING (auth.uid() = user_id);

-- Consultas
CREATE POLICY "Ver consultas" ON consultas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar consultas" ON consultas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar consultas" ON consultas FOR UPDATE USING (auth.uid() = user_id);

-- Tarefas
CREATE POLICY "Ver tarefas" ON tarefas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar tarefas" ON tarefas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar tarefas" ON tarefas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Deletar tarefas" ON tarefas FOR DELETE USING (auth.uid() = user_id);

-- Logs
CREATE POLICY "Ver logs" ON logs_execucao FOR SELECT USING (
  EXISTS (SELECT 1 FROM consultas c WHERE c.id = consulta_id AND c.user_id = auth.uid())
);
CREATE POLICY "Criar logs" ON logs_execucao FOR INSERT WITH CHECK (true);

-- Notificações
CREATE POLICY "Ver notificacoes" ON notificacoes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Criar notificacoes" ON notificacoes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Atualizar notificacoes" ON notificacoes FOR UPDATE USING (auth.uid() = user_id);
