# MozEmpresas — Plano de execução P2

**Data:** 27/10/2026  
**Base:** branch `main`  
**Objectivo:** tornar a qualidade e a operação verificáveis, sem declarar fluxos concluídos apenas porque compilam.

## Ordem de execução

### P2.1 — Testes automatizados de regras críticas
- Introduzir um runner de testes integrado no CI.
- Cobrir validação de eventos publicitários e elegibilidade de campanhas.
- Expandir a cobertura para transições de encomendas, autorização por empresa, validação de anexos e pedidos de serviços.
- Manter testes determinísticos e sem dependência da base de dados de produção.

**Aceitação:** testes executados automaticamente no CI; falhas bloqueiam a validação do commit.

### P2.2 — Testes de integração e smoke tests
- Preparar um ambiente isolado de PostgreSQL/Supabase compatível com os fluxos necessários.
- Testar comprador/vendedor com empresas distintas, RLS, anexos, serviços e notificações.
- Registar resultados, pré-condições e limitações; não usar dados fictícios em produção.

### P2.3 — Observabilidade operacional
- Uniformizar logs estruturados sem tokens, segredos ou dados pessoais desnecessários.
- Registar erros e correlação de pedidos nas rotas críticas.
- Definir sinais para falhas de armazenamento, notificações e registo de eventos.

### P2.4 — Segurança e robustez
- Rever rate limiting, autorização no servidor, validação de entradas e comportamento em indisponibilidade.
- Rever operações multi-etapa e mecanismos de compensação para ficheiros.
- Não aplicar migrações ou alterar políticas de produção sem reconciliação do esquema e aprovação explícita.

### P2.5 — Desempenho e acessibilidade
- Medir percursos prioritários antes de optimizar.
- Rever consultas repetidas, carregamento de listas, navegação por teclado e mensagens de erro.
- Evitar optimizações sem evidência mensurável.

### P2.6 — Fecho documental
- Actualizar estado de implementação, arquitectura, riscos conhecidos e instruções operacionais.
- Separar claramente validações de CI, testes funcionais, testes de integração e validação em produção.

## Regras de execução
- Trabalhar directamente na `main`, sem branches ou PRs.
- Não executar migrações históricas nem modificar dados de produção como parte dos testes.
- Manter compatibilidade com PostgreSQL independente e a camada de adaptação existente.
- Cada entrega deve indicar commit, verificações efectivamente executadas e limitações remanescentes.


## Progresso de execução — 02/11/2026

### P2.1 — isolamento de conta parceira em PostgreSQL
- Acrescentados fixtures descartáveis em `scripts/ci/setup-partner-account-hardening.sql` e asserções em `scripts/ci/verify-partner-account-hardening.sql`.
- O job `migration-hardening` aplica a migração `20261101111659_harden_partner_account_memberships.sql` numa instância PostgreSQL efémera e verifica a restrição de uma única associação activa por utilizador, a preservação de associações inactivas e o comportamento fail-closed dos helpers `current_partner_account_id()` e `partner_account_context()`.
- O teste PostgreSQL passou no workflow CI `41492256029`. A validação geral (auditoria, testes unitários, typecheck, lint e build) ainda estava em execução no momento do registo.
- Nenhuma migração foi aplicada à base de dados activa; o teste usa exclusivamente o serviço PostgreSQL efémero do GitHub Actions.
- Próxima cobertura: acrescentar testes de autorização negativa e concorrência para operações comerciais e pedidos de serviços, sem usar dados de produção.


### Reavaliação do histórico e expansão da P2.1 — 02/11/2026

A revisão dos commits, testes existentes e relatórios anteriores identificou cobertura já concluída. Estes itens deixam de ser tratados como trabalho pendente e não serão repetidos:

- Runner Vitest no CI, auditoria de dependências, typecheck, lint e build: já fazem parte do job `validate`.
- Validação de eventos publicitários e elegibilidade de campanhas: coberta por `tests/advertising-event-validation.test.ts`.
- Transições de pedidos comerciais e publicações do marketplace: cobertas por `tests/commerce-state-machine.test.ts`.
- Transições de oportunidades e candidaturas: cobertas por `tests/opportunity-state-machine.test.ts`.
- Permissões de gestão empresarial (proprietário, papéis de gestão, viewer, empresa arquivada e associação cruzada): cobertas por `tests/business-permissions.test.ts`.
- Hardening do `search_path` de funções/procedures SECURITY DEFINER e contexto/membership de parceiro: já verificados em PostgreSQL descartável pelo job `migration-hardening`.

