# Execução consolidada dos P0 — 2026-11-01

**Repositório:** Alinvest-Lda/MozEmpresas, branch main  
**Supabase:** zikjvjzbbfzrelbkaaci  
**Regra:** não criar branch pago; não executar DDL, alterações de grants, RLS, funções ou dados na base de produção. Foram feitas consultas read-only ao Supabase e alterações de código/documentação no repositório.

## 1. Resultado executivo

A execução consolidada avançou em todas as frentes que podem ser tratadas com segurança no estado actual. **Os P0 não estão integralmente encerrados**: faltam um ambiente isolado para validar alterações de banco de dados e contas de teste para percorrer fluxos autenticados. Não se deve declarar o produto pronto para lançamento comercial amplo.

## 2. Alterações de código efectuadas

### Workspace de Parceiros — visão geral

Commit: 229ac007e705cd3460543bac4077d7027db9a02c

- O estado apresentado no topo passa a reflectir o estado real da conta (ACTIVE, SUSPENDED ou estado pendente), em vez de exibir sempre “Conta activa”.
- A contagem de gestores deixa de apresentar zero quando a consulta falha; passa a indicar indisponibilidade.
- Erros no carregamento de publicações deixam de ser interpretados como ausência de publicações para determinar a próxima acção.
- A página continua a distinguir falha de consulta de lista vazia.

### Inteligência / indicadores

A página app/parceiro/inteligencia/page.tsx já está redigida como **Indicadores da actividade** e declara expressamente que não oferece estudos sectoriais, tendências ou benchmarks. Também separa pedidos individuais dos registos partilhados da organização e mostra erros de carregamento. A auditoria anterior estava desactualizada nesta dimensão; não foi necessária nova alteração.

### Conta e gestores

A página app/parceiro/conta/page.tsx mantém suspensa a associação directa de gestores e informa que os convites estão em preparação. Esta protecção de interface é mantida até existir convite vinculado à conta-alvo e claim seguro.

## 3. Integridade e segurança — verificação read-only

### Associação de parceiros

Consulta actual: 1 membership activa; 1 utilizador distinto com membership activa; 0 utilizadores com múltiplas memberships activas; 1 membership activa ligada a uma conta ACTIVE.

A amostra não prova a regra para todos os cenários. A função current_partner_account_id() continua a escolher uma membership com LIMIT 1, sem validar o estado da conta e o estado do perfil. partner_account_context() tem a mesma ambiguidade. partner_account_add_manager() continua executável por authenticated e faz associação directa de um utilizador existente. partner_access_claim() não implementa ainda a aceitação de convite para uma conta-alvo: quando não encontra membership, cria uma nova conta owner.

**Decisão:** não adicionar índice único nem alterar funções/grants em produção sem teste de migração e revisão das dependências. A UI já não expõe a associação directa, mas a RPC continua a exigir correcção na base de dados.

### RLS e SECURITY DEFINER

O Security Advisor actual continua a reportar 4 tabelas com RLS activo e sem políticas (contact_messages, partner_account_members, partner_accounts, public_rate_limits); 4 funções SECURITY DEFINER executáveis por anon; 22 funções SECURITY DEFINER executáveis por authenticated.

A ausência de políticas numa tabela com RLS significa negação por defeito para os papéis abrangidos, mas as funções SECURITY DEFINER podem contornar RLS e têm de ser analisadas como endpoints privilegiados. A tabela private.partner_access_grants está sem RLS; o schema é privado, mas é necessário confirmar grants directos, funções consumidoras e defesa em profundidade antes de mudar o desenho.

**Decisão:** nenhuma revogação genérica, política permissiva genérica ou alteração de grants foi aplicada. A correcção deve ser função a função, verificando auth.uid(), papel, tenant, search_path, grants e testes negativos.

## 4. Migrações — reconciliação actualizada

Comparação executada entre o ledger vivo e os ficheiros actualmente presentes em supabase/migrations: 67 registos aplicados no Supabase; 56 ficheiros SQL no repositório; 32 correspondências exactas por nome-base; 35 registos do ledger sem correspondência exacta; 24 ficheiros sem correspondência exacta no ledger.

A comparação por nome é apenas heurística. Migrações podem ter sido renomeadas, agrupadas, aplicadas manualmente ou incorporadas em ficheiros baseline. **Não executar db push, migration repair, replay ou baseline cutover** com base nesta comparação. O passo seguro seguinte é comparar o SQL de cada ficheiro com as definições vivas do catálogo e produzir uma tabela de equivalência aprovada antes de reconstruir o histórico.

O baseline existente informa que o snapshot é reconstruído do catálogo e não substitui um pg_dump nativo nem um ensaio de restauro limpo.

