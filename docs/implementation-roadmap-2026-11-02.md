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
- O responsável do projecto confirmou que o deploy passou após esta actualização. O estado de produção deve continuar a ser confirmado pelo painel Vercel em cada nova entrega.

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


## Actualização pós-deploy — 02/11/2026

O deploy foi confirmado pelo responsável do projecto. A revisão read-only de segurança e migrações foi registada em `docs/security-and-migration-review-2026-11-02.md`.

Estado actual da reconciliação:
- 68 migrações no ledger activo.
- 57 ficheiros SQL no repositório.
- 33 correspondências exactas por nome.
- 35 entradas do ledger sem ficheiro com o mesmo nome e 24 ficheiros sem entrada com o mesmo nome. Estes números representam divergência de nomenclatura/histórico, não migrações comprovadamente em falta.
- As quatro tabelas RLS sem policies têm grants apenas para `postgres` e `service_role`; não foi demonstrado acesso directo por `anon` ou `authenticated`.
- As quatro funções SECURITY DEFINER acessíveis por `anon` foram classificadas como endpoints públicos/pré-autenticação com contratos distintos; a revisão aprofundada de validação, limites e consumidores continua pendente.
- Não foram feitas alterações DDL ou de grants à produção.

Próximo gate: obter snapshot nativo do esquema activo e concluir comparação por objecto; em paralelo, preparar testes SQL/RLS reproduzíveis num PostgreSQL isolado. O desenvolvimento do Super Admin que dependa de novas tabelas, funções ou policies continua bloqueado até estes gates passarem.


## Decisão de execução — continuação em 02/11/2026

Por decisão do responsável do projecto, a reconciliação detalhada da Fase 0 fica suspensa temporariamente. A aplicação está operacional e a fundação visual pode avançar sem DDL, alterações de grants ou dependências novas no esquema activo. Os pontos de segurança/migrações permanecem documentados e não são declarados resolvidos.

### Fase 1 — em implementação

- Centralização dos tokens visuais e tipográficos em `app/styles/tokens.css`, mantendo aliases para reduzir risco de regressão.
- Carregamento da fonte Inter via `next/font`.
- Camadas CSS declaradas e Stylelint limitado aos novos ficheiros da fundação, sem impor uma migração global abrupta sobre o CSS legado.
- Biblioteca inicial `components/ui` com controlos, estados, tabela, separadores, diálogos/gavetas e paginação.
- Concha própria do Super Admin, sem alterar o modelo de autenticação nem as rotas funcionais existentes.
- Página interna de referência em `/dashboard/admin/design-system`.
- A migração integral dos shells público, empresarial e parceiro continuará gradual, depois de validar a nova fundação.


### Continuação da Fase 1 — consolidação visual (02/11/2026)

- Centralizada a paleta actualmente usada pelo Super Admin em tokens CSS, preservando os valores visuais existentes para evitar alterações de aparência não intencionais.
- Migrados os estilos das páginas de empresas e utilizadores, bem como do painel analítico, para consumir os tokens partilhados em vez de declarar cores hexadecimais localmente.
- Os ficheiros de módulos CSS migrados já não contêm cores hexadecimais; os estilos globais da fundação também foram convertidos para notação RGB para cumprir `color-no-hex`.
- A lógica de consultas, filtros, moderação e permissões destas páginas não foi alterada. Nenhuma alteração foi feita ao Supabase.
- Commits desta tranche: `b309017`, `17fecb6`, `52d497a`, `d4cb36f`.
- Validação pendente: confirmar o resultado dos deployments Vercel gerados por estes commits e executar lint/build automatizados; não marcar a Fase 1 como concluída antes dessa verificação.

- As páginas de empresas e utilizadores passaram também a consumir os controlos partilhados `Input` e `Select`, mantendo os filtros GET e os formulários de moderação existentes.
- Commits adicionais: `a8d5ada`, `183562f`.


### Consolidação dos módulos operacionais do Super Admin — 02/11/2026

- Migrada a paleta dos módulos Oportunidades, Publicidade e Suporte para tokens partilhados em `app/styles/tokens.css`, preservando os valores de cor existentes.
- As páginas passaram a utilizar os componentes comuns `Input` e `Select` nos filtros e controlos de estado. Os campos ocultos e a caixa de resposta do suporte mantêm os elementos nativos adequados às suas funções.
- Preservados os filtros GET, paginação, acções de moderação, estados, respostas aos tickets e consultas Supabase. Não foram alteradas acções de servidor, tabelas, políticas, permissões ou dados.
- Ficheiros CSS migrados: `oportunidades.module.css`, `publicidade.module.css` e `suporte.module.css`.
- Commits desta tranche: `be4c23c`, `45c8ef0`, `3f1ebe7`, `863eec3`, `5802c28`, `9a6fa13`, `e6c5011`.
- Validação de produção pendente para esta tranche; confirmar o deployment da sequência final de commits antes de declarar a migração concluída.

- A página Central de monetização também passou a consumir tokens de cor partilhados; o layout, os indicadores e as consultas existentes foram preservados. Não foram adicionados formulários ou acções novas, nem alterados dados. Commits: `63a0d36`, `d1b0063`.


### Visão geral do Super Admin — correcção de datas (02/11/2026)

- A agregação diária do painel analítico passou a usar explicitamente o fuso horário `Africa/Maputo` para gerar as chaves e os rótulos dos 14 dias.
- O limite inicial da consulta foi ajustado para incluir o dia de calendário completo em Moçambique, em vez de começar exactamente 13 períodos de 24 horas antes do momento do carregamento.
- O texto de apoio do gráfico esclarece que a série representa novos registos e não utilizadores activos nem visitas.
- Não foram alteradas consultas de totais, tabelas, políticas, permissões ou dados. Nenhuma alteração foi feita ao Supabase.
- Commit: `8d39df6`.
- Validação de produção e build pendentes; não marcar a correcção como concluída antes da confirmação do deployment.
