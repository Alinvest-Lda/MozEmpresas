# MozEmpresas — Fase 2: módulos operacionais

**Data de início:** 2026-11-10  
**Branch:** main  
**Projecto Supabase:** zikjvjzbbfzrelbkaaci  
**Objectivo:** transformar os módulos existentes em percursos operacionais coerentes, sem duplicar estruturas nem antecipar integrações não configuradas.

## 1. Relação com a Fase 1

A Fase 1 continua parcialmente aberta nos pontos de reconciliação integral das migrations e no convite de gestores de parceiros para uma conta existente. A autorização para avançar para a Fase 2 não elimina esses bloqueios: as entregas abaixo são limitadas a código e testes que não exigem DDL de produção nem enfraquecem os controlos existentes.

Não aplicar migrations, reparar o ledger, alterar RLS ou activar integrações financeiras reais nesta fase sem reconciliação e validação próprias.

## 2. Âmbito operacional

### F2.1 — Parceiros e oportunidades
- Fechar o ciclo de conta, acesso e gestores sem confundir entidade parceira com empresa.
- Manter bloqueada a RPC legada de adição directa de gestores até o convite vinculado à conta estar implementado.
- Consolidar criação, edição, publicação, fecho e arquivo de oportunidades.
- Consolidar a análise de candidaturas, com autorização por conta e histórico.
- Separar funcionalidades de parceiro das áreas do utilizador final.

### F2.2 — Serviços MozEmpresas
- Consolidar catálogo, solicitação e acompanhamento.
- Aplicar transições explícitas aos estados já existentes na base de dados.
- Preservar a separação entre solicitante, operador e Super Admin.
- Garantir que actualizações concorrentes não sobrescrevem estados mais recentes.
- Dar feedback consistente ao solicitante e manter notificações por destinatário.

### F2.3 — Publicidade e monetização
- Consolidar produtos, pedidos, campanhas, inventário e elegibilidade.
- Preservar compras com créditos atómicas e reserva DIRECT/M-Pesa apenas quando a RPC necessária estiver instalada e validada.
- Não creditar carteiras nem activar campanhas com base em comprovativo ou pedido pendente.
- Fechar a reconciliação entre compra, pagamento, campanha e movimento financeiro.
- Manter explícito o estado de dependência quando a migration/RPC ainda não está instalada.

### F2.4 — Super Admin e backoffice
- Unificar filas de moderação, serviços, publicidade, oportunidades, contas e suporte.
- Proteger cada operação com verificação server-side de Super Admin.
- Exigir actualização condicional e resultado confirmado.
- Registar actor, objecto, acção e momento nas operações críticas, reutilizando a estrutura de auditoria existente.
- Não expor funções de gestão global a utilizadores empresariais ou parceiros.

### F2.5 — Integração entre módulos
- Ligar eventos reais a notificações.
- Evitar duplicação de notificações em retries.
- Garantir consistência entre estado de negócio, histórico e interface.
- Cobrir isolamento entre empresas, contas parceiras e utilizadores.

## 3. Entrega implementada — primeira tranche F2.2 (10/11/2026)

Foi confirmada por consulta read-only ao PostgreSQL a constraint service_requests_status_check, com os estados:

REQUESTED, UNDER_REVIEW, QUOTED, ACCEPTED, IN_PROGRESS, COMPLETED, CANCELLED.

Alterações em main:
- Criado lib/services/state-machine.ts com transições operacionais explícitas.
- A acção administrativa updatePlatformServiceRequest agora valida o par estado actual → estado pretendido antes de actualizar.
- O update continua a usar compare-and-set pelo estado previamente lido, rejeitando actualizações obsoletas/concurrentes.
- A validação de entrada passou a aceitar CANCELLED, já suportado pela constraint activa.
- As páginas de Serviços e da fila Super Admin apresentam CANCELLED como “Cancelado”; a fila administrativa permite agora seleccionar explicitamente o cancelamento.
- Criado tests/service-state-machine.test.ts com cobertura de progressão, cancelamento, estados terminais, auto-transições e valores desconhecidos.
- Expandido tests/service-validation.test.ts para cobrir o estado de cancelamento.

### Matriz inicial de transições de pedidos de serviço

