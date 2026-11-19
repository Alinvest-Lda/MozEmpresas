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

## 3.1 — Entregas de 19/11/2026

### F2.5 — Notificações e suporte (código aplicado)
- As acções de leitura de notificações validam UUID, sessão autenticada e propriedade do registo; só actualizam notificações ainda não lidas.
- Criada máquina de estados para atendimentos: `OPEN`, `IN_PROGRESS`, `WAITING_USER`, `RESOLVED` e `CLOSED`.
- A fila Super Admin passou a apresentar apenas transições permitidas, com compare-and-set sobre o estado previamente lido.
- O fecho grava `closed_at`; atendimentos fechados não aceitam novas respostas.
- Respostas do utilizador reabrem atendimentos resolvidos ou devolvem atendimentos à equipa quando aguardavam o utilizador.
- As respostas actualizam a actividade do ticket com controlo concorrente. Se a mensagem for guardada mas o estado mudar em simultâneo, a interface informa que não deve ser reenviada.
- Adicionados testes unitários da máquina de estados do suporte.

### F2.1 — Reforço de acesso ao workspace de parceiros (código aplicado)
- As páginas de visão geral, conta, inteligência, oportunidades, candidaturas, publicidade, pedidos publicitários, serviços e resultados passaram a exigir `requirePartnerAccount()`.
- O controlo central valida sessão, perfil activo, classificação de parceiro, contexto da conta, estado activo da conta e membership.
- O fluxo de convites de gestores continua suspenso; não foi reactivada a RPC legada de associação directa.

### Bloqueios de schema confirmados — não contornar
- O esquema activo não dispõe da RPC transaccional de aprovação de compras de créditos nem da unicidade por referência no ledger. A aprovação financeira permanece apenas de consulta.
- `partner_access_grants` não contém conta-alvo nem papel pretendido; o convite de gestores exige a migração e as RPCs descritas em `docs/architecture/partner-manager-invitations.md`.
- Reconciliação read-only em 19/11: 58 ficheiros SQL no repositório e 68 versões no ledger activo. Apenas 33 nomes coincidem literalmente; há ficheiros do repositório sem nome correspondente no ledger e versões activas sem ficheiro com o mesmo nome. Isto não prova que as alterações estejam ausentes — indica histórico renomeado/reconciliado de forma incompleta. Não inferir equivalência por timestamp nem executar repair/db push.
- A migration `20261102190000_atomic_direct_ad_purchase.sql` continua fora do ledger activo. Funcionalidades dependentes dela não devem ser activadas em produção.

## 4. Próximas entregas

1. Fechar a reconciliação do histórico de migrations com um mapeamento conteúdo-a-conteúdo, sem aplicar alterações ao projecto activo.
2. Preparar a aprovação/recusa atómica de compras de créditos, incluindo ledger idempotente e registo da decisão.
3. Implementar convites de gestores vinculados à conta e respectivos RPCs, mantendo bloqueada a associação directa legada.
4. Completar os fluxos de oportunidades, publicidade e serviços de parceiros, incluindo estados, permissões e feedback.
5. Completar publicidade empresarial/parceiro e contratação DIRECT apenas depois de confirmar a migration/RPC no ambiente correcto.
6. Concluir os ciclos comerciais de suporte e monetização que não exijam novas estruturas, preservando as regras actuais.
7. Reservar auditoria operacional transversal e testes de validação integrada exclusivamente para a última fase, conforme decisão do projecto.

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


### Entrega de segurança — ciclo de créditos (19/11/2026)

- A máquina de estados deixou de permitir que uma transição genérica altere um pedido para `PAID`.
- `PAID` permanece terminal, mas só pode ser alcançado pela futura operação SQL transaccional que confirma a liquidação, regista o movimento no ledger e actualiza o saldo na mesma transacção.
- Adicionada a função explícita `requiresAtomicCreditPosting` para identificar que a confirmação exige esse caminho privilegiado; não representa autorização para actualizar o estado directamente.
- Os testes unitários passaram a cobrir a rejeição de `REQUESTED → PAID` e `PAYMENT_PENDING → PAID`, transições terminais e estados desconhecidos.
- A interface administrativa continua deliberadamente em modo de consulta. Não foi criada acção de aprovação/recusa, não foram alterados saldos e nenhuma DDL foi aplicada.
- Dependência ainda aberta: a RPC atómica, a unicidade idempotente da referência no ledger e os campos/registo de decisão dependem da reconciliação de migrations e da validação em PostgreSQL isolado.

