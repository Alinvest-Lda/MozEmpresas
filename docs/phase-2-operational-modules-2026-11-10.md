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


### Entrega F2.2 — prevenção de pedidos duplicados de compra de créditos (19/11/2026)

- Antes de carregar comprovativos, a acção verifica se a empresa já tem uma compra em `REQUESTED` ou `PAYMENT_PENDING`.
- Quando existe pedido pendente, a nova submissão é bloqueada e a interface explica que deve aguardar a resolução do pedido existente.
- Esta verificação reduz duplicados acidentais, mas **não é atómica**: uma constraint/índice e operação transaccional no banco continuam necessárias para impedir duplicação concorrente. Não foi aplicada alteração ao schema.
- Commits: `b8b48a6` (server action) e `d7fe879` (mensagem UX).
- CI não foi executado/confirmado nesta intervenção; testes integrados continuam reservados para a fase final.


### Entrega F2.3 — detalhe de pedidos no painel Super Admin (19/11/2026)

- O painel de créditos agora apresenta, em cada pedido, a indicação de comprovativo anexado/ausente e as notas submetidas pela empresa.
- Esta informação é apenas metadado de consulta; não expõe o caminho interno do ficheiro nem disponibiliza o comprovativo. A abertura segura do comprovativo requer endpoint/action com autorização e URL temporário, a desenvolver separadamente.
- Commit: `e48fb1d`.
- CI/deploy não foi confirmado nesta entrega.


### Entrega F2.4 — resumo financeiro de pedidos pendentes no Super Admin (19/11/2026)

- O painel de créditos apresenta agora o valor monetário agregado dos pedidos pendentes (`REQUESTED`, `PAYMENT_PENDING`, `PENDING`) e o volume de créditos correspondente.
- A métrica é calculada sobre os 50 pedidos mais recentes carregados; não é um total histórico completo nem substitui reconciliação financeira.
- O indicador de carteiras mantém o número de carteiras carregadas e passa a mostrar o saldo agregado no texto auxiliar, evitando perder a métrica anterior.
- Ajustado o grid responsivo para acomodar cinco indicadores em ecrãs largos e três em ecrãs intermédios.
- Commits: `07e4e54` (página) e `8826bd9` (CSS).
- Não foram adicionadas acções de aprovação, alterações de schema ou atribuição de créditos. CI/deploy ainda não confirmado.


### Entrega F2.5 — distribuição dos estados dos pedidos de crédito no Super Admin (19/11/2026)

- A secção de pedidos apresenta agora uma síntese por estado, contando separadamente pedidos por validar, a aguardar pagamento, pendentes, pagos, recusados e cancelados (apenas estados presentes nos 50 registos carregados).
- A leitura permite distinguir pedidos que exigem análise de pedidos que aguardam liquidação, sem alterar estados nem conceder créditos.
- Commits: `dff89dc` (contagens e apresentação) e `f13c405` (estilos).
- Sem alterações ao schema, ledger ou fluxo de pagamento. CI/deploy não confirmado nesta intervenção.

### F2.6 — consistência da distribuição de estados de compras (19/11/2026)

- A distribuição administrativa dos pedidos de compra de créditos passou a incluir explicitamente o estado `APPROVED`, que já era reconhecido no mapa de rótulos da página mas estava ausente da lista de estados apresentados no resumo.
- A alteração evita que pedidos aprovados desapareçam da distribuição visual, mantendo-os separados de pedidos pagos (`PAID`).
- A métrica continua limitada aos últimos 50 pedidos carregados e não deve ser interpretada como total histórico.
- Não foram alterados estados financeiros, permissões, saldo de carteiras ou schema.

### F2.7 — consulta protegida de comprovativos de compra (19/11/2026)

- Criado o endpoint `GET /api/admin/credit-purchases/[id]/proof` para disponibilizar comprovativos apenas após validação server-side da sessão e do papel `super_admin` através de `getSuperAdminContext()`.
- O endpoint valida o UUID, consulta apenas o caminho associado ao pedido indicado e gera URL assinada no bucket privado `payment-proofs`, com validade de 60 segundos.
- A resposta usa redirecionamento temporário e cabeçalho `Cache-Control: private, no-store`; o caminho interno do storage não é exposto na página administrativa.
- A listagem de pedidos passou a disponibilizar a ligação “Consultar comprovativo” apenas quando existe `proof_path`.
- A implementação depende de o bucket `payment-proofs` permanecer privado e de as políticas RLS/storage estarem correctamente configuradas. A revisão efectiva dessas políticas e o teste com utilizador não administrador ficam para a auditoria integrada final.
- Não foram alterados pagamentos, saldos, ledger ou schema; não existe ainda aprovação financeira automatizada.


### F2.8 — reconciliação read-only e acesso seguro a comprovativos (19/11/2026)

- Ligação confirmada ao projecto Supabase activo `zikjvjzbbfzrelbkaaci`, PostgreSQL 17.6. O ledger nativo contém 68 migrations, da versão `20260927143639` à `20261101111659`; este inventário confirma o estado activo, mas não substitui o mapeamento conteúdo-a-conteúdo dos ficheiros do repositório.
- A tabela `credit_purchase_requests` está vazia no momento da consulta. A constraint de estado activa permite `REQUESTED`, `PAYMENT_PENDING`, `PAID`, `REJECTED` e `CANCELLED`; os rótulos `PENDING` e `APPROVED` na interface são apenas compatibilidade visual e não devem ser tratados como estados graváveis.
- O bucket `payment-proofs` existe e é privado. As policies Storage activas permitem ao utilizador autenticado ler/enviar apenas objectos na pasta com o seu próprio UUID. Não existe policy de leitura para Super Admin.
- A leitura confirmou uma incompatibilidade no endpoint F2.7: a sessão normal autenticada não satisfaz a policy Storage do proprietário do comprovativo, pelo que a geração do signed URL pelo cliente de sessão podia falhar mesmo após a autorização Super Admin.
- Correcção em código: o endpoint continua a autenticar e autorizar o Super Admin e a obter o caminho do comprovativo com o cliente da sessão; a assinatura do URL temporário passa a usar cliente privilegiado exclusivamente server-side. O URL mantém TTL de 60 segundos e resposta sem cache. O endpoint falha fechado com 503 se a credencial privilegiada não estiver configurada.
- Criado `lib/supabase/service-role.ts`, sem expor a chave ao browser. A variável `SUPABASE_SERVICE_ROLE_KEY` é preferida, com compatibilidade para `SUPABASE_SECRET_KEY`. A configuração efectiva no Vercel e o teste de acesso real ainda precisam de confirmação.
- Advisors de segurança reportaram: 4 tabelas RLS sem policies (contact_messages, partner_account_members, partner_accounts, public_rate_limits); 4 funções SECURITY DEFINER executáveis por anon; 21 executáveis por authenticated; protecção contra palavras-passe comprometidas desactivada. Estes avisos exigem revisão função a função — não se deve revogar permissões em lote sem confirmar o contrato de cada RPC.
- Advisors de performance reportaram 26 casos de policies permissivas sobrepostas e 2 pares de índices duplicados, entre outros índices ainda não utilizados. Não foram removidas policies nem índices: primeiro é necessário verificar consumidores e equivalência exacta.
- Nenhuma DDL, alteração de RLS, reparação de migrations ou mudança de dados foi aplicada nesta intervenção.