Implementado nesta tranche:
- Validador partilhado de anexos para marketplace e publicações, com testes para allowlist MIME, ficheiros vazios, contagem máxima e limite de 10 MiB.
- Validação extraída e testável dos pedidos de serviços, incluindo UUIDs, notas até 2.000 caracteres, estados conhecidos e preço não negativo com vírgula decimal.
- Actualização administrativa de pedidos de serviços agora usa compare-and-set pelo estado previamente lido; duas actualizações concorrentes não sobrescrevem silenciosamente uma à outra.
- Testes adicionados em `tests/attachment-validation.test.ts` e `tests/service-validation.test.ts`.

Ficam fora desta tranche, por exigirem ambiente/schema reconciliado ou contrato de negócio ainda não confirmado: testes end-to-end de RLS entre comprador/vendedor, falhas e compensação de Storage para anexos, concorrência de capacidade de campanhas M-Pesa, ciclo financeiro de créditos/pagamentos, transições completas de pedidos de serviços e validação visual autenticada. A suspensão da reconciliação da Fase 0 e da frente P0–P5 mantém-se.

Commits desta tranche: `fc6bd51`, `6c8c6be`, `a904bb7`, `f148057`, `8c44798`, `62c908e`, `7e3a78b`.
CI gerado para esta sequência: workflows `41494982052`, `41494990423`, `41495141211`, `41495151081` e `41495158198`; resultados finais a confirmar. Nenhuma alteração foi feita ao Supabase activo, RLS, grants ou dados.


### P2.2 — integração focalizada de marketplace, serviços e notificações (02/11/2026)

Foi acrescentado ao job PostgreSQL descartável um cenário de integração que aplica directamente as migrações actuais:

- `20260928120000_commerce_partner_service_audit_foundation.sql`
- `20260929233000_commerce_seller_order_actions.sql`
- `20261004173000_commerce_participant_access_and_order_progress.sql`
- `20261012170000_marketplace_order_notifications.sql`
- `20261026100000_align_commerce_order_update_policy.sql`

Os testes exercitam criação de pedido comercial pelo comprador, actualização pelo vendedor, leitura de itens e eventos por participantes, isolamento perante utilizador externo, criação/leitura de pedidos de serviços e notificações de criação/actualização com leitura restrita ao destinatário. A execução confirma também a suite já existente de SECURITY DEFINER e memberships de parceiros.

Ficheiros: `scripts/ci/setup-marketplace-integration.sql` e `scripts/ci/verify-marketplace-integration.sql`. Workflow: `.github/workflows/ci.yml`. Execução PostgreSQL do workflow `41498073765`: os três passos SQL — SECURITY DEFINER, integração marketplace/serviços/notificações e memberships de parceiro — passaram. O workflow `41498073765` terminou integralmente com sucesso: auditoria de dependências, testes unitários, typecheck, lint, build de produção e todos os passos PostgreSQL.

**Limite importante de fidelidade do fixture:** a origem da tabela `commerce_orders` e a política SELECT de base para vendedores não estão representadas na sequência de migrações versionadas consultada. O fixture inclui as regras mínimas de leitura de comprador/vendedor necessárias para executar o teste de UPDATE e os triggers; por isso, este resultado valida as migrações listadas e o comportamento das regras testadas, mas não constitui ainda prova de paridade integral com o schema/RLS activo. Essa paridade fica pendente de uma exportação/reconciliação read-only do schema, sem aplicar alterações em produção.

Também ficam pendentes: integração real com Supabase Storage (o tratamento de compensação de uploads tem testes unitários com mocks), execução através do serviço de Storage e validação de políticas de objectos, testes E2E autenticados com contas reais descartáveis e entrega externa de notificações. Não foram usadas credenciais, tabelas ou dados de produção; nenhuma alteração foi feita ao Supabase activo.


### P2.3 — primeira tranche de observabilidade operacional (02/11/2026)

