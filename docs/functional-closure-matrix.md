# MozEmpresas — Matriz de fecho funcional e regras de negócio

**Estado:** auditoria funcional com verificação read-only adicional do esquema Supabase activo; não representa certificação de produção.  
**Base consultada:** branch `main` e consultas read-only ao projecto Supabase `zikjvjzbbfzrelbkaaci` em 2026-10-29.  
**Objectivo:** estabelecer uma única referência de trabalho antes de retomar P0–P5, distinguindo regras definidas, implementação observada e validações ainda necessárias.

## 1. Como interpretar esta matriz

- **Definido**: a regra está documentada ou é explícita no modelo de dados/código.
- **Parcial**: existe parte do fluxo, mas o ciclo completo ou os efeitos transversais não estão comprovados.
- **A validar**: exige testes, inspecção adicional do esquema activo ou confirmação de operação.
- **Não declarar concluído**: não existe evidência suficiente para fechar o fluxo.

Esta revisão é documental e estática. A presença de uma página, acção de servidor, tabela ou migração não prova, por si só, que o fluxo funciona em produção.

## 2. Decisões de produto preservadas

1. MozEmpresas é um directório empresarial e balcão digital para descoberta de empresas, produtos e serviços em Moçambique.
2. O produto final-user cobre directório, perfis empresariais, marketplace, gestão de empresas/acessos, serviços MozEmpresas, publicidade e funcionalidades de conta.
3. O módulo Concursos foi removido e não deve ser reintroduzido como parte deste fecho.
4. O módulo de Parceiros é uma área distinta: o parceiro é uma entidade própria, não uma empresa que gere um portefólio de terceiros.
5. O Super Admin controla a operação global, moderação, contas de parceiro, oportunidades, publicidade, monetização e suporte.
6. Não declarar pagamentos reais integrados ou validados quando o código só cria pedidos/registos pendentes ou depende de validação manual.
7. Não executar migrações em produção, reparar o histórico de migrações ou alterar RLS sem reconciliação e plano explícito.
8. Manter compatibilidade com PostgreSQL e evitar dependência desnecessária de funcionalidades específicas de fornecedor.

## 3. Matriz por módulo