### F2.9 — integridade concorrente dos pedidos de créditos (19/11/2026)

- Confirmado por consulta directa que `credit_purchase_requests` não contém pedidos históricos nem estados activos neste momento.
- Aplicada no Supabase a migration `enforce_single_open_credit_purchase_per_business`, criando o índice único parcial `credit_purchase_requests_one_open_per_business_uidx` sobre `business_id` para estados `REQUESTED` e `PAYMENT_PENDING`.
- Esta constraint na base de dados passa a ser a protecção definitiva contra duas submissões concorrentes da mesma empresa. A verificação prévia da aplicação mantém-se para resposta rápida, mas deixa de ser a única barreira.
- Actualizada a Server Action para interpretar PostgreSQL `23505` como pedido pendente, remover o comprovativo carregado na tentativa concorrente e apresentar o erro de pendência em vez de um erro genérico.
- Não foi implementada aprovação financeira nem atribuição de créditos nesta intervenção. O fluxo de liquidação e ledger requer uma RPC transaccional separada, com validação do actor, do estado actual e idempotência do movimento.
- A migration foi aplicada directamente no projecto Supabase activo e registada no ledger. O ficheiro SQL correspondente também é mantido no repositório para rastreabilidade; o histórico anterior permanece sujeito à reconciliação global.


### F3.0 — decisão administrativa transaccional de compras de créditos (19/11/2026)

- Criada a tabela privada `credit_purchase_decision_events`, com um registo de decisão por pedido, actor, estado anterior/novo, nota interna e data. RLS activa e sem acesso directo para `anon`/ `authenticated`.
- Criada a função `admin_decide_credit_purchase` como operação transaccional: valida sessão e papel `super_admin` activo, bloqueia o pedido com `FOR UPDATE`, só permite decidir pedidos em `REQUESTED` ou `PAYMENT_PENDING`, e trata repetição da mesma decisão como idempotente.
- Aprovação: cria/obtém carteira, bloqueia a carteira, soma créditos, regista um movimento `PURCHASE` com referência ao pedido e marca o pedido como `PAID`. Todas as alterações ocorrem na mesma transacção.
- Recusa: marca como `REJECTED` e regista o evento, sem alterar a carteira.
- Índice único parcial em `credit_transactions(reference_type, reference_id)` impede duplicação de movimento de compra para o mesmo pedido.
- Super Admin recebe controlos de aprovação/recusa na lista de pedidos, nota interna opcional e feedback de resultado. A Server Action valida a sessão e a RPC volta a validar a autorização na base de dados.
- Migration aplicada no projecto Supabase activo através das operações `atomic_admin_credit_purchase_decisions` e `validate_admin_credit_decision_input`. O ficheiro consolidado de migração foi adicionado ao repositório; a correspondência exacta dos nomes/versões do ledger do Supabase com os ficheiros locais fica para a reconciliação global de migrations.
- Não foram criados pedidos artificiais nem movimentos de teste na carteira de produção. A validação end-to-end com uma conta Super Admin e comprovativo real permanece pendente.


### F3.1 — referência de pagamento e reconciliação M-Pesa (19/11/2026)

- Auditoria confirmou que o fluxo de compra disponível ao utilizador ainda era manual: seleccionava M-Pesa, registava pedido e aguardava validação administrativa. Não existia endpoint/callback de provedor nem confirmação automática M-Pesa no repositório.
- Aplicada no Supabase a migration `mpesa_credit_payment_reconciliation`: adiciona referência única ao pedido, identificador único de transacção do provedor e data de confirmação; cria tabela privada `credit_payment_events` com unicidade por provedor/transacção.
- Criada a função privilegiada `confirm_mpesa_credit_purchase`: só aceita chamadas com role `service_role`, valida referência, identificador de transacção, montante exacto e moeda MZN, bloqueia o pedido, deduplica eventos, credita a carteira, escreve o ledger e marca o pedido como `PAID` na mesma transacção.
- A Server Action passou a gerar uma referência única `ME...` para cada pedido e classifica pedidos M-Pesa como `PAYMENT_PENDING`. O histórico da empresa apresenta a referência para facilitar identificação e reconciliação.
- **Limite explícito:** esta fase ainda não liga o MozEmpresas ao API/merchant M-Pesa nem recebe callbacks reais. A confirmação automática só será activada quando existir contrato/API do provedor, credenciais merchant, mecanismo de assinatura/autenticação de callback e URL de produção registada. Até lá, a referência não prova pagamento e a atribuição automática permanece desactivada.
- Não foram efectuados pagamentos de teste nem atribuídos créditos artificiais. O teste end-to-end com transacção M-Pesa real está pendente.


### F3.2 — endpoint autenticado de callback M-Pesa (19/11/2026)