- O logger estruturado existente foi endurecido com allowlist de campos operacionais. Mensagens, payloads, email, telefone, user IDs, tokens, cookies e valores arbitrários deixam de ser serializados pelo logger.
- Criado `withApiObservability`: valida/gera um `x-request-id`, devolve-o no header de resposta e regista rota, método, status e duração. Excepções não tratadas geram resposta genérica 500 e log apenas com o nome da classe do erro.
- Instrumentadas as rotas públicas de eventos e decisão de publicidade, contactos e pedidos de publicidade.
- Erros de persistência nas rotas de contactos, publicidade e decisão de anúncios passam a ser classificados como 500, separando-os de payloads inválidos (400), permitindo que os logs operacionais distingam falhas de cliente e de servidor.
- Os limites de erro das páginas geral, Super Admin e administração passaram a omitir `error.message`, que poderia conter dados de entrada; mantêm apenas componente, nome do erro e digest técnico.
- Testes em `tests/observability.test.ts`: sanitização de contexto, propagação do request ID e fallback seguro para excepções não tratadas.
- CI `41499838769` terminou com sucesso: auditoria, testes unitários, typecheck, lint, build e todos os passos PostgreSQL.

Esta tranche cobre as principais rotas HTTP públicas e error boundaries. Ainda não uniformiza logs em todas as Server Actions nem integra alertas externos, métricas de negócio ou tracing distribuído. A P2.3 permanece aberta para essas extensões e para instrumentação adicional de Storage/notificações.


### P2.4 — segurança e robustez, primeira tranche (02/11/2026)

**Reserva de inventário publicitário e pagamentos**
- Corrigido o fluxo de pedido M-Pesa: a acção anterior fazia uma verificação de capacidade separada do INSERT, permitindo sobre-reserva concorrente; procurava depois a campanha por empresa/produto/data, o que podia associar alvos à linha errada. A nova acção usa a RPC transaccional `request_promotion_with_mpesa`, recebe directamente o ID criado e grava os alvos na mesma transacção.
- A reserva M-Pesa e a compra com créditos passam a bloquear a linha do produto com `FOR UPDATE` antes de contar capacidade e inserir campanha, serializando as reservas do mesmo produto entre métodos de pagamento.
- Corrigida a incompatibilidade do campo `payment_method`: o esquema versionado aceita `DIRECT` ou `CREDITS`; o fluxo de M-Pesa passa a registar `DIRECT` (o método de pagamento continua apresentado ao utilizador como M-Pesa).
- A RPC valida conta activa e autorização owner/admin/operator, data de início, tamanho e número de critérios de segmentação, e garante que uma oferta associada pertence à empresa e está publicada.
- A data `datetime-local` é interpretada no fuso de Maputo (+02:00); IDs, títulos e critérios de segmentação são validados antes de chamar a base de dados.
- Migração nova: `supabase/migrations/20261102190000_atomic_direct_ad_purchase.sql`. Está apenas no repositório; **não foi aplicada ao Supabase de produção**. O fluxo M-Pesa que usa esta RPC requer a migração antes de ser activado em produção.

**Autorização no servidor**
- Acções de empresas, marketplace, oportunidades, pedidos de serviços, publicidade e compra de créditos passam a exigir `requireNormalAccount()`, que valida sessão, classificação da conta e estado activo, falhando fechado perante erro de contexto.
- Acções de oportunidades de parceiros passam a usar `requirePartnerAccount()` e exigem papel `owner` ou `manager`; os papéis viewer/member não podem alterar oportunidades ou candidaturas.

**Anexos e comprovativos**
- A allowlist MIME já existente passa a ser complementada por verificação da assinatura binária inicial para PDF, imagens, documentos Office e texto UTF-8. A validação é executada antes de enviar ficheiros ao Storage em marketplace e publicações.
- Comprovativos de compra de créditos passam a aceitar apenas PDF/JPEG/PNG/WebP, até 10 MiB, com extensão derivada do MIME validado e limpeza do objecto se a gravação do pedido falhar.
- Fixtures PDF dos testes de compensação foram actualizadas para usar bytes com assinatura válida.

**Verificação**
- CI `41503236027` terminou com sucesso nos dois jobs. Passaram auditoria de dependências, testes unitários, TypeScript, lint, build de produção e os quatro cenários PostgreSQL descartáveis: SECURITY DEFINER/search_path, marketplace/serviços/notificações, reservas publicitárias atómicas e membership/contexto de parceiro.
- Os testes PostgreSQL de publicidade verificam pedido DIRECT pendente, preço com segmentação, gravação de alvos, bloqueio de capacidade, rejeição de oferta de outra empresa, rejeição de utilizador externo, débito de créditos e transacção correspondente. Também verificam que ambas as RPCs usam bloqueio `FOR UPDATE`.
- Testes unitários adicionais cobrem validação de datas/segmentação, assinaturas de ficheiros e papéis de parceiro.

