# MozEmpresas — Inventário de estados e transições

**Estado:** inventário baseado no código/migrações, com verificação read-only selectiva do esquema Supabase activo em 2026-10-29.  
**Base:** `main` e projecto Supabase `zikjvjzbbfzrelbkaaci`.  
**Nota:** os estados abaixo são os encontrados no código/schema ou declarados na documentação. Onde não há evidência de uma máquina de estados completa, as transições são marcadas como pendentes; não devem ser presumidas.

## 1. Decisão de domínio confirmada

O marketplace MozEmpresas é uma camada de descoberta e intenção comercial. A migração `20260930003000_marketplace_offline_commerce.sql` declara expressamente que a plataforma **não processa pagamentos nem liquida transacções entre comprador e vendedor**. Negociação, facturação, pagamento, entrega e execução decorrem fora da plataforma. Os estados de pedido servem para rastreabilidade da interacção comercial.

Esta regra é distinta dos pagamentos próprios da plataforma, como compra de créditos, publicidade e contratação de serviços MozEmpresas, que podem envolver cobranças à própria plataforma.

## 2. Inventário por processo

| Processo | Estados encontrados | Transições conhecidas | Lacuna / critério para fechar |
|---|---|---|---|
| Publicação de marketplace (`listings`) | `DRAFT`, `PUBLISHED`, `PAUSED`, `SOLD_OUT`, `ARCHIVED` | A criação observada começa em `DRAFT`. A lista de estados é usada pela moderação administrativa. | Formalizar quem pode executar cada transição e a partir de que estado; validar transições no servidor/SQL, visibilidade e histórico. |
| Pedido comercial marketplace (`commerce_orders`) | `INTERESTED`, `CONTACTED`, `NEGOTIATING`, `AGREED`, `COMPLETED`, `CANCELLED` | Máquina em `lib/commerce/state-machine.ts`: `INTERESTED → CONTACTED/CANCELLED`; `CONTACTED → NEGOTIATING/CANCELLED`; `NEGOTIATING → AGREED/CANCELLED`; `AGREED → COMPLETED/CANCELLED`. | Testar papéis comprador/vendedor, concorrência, histórico e impossibilidade de transição após estado terminal. Sem pagamento/liquidação na plataforma. |
| Oportunidade (`opportunities`) | `DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED` | Leitura pública é condicionada a publicação; janela de candidatura usa `opens_at`/ `closes_at`. | A máquina de transições completa não foi confirmada. Definir rascunho/publicação, edição após publicação, fecho, arquivo e reabertura. |
| Candidatura (`opportunity_applications`) | Valores históricos incluem `DRAFT`, `SUBMITTED`, `WITHDRAWN`; operações de parceiro também podem usar estados de análise. | Inserção permitida quando a oportunidade está publicada e dentro da janela; actualizações do candidato foram restringidas à coluna `status`. | Confirmar lista final de estados e transições para candidato e parceiro; impedir auto-aprovação/alterações arbitrárias; definir estados de revisão, selecção e rejeição com enumeração canónica. |
| Pedido de serviço (`service_requests`) | `REQUESTED`, `UNDER_REVIEW`, `QUOTED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Estes estados estão definidos na migração fundacional. | Validar transições por actor, cotação/aceitação, motivo de cancelamento, notificação, histórico e efeito no serviço contratado. |
| Ordem de serviço (`platform_service_orders`) | O código usa `PENDING_PAYMENT` e `FAILED`; o checkout por créditos usa RPC dedicada. | M-Pesa cria ordem pendente e registo financeiro pendente; se o registo financeiro falhar, tenta marcar a ordem como falhada. | Inventariar os estados SQL completos e o processo que confirma pagamento/activa serviço. Definir expiração, cancelamento, reembolso, renovação e idempotência. |
| Pagamento de serviço/crédito | O código usa `PENDING`; relatórios e schema mencionam estados como `PAID`, `FAILED`, `REFUNDED` noutros contextos. | Não foi encontrada evidência suficiente de integração real M-Pesa end-to-end nesta revisão. | Definir fonte de verdade, confirmação, falha, timeout, callback duplicado, reconciliação e autorização para validação manual. Não creditar nem activar por mera criação do pedido. |
| Pedido de compra de créditos (`credit_purchase_requests`) | O código cria estado `REQUESTED`. | O utilizador submete pacote, método e comprovativo quando transferência bancária. | Obter a lista completa de estados/handlers; definir aprovação, rejeição, comprovativo inválido, crédito único, notificação e trilho financeiro. |
| Publicidade de empresa (`business_promotions`) | Migrações e RPC usam `PENDING`, `ACTIVE`; existem campos de período e capacidade. | Compra com créditos chama RPC transaccional que valida produto, capacidade, saldo e regista consumo. | Definir aprovação/moderação, falha, cancelamento, pausa, rejeição, expiração e eventual reembolso. Verificar concorrência de capacidade para todos os métodos de compra. |
| Pedido de publicidade (`advertising_requests`) | Estado inicial `REQUESTED`. | Formulário público pode inserir pedido. | Definir e validar ciclo de triagem, orçamento, aprovação, contratação, pagamento, produção criativa, activação e fecho. O pedido público não deve ser confundido com campanha paga. |
| Campanha publicitária de parceiro | Existem tabelas de produto, campanha, alvo e entitlement; as políticas protegem leitura por conta. | Não foi confirmada uma máquina completa no código consultado. | Definir estados e relação entre pedido, aprovação, pagamento, vigência, entrega e métricas. |
| Acesso de parceiro (`partner_access_grants`) | `PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`. | RPC de validação expira convites vencidos; claim exige correspondência entre email e utilizador. | Confirmar uso único sob concorrência, reenvio/revogação, associação automática à conta de parceiro e tratamento de conta já existente. |
| Conta de parceiro | Migrações e funções referenciam `partner_accounts.status = ACTIVE`; existe `partner_account_members`. | A função de contexto exige conta activa e membership activa. | Obter esquema completo e lista de estados. Definir suspensão, encerramento, transferência de owner e comportamento de todos os gestores. |
| Ticket de suporte (`support_tickets`) | Criação com `OPEN`, staff pode definir `WAITING_USER`; resposta do utilizador reabre como `OPEN`. | Criar ticket, adicionar mensagem, actualizar estado; há compensação se a mensagem inicial falhar. | Definir `IN_PROGRESS`, `RESOLVED`, `CLOSED` se fizerem parte do modelo, quem pode encerrar, reabrir e SLA. Confirmar estados válidos na base de dados. |
| Conta de utilizador | Código verifica `account_status = ACTIVE` e migrações incluem desactivação própria. | Fluxos críticos redireccionam contas inactivas. | Formalizar suspensão por plataforma, desactivação pelo próprio, reactivação, preservação de dados e efeito em sessões/recursos. |

## 3. Regras de transição transversais

1. Validar o par **estado actual → estado pretendido**, não apenas se o novo estado pertence a uma lista.
2. Validar o actor e o âmbito de propriedade/tenant antes da transição.
3. Usar actualização condicional ou transacção para evitar que duas operações concorrentes concluam transições incompatíveis.
4. Escrever o histórico de estado na mesma transacção sempre que possível.
5. Definir o comportamento quando falha uma notificação depois da transição: usar outbox/retry ou registar uma falha operacional; não fingir atomicidade entre serviços separados.
6. Estados terminais devem ser explicitamente identificados. Reabrir um processo terminal requer uma regra de negócio própria.
7. Os estados de pagamento não devem ser reutilizados como estados de campanha, ordem ou serviço sem regras explícitas de sincronização.
8. Não apagar o histórico financeiro ou comercial para corrigir erros; usar cancelamento, reversão ou movimento compensatório auditável.

## 4. Trabalho pendente imediato

- [ ] Confirmar os estados e transições no esquema activo, em especial `credit_purchase_requests`, `platform_service_orders`, `financial_payments`, `business_promotions`, `partner_ad_campaigns` e `support_tickets`.
- [ ] Comparar a máquina de estados de pedidos comerciais com as operações SQL e políticas RLS.
- [ ] Inventariar todas as acções administrativas que alteram estados e verificar transições, autorização e auditoria.
- [ ] Criar testes para transições permitidas/proibidas e concorrência.
- [ ] Actualizar a matriz funcional quando cada lacuna for confirmada ou resolvida.

## 5. Evidência read-only do esquema activo (2026-10-29)

Foram confirmadas no esquema activo as tabelas `partner_accounts`, `partner_account_members`, `credit_purchase_requests`, `platform_service_orders`, `financial_payments`, `business_promotions`, `partner_ad_campaigns`, `advertising_requests`, `support_tickets` e `platform_members`. Os checks de estado de `credit_purchase_requests`, `platform_service_orders` e `partner_ad_campaigns` correspondem aos valores listados acima. As tabelas públicas verificadas têm RLS activo. A função `current_partner_account_id()` não verifica o estado da conta/perfil, embora `current_partner_opportunity_role()` o faça; incluir esse desvio no fecho de autorização multi-tenant.

O projecto activo apresenta 67 registos de migração, enquanto o inventário do repositório documenta 53 ficheiros SQL e várias diferenças de nome. A existência de tabelas em produção não comprova que a migração correspondente esteja versionada ou seja reproduzível. Não executar `db push`, reparação do ledger ou alterações RLS até reconciliar cada diferença.

## 6. Limitações

Este documento é um inventário inicial do repositório. Não comprova que o esquema activo seja idêntico às migrações, que as migrações tenham sido aplicadas ou que todos os estados sejam utilizados no ambiente publicado. Não aplicar migrações como parte desta auditoria sem reconciliação e aprovação.