- Criado `POST /api/webhooks/payments/mpesa`, em runtime Node.js, para receber eventos de um adaptador/provedor M-Pesa.
- O endpoint exige `MPESA_WEBHOOK_SECRET` e `MPESA_MERCHANT_CODE`; valida HMAC-SHA256 sobre `timestamp.rawBody`, com timestamp Unix em `x-mpesa-timestamp`, assinatura em `x-mpesa-signature` (hex ou `sha256=hex`) e janela anti-replay de cinco minutos.
- O payload normalizado e estrito contém `transactionId`, `paymentReference`, `amount` numérico, `currency=MZN`, `merchantCode` e `status` (`SUCCESS`, `PENDING`, `FAILED`, `CANCELLED`). Merchant, referência e valor são validados; só `SUCCESS` chama a função transaccional de crédito.
- Eventos pendentes/falhados/cancelados são reconhecidos com HTTP 202, sem creditar. Confirmações válidas chamam `confirm_mpesa_credit_purchase` através do cliente service-role; repetições idempotentes não duplicam créditos.
- Adicionados testes unitários para assinatura válida, corpo adulterado, assinatura inválida e timestamp fora da janela.
- **Contrato de integração:** este endpoint recebe um evento normalizado assinado pelo adaptador/gateway. Não é ainda uma implementação do protocolo proprietário de um operador ou agregador. O conector de produção deverá converter o callback real do provedor para este contrato e assinar o corpo com o segredo configurado.
- Activação depende de configurar `MPESA_WEBHOOK_SECRET` e `MPESA_MERCHANT_CODE` no ambiente Vercel e registar o URL `/api/webhooks/payments/mpesa` no adaptador/provedor. Não existem credenciais merchant ou provedor configuradas neste repositório; nenhum pagamento real foi recebido ou simulado.


## F3.3 — Reconciliação operacional de pagamentos e experiência de compra (19/11/2026)

- O painel Super Admin de créditos passou a consultar os eventos de pagamento associados aos últimos 50 pedidos e a cruzá-los com estado, referência, montante e identificador da transacção.
- São assinalados pedidos MPesa marcados como pagos sem evento único correspondente, sem identificador de transacção, ou com referência/montante divergentes; também são assinalados eventos associados a pedidos que não estejam marcados como pagos.
- O painel apresenta o total de pedidos pagos e o respectivo montante apenas dentro da amostra dos últimos 50 pedidos, sem o apresentar como receita histórica total.
- A lista de pedidos passou a expor referência de pagamento, identificador da transacção e instante de confirmação, quando disponíveis.
- A área empresarial de créditos passou a destacar a referência de pagamento e a explicar que a referência identifica o pedido, mas não prova a transferência nem credita automaticamente o saldo.
- Limitação deliberada: o callback actualmente persistido regista apenas confirmações bem-sucedidas. Pagamentos recusados, falhados, expirados ou callbacks rejeitados antes da confirmação ainda não constituem um histórico de eventos consultável. A integração directa com operador/agregador continua dependente de contrato, credenciais e adaptador do fornecedor.
- A reconciliação apresentada é operacional e limitada aos últimos 50 pedidos; não substitui fecho contabilístico, extracto do operador ou reconciliação integral por período.
- Commits: `5787d59c3f06d71aeb37c274ea55dd6afcb6fd55` (painel Super Admin) e `8856db9d295280fa2c63f674b6f21a69dd0acdc6` (área empresarial).
- Validação: os dois ficheiros foram relidos a partir de `main`. O estado Vercel dos dois commits permanecia `pending` no momento do registo; não foram encontrados workflow runs associados. Build, testes e deploy não estão confirmados.


## F3.4 — Auditoria de callbacks e ajustes auditáveis de carteiras (19/11/2026)

- Criada `credit_payment_callback_events`, com RLS activo e leitura exclusiva de Super Admin; conserva metadados dos callbacks autenticados (referência, transacção, montante, estado, estado de processamento, entregas repetidas e timestamps), sem persistir corpo bruto, assinatura ou segredo.
- Criada a RPC `record_credit_payment_callback`, executável apenas por `service_role`, para registar entregas de forma atómica, incrementar contagem de repetição e rejeitar reutilização do mesmo identificador com referência, montante, moeda ou comerciante divergentes.
- O endpoint M-Pesa passou a registar callbacks SUCCESS, PENDING, FAILED e CANCELLED; apenas SUCCESS segue para a RPC transaccional de crédito. Eventos não bem-sucedidos ficam como IGNORED; erros de negócio como REJECTED; indisponibilidade transitória como RETRY.
- O painel Super Admin passou a mostrar a fila de callbacks, contagem por estado, repetição de entregas e códigos de ocorrência.
- Criada `credit_wallet_adjustment_events` e a RPC `admin_adjust_credit_wallet`: ajuste positivo/negativo requer actor Super Admin activo, motivo (10–500 caracteres), bloqueio da carteira, impedimento de saldo negativo, chave de idempotência serializada e registo atómico de evento, movimento `ADJUSTMENT` no ledger e novo saldo.
- A interface Super Admin passou a permitir ajustes controlados e consultar os últimos 50 eventos de ajuste. Os movimentos anteriores não são apagados nem editados.
- Verificação read-only pós-migração confirmou as tabelas e funções e não encontrou eventos de callback ou ajustes (ambas as tabelas vazias no momento da verificação). Não foram efectuados pagamentos nem alterações artificiais de saldo.
- Limitação: estes ajustes corrigem unidades de crédito; não representam estorno bancário nem devolução de dinheiro ao cliente. O processo de reembolso monetário e integração directa com o operador/agregador continuam dependentes de regras comerciais e integração do fornecedor.
- Commits principais: `9abc9a1` (tabela de callbacks), `1fa3783` (RPC de registo), `b3dd009` (endpoint), `48efe32` (idempotência callback), `65cf9f8` (ajustes), `3966294` (idempotência dos ajustes), `edcccbb`/`a47a4cb` (acção servidor), `5539a35`/`45b9262` (painel Super Admin), `f80b2e8` (estilos).
- Validação: migrações aplicadas no Supabase e verificações read-only executadas. Build, testes automatizados e deploy Vercel não confirmados.

- Teste transaccional read-only/rollback do recorder de callbacks: primeira entrega criou um evento dentro da transacção, a repetição idêntica incrementou o contador e uma referência divergente para o mesmo identificador foi rejeitada com `CALLBACK_TRANSACTION_CONFLICT`; a transacção foi revertida e a consulta posterior confirmou zero linhas de teste persistidas.
- Privilégios verificados: `service_role` pode executar `record_credit_payment_callback`; `authenticated` não pode. A RPC de ajustes é executável por `authenticated`, mas valida `auth.uid()` contra membro Super Admin activo dentro da função.
- A função de ajustes ainda não foi exercitada ponta a ponta porque a base de dados não tem carteiras empresariais existentes; nenhum saldo real foi criado ou alterado.