**Limitações ainda abertas:** a concorrência foi protegida com bloqueio transaccional e verificada pela definição da função e pelos testes de capacidade sequenciais; não foi executado um teste multi-sessão concorrente. Não foi feita validação do Storage real, nem teste do provedor M-Pesa, nem reconciliação read-only do schema/RLS activo. A migração nova não está aplicada em produção e o deployment Vercel correspondente ao código desta tranche não foi confirmado. Não alterar produção sem reconciliação e aprovação explícita.


### P2.4 — rate limiting e comunicação de dependência ausente (02/11/2026)

- resolveTrustedClientAddress passou a ler exclusivamente o cabeçalho de proxy configurado (por omissão x-vercel-forwarded-for), validar o valor com node:net.isIP e rejeitar valores ausentes/malformados. Não usa x-forwarded-for enviado pelo cliente como fallback.
- Quando não existe endereço de proxy confiável, o rate limiter falha fechado com resposta 503, em vez de agrupar todos os pedidos na chave unknown e criar um bloqueio global por partilha de contador.
- Testes em tests/rate-limit.test.ts cobrem IPv4, IPv6, cabeçalho configurado, rejeição de cabeçalhos arbitrários e valores inválidos.
- A documentação de cabeçalhos da Vercel identifica x-vercel-forwarded-for como equivalente a x-forwarded-for, com a vantagem de não ser sobrescrito da mesma forma quando existe um proxy adicional; a aplicação mantém o nome de cabeçalho configurável para outros ambientes.
- Se a RPC request_promotion_with_mpesa ainda não existir no schema PostgREST, a acção passa a classificar o erro como dependência não activada e a página informa que a reserva segura aguarda a migração, em vez de apresentar apenas uma falha genérica.
- CI 41503815149 terminou com sucesso: auditoria, testes unitários, typecheck, lint, build e todos os quatro grupos PostgreSQL. O workflow 41504020604, que inclui a mensagem de dependência ausente, ainda estava em execução no momento deste registo.

**Estado de produção:** a última deployment Vercel READY observada corresponde ao commit 444b005; não inclui os commits posteriores de rate limiting e da mensagem de dependência. A migração 20261102190000_atomic_direct_ad_purchase.sql continua apenas no repositório. Não aplicar a migração nem activar o fluxo M-Pesa seguro em produção sem reconciliação read-only do schema e aprovação explícita.


### P2.4 — consolidação dos guardas de conta nas acções de servidor (02/11/2026)

- O mesmo contexto fail-closed de conta normal activa foi aplicado também a convites empresariais (criação e aceitação), gestão de acessos empresariais e suporte do utilizador.
- Com esta tranche, os principais fluxos normais de empresa, marketplace, oportunidades, serviços, publicidade, créditos, convites, acessos e suporte passam pelo helper partilhado requireNormalAccount. Os fluxos do parceiro usam requirePartnerAccount e exigem owner/manager para gerir oportunidades/candidaturas. Operações administrativas continuam a validar Super Admin separadamente.
- O workflow 41504353263 já confirmou os quatro blocos PostgreSQL; a validação geral (auditoria, testes, typecheck, lint e build) ainda estava em execução no momento do registo.
- Não houve alteração ao Supabase activo nem aplicação da migração publicitária nova.


### P2.5 — primeira tranche de acessibilidade e auditoria de desempenho (05/11/2026)

- Auditoria estática identificou consultas não limitadas em `app/dashboard/admin/usuarios/page.tsx`: a página lê todas as linhas de `platform_members` e `business_members` para depois apresentar no máximo 100 perfis. O volume de dados transferido e o trabalho em memória crescem com a plataforma; requer redesenho cuidadoso dos filtros de associação/acesso, sem alterar a semântica.
- `app/dashboard/admin/oportunidades/page.tsx` executa oito consultas de contagem paralelas, além da consulta paginada. Uma futura consolidação deve preservar a precisão dos indicadores e ser testada antes de introduzir RPC/migração.
- `Dialog` e `Drawer` no kit partilhado não tinham tratamento de Escape, ciclo de foco, reposição do foco anterior ou associação semântica do título. Corrigido em `components/ui/index.tsx`: foco inicial, contenção de Tab/Shift+Tab, Escape, retorno do foco, `aria-labelledby` e fecho apenas por clique no backdrop.
- Commit: 78f1ba0. CI 41988169238 foi iniciado; resultado ainda pendente neste registo.
- Não foi realizada validação visual autenticada em browser. Não foram alterados dados, schema, grants ou políticas RLS de produção.