| ID | Módulo / processo | Regra de negócio a fechar | Evidência observada no repositório | Estado de fecho | Critério de aceitação |
|---|---|---|---|---|---|
| F01 | Identidade e estado da conta | Só utilizadores autenticados e activos executam operações permitidas ao seu papel. | Há verificações de autenticação e estado de perfil em várias acções; a cobertura é distribuída por módulos. | Parcial / validar transversalmente | Testes de sessão ausente, conta inactiva, utilizador normal, gestor de empresa, parceiro e Super Admin em cada fluxo crítico. |
| F02 | Empresa e gestores | Cada operação empresarial verifica associação e papel no servidor/base de dados. | Existem `businesses`, `business_members`, helpers de permissões e políticas RLS. | Parcial / validar | Matriz de permissões por papel; testes cruzados com duas empresas e utilizadores não associados; verificar convites, remoção, suspensão e arquivo. |
| F03 | Directório público | Apenas perfis e ofertas publicáveis são expostos; os dados públicos não revelam informação privada. | Directório e perfis públicos existem; há migrações de hardening de perfis e políticas. | Parcial / validar | Testes anónimos/autenticados; campos públicos explicitamente allowlisted; contas e ofertas suspensas não aparecem. |
| F04 | Marketplace — publicações | Oferta passa por rascunho, publicação, edição permitida, arquivo/remoção, respeitando propriedade e validação. | `lib/commerce/actions.ts` cria ofertas em `DRAFT`, valida campos, empresa, anexos e autorização. | Parcial | Testar CRUD com anexos reais em ambiente isolado, estados, limpeza de ficheiros, falhas parciais e visibilidade pública. |
| F05 | Marketplace — pedido comercial | Comprador e vendedor têm acesso correcto; transições são permitidas e ficam registadas. | `lib/commerce/state-machine.ts` define `INTERESTED → CONTACTED → NEGOTIATING → AGREED → COMPLETED`, com cancelamento nos estados intermédios previstos; a migração `20260930003000_marketplace_offline_commerce.sql` define que pagamentos/liquidação ocorrem fora da plataforma. | Parcial / validar | Testes de transições válidas/inválidas, papéis dos participantes, concorrência, histórico, cancelamento e isolamento. Preservar a regra: marketplace regista intenção comercial, não processa pagamento entre comprador e vendedor. |
| F06 | Serviços MozEmpresas | Serviço activo pode ser solicitado/contratado; estados, preço, vigência e cancelamento são coerentes. | Existem catálogo, pedidos e acção de checkout; contratação com créditos usa RPC; M-Pesa cria ordem e pagamento pendentes. Em 10/11 foi criada máquina de estados para `service_requests`, aplicada à acção administrativa com compare-and-set e testes unitários; `CANCELLED` foi alinhado ao check activo. | Parcial | Executar CI e testar autorização/concorrência em PostgreSQL isolado; fechar pagamento, activação, expiração, renovação, notificações e histórico. |
| F07 | Créditos e carteira | Créditos só são creditados após confirmação de pagamento; consumo é atómico e rastreável. | Existe pedido de compra de créditos com comprovativo opcional/obrigatório conforme método; há carteiras e transacções. | Parcial / risco financeiro | Confirmar fluxo de aprovação/recusa, idempotência, crédito uma única vez, reconciliação, histórico e tratamento de comprovativos; testar concorrência. |
| F08 | Publicidade para empresas | Produto, preço, capacidade, datas, alvo, pagamento e entrega são consistentes. | Catálogo de produtos e RPC de compra com créditos; pedidos/campanhas M-Pesa; validação de eventos publicitários. | Parcial / risco comercial | Testar capacidade concorrente, períodos sobrepostos, elegibilidade, moderação, pagamento confirmado, activação, expiração e métricas. |
| F09 | Publicidade para parceiros | Campanhas e produtos de parceiro pertencem à conta parceira certa e respeitam entitlement/permissões. | Migrações de produtos/campanhas/alvos/entitlements e políticas RLS existem no histórico. | Parcial / dependente de conta de parceiro | Verificar o esquema real, associação à conta, ciclo de pedido-aprovação-pagamento-entrega e isolamento entre duas contas parceiras. |
| F10 | Oportunidades de parceiros | Só a conta autorizada gere as suas oportunidades; candidatos submetem dentro da janela e estados válidos. | Migrações definem `partner_account_id`, políticas de leitura/gestão e candidatura; há acções de parceiro. | Parcial | Testar publicação, rascunho, datas, candidatura, actualização de estado, encerramento e acesso entre contas. |
| F11 | Conta Parceiro e utilizador único | Cada organização Parceiro tem exactamente um utilizador activo. Criação, activação, revogação e substituição do responsável preservam a associação e o histórico. | `partner_accounts`, `partner_account_members` e `private.partner_access_grants`; índice único parcial por conta e por utilizador; claim cria membership `owner`; Super Admin lista e revoga o acesso com motivo auditado; novo convite só é possível após libertar a conta; utilizador recebe notificação de revogação. | Implementação do ciclo principal concluída; validação reservada | Fechar recuperação operacional do acesso e procedimentos de substituição assistida. Os testes de convite, replay, concorrência e isolamento ficam para a fase final. |
| F12 | Serviços e exclusividades de parceiro | Elegibilidade, condições e período são representados como direitos verificáveis da conta. | A especificação descreve o fluxo; existem estruturas de entitlements e serviços gerais, mas não está provado o ciclo completo de exclusividade. | A validar / provavelmente incompleto | Definir tipos de entitlement, âmbito, vigência, conflitos, renovação, revogação e efeitos em publicidade/serviços. |
| F13 | Inteligência e desempenho | Métricas são derivadas de dados reais, com definições, período e limites de agregação. | A especificação do parceiro exige fontes reais e separa dados observados, calculados e interpretações. | A validar | Cada indicador tem consulta/fonte, fórmula, janela temporal, regras de privacidade e teste de reconciliação; sem fonte, não mostrar métrica. |
| F14 | Super Admin e moderação | Cada acção é autorizada, transita de estado permitido, deixa histórico e produz efeitos relacionados. | Páginas e acções administrativas existem; contexto Super Admin valida papel; relatórios anteriores reconhecem cobertura incompleta de auditoria. | Parcial / prioridade alta | Inventariar todas as acções administrativas; verificar transições, autorização, resultado de update, auditoria, notificações e reversão/compensação. |
| F15 | Suporte | Ticket e mensagem inicial são consistentes; respostas e estados reflectem quem deve agir. | Criação de ticket e mensagem inicial são separadas com limpeza compensatória; resposta de staff actualiza estado. | Parcial | Testar concorrência e falhas entre mensagem/estado; definir estados, reabertura, encerramento, acesso, tempos e histórico. |
| F16 | Notificações | Eventos relevantes geram notificações correctas sem expor dados a outros utilizadores. | Notificações agora cobrem mensagens de suporte (trigger duplicado removido), atribuição/estado de operações do backoffice Parceiro, governação administrativa da conta, revogação de acesso Parceiro e transições de pedidos de créditos, ordens/pedidos de serviço, campanhas e cobranças de parceiros. | Implementação ampliada; mapa global ainda parcial | Completar matriz evento→destinatário→conteúdo→destino para restantes fluxos (pagamentos M-Pesa, marketplace, moderação, anúncios empresariais e alertas de conta); testes de falha, duplicação, leitura e isolamento ficam para a fase final. |
| F17 | Auditoria operacional | Operações críticas identificam actor, acção, objecto, momento e resultado. | Há estrutura de auditoria; relatórios anteriores dizem que a cobertura global não foi comprovada. | Parcial / prioridade alta | Matriz de eventos auditáveis, testes de escrita e protecção contra alteração indevida; cobrir operações financeiras, moderação, acesso e estados. |
| F18 | Pagamentos e reconciliação | Estados de pedido, pagamento e serviço/campanha não se contradizem; callbacks são idempotentes. | O checkout M-Pesa consultado cria `PENDING_PAYMENT` e registo `PENDING`; não foi comprovada integração real end-to-end nesta auditoria. | Não fechado | Só fechar após integração configurada e testes de sucesso, falha, timeout, callback repetido, valor/referência incorrectos, cancelamento e reconciliação. |
| F19 | Anexos e Storage | Tipo, tamanho, autorização, ciclo de vida e limpeza são controlados. | Há validações de MIME/tamanho e compensação em algumas acções; Storage e PostgreSQL não são transaccionais. | Parcial | Testes com ficheiros reais, falhas ambíguas, remoção, permissões de leitura, ficheiros órfãos e limites no servidor. |
| F20 | Pesquisa, favoritos e alertas | Filtros guardados correspondem à definição de pesquisa e só notificam sobre resultados elegíveis. | Migrações de pesquisas guardadas/favoritos/alertas e correcções de filtros existem. | Parcial / validar | Testes por tipo de oportunidade, filtros combinados, alteração de publicação, duplicação e opt-out. |
| F21 | Configuração, dados e migrações | O esquema no ambiente corresponde ao histórico e às migrações aprovadas. | Relatório P2 indica que o hardening está no repositório, mas ainda não aplicado; recomenda exportação nativa e reconciliação. | Bloqueador de validação | Exportar esquema nativo, comparar tabelas/funções/políticas/triggers/índices e ledger; testar migrações numa base isolada antes de qualquer aplicação. |
| F22 | CI, integração e produção | Build verde é distinto de teste funcional, integração e validação de produção. | Existem testes unitários para máquina de estados e validação de eventos; relatórios registam testes end-to-end pendentes. | Parcial | CI cobre regras críticas; ambiente isolado cobre RLS/SQL; smoke test documentado cobre percursos; resultados e commit ficam registados. |

