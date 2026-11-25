# MozEmpresas — estado de implementação

## Estado de fecho funcional

A experiência da plataforma está publicada, mas o fecho funcional global **não está comprovado**. A matriz [Matriz de fecho funcional e regras de negócio](../functional-closure-matrix.md) é a referência para a auditoria actual e prevalece sobre descrições genéricas de módulos como “concluídos”.

Esta documentação distingue:
- presença de uma funcionalidade no código;
- implementação parcial de um fluxo;
- validação por testes automatizados;
- validação de integração com base de dados/serviços;
- confirmação funcional no ambiente publicado.

Não declarar pagamentos reais, fluxo completo de parceiros, auditoria transversal, notificações ou segurança integral como concluídos sem evidência específica. A revisão actual é estática e não substitui testes end-to-end nem reconciliação do esquema activo.

## Estado actual
A experiência final-user está publicada e separada de funcionalidades reservadas a serviços pagos e do módulo independente de Parceiros. A publicação não comprova o fecho de todos os ciclos de negócio; consultar a matriz de fecho funcional.

## Concluído nesta fase
- Landing page orientada ao directório empresarial e descoberta de mercado.
- Hero publicitário com rotação de anúncios.
- Directório público de empresas com pesquisa por nome/actividade e localização.
- Perfil público de empresa com contactos e ofertas.
- Marketplace público com pesquisa, filtros e detalhe de produto/serviço.
- Login, registo e área autenticada.
- Dashboard com navegação persistente e separação entre Trabalho, Empresa, Serviços e Conta.
- Gestão inicial de empresas e acessos/equipa.
- Catálogo de serviços MozEmpresas e pedidos de serviço.
- Concursos removidos do produto, da navegação pública e do catálogo de serviços.
- Oportunidades e Parceiros retirados do workspace do utilizador final.
- Rotas públicas de oportunidades/parceiros retiradas da navegação principal.
- Rota legada de publicação de oportunidade neutralizada até à criação do módulo de parceiros.
- CI configurado no repositório.
- Deploy Vercel ligado ao branch `main`.
- Acesso dedicado de parceiro reservado ao Super Admin.
- Modelo inicial de convite/activação de parceiro implementado sem alteração do RLS existente.
- Contrato funcional do novo módulo de Parceiros documentado em `docs/architecture/partner-module.md`.

## Arquitectura preservada para evolução
- As estruturas de oportunidades permanecem disponíveis para o módulo de Parceiros; concursos não fazem parte do produto MozEmpresas.
- O módulo de serviços permite adicionar serviços pagos relevantes sem introduzir módulos que não fazem parte da proposta de valor do produto.
- A separação actual é: **final-user → directório/marketplace/serviços**; **parceiros → workspace próprio da relação estratégica com a MozEmpresas**.
- O parceiro representa uma entidade própria com um único utilizador activo por organização. A substituição do responsável é sequencial, auditada e controlada pelo Super Admin.
- `business_partner_relationships` não é o núcleo conceptual da conta de parceiro.
- O design do parceiro reutiliza as fundações transversais do produto; não será criado um segundo design system.

## Fase 2 — módulos operacionais (em execução)

A Fase 2 do roadmap de lançamento está em execução. O plano e o progresso estão em [`docs/phase-2-operational-modules-2026-11-10.md`](../phase-2-operational-modules-2026-11-10.md). A primeira tranche reforça o fluxo de pedidos de Serviços MozEmpresas com máquina de estados explícita, validação server-side, compare-and-set e testes unitários. Esta entrega não altera o esquema de produção.

Pendências principais: convites de gestores vinculados à conta, ciclo financeiro real/idempotente, publicidade dependente de migration ainda não aplicada, e validação integrada de autorização e notificações.

## Próxima fase — desenvolvimento do módulo de Parceiros
A especificação fechada está em `docs/architecture/partner-module.md`.

Ordem prevista:
1. Consolidar a entidade de conta de parceiro e o acesso do utilizador único.
2. Fechar permissões e integração com o acesso dedicado existente.
3. Implementar publicação/gestão de oportunidades.
4. Implementar serviços e exclusividades.
5. Implementar publicidade e exposição.
6. Implementar actividade e desempenho.
7. Implementar inteligência, dados e insights.
8. Integrar notificações e alertas.
9. Completar administração da relação no Super Admin.
10. Testar o fluxo completo e documentar a conclusão.

**Nota:** o workspace de parceiro actualmente existente é protótipo estrutural e não deve ser tomado como referência final de produto.