| Estado actual | Destinos permitidos |
|---|---|
| REQUESTED | UNDER_REVIEW, CANCELLED |
| UNDER_REVIEW | QUOTED, ACCEPTED, CANCELLED |
| QUOTED | ACCEPTED, CANCELLED |
| ACCEPTED | IN_PROGRESS, CANCELLED |
| IN_PROGRESS | COMPLETED, CANCELLED |
| COMPLETED | Nenhum (terminal) |
| CANCELLED | Nenhum (terminal) |

Estas transições são aplicadas na acção de gestão administrativa. A validação SQL/RLS de todas as vias directas permanece pendente; não declarar a máquina globalmente fechada antes dos testes de integração.

### Entrega adicional F2.1 — moderação de oportunidades (11/11/2026)

- A acção Super Admin `moderateOpportunity` passou a aplicar a máquina `canTransitionOpportunity` já usada no workspace de parceiros.
- A leitura do estado actual antecede a decisão; o update usa compare-and-set pelo estado lido.
- A interface administrativa apresenta apenas destinos permitidos e impede seleccionar o estado actual como nova transição.
- A regra aplica-se também ao Super Admin, sem bypass administrativo da máquina de estados.
- A cobertura unitária existente da máquina de oportunidades valida as transições permitidas e proibidas; o CI desta alteração ainda aguarda confirmação.

### Entrega F2.3 — ciclo de compra de créditos (11/11/2026)

- Criada máquina de estados de compra de créditos em `lib/credit-purchases/state-machine.ts` e testes unitários para progressão, decisões terminais e transições inválidas.
- A página Super Admin passou a identificar `PAYMENT_PENDING` como “A aguardar pagamento” e a incluí-lo correctamente no indicador de pedidos pendentes.
- A revisão do PostgreSQL confirmou que a página de gestão é apenas de consulta e que não existe RPC pública de aprovação de pedidos de crédito.
- A tabela `credit_transactions` não tem índice único por referência de pedido; por isso, aprovar via operações REST separadas seria vulnerável a crédito duplicado ou estado inconsistente.
- Criado `docs/architecture/credit-purchase-approval.md` com contrato de aprovação/recusa, atomicidade, idempotência, auditoria e testes SQL necessários.
- Nenhuma DDL foi aplicada. A RPC transaccional e o controlo único do ledger ficam pendentes da geração de migration pelo Supabase CLI e validação em PostgreSQL isolado.

## 4. Próximas entregas

1. Executar CI para a tranche F2.2 e corrigir falhas que surjam.
2. Confirmar na interface administrativa que todos os estados válidos, incluindo CANCELLED, estão disponíveis e correctamente identificados.
2. Rever a fila Super Admin de pedidos de serviço e os estados apresentados, sem criar nova estrutura de dados.
3. Mapear o ciclo de aprovação/recusa de compras de créditos e os efeitos atómicos no ledger financeiro.
4. Completar os fluxos de oportunidade do parceiro com estados, autorização e feedback.
5. Implementar o contrato de convites de gestores quando a migração puder ser gerada pelo Supabase CLI e validada em PostgreSQL isolado.
6. Rever o ciclo de publicidade DIRECT/créditos e manter M-Pesa bloqueado onde a RPC não esteja instalada.
7. Fechar auditoria/notificações dos eventos operacionais com testes de isolamento.

## 5. Critérios de aceitação da Fase 2

- Cada módulo tem regra de negócio, actor autorizado, estado e transições definidos.
- As acções server-side verificam identidade, estado da conta, papel e propriedade/tenant.
- Operações concorrentes usam transacção ou compare-and-set.
- Pagamentos, créditos e campanhas só avançam após confirmação válida e idempotente.
- Eventos e notificações não expõem dados entre tenants.
- Testes automatizados cobrem transições válidas/inválidas e autorização negativa.
- CI, build e deployment são reportados separadamente; não confundir READY com validação funcional.
- Nenhuma alteração de produção é considerada aplicada sem evidência do ambiente activo.

## 6. Limitações actuais

- A migração de convites de gestores continua pendente.
- A migração 20261102190000_atomic_direct_ad_purchase.sql continua fora do ledger de produção; o fluxo que depende dela não deve ser declarado activo em produção.
- A reconciliação um-para-um de todos os ficheiros SQL com o esquema nativo continua aberta.
- A tranche de pedidos de serviço aguarda resultado de CI após estes commits.
- Não foram feitas alterações ao Supabase activo nesta tranche.