## 3.1. Evidência de verificação do esquema activo (2026-10-29)

Consultas read-only ao projecto Supabase activo confirmaram que `partner_accounts`, `partner_account_members`, `private.partner_access_grants`, `credit_purchase_requests`, `platform_service_orders`, `financial_payments`, `business_promotions`, `partner_ad_campaigns`, `advertising_requests`, `support_tickets` e `platform_members` existem. As tabelas públicas verificadas têm RLS activado; `private.partner_access_grants` não tem RLS activado, mas reside no schema `private` e a migração de referência revoga privilégios directos a `anon` e `authenticated`. Os estados financeiros e de publicidade estão definidos por checks na base de dados, incluindo `credit_purchase_requests` (`REQUESTED`, `PAYMENT_PENDING`, `PAID`, `REJECTED`, `CANCELLED`), `platform_service_orders` (`PENDING_PAYMENT`, `PAID`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `FAILED`) e `partner_ad_campaigns` (`DRAFT`, `REQUESTED`, `APPROVED`, `ACTIVE`, `PAUSED`, `ENDED`, `REJECTED`). Isto confirma a existência de estruturas e enumerações, não a conclusão dos fluxos end-to-end.

**Risco confirmado:** `current_partner_account_id()` usa membership activa e perfil `user_type='parceiro'`, mas não verifica `partner_accounts.status` nem `profiles.account_status`; o helper `current_partner_opportunity_role()` já verifica esses estados. Esta diferença deve ser tratada com teste de regressão e migração revista, não com alteração directa em produção.