## F3.5 — Reconciliação integral do ledger e relatório financeiro (19/11/2026)

- Criada a RPC `admin_credit_financial_report(p_from,p_to)`, disponível apenas a utilizadores autenticados e com validação interna de membro Super Admin activo. O intervalo é limitado a 366 dias.
- O relatório calcula directamente no PostgreSQL, sem limites de paginação da interface: saldo agregado das carteiras, soma histórica do ledger, divergências por carteira, compras pagas, créditos vendidos, pedidos em aberto, movimentos por tipo/referência e estado dos callbacks.
- O painel Super Admin ganhou filtros de data (por defeito, mês corrente), indicadores consolidados, lista de divergências por carteira e resumo dos movimentos por natureza.
- A comparação de saldo usa a soma de todos os movimentos históricos de cada carteira, e não apenas os 20/50/100 registos apresentados nas listas operacionais.
- Corrigida a função `purchase_platform_service_with_credits`: tentava gravar o tipo `SERVICE_PURCHASE`, que não é permitido pelo CHECK constraint de `credit_transactions`. Passa a gravar `CONSUMPTION` com referência `PLATFORM_SERVICE_ORDER`, alinhando a operação com o ledger existente.
- Alterada a FK `credit_transactions.wallet_id` para `ON DELETE RESTRICT`, impedindo que a eliminação de uma carteira apague em cascata o seu histórico financeiro.
- Criados índices para consultas por carteira/data, referência de callback, pedido de pagamento, pacote e actor dos ajustes.
- Verificação real com sessão autenticada de Super Admin: a RPC devolveu o relatório esperado para 19/11/2026. A base de dados tem actualmente zero carteiras, movimentos, pedidos de compra e ordens de serviço; por isso, o relatório correcto é zero, não foram criados dados artificiais.
- Verificado que `anon` não pode executar a RPC de relatório; `authenticated` pode invocá-la, mas a função só devolve dados depois de validar o Super Admin activo.
- Limitação: os totais de MZN são valores operacionais de compras confirmadas e valores associados a movimentos; não constituem demonstração de resultados contabilística, receita líquida ou reconciliação bancária. Créditos expirados não são calculados porque o modelo actual não define expiração de créditos.
- Commits: `57110a1` (RPC, correcção de consumo e protecção do ledger), `6c5971c` (painel de relatório), `ada08fc` (validação de datas), `273c6d1` (estilos), `4b0735e` (índices).
- Validação: migrações aplicadas; teste autenticado da RPC passou; verificação da função de consumo e da FK passou. Build/testes automáticos/deploy final ainda não confirmados.

- Teste transaccional adicional (rollback): a RPC de relatório foi exercitada com dados sintéticos temporários (compra +100 cr, consumo -20 cr, carteira com 79 cr e pedido pago de 5.000 MZN); identificou correctamente saldo contabilístico de 80 cr, diferença de -1 cr, uma compra paga, 100 créditos vendidos e os dois tipos de movimento. A transacção foi revertida.
- Teste transaccional de ajustes (rollback): ajuste -10 cr alterou saldo e ledger de 100 para 90; repetição da mesma chave devolveu já processado sem duplicar o evento; reutilização da chave com valor diferente foi rejeitada. A transacção foi revertida.
- Consulta posterior confirmou zero carteiras, zero movimentos, zero pedidos e zero ajustes persistidos. Nenhum dado comercial real foi modificado.
- Advisors após os índices: as ocorrências de chaves estrangeiras sem índice no projecto baixaram de 42 para 34; os restantes avisos reportados são preexistentes e não foram alterados nesta fase.

## F3.6 — Integridade do consumo publicitário de créditos (19/11/2026)

- Reforçada a RPC `purchase_promotion_with_credits` para serializar a verificação de capacidade por produto através de bloqueio de linha `FOR UPDATE`, impedindo que compras concorrentes ultrapassem a capacidade comercial configurada.
- A operação continua transaccional: débito da carteira, criação da campanha, registo no ledger e definição dos alvos são confirmados ou revertidos em conjunto.
- A RPC valida a empresa activa e o papel do utilizador, a associação da oferta/listing à empresa, a data de início, limites de segmentação e produto pago activo.
- Revogada a assinatura legada de cinco argumentos; a assinatura com segmentação permanece acessível apenas a utilizadores autenticados e mantém verificação de autorização dentro da função.
- Migração aplicada no Supabase: `20261119190000_f36_advertising_credit_inventory_serialization.sql`. Commit: `8eb4cb3e5a18e5d4475309578dbebb8927e628ff`.
- Limitação de validação: não existem carteiras nem campanhas comerciais no projecto activo para executar um cenário real de compra concorrente. A validação transaccional com dados reais fica pendente; não foram criados dados comerciais artificiais.

## F3.7 — Idempotência de contratação de serviços com créditos (19/11/2026)

- A contratação self-service de serviços da plataforma passa a exigir uma chave UUID de idempotência, persistida em `platform_service_orders` e protegida por índice único parcial por empresa.
- A RPC `purchase_platform_service_with_credits` foi substituída por uma versão com validação de sessão, utilizador, empresa activa e papel autorizado; bloqueia a carteira com `FOR UPDATE`, verifica uma contratação anterior após obter o bloqueio e devolve a mesma ordem em caso de repetição.
- Débito da carteira, criação da ordem, eventual subscrição, movimento de consumo no ledger e documento financeiro continuam numa única transacção.
- O formulário cliente mantém a mesma chave durante tentativas repetidas e só permite submeter depois da sua geração. A Server Action valida o formato UUID e envia a chave à RPC.
- Migração aplicada no Supabase: `20261119200000_f37_idempotent_platform_service_credit_checkout.sql`. Commit da migração: `d50d885ecbdfb66a9c688e173d53b7e383c3c3db`; commits da Server Action e formulário: `7e85aaa28c1cf036000db543eece3b4f2a357df3` e `caf49ce5c2932883bff6c7c853417432fb0e8ecb`.
- Limitação: não existem carteiras e ordens comerciais no projecto activo para executar uma compra real ou concorrente. A confirmação de idempotência foi feita por inspecção da definição, assinatura, índice e privilégios; cenário transaccional com utilizador real fica pendente. Build, testes automáticos e deploy ainda não foram confirmados.