## 5. Monetização e pagamentos — verificação actual

Consultas read-only ao estado vivo encontraram: 0 commerce_orders; 0 credit_purchase_requests; 0 financial_payments; 0 campanhas de parceiro; 0 pedidos publicitários.

Não há amostra transaccional que permita provar o percurso de compra, pagamento, confirmação, crédito, reversão, reconciliação ou concorrência de inventário. A existência de tabelas e RPCs não prova integração M-Pesa. O desenho tem de distinguir pedido manual com comprovativo de pagamento automatizado por callback/verificação do provedor, com idempotência e reconciliação.

**Decisão:** não activar nem creditar transacções, não marcar pagamentos como confirmados e não prometer pagamento automático sem integração e testes do provedor. O modelo financeiro permanece bloqueador P0.

## 6. Marketplace e operações

Consultas read-only encontraram: 1 oportunidade; 1 candidatura; 0 pedidos comerciais; 0 notificações; 0 tickets e 0 mensagens de suporte; 0 registos nas tabelas audit_logs e access_audit_log.

O esquema inclui políticas de participantes para encomendas, itens e eventos, mas não há volume de operações reais para demonstrar jornadas de comprador/vendedor, transições, cancelamento, conclusão, anexos, notificações ou isolamento entre duas empresas.

**Decisão:** não criar transacções fictícias em produção para simular testes. A validação E2E requer contas de teste e dados num ambiente isolado.

## 7. Super Admin e auditoria

A existência das páginas e das guardas administrativas não comprova cada mutação. O facto de as tabelas de auditoria estarem vazias não demonstra por si só falha de implementação, mas significa que não há evidência de utilização operacional nem de cobertura. Cada acção administrativa e financeira deve ser testada com utilizador sem papel, papel inactivo e Super Admin, verificando resultado persistido, actor, alvo, acção, data, resultado e possibilidade de reversão.

## 8. Estado por frente

| Frente P0 | Resultado nesta execução | Estado |
|---|---|---|
| Conta de parceiro e convites | UI de associação directa suspensa; modelo e RPCs vivos diagnosticados | Parcial; DDL e E2E pendentes |
| Isolamento, RLS e SECURITY DEFINER | Advisors e definições críticas inspeccionados; sem alterações arriscadas | Diagnóstico concluído; correcções pendentes |
| Reconciliação de migrações | Contagens e divergências recalculadas (67 vs. 56; 32 exactas) | Diagnóstico concluído; equivalência SQL pendente |
| Monetização | Tabelas e volume de transacções verificados; nenhuma transacção real encontrada | Não validável sem integração/ambiente de teste |
| Inteligência | Linguagem limitada a indicadores operacionais e limitações explícitas | Fechado na camada de copy |
| Marketplace | Esquema e amostra inspeccionados; sem encomendas reais | E2E pendente |
| Super Admin | Dados de auditoria e módulos financeiros inspeccionados; sem evidência transaccional | E2E pendente |
| Estados e erros no dashboard parceiro | Corrigidos estado da conta, erro de membros e decisão baseada em dados indisponíveis | Código alterado; build pendente |

## 9. Verificação de entrega

O commit 229ac00 foi enviado para main. O status Vercel estava pending no momento da última consulta; só considerar o deploy concluído quando o estado mudar para success/READY. Não foi executado teste E2E autenticado.

## 10. Condições para fechar os bloqueadores restantes

1. Disponibilizar ambiente de staging/branch isolado ou aceitar formalmente um ambiente de teste equivalente, com custo e ciclo de vida controlados.
2. Reconciliar todas as 67 migrações aplicadas com os 56 ficheiros SQL, lendo e comparando conteúdo e catálogo.
3. Implementar convite multi-gestor por account_id, token hash, email normalizado, expiração, revogação, uso único e claim atómico; impedir segunda membership activa por utilizador.
4. Rever cada função SECURITY DEFINER e política RLS, com testes positivos e negativos por papel e tenant.
5. Integrar ou definir explicitamente o pagamento manual; provar idempotência, confirmação, crédito, reversão e capacidade concorrente.
6. Executar testes E2E com pelo menos duas empresas, dois parceiros/gestores, comprador, vendedor, utilizador normal e Super Admin.
7. Validar auditoria, notificações, suporte e estados de falha em todos os percursos.

**Conclusão:** foram executadas as intervenções seguras disponíveis, incluindo uma correcção concreta no dashboard de parceiro, actualização de evidência e revisão do estado do banco. Os bloqueadores que exigem alterações de esquema ou testes com múltiplas identidades permanecem explicitamente abertos; não foram simulados nem marcados como concluídos.