## 3.2. Achados activos de segurança

A verificação read-only e o Security Advisor de 2026-10-29 identificaram tabelas de parceiro com RLS activo mas sem políticas, funções `SECURITY DEFINER` expostas por RPC e a protecção contra palavras-passe comprometidas desactivada. Estes pontos foram registados com detalhe, impacto e critérios de aceitação em [`docs/functional-closure-live-findings-2026-10-29.md`](./functional-closure-live-findings-2026-10-29.md). Não foram feitas alterações ao banco de dados; não revogar funções nem adicionar políticas em massa sem análise por fluxo.

## 3.3. Testes de regressão do módulo de Parceiros

Foi acrescentado um plano inicial de testes para contexto da conta, estado de perfil/conta/membership, isolamento entre contas, papéis, convites e operações com créditos: [`docs/architecture/partner-module.md`, secção 8](./architecture/partner-module.md). Os casos devem ser executados em staging antes de qualquer migration; não foram executados em produção.

## 4. Regras transversais obrigatórias

### 4.1 Estados
Cada processo deve ter um catálogo de estados e uma tabela de transições com:
- estado de origem;
- estado de destino;
- actor autorizado;
- pré-condições;
- efeitos secundários;
- evento de auditoria;
- notificações;
- comportamento em falha.

Uma validação de enumeração não basta: também é preciso validar se a transição é permitida a partir do estado actual.

### 4.2 Operações financeiras
- Um pedido de pagamento não é um pagamento confirmado.
- Um comprovativo carregado não é prova automática de liquidação.
- A mesma referência/callback não pode gerar créditos ou activar serviços mais de uma vez.
- O consumo de créditos, o registo da transacção e a criação da campanha/ordem devem ser atómicos na base de dados quando pertencem à mesma operação.
- Reembolsos e reversões devem produzir movimentos compensatórios, sem apagar o histórico original.

### 4.3 Multi-tenancy e autorização
- Toda a operação de negócio valida autorização no servidor e/ou base de dados; a UI não é uma fronteira de segurança.
- Utilizadores de uma empresa não podem aceder a outra empresa por alteração de IDs.
- Gestores de uma conta parceira não podem ler ou alterar outra conta parceira.
- Operações de Super Admin usam verificação centralizada e ficam auditadas.
- Não alterar RLS existente sem analisar dependências, migrações e risco de regressão.

### 4.4 Falhas parciais
Para fluxos que atravessam base de dados, Storage, notificações ou fornecedor de pagamentos, definir:
- ordem das operações;
- ponto de confirmação;
- compensação ou retry;
- idempotência;
- estado visível ao utilizador;
- alerta operacional.

## 5. Prioridade de fecho funcional

### F0 — Bloqueadores antes do fecho
1. Reconciliar documentação com código e esquema real.
2. Fechar modelo de conta de parceiro e gestores.
3. Definir o ciclo financeiro real versus manual/simulado.
4. Fechar transições e permissões de publicidade, serviços e marketplace.
5. Confirmar estado do esquema e migrações sem alterar produção.

### F1 — Processos operacionais
6. Fechar Super Admin, moderação e auditoria.
7. Fechar notificações e suporte.
8. Fechar anexos e limpeza de falhas.
9. Fechar métricas e fontes de dados.

### F2 — Prova de conclusão
10. Testes automatizados das regras críticas.
11. Testes de integração com utilizadores e empresas distintos.
12. Smoke tests em ambiente de teste.
13. Actualizar o estado de implementação apenas com evidência reproduzível.

## 6. Documentos de execução relacionados\n\n- [Inventário de estados e transições](business-state-transition-inventory.md) — estados encontrados, transições conhecidas e lacunas por processo.\n\n## 7. Próximas acções desta roadmap

| Acção | Entrega | Estado |
|---|---|---|
| R1.1 | Publicar esta matriz como referência funcional única | Em execução |
| R1.2 | Corrigir README e estado de implementação para apontarem para a matriz e não confundirem deploy com fecho funcional | Pendente |
| R1.3 | Fazer inventário de estados/transições por módulo e assinalar divergências | Pendente |
| R1.4 | Reconciliar o modelo de parceiros com as migrações do repositório e o esquema activo | Pendente; exige acesso de leitura ao esquema activo |
| R1.5 | Definir contrato de pagamento/monetização com estados explícitos | Pendente |
| R1.6 | Mapear eventos de auditoria e notificações | Pendente |
| R1.7 | Converter lacunas prioritárias em plano de implementação testável | Pendente |