## F3.8 — Ciclo M-Pesa de serviços da plataforma (19/11/2026)

- Criada a RPC `create_mpesa_platform_service_order`: valida sessão e acesso à empresa, serializa retries com advisory lock e cria a ordem `PENDING_PAYMENT` e o respectivo `financial_payments` pendente na mesma transacção. A chave UUID é persistida na ordem; repetição devolve a mesma ordem e pagamento.
- A Server Action passou a usar a RPC, eliminando o fluxo anterior de duas inserções independentes e a possibilidade de ordem sem pagamento associado.
- O webhook encaminha referências `SERVICE:<uuid>` para `confirm_mpesa_platform_service_payment`, sem passar pela RPC de carregamento de créditos. A confirmação valida referência, empresa, montante, moeda, estado e unicidade da transacção do fornecedor; actualiza pagamento e ordem, emite documento financeiro e cria subscrição recorrente apenas depois de confirmação verificada, tudo na mesma transacção.
- Callbacks `FAILED` e `CANCELLED` são tratados por RPC própria, que só altera ordens/pagamentos ainda pendentes e nunca reverte uma ordem já paga. Callbacks `PENDING` ficam auditados sem activar serviço.
- Índices únicos adicionados para chave idempotente M-Pesa por empresa e transacção do fornecedor; referência de pagamento M-Pesa protegida contra duplicação.
- Migrações aplicadas: `20261119210000_f38_atomic_mpesa_service_order_settlement.sql`, `20261119211500_f38_mpesa_service_failure_callback_handling.sql`, `20261119213000_f38_create_subscription_after_verified_service_payment.sql`.
- Commits: migração principal `0ef65084b3979b416aef26e54c650658cf451ef9`; webhook `cc422785bcdcb53a5ac4c75408daa2effe9e6cd7`; Server Action `0fc1fe890286d6eb316e11a1d60119457d28b2c3`; falhas/cancelamentos `014230aa1af637cf7fe3a7e1f864542feb02a6f3` e `1f23d098048d817c45deac34dea94dd69b8ae296`; subscrição pós-pagamento `a0ba2a329f80c009dcf9b706c094423b0256d84e`.
- Limitação: não existe integração directa com protocolo/API real de operador M-Pesa nem credenciais de produção configuradas; o endpoint continua a aceitar o contrato normalizado assinado documentado. Não foram executados pagamentos reais; a validação funcional com conta comercial e callbacks do operador fica pendente. Build e deploy ainda não confirmados.

## F3.9 — Reconciliação administrativa das contratações de serviços (19/11/2026)

- Criada a tabela privada `platform_service_order_events`, com histórico de cada criação e transição de estado da ordem, origem do evento e actor quando disponível. RLS activada e acesso directo a anon/authenticated revogado.
- Trigger de auditoria regista automaticamente inserções e alterações de estado, sem depender da Server Action ou do webhook que originou a transição.
- Criada RPC `admin_service_payment_reconciliation`, que verifica explicitamente a associação activa Super Admin antes de devolver ordens, empresa, serviço, pagamento M-Pesa, referência, transacção do fornecedor, datas e histórico.
- Reconciliação sinaliza pagamento M-Pesa em falta, diferença de montante/moeda, ordem marcada paga sem pagamento confirmado, pagamento confirmado em ordem pendente/falhada/cancelada e confirmação sem identificador ou timestamp.
- A RPC limita a consulta aos 500 registos mais recentes e não altera dados. Pedidos pagos por créditos não são indevidamente classificados como pagamentos M-Pesa em falta.
- Nova página `/dashboard/admin/monetizacao/servicos`, ligada à Central de Monetização, com indicadores, filtros por estado, filtro de ocorrências e histórico de transições. É deliberadamente read-only nesta fase; não há estorno ou cancelamento administrativo exposto sem política de elegibilidade e transacção compensatória implementadas.
- Migrações aplicadas: `20261119220000_f39_service_order_audit_and_admin_reconciliation.sql` e `20261119223000_f39_reconciliation_credit_orders_and_actor_hardening.sql`.
- Commits principais: `7f540206dffb796e7f5c50c9205671d102d3c213` (migração), `69f6c7fecbb931d69c3b05077a3387c15c1ab9f5` (página), `6e6fd7e5a22c8003d30e46f3e0b82d4ae80a44f0` (estilos), `a12ee56935dbd894eddd47634c8fdd138f150727` (ligação à central), `c7c7f3457509d39efe092b21dfd4b8acc80e3f4b` (correcção da reconciliação).
- Limitação: não há ordens, pagamentos ou documentos no ambiente activo para validar visualmente casos reais; a contagem consultada foi zero. Não foram feitos pagamentos reais. Build e deploy ainda não confirmados.

## F3.10 — Cancelamento e ajustamentos financeiros de serviços (19/11/2026)

