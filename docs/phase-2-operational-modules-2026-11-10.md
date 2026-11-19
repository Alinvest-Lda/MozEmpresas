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
