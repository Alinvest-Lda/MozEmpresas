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


### Consolidação da fila de pedidos no painel principal — 02/11/2026

- A fila de pedidos de serviços passou a utilizar os componentes partilhados `Field`, `Select`, `Input` e `Button` no formulário de actualização de estado e orçamento.
- Foram removidos estilos inline de apresentação da secção, do aviso de resultado, do filtro de pedidos sem actualização e dos metadados do pedido; os estilos passaram para regras CSS consistentes no workspace do Super Admin.
- Mantidos a Server Action `updatePlatformServiceRequest`, os campos enviados, o redirect de sucesso/erro, os estados disponíveis e as consultas existentes.
- Não foram alterados dados, tabelas, policies, permissões ou configuração do Supabase.
- Commits: `6b002c9` e `71aea61`.
- Validação de build/deployment pendente.


### Continuação da migração dos controlos administrativos — 02/11/2026

- A página de gestão de ofertas passou a utilizar os componentes partilhados `Field`, `Input`, `Select` e `Button` nos filtros e na moderação; estilos inline foram substituídos por classes responsivas no CSS global.
- A página de acessos de parceiros passou a utilizar `Input` e `Select` no convite e no filtro de estado, preservando o botão especializado de submissão e o fluxo seguro de activação.
- Mantidos os parâmetros GET, a paginação, as Server Actions, a RPC `partner_access_list`, os estados dos convites e os dados apresentados.
- Não foram alterados o modelo de um utilizador por organização parceira, as permissões, a base de dados ou as políticas Supabase.
- Commits: `5f4857d`, `4906af4`, `9140167`.
- Validação do deployment desta tranche pendente.


### Parceiros — consolidação visual da gestão de acessos — 02/11/2026

- A paleta específica da página de acessos de parceiros foi centralizada em tokens CSS, mantendo os valores RGB equivalentes aos hexadecimais existentes.
- O formulário de convite e o filtro de estado passaram a utilizar os controlos partilhados `Input` e `Select`.
- Mantidos o convite por email, validade, RPC de listagem, estados, filtro GET, link privado de activação e botão de submissão especializado.
- Não foram alterados o fluxo de autenticação, o modelo de um utilizador por organização, as RPCs, a base de dados ou as políticas.
- Commits adicionais: `f149335`, `abe633e`.
- Validação do deployment final desta sequência pendente.


### Monetização e créditos — continuação da Fase 1 (02/11/2026)

- A página de gestão de créditos foi consolidada sob `getSuperAdminContext()`, aplicando a mesma verificação server-side de utilizador activo com papel `super_admin` usada no restante plano de controlo.
- A vista administrativa apresenta pacotes, pedidos recentes de compra, saldos das carteiras empresariais e movimentos do livro de créditos. Os limites de consulta (50 pedidos, 100 carteiras e 20 movimentos) são explicitados na interface.
- Os movimentos são consultados apenas para as carteiras listadas, evitando apresentar um histórico sem relação com os saldos mostrados.
- A página é deliberadamente read-only: não foram criadas acções de aprovação, rejeição, pagamento ou atribuição de créditos. Essas operações exigem validação do fluxo financeiro, transições permitidas e registo auditável antes de serem activadas.
- A Central de monetização passou a ligar directamente à gestão de créditos e a apresentar o número de produtos publicitários activos.
- Commits: `416e209`, `17ef6d8`, `4ea8fc7`, `066d3e8`, `7626281`.

### Shell administrativo, acessibilidade e estados de rota (02/11/2026)

- A navegação lateral passou a activar apenas a rota mais específica, evitando que a secção geral de Monetização e a subsecção Créditos apareçam simultaneamente seleccionadas.
- Melhorado o controlo da navegação móvel: rótulo do botão acompanha o estado aberto/fechado, mantendo o fecho pelo item seleccionado e pelo fundo de sobreposição.
- Adicionado link de salto para o conteúdo, foco visível consistente e suporte a preferência de movimento reduzido.
- Criados estados próprios de carregamento e erro para a área administrativa, com skeletons, tentativa de repetição e registo estruturado do erro no cliente.
- Commits: `af0557c`, `a6c5bb9`, `ae9f7f4`, `afaef7d`, `aff2189`, `52d6d1b`.
- Não foram alterados autenticação, permissões, tabelas, RLS, grants, RPCs ou dados Supabase.

### Revisão transversal da Fase 1 — estado de 02/11/2026