- Criada `platform_service_adjustments`, trilho imutável com unicidade por ordem e referência externa única, contendo tipo, montante, créditos, pagamento original, motivo, actor e data. RLS activa; leitura apenas por membros autorizados da empresa e Super Admin; escrita privilegiada por RPC.
- Criada RPC transaccional `admin_cancel_platform_service_order`, que verifica Super Admin activo, bloqueia a ordem, verifica elegibilidade, impede duplicação e executa em conjunto o cancelamento, ajuste financeiro, subscrição e documento.
- Contratações pagas com créditos: devolve os créditos à carteira e insere movimento compensatório `REFUND` em `credit_transactions`; o movimento original de consumo não é apagado.
- M-Pesa pendente: marca pagamento falhado e cancela a ordem, sem criar reembolso fictício.
- M-Pesa confirmado: exige referência do reembolso externo já executado pelo operador; regista `REFUNDED`, cancela a ordem e subscrição, invalida o documento e conserva referência, motivo e actor. A plataforma não executa transferência de dinheiro nem comunica directamente com o operador.
- Ordens concluídas, falhadas, já canceladas, sem pagamento elegível ou sem referência externa são recusadas. Chave única por ordem impede segundo estorno.
- Nova Server Action protegida e formulário na página Super Admin de reconciliação. A empresa e o Super Admin conseguem consultar o ajustamento e o respectivo histórico.
- Migrações aplicadas: `20261119230000_f310_service_order_cancellation_and_compensating_refunds.sql` e `20261119231500_f310_admin_read_service_adjustments.sql`.
- Commits: migração `8c81caf961e8ea3adb181d3771f217aa9fb1a8b1`; Server Action `cfcb56b356b973c25c49c9e17e5452b248845d0a`, `f4b63c5c5d948080e74a92c723505e736c746f17`; formulário `5ebdc8965e73a726abbbd26a13d6d8faa04c6487`; histórico cliente `528de19c980017ae265007f9cd3a454c1cd12e48`; acesso Super Admin `14e370cf7e0d5db452ffef26cec75fb95ea8750e`; painel de histórico `5b44c98bbb48b3f19e5008d9a7585143c1d55fb2`; CSS cliente `d02014eca0f84d4ee56d73cd80c87242908f8037`.
- Limitação operacional: reembolso M-Pesa continua a depender da execução no operador e da introdução da referência externa pelo Super Admin. Sem API de operador configurada, não existe reembolso automático.
- Não foram executados estornos reais nem testes com transacções reais, dado que o ambiente activo não tem ordens/pagamentos de serviço (a tabela de ajustamentos está vazia). As verificações de catálogo confirmam a RPC instalada, RLS activa e execução anónima bloqueada. O check Vercel dos commits desta intervenção está em falha por limite de builds da conta (build-rate-limit); não é possível declarar build/deploy validado.


## F3.11 — Tratamento explícito de conflitos no callback M-Pesa (22/11/2026)

- Corrigida a resposta HTTP do webhook quando a mesma transacção do operador chega com referência, montante, moeda ou comerciante divergentes: o recorder de auditoria devolve `CALLBACK_TRANSACTION_CONFLICT`, agora traduzido em HTTP 409 (conflito), em vez de 503 (indisponibilidade temporária).
- Falhas de base de dados/serviço que não sejam conflito de integridade continuam a devolver 503, evitando classificar problemas transitórios como erros do cliente.
- Criado helper puro `classifyMpesaCallbackAuditError`, evitando lógica de classificação duplicada no endpoint e sem expor mensagens de base de dados.
- Adicionados testes unitários para conflito e falha transitória, além da suite de assinatura existente.
- Commits: helper `14f7cf079c6fd5411acd1326dd4fc4c3aed08eeb`; endpoint `dd21696a86b2bbbea07b7a8bfa76ea0ab182df84`; testes `5f28f1e7e6fb24d6dfe4ed3a501917f0366ad146`.
- Validação: alterações commitadas em `main`; testes CI/build não executados manualmente neste ambiente. Deploy de produção F3.10 verificado READY; F3.11 aguarda nova build/deploy.


## F3.12 — Integridade da identidade dos callbacks M-Pesa (22/11/2026)

- O RPC `record_credit_payment_callback` agora rejeita callbacks repetidos para a mesma transacção e estado quando a referência de pagamento, valor, moeda ou merchant code divergem dos valores da primeira entrega.
- Repetições com dados idênticos continuam a incrementar delivery_count e preservam PROCESSED quando já processado; callbacks conflitantes levantam `CALLBACK_TRANSACTION_CONFLICT`, que o endpoint traduz em HTTP 409.
- Migração aplicada no Supabase: `20261122100000_f312_mpesa_callback_identity_conflict_guard.sql` (45d20c9). A confirmação de catálogo do RPC foi consultada depois da aplicação.
- Testes unitários adicionados/actualizados no helper de classificação; CI do commit F3.11 confirmou estado Vercel success. Testes SQL específicos de concorrência ainda não foram executados.


## F3.13 — Cancelamento seguro de campanhas empresariais (22/11/2026)

- Corrigido constraint de estado de `business_promotions` para incluir DRAFT, compatível com o default da tabela.
- Implementado RPC `admin_cancel_business_promotion`, Super Admin-only, com lock da promoção, validação de elegibilidade (antes do início, estados PENDING/ACTIVE), motivo obrigatório, idempotência por registo único e trilha auditável.
- Cancelamentos pagos por créditos estornam saldo e lançam transação REFUND atomicamente; M-Pesa pendente pode ser cancelado sem inventar reembolso; campanhas M-Pesa já ACTIVE não são canceladas sem refund externo.
- Adicionado painel de cancelamento na fila Super Admin, com mensagem diferenciada de sucesso, não elegível e reembolso externo obrigatório.
- Migração aplicada: `20261122110000_f313_safe_business_promotion_cancellation.sql`; commits `3c4d020` (migration file), `5d98dd0` (server action), `c3b6337` (admin UI), `87bf2dc` (styles). Deploy aguarda.
- Limite: fluxo de reembolso MPesa é operacional externo, não foi automatizado; campanhas não são alteradas se reembolso externo não tiver sido realizado.

- F3.13 hardening adicional: removida a opção CANCELLED do selector de moderação e da allowlist da Server Action. Cancelamento não pode mais ser feito por alteração de estado simples, contornando o fluxo de estorno/auditoria; usa exclusivamente RPC de cancelamento.
- Commits de hardening: `bebdf1f` e `698c152`.

## F3.15 — Reconciliação financeira integrada (22/11/2026)