## 8. Limitações conhecidas desta revisão

- Não foram executados testes de browser ou end-to-end nesta etapa.
- Não foi consultado o esquema actual da base de dados nesta execução. Existe no repositório um inventário de esquema capturado em 25/10/2026 (59 tabelas) e uma reconciliação de histórico, mas a documentação declara que o inventário não é um `pg_dump` nativo; é necessário confirmar o estado actual por leitura e obter exportação nativa.
- Não foi confirmada uma integração real de pagamento.
- Não foi confirmada a aplicação de migrações pendentes.
- O estado “parcial” significa falta de prova de fecho, não necessariamente que toda a funcionalidade esteja avariada.


## 3.4. Achados de autorização e convites do módulo de Parceiros

A revisão estática das migrações de convite, helpers de contexto e acções de oportunidades identificou que o convite não guarda uma conta-alvo e que a resolução da conta actual pode ser ambígua se houver várias memberships elegíveis. A análise, evidência e plano de correcção sem alterações à produção estão em [`docs/partner-authorization-findings-2026-10-31.md`](partner-authorization-findings-2026-10-31.md). Tratar a gestão de gestores como lacuna até o convite para uma conta existente e os testes de isolamento serem implementados e validados. O contrato técnico foi documentado em [`docs/architecture/partner-manager-invitations.md`](./architecture/partner-manager-invitations.md).


## 3.5. Actualização de segurança e transições (2026-10-31)

A consulta read-only actualizada confirmou que `private.partner_access_grants` está com RLS desactivado e que o Security Advisor assinala quatro tabelas sem políticas RLS e funções `SECURITY DEFINER` expostas a papéis autenticados/anónimos. Os detalhes e a sequência segura estão em [`docs/functional-closure-live-findings-2026-10-29.md`](functional-closure-live-findings-2026-10-29.md), secção 6. Nenhuma alteração de base de dados ou de Auth foi aplicada.

No código, foram introduzidas máquinas de transição explícitas para oportunidades e candidaturas de parceiros. As acções agora validam estado actual → destino e usam o estado actual como condição da actualização, para rejeitar transições inválidas e actualizações concorrentes obsoletas. A UI de candidaturas apresenta apenas transições permitidas e já não permite ao parceiro marcar uma candidatura como retirada. Foram acrescentados testes unitários para as regras. **A execução desses testes, typecheck, lint e build ainda precisa de confirmação do CI.** O fecho end-to-end continua bloqueado pela reconciliação das migrações e validação de autorização/RLS em ambiente isolado.


A correcção de transições de 31/10 também abrange `listings` do marketplace: criação de máquina de estados, validação nas acções de edição/alteração de estado, updates condicionais contra concorrência e opções de UI limitadas aos destinos válidos. Testes unitários adicionados; o CI dos commits mais recentes ainda está em execução. A validação SQL/RLS e end-to-end permanece pendente.


## 5. Actualização da Fase 1 — verificação de 2026-11-10

A revisão read-only mais recente está documentada em [Fecho da Fase 1 do roadmap de lançamento](./phase-1-architecture-closure-2026-11-10.md). Esta actualização substitui apenas os snapshots datados anteriores quando houver evidência mais recente; não declara os fluxos funcionais concluídos.

- A migration `20261101111659_harden_partner_account_memberships` consta do ledger activo. O helper de contexto exige exactamente uma membership elegível, membership activa, conta `ACTIVE` e perfil de parceiro `ACTIVE`.
- A adição directa de gestores continua bloqueada. O modelo de convite existente não identifica conta de destino nem papel, pelo que não deve ser usado para associar gestores a uma conta existente.
- A contagem SQL e a API de listagem foram novamente comparadas: ambas devolvem 68 versões únicas, sem divergência. A diferença 68/67 observada na primeira leitura não se confirmou.
- A migration `20261102190000_atomic_direct_ad_purchase.sql` existe no repositório e tem teste isolado no CI, mas não aparece entre as versões do ledger de produção consultadas.
- O Security Advisor de 10/11 reportou RLS activo sem políticas em `partner_accounts`, `partner_account_members`, `contact_messages` e `public_rate_limits`; também sinalizou 4 funções SECURITY DEFINER para `anon`, 21 para `authenticated` e protecção contra palavras-passe comprometidas desactivada. Não foram criadas políticas nem revogados grants em massa.
- Foi criado `lib/monetization/state-catalog.ts` e respectivo teste para alinhar os estados de compras de créditos, pagamentos e ordens de serviço aos checks activos do PostgreSQL. O catálogo não presume transições.