Cada módulo só é considerado concluído quando possuir database, regras, acções/API, UI, permissões, validação, estados de erro, testes e documentação.


## Actualização de implementação — 24/11/2026

O acesso Parceiro foi consolidado para um utilizador activo por organização. O ciclo estrutural cobre criação do convite pelo Super Admin, activação como owner, bloqueio de perfis inactivos, listagem de memberships activas, revogação com motivo e histórico, e elegibilidade para substituição sequencial do responsável. Ver `docs/architecture/partner-manager-invitations.md` e a tranche F3.34–F3.36 em `docs/phase-2-operational-modules-2026-11-10.md`.

O fecho de implementação continua em curso. A validação integrada e os testes finais não estão a ser usados como critério intermédio de avanço nesta etapa; serão executados após a implementação global atingir 100%.


## Reconciliação de sequência funcional e notificações (25/11/2026)

A sequência funcional histórica já tinha alcançado **F3.73** (notificações bilaterais da Central de Suporte), seguindo-se F3.74/F3.75 e outras intervenções com numeração própria. Os sufixos `f337`–`f341` presentes em cinco ficheiros de migração posteriores são identificadores/nomes técnicos desses ficheiros e **não** representam uma reinicialização da sequência funcional em F3.37. Não usar esses sufixos para medir progresso ou propor novas intervenções.

Reconciliação read-only do Supabase confirmou que a F3.73 deixou a funcionalidade coberta pelo trigger anterior `notify_support_message_recipient_trigger`, cuja função `notify_support_message_recipient()` já trata respostas do backoffice ao utilizador e mensagens do utilizador ao responsável activo ou aos Super Admins. O trigger adicional criado pela F3.73 foi removido pela migração posterior; não deve ser recriado, pois duplicaria notificações. A lógica actualmente activa foi preservada.

Foi identificada uma sobreposição real em `service_requests`: a F3.72 já grava o histórico de estado e a notificação na mesma transacção (`trg_capture_service_request_status_event_f372`), enquanto uma migração posterior adicionou também `service_request_status_notification` usando a função genérica de ciclo de vida. Foi removido apenas esse segundo trigger. A função genérica foi preservada porque continua a servir os pedidos de créditos, ordens de serviço e campanhas/cobranças de parceiros.

A migração correctiva está em `supabase/migrations/20261124220337_reconcile_service_request_notification_ownership.sql` e foi aplicada ao projecto Supabase. Não foram executados testes, validações finais ou deploy. O progresso global mantém-se em **89% (referência provisória anterior, não recalculada)** até reconciliação integral dos módulos; esta correcção não aumenta por si só a percentagem.


### Consolidação adicional — candidaturas a oportunidades (25/11/2026)

A F3.72 já tinha o trigger `capture_opportunity_application_event` a registar transições de estado e a notificar o candidato. A migração posterior `f341` criou um segundo trigger (`opportunity_application_status_notification`) para a mesma transição. Foi removido apenas o trigger duplicado e consolidada a notificação no trigger de captura de eventos, mantendo o histórico transaccional e evitando auto-notificação quando o próprio candidato altera o estado. Migração aplicada: `20261124220709_consolidate_opportunity_application_status_notifications.sql`. Sem testes ou validações finais.


### Correcção cronológica adicional (25/11/2026)

A leitura integral dos nomes das migrações posteriores confirmou que a sequência funcional avançou depois da F3.73: **F3.74** (`20261124182000_f374_atomic_commerce_order_transitions.sql`) e **F3.75** (`20261124214209_f375_enforce_single_active_partner_user_per_organization.sql`). Assim, F3.73 é um marco histórico confirmado, mas não o último marco. O último identificador funcional explícito localizado no histórico de migrações é **F3.75**. Os sufixos f337–f341 das migrações subsequentes continuam a ser identificadores técnicos locais e não devem ser usados para reiniciar a sequência. A referência global de fecho permanece em 89% provisórios.


## E2E sweep — actual cleanup and unresolved reconciliation (25/11/2026)

Removed the obsolete custom M-Pesa HMAC callback route/helper/test and the callback-only MPESA_MERCHANT_CODE example variable. Partner account page was changed from group-manager listing/placeholder to the single-active-user account view. Partner opportunity server guard now permits only the owner role. Tests remain deferred.

Repo migration files (191) vs Supabase ledger entries (206) remains a reconciliation issue; exact-name matching is not a safe deletion criterion. Read-only privilege inspection found private.partner_access_grants is RLS-disabled but anon/authenticated lack private schema USAGE and all direct table privileges checked; it remains a defense-in-depth review item, not a confirmed direct exposure.