- Criada a RPC `admin_financial_operations_overview()`, exclusivamente para consulta administrativa e com verificação server-side de membro activo `super_admin`.
- O resumo consolida pagamentos por estado/método, documentos por estado/tipo, pedidos de créditos, campanhas publicitárias, saldos de carteiras e estornos registados.
- Indicadores de divergência: saldo da carteira vs. ledger, pagamento/documento com estados incompatíveis, compra de créditos paga sem movimento PURCHASE, ordens de serviço com inconsistência de pagamento e callbacks que exigem revisão.
- A RPC foi aplicada por migration, com EXECUTE revogado de PUBLIC/anon e concedido a authenticated/service_role; o corpo valida explicitamente o Super Admin.
- A página `/dashboard/admin/monetizacao` consome a RPC e apresenta a reconciliação consolidada. Em caso de erro, não substitui dados por zeros: apresenta indisponibilidade.
- Teste read-only executado em transacção com contexto de Super Admin e rollback: a RPC devolveu JSON válido. Resultado actual: sem carteiras, pagamentos, documentos, compras de créditos ou campanhas; zero divergências nos indicadores calculáveis. Isto não equivale a teste transaccional com movimentos reais.
- Restrições confirmadas no schema: pagamentos aceitam `REFUNDED`, documentos aceitam `VOID`, ledger aceita `REFUND`. Não foi necessária alteração desses estados.
- Deploy automático do commit da interface está em curso; só considerar publicado após estado Vercel `READY`.

## F3.16 — Reconciliação financeira exaustiva (22/11/2026)

- Actualizada a RPC `admin_financial_operations_overview()` para contar todas as ordens de serviço, sem depender do limite operacional de 500 linhas da consulta detalhada.
- A reconciliação agora detecta pagamentos com `document_id` órfão (referência a documento inexistente), além de incompatibilidades entre estado do pagamento e estado do documento.
- O resumo continua protegido por verificação explícita de membro activo `super_admin`; EXECUTE permanece revogado de PUBLIC/anon e concedido a authenticated/service_role para permitir a chamada da página administrativa com autorização interna.
- Verificação de catálogo confirmou a assinatura, permissões e implementação da contagem integral. Consulta directa actual: 0 ordens de serviço; 0 divergências calculáveis. Sem movimentos reais, não é possível certificar cenários de estorno e liquidação ponta a ponta.
- Migration aplicada em produção: `20261122103803_f316_exhaustive_financial_reconciliation`.
- Deploy F3.15 confirmado READY antes desta alteração de base de dados. F3.16 não altera a interface; a RPC em produção foi actualizada directamente no Supabase.
- A interface administrativa passou a mostrar também a quantidade total de ordens de serviço verificadas pela reconciliação integral (commit `a956149f`); a publicação desta actualização aguarda build Vercel.

## F3.17–F3.19 — Cobertura de índices de relações e fecho de performance (22/11/2026)

- Aplicadas três migrations de cobertura de índices para relações de chave estrangeira em fluxos financeiros, documentos, compras de créditos, estornos, ordens e subscrições de serviços, campanhas publicitárias, pedidos de publicidade, auditoria, notificações, oportunidades, comércio e suporte.
- F3.17: 13 índices para relações financeiras, campanhas e ordens de serviço.
- F3.18: 8 índices adicionais para pedidos e campanhas publicitárias, eventos de serviço, subscrições e trilhos de decisão/ajuste de créditos.
- F3.19: 18 índices para as restantes relações de chave estrangeira no schema public.
- Validação pós-migration: 39 índices novos verificados; zero relações FK sem índice de cobertura no schema public.
- As migrations foram aplicadas no Supabase e os três ficheiros correspondentes foram registados no repositório:
  - `20261122104213_f317_financial_ads_service_fk_indexes.sql`
  - `20261122104224_f318_advertising_service_audit_indexes.sql`
  - `20261122104241_f319_public_platform_fk_index_coverage.sql`
- A auditoria Performance continua a sinalizar duas FKs no schema privado `private.partner_access_grants`, que ficam fora desta cobertura pública e serão tratadas com validação específica do schema privado.
- Não foram removidos índices existentes, nem alteradas políticas RLS nesta intervenção. Os avisos de índices não utilizados não foram tratados como autorização para apagar índices, dado o baixo volume actual de dados e a ausência de tráfego representativo.
- Estado dos módulos de dados: cobertura de FK no schema public concluída. Isto é melhoria de desempenho e integridade de relações, não prova isolada de que os fluxos de pagamento, estorno ou entrega de anúncios foram testados com transacções reais.

## F3.20 — Isolamento por empresa e hardening RLS (22/11/2026)

- Corrigida a política de leitura de `business_promotion_cancellations`: a condição de associação compara agora `business_members.business_id` com o `business_id` do registo, eliminando a comparação tautológica anterior que podia permitir leitura cruzada entre empresas.
- O acesso de leitura permanece limitado ao proprietário da empresa, membros com papel owner/admin/operator e Super Admin activo.
- Optimizadas as políticas de leitura e actualização de `platform_service_subscriptions`: chamadas a `auth.uid()` passaram a subconsultas estáveis, preservando a verificação de proprietário/membro e o acesso administrativo activo. UPDATE mantém `USING` e `WITH CHECK`.
- Criados índices para as duas FKs privadas de `private.partner_access_grants`; a consulta de catálogo confirmou zero FKs sem índice nesse schema.
- Verificação pós-migration confirmou as expressões das três políticas, o escopo por empresa e os dois índices privados.
- Migration aplicada em produção: `20261122104536_f320_tenant_scoped_cancellation_rls_and_private_fk_indexes`.
- O advisor de segurança continua a listar 4 RPCs SECURITY DEFINER acessíveis a anon para decisões públicas de publicidade e validação de convite, e 29 acessíveis a authenticated. A maioria são operações de negócio intencionais com autorização interna; continuam a exigir revisão função a função. Não foram revogados acessos em massa para evitar quebrar o portal, a publicidade pública, os parceiros ou os checkouts.
- O advisor ainda sinaliza tabelas com RLS sem políticas; os privilégios directos permanecem bloqueados a anon/authenticated em tabelas internas de eventos, contacto, parceiros e rate-limit. Não foram adicionadas políticas de leitura/escrita genéricas.
- A auditoria de performance ainda identifica 27 pares/grupos de políticas permissivas sobrepostas e 6 casos de auth initplan. F3.20 corrigiu os três casos identificados nesta intervenção; a consolidação dos restantes requer análise por tabela e teste de isolamento multi-tenant.

## F3.21 — Integridade do ciclo de compras de créditos (22/11/2026)