- Verificados os 10 principais ecrãs administrativos: visão geral, empresas, utilizadores, ofertas, oportunidades, publicidade, suporte, parceiros, monetização e créditos.
- Todos estes ecrãs apresentam tratamento de estados vazios e de erro no próprio conteúdo; os novos estados de carregamento/erro ao nível do segmento cobrem a área administrativa inteira.
- Os formulários migrados não apresentam estilos inline de layout; permanecem controlos nativos pontuais para campos ocultos, áreas de texto e botões especializados, onde a substituição não melhora a semântica nem o fluxo.
- O sistema de estilos partilhado `app/styles/components.css` e `app/styles/tokens.css` foi verificado sem declarações `!important` e sem cores hexadecimais, conforme as regras Stylelint aplicadas a estes ficheiros.
- A navegação do Super Admin foi comparada com as rotas existentes no repositório; não foi adicionada uma ligação de Notificações inexistente.
- A Fase 1 continua aberta até confirmação do build/deployment e verificação visual final em desktop e mobile. A Fase 2 não será iniciada nesta entrega.


### Revisão de acessibilidade e correcção final da monetização (02/11/2026)

- Corrigido um separador literal escapado que podia surgir entre os indicadores da Central de monetização.
- A navegação lateral móvel fechada passa a usar `visibility: hidden` após a transição, deixando de expor ligações fora do ecrã à navegação por teclado.
- O token global de foco foi alterado de verde claro para verde escuro, aumentando a visibilidade do contorno de foco em fundos claros.
- Commits: `2127a98`, `46ea0e5`, `5af70b7`.
- A revisão estática confirmou a API dos componentes Skeleton/Button utilizados nos estados de rota e a presença do token de foco.
- O build anterior passou, mas estes três commits exigem nova confirmação de build. A inspecção visual interactiva com sessão autenticada continua pendente; a ferramenta de navegação gráfica não está disponível nesta execução. Não considerar a Fase 1 formalmente encerrada até concluir essa verificação e executar `npm run lint` e `npm run typecheck` no ambiente do repositório.


### Validação CI e última limpeza CSS — 02/11/2026

- O deployment de produção do commit `39faede003dd730e880cd872f12fc6e2f0800198` foi confirmado como `READY`, com alias `moz-empresas.vercel.app`.
- O workflow CI `41487482966` terminou com sucesso nos dois jobs: `validate` e `migration-hardening`. No job `validate`, passaram instalação, auditoria de dependências, testes unitários, typecheck, lint e build de produção. O teste isolado PostgreSQL da migração de hardening também passou.
- A revisão dos nove módulos CSS do Super Admin confirmou ausência de cores hexadecimais. Foi encontrado um único `!important` residual em Publicidade; a regra foi substituída por um selector local mais específico, preservando a margem visual sem prioridade forçada.
- Commit da limpeza: `961f62d`.
- A Fase 1 permanece tecnicamente validada por CI e deploy, mas a inspecção visual autenticada em desktop e mobile ainda não foi executada nesta sessão. Não declarar essa verificação como concluída nem avançar para alterações dependentes de esquema na Fase 2 até esse controlo visual.
- Nenhuma alteração foi feita ao Supabase, schema, grants, RLS ou dados.


### Início da P2.1 — testes PostgreSQL para isolamento de parceiros (02/11/2026)

- A pedido do responsável do projecto, o desenvolvimento prosseguiu após confirmação do deployment de produção.
- O CI passou a executar a migração já existente de hardening de memberships num PostgreSQL descartável, com fixtures e verificações específicas.
- Cenários cobertos: associação activa única por utilizador, associação histórica inactiva permitida, resolução do contexto e rejeição de perfil inactivo, perfil não parceiro, conta suspensa e utilizador sem membership.
- O job PostgreSQL do workflow `41492256029` passou. O job geral `validate` ainda estava em execução no momento desta actualização.
- Ficheiros adicionados: `scripts/ci/setup-partner-account-hardening.sql` e `scripts/ci/verify-partner-account-hardening.sql`; workflow actualizado em `.github/workflows/ci.yml`.
- Nenhuma alteração ao Supabase activo, DDL de produção, grants, RLS ou dados.
- A P2.1 continua aberta: esta tranche cobre o isolamento de conta parceira, não substitui os testes restantes de marketplace, anexos, serviços, publicidade e operações administrativas.
