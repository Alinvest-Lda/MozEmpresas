# MozEmpresas — Plano de execução após varredura (2026-11-02)

## Referência de execução

Documento de base: **“MozEmpresas — Varredura do repositório, fases seguintes e especificação do Super Admin”**, revisão estática de 02/11/2026.

Repositório: `Alinvest-Lda/MozEmpresas`, branch `main`.

## Regras de execução

1. Segurança, integridade e evidência precedem novos módulos.
2. Não declarar uma fase concluída sem testes reproduzíveis e estado documentado.
3. Não alterar o esquema activo por tentativa enquanto o ledger e os ficheiros de migração não estiverem reconciliados.
4. Não revogar funções `SECURITY DEFINER` em lote: cada função exige análise do contrato e dos consumidores.
5. Não activar pagamentos, créditos, campanhas ou permissões administrativas sem transição validada e registo auditável.
6. Manter o produto sem o módulo de Concursos.
7. Preservar a regra aprovada de parceiros: um utilizador só pode ter uma associação activa a uma organização parceira.

## Estado verificado em 02/11/2026

### Repositório e CI

- Último commit de referência antes desta execução: `2c6778a141bbb1a105cc00b0d23ac4890be93595`.
- A execução desta etapa acrescentou:
  - `app/loading.tsx`
  - `app/error.tsx`
  - `app/global-error.tsx`
  - `app/not-found.tsx`
  - `lib/observability/logger.ts`
- Estes estados são uma primeira cobertura global de carregamento, erro e rota inexistente; não substituem os estados específicos de cada página.
- A validação Vercel do commit `8ec7763f8a995f7c13f22839d5659b919e3fa901` estava pendente no momento desta actualização. Não declarar build ou deploy concluído até confirmação.

### Supabase activo

- Project ref: `zikjvjzbbfzrelbkaaci`; estado observado: `ACTIVE_HEALTHY`; PostgreSQL 17.6.
- Ledger activo: **68 migrações**, última versão `20261101111659`.
- Ficheiros SQL no repositório: **57**.
- A divergência de 11 entradas permanece por reconciliar. As versões/nomenclaturas não podem ser alinhadas por aproximação.
- A migração `20261101111659_harden_partner_account_memberships` está no repositório e no ledger activo.
- Não foi criada branch Supabase de staging. Não executar novas migrações de plataforma até exportar/reconciliar o esquema e estabelecer um caminho seguro de validação.

### Advisor de segurança observado

- 4 tabelas com RLS activo sem políticas: `contact_messages`, `partner_account_members`, `partner_accounts`, `public_rate_limits`.
- 4 funções `SECURITY DEFINER` executáveis por `anon`: `get_ad_decision`, `home_ad_slots`, `partner_access_validate`, `record_ad_interest`.
- 21 funções `SECURITY DEFINER` executáveis por `authenticated`; analisar uma a uma, considerando função, assinatura, consumidor, grants e necessidade de exposição.
- Estes alertas não autorizam revogações automáticas: algumas funções podem ser necessárias para fluxos públicos ou autenticados, mas o contrato deve ser comprovado.

## Sequência de execução

### Fase 0 — Gates de segurança e prova (BLOQUEADORA)

1. Exportar o esquema activo.
2. Reconciliar as 68 entradas do ledger com os 57 ficheiros SQL do repositório, identificando migrações aplicadas sem ficheiro, baselines e divergências de nomenclatura.
3. Criar/definir um ambiente isolado de integração PostgreSQL e estratégia de staging compatível com o custo operacional.
4. Rever individualmente as funções `SECURITY DEFINER` e as tabelas RLS sem políticas.
5. Integrar testes PostgreSQL reais para isolamento entre empresas, parceiros e papéis de plataforma.
6. Introduzir logging estruturado e estados globais de carregamento/erro/404; expandir depois para estados por rota.
7. Saída obrigatória: CI de integração SQL/RLS verde e checklist de smoke test ligada a um commit.

### Fase 1 — Fundação de design e shells

Só iniciar a migração visual estrutural depois dos gates essenciais da Fase 0.

- Centralizar tokens em `app/styles/tokens.css`.
- Introduzir camadas CSS e Stylelint; impedir novos hex fora dos tokens e novos `!important`.
- Criar `components/ui/` com os primitivos definidos no documento de varredura.
- Criar `AdminShell` próprio e extrair shells partilhados sem regressões.
- Normalizar vocabulário para português moçambicano.
- Rever responsividade, foco, diálogos, gavetas e estados acessíveis.

### Fase 2 — Super Admin como plano de controlo

- Criar `admin_audit_log`, `platform_permissions` e `has_platform_permission()` depois da reconciliação e validação SQL.
- Implementar `requireAdmin` e `adminMutation()` com autorização, Zod, transições, actualização condicional, auditoria, notificação e revalidação.
- Migrar todas as mutações administrativas para o contrato central.
- Criar RBAC para `operator`, `admin` e `super_admin`; a navegação deve mostrar apenas capacidades autorizadas.
- Implementar caixa de trabalho, gestão de utilizadores, moderação com motivo e visualizador de auditoria.
- Testar permissões negativas, transições inválidas, concorrência e falhas de auditoria.

### Fases seguintes

- **Fase 3:** pedidos financeiros, créditos, pagamentos, catálogo, preços, planos e inventário publicitário.
- **Fase 4:** convites de parceiros vinculados a `account_id`, claim atómico e isolamento por conta.
- **Fase 5:** marketplace, serviços e notificações por evento.
- **Fase 6:** WCAG 2.2 AA, desempenho, mobile-first e piloto controlado.

## Critério de conclusão

Cada módulo só pode ser marcado como concluído quando tiver: esquema validado, regras de negócio, autorização/RLS, acções seguras, UI, estados de carregamento/vazio/erro/sucesso, testes, acessibilidade e documentação baseada em evidência.