### Estado de execução e sequência imediata — 19/11/2026

- O CI do commit `733c78ba30147df6a626cdf39b3592b395317ed5` terminou com sucesso (workflow `44514389257`).
- A entrega de segurança acima foi aplicada directamente em `main`; o CI do novo commit deve ser confirmado antes de considerar esta tranche tecnicamente validada.
- Próxima tarefa estrutural: produzir o inventário completo e rastreável das 58 migrations do repositório e 68 versões do ledger, distinguindo correspondência exacta, renomeação provável e ausência de evidência. Não usar timestamp como prova de equivalência e não executar `migration repair`, `db push` ou DDL em produção.
- Só depois do mapeamento e da comparação do schema nativo se deve gerar, via Supabase CLI, as migrations para aprovação atómica de créditos e convites de gestores. A falta de CLI/workspace impede criar migrations válidas nesta sessão; não será inventado um nome/timestamp.


### F2.3 — melhorias autónomas na experiência de compra de créditos (19/11/2026)

- A página empresarial passou a apresentar mensagens distintas para pedido inválido, falta de permissão, comprovativo inválido/em falta e falha de limpeza do ficheiro temporário.
- O sucesso esclarece que o registo do pedido não significa crédito imediato: o saldo só muda após confirmação do pagamento.
- Estados de compra e tipos de movimento passaram a ser apresentados em português, com datas formatadas no fuso `Africa/Maputo`.
- Quando não existem pacotes activos, a página apresenta um estado vazio explícito em vez de deixar a área de compra sem conteúdo.
- Estas melhorias não alteram o contrato financeiro, não aprovam pedidos e não escrevem no ledger.

### Reconciliação read-only — inventário confirmado em 19/11/2026

A leitura directa do ledger activo e do directório `supabase/migrations` confirmou:

| Medida | Resultado |
|---|---:|
| Versões no ledger activo | 68 |
| Ficheiros SQL no repositório | 58 |
| Nomes de migration coincidentes | 33 |
| Coincidência simultânea de nome e versão | 8 |
| Mesmo nome, mas timestamp diferente | 25 |
| Ficheiros sem nome correspondente no ledger | 25 |
| Entradas do ledger sem ficheiro com o mesmo nome | 35 |

Os 25 ficheiros sem nome correspondente incluem 7 baselines legadas numeradas `0001`–`0007`. Os 35 registos sem ficheiro homónimo não significam, por si só, que o SQL esteja ausente: podem corresponder a renomeações, consolidações ou migrações históricas cujo conteúdo não está preservado com o mesmo nome no repositório.

**Limite da evidência:** o ledger guarda versão/nome, não o conteúdo SQL executado. Portanto, coincidência de nome (mesmo com timestamp diferente) não prova equivalência de conteúdo. O próximo passo de reconciliação exige exportação nativa do schema e comparação por objectos (tabelas, colunas, constraints, índices, funções, triggers, policies e grants), além da recuperação dos ficheiros históricos quando disponíveis. Nenhuma alteração foi feita ao schema activo.

### Entrega F2.1 — validação de IDs nas acções de oportunidades (19/11/2026)

- Criado validador de UUID para identificadores de oportunidade/candidatura nas acções server-side.
- As acções de transição rejeitam identificadores malformados antes de consultar a base de dados.
- Adicionado teste unitário para UUIDs válidos, formatos inválidos, valores vazios e strings arbitrárias.
- Commits: `d1cbd0f`, `508e12f`, `91d766f`.
- Esta entrega é hardening do fluxo; não representa fecho do módulo de oportunidades nem validação de integração.

### Entrega F2.1 — controlo de edição de candidaturas (19/11/2026)

- A submissão de candidaturas valida o UUID da oportunidade antes de consultas.
- Candidaturas existentes só podem ter dados de submissão editados enquanto permanecem em `SUBMITTED`; decisões em análise, shortlist, aceite ou rejeitado bloqueiam edição.
- A actualização usa também filtro de estado `SUBMITTED` para reduzir condição de corrida contra mudança de estado.
- Commit: `347f21d`.
- A validação de integração/RLS e concorrência permanece para a fase final.
