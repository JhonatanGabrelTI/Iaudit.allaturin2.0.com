-- ============================================
-- CORREÇÃO DE PERMISSÕES (Apagar Histórico)
-- ============================================

-- Habilitar a deleção de consultas para o próprio usuário
DROP POLICY IF EXISTS "Deletar consultas" ON consultas;
CREATE POLICY "Deletar consultas" ON consultas FOR DELETE USING (auth.uid() = user_id);

-- Se precisar apagar logs também quando apagar consultas (Cascade já faz isso, mas garantindo permissão)
DROP POLICY IF EXISTS "Deletar logs" ON logs_execucao;
CREATE POLICY "Deletar logs" ON logs_execucao FOR DELETE USING (
  EXISTS (SELECT 1 FROM consultas c WHERE c.id = consulta_id AND c.user_id = auth.uid())
);