**Estado F21 — migrações:** a contagem do ledger está reconciliada entre SQL e API (68/68); continua pendente a correspondência um-para-um entre todos os ficheiros SQL e o esquema nativo.
**Estado F11 — parceiro:** contexto e membership reforçados; convite de gestor para conta existente ainda não implementado.
**Estado F07/F18 — financeiro:** vocabulário de estados alinhado em TypeScript; idempotência, reconciliação e confirmação end-to-end continuam por provar.


## 3.3. Actualização de implementação — conta Parceiro (24/11/2026)

A regra de produto foi consolidada para **um utilizador activo por organização Parceiro**, substituindo a proposta anterior de múltiplos gestores. A função `current_partner_account_id()` exige membership activa, conta activa, portal habilitado e perfil de parceiro activo. A activação inicial atribui o papel `owner`. O Super Admin pode consultar memberships activas e revogar um acesso com motivo obrigatório; a revogação desactiva a membership e regista `ACCESS_REVOKED` no histórico institucional, sem apagar conta ou dados. A interface administrativa só apresenta contas elegíveis sem utilizador activo para novos convites.

Esta actualização descreve implementação estrutural. Não declara a validação integrada concluída.


## 3.4. Actualização de implementação — notificações e governação (25/11/2026)

Implementação adicional no Supabase:
- Notificação ao utilizador quando o Super Admin suspende/reactiva a conta, trata pedido de eliminação ou inicia recuperação de password, usando o stream canónico `account_admin_audit_log`.
- Notificação ao utilizador Parceiro quando o acesso organizacional é revogado, com motivo e referência da organização.
- Notificações por transição de estado para pedidos de compra de créditos, ordens de serviço, pedidos de serviço, campanhas e cobranças de publicidade de parceiros.
- Removido o trigger duplicado de mensagens de suporte; mantém-se o trigger anterior, que distingue destinatário atribuído e restantes Super Admins.
- As notificações são inseridas na mesma transacção da alteração de estado ou evento de auditoria, através de triggers PostgreSQL. Não há dependência de envio de email/SMS para a persistência da notificação interna.

Migrations: `f337_account_governance_and_partner_revocation_notifications`, `f338_remove_duplicate_support_message_notifications`, `f339_business_service_and_partner_lifecycle_notifications`, `f340_use_canonical_account_audit_for_notifications`.

Esta tranche é implementação estrutural. Não foram executados testes integrados ou validações finais.


A cobertura de oportunidades foi ampliada: a alteração do estado de uma candidatura notifica o candidato, e a alteração do estado de uma oportunidade notifica o respectivo titular. O evento de submissão de candidatura já tinha notificação própria para o titular, pelo que esta tranche cobre a fase posterior de acompanhamento.


## 3.5. Correcção de sequência e reconciliação de notificações (25/11/2026)

A referência funcional histórica alcançou F3.73 antes das migrações com sufixos `f337`–`f341`. Esses sufixos são nomes/identificadores de migração, não novos números da sequência funcional. Não reiniciar a sequência em F3.37 nem contabilizar essas migrações como intervenções funcionais F3.37–F3.41.

A função activa `notify_support_message_recipient()` e o trigger `notify_support_message_recipient_trigger` mantêm a notificação bilateral da Central de Suporte. O trigger adicional F3.73 foi removido para evitar duplicação; a funcionalidade não foi perdida. Em `service_requests`, a F3.72 já regista histórico e notifica atomicamente. Foi removido o trigger genérico sobreposto `service_request_status_notification`, mantendo-se o trigger atómico F3.72 e a função genérica para os restantes fluxos que ainda a utilizam. Migração correctiva: `20261124220337_reconcile_service_request_notification_ownership.sql`.

Não foram executados testes ou validações finais. A referência global permanece em **89% provisórios**, sem recalcular ou aumentar a percentagem nesta correcção.


### Candidaturas a oportunidades — reconciliação de notificações (25/11/2026)

A F3.72 já combinava histórico de estado e notificação do candidato em `capture_opportunity_application_event`. Foi removido o trigger posterior duplicado `opportunity_application_status_notification` e mantida a notificação no fluxo transaccional de captura, sem auto-notificação ao próprio actor. Migração: `20261124220709_consolidate_opportunity_application_status_notifications.sql`. Não foram executados testes/validações.