- Consolidada a política SELECT de `credit_purchase_requests`: requerente, proprietário da empresa e membros activos da plataforma passam a partilhar uma única política explícita.
- Removida a política de UPDATE administrativo directo e revogado UPDATE a `PUBLIC`, `anon` e `authenticated`. As decisões de aprovação/rejeição passam exclusivamente por `admin_decide_credit_purchase()`, que verifica Super Admin activo, bloqueia a requisição e actualiza carteira + ledger de forma transaccional.
- Consolidada a leitura de `platform_service_adjustments` numa política que cobre proprietário, membros autorizados e Super Admin activo.
- Verificação pós-migration: `authenticated UPDATE=false`, `anon UPDATE=false`, `service_role UPDATE=true`, `authenticated SELECT=true`. A RPC de decisão permanece executável por authenticated, mas valida Super Admin no corpo; anon EXECUTE=false.
- Migration aplicada no Supabase: `20261122105012_f321_credit_purchase_write_lockdown_and_rls_consolidation`.
- A interface Super Admin já usa a RPC `admin_decide_credit_purchase`; a compra por webhook continua a usar RPC separada de service_role. Não foram alterados os fluxos de checkout do cliente.
- A auditoria continua a exigir análise das políticas de publicidade e das RPCs SECURITY DEFINER restantes. Não foram aplicadas revogações generalizadas.

## F3.22 — Hardening de endpoints públicos de publicidade e convites (22/11/2026)

- Endurecidos os `search_path` de quatro funções `SECURITY DEFINER`:
  - `get_ad_decision(text,uuid,text,text,jsonb)`
  - `home_ad_slots()`
  - `record_ad_interest(text,uuid,text[],jsonb)`
  - `partner_access_validate(text)`
- `pg_temp` foi explicitamente colocado no final do caminho de pesquisa, impedindo que objectos temporários sombreiem objectos confiáveis usados pelas funções privilegiadas.
- Preservada a execução anónima intencional dos endpoints públicos de entrega de anúncios, recolha de interesse e validação de convite. Não houve revogação indiscriminada de EXECUTE.
- Verificação pós-migration: os quatro caminhos de pesquisa estão definidos explicitamente; os privilégios anon/authenticated mantêm-se como esperado.
- Migration aplicada no Supabase: `20261122110210_f322_harden_public_definer_search_paths`.
- O advisor continua a listar as quatro funções por serem `SECURITY DEFINER` acessíveis a anon; esse alerta é esperado enquanto os endpoints públicos forem mantidos. O hardening reduz o risco de object shadowing, mas não substitui validação de parâmetros, rate limiting e testes de abuso.
- Ainda não foi executado teste transaccional de compra, entrega ou cancelamento de campanha com pagamentos reais. A validação desta fase cobre configuração de segurança e metadados, não a operação ponta-a-ponta.

## F3.23 — Concorrência e capacidade de campanhas de parceiros (22/11/2026)

- Corrigida a verificação concorrente de capacidade em `partner_ad_request`: a função bloqueia agora a linha do produto com `FOR UPDATE` antes de contar reservas/campanhas sobrepostas e inserir o novo pedido.
- Pedidos simultâneos para o mesmo produto passam a serializar no mesmo registo de produto, evitando ultrapassar a capacidade por corrida entre transacções.
- O payload de segmentação passou a aceitar apenas arrays JSON com máximo de 20 elementos; os tipos permitidos e o limite de 160 caracteres por valor foram preservados.
- Mantida a autorização por conta de parceiro e papel owner/manager, sem expor execução anónima.
- Verificação pós-migration: definição contém o bloqueio de linha e limite de segmentação; `SECURITY DEFINER` mantido com `search_path=public, pg_temp`; EXECUTE anon=false e authenticated=true.
- Migration aplicada no Supabase: `20261122111500_f323_partner_ad_capacity_lock_and_target_limits`.
- Não foi simulada concorrência com múltiplas sessões reais; a correcção foi verificada por catálogo/definição da função. Teste de carga concorrente permanece na validação integrada.

## F3.24 — Integridade da telemetria publicitária (22/11/2026)

- Reforçadas as constraints de `ad_delivery_events`: origem apenas `business|partner`, eventos apenas `IMPRESSION|CLICK`, visitor_key entre 16 e 200 caracteres e contexto JSON object.
- Todas as constraints foram validadas no banco. Foi detectada uma constraint pré-existente para o tipo de evento; removi a duplicação criada na primeira aplicação e mantive apenas a constraint validada final.
- Criada a função trigger `validate_ad_delivery_campaign_reference()` como SECURITY INVOKER, com `search_path=public,pg_temp`. Cada evento passa a exigir campanha existente e correspondência exacta de surface/slot com a campanha de negócio ou parceiro referenciada.
- Trigger `ad_delivery_campaign_reference_guard` activo em INSERT e em alterações às colunas de referência/contexto.
- Verificação pós-aplicação: quatro constraints relevantes validadas, trigger activo e sem registos históricos inválidos. A tabela ainda não contém campanhas/eventos em produção (0 campanhas de negócio, 0 campanhas de parceiros, 0 eventos), pelo que não foi possível executar um teste positivo de entrega com campanha real.
- A escrita directa continua bloqueada para anon/authenticated por privilégios de tabela; a política INSERT existente não concede privilégios por si só. service_role mantém INSERT.
- Migrations no repositório: `20261122113000_f324_ad_delivery_event_integrity_and_campaign_reference_guard` e `20261122113100_f324b_remove_duplicate_ad_event_type_constraint`.
- Limitação funcional identificada: ainda não existe relação financeira/documental persistida para campanhas de parceiros (`partner_ad_campaigns`), e a tabela de eventos não tem preço, custo ou referência de facturação. A medição de impressões/cliques é telemetria, não prova de cobrança. O fecho de monetização exige criar o fluxo de cobrança/recibo e reconciliação do parceiro antes de classificar métricas como facturáveis.

- Testes negativos controlados executados em bloco transaccional: referência de campanha inexistente rejeitada com `AD_CAMPAIGN_NOT_FOUND`; origem inválida rejeitada com `INVALID_CAMPAIGN_SOURCE`. Nenhum evento de teste foi persistido.
- Compatibilidade de migration revista antes do deploy: a migration versionada usa um nome temporário distinto da constraint já existente no schema base; a migration seguinte remove apenas a duplicação temporária criada durante a aplicação directa em produção. Assim evita-se colisão de nomes na sequência de migrations.
