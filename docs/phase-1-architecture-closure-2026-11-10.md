# MozEmpresas — Fecho da Fase 1 do roadmap de lançamento

**Data da revisão:** 2026-11-10  
**Repositório:** `Alinvest-Lda/MozEmpresas`  
**Branch de trabalho:** `main`  
**Projecto Supabase activo:** `zikjvjzbbfzrelbkaaci` (MozEmpresas)  
**Âmbito:** arquitectura, reconciliação do esquema, modelo de parceiro, autorização multi-tenant, estados e regras financeiras.

## 1. Resultado executivo

A Fase 1 fica **parcialmente implementada e documentada**, mas não deve ser marcada como concluída para lançamento. Foram aplicadas alterações seguras ao repositório e confirmadas alterações anteriores no ambiente activo. Permanecem bloqueadores de reconciliação e validação que não podem ser resolvidos por uma migração cega em produção.

### Alterações realizadas nesta intervenção

1. Criado `lib/monetization/state-catalog.ts`, com os vocabulários de estado alinhados aos checks actualmente existentes no PostgreSQL.
2. Criado `tests/monetization-state-catalog.test.ts`, para impedir divergência silenciosa entre o código e os estados financeiros do esquema activo.
3. Reforçado `scripts/ci/verify-partner-account-hardening.sql` para verificar que a RPC legada `partner_account_add_manager(text,text)` continua sem execução para `authenticated` e falha explicitamente até existir convite associado a uma conta.
4. Preservada a regra de que o marketplace regista intenção comercial; não processa pagamentos nem liquida transacções entre comprador e vendedor.

Estas alterações foram feitas em `main`. Não foi aplicada qualquer migração, não foram alteradas políticas RLS em produção e não foram alteradas definições de Auth.

## 2. Reconciliação Supabase — resultado da verificação de 10/11/2026

O projecto correcto foi confirmado como **MozEmpresas**, PostgreSQL 17.6, estado `ACTIVE_HEALTHY`.

Snapshot read-only:
- 59 tabelas no schema `public`.
- 1 tabela no schema `private`.
- 121 políticas RLS inventariadas nos schemas `public` e `private`.
- 29 funções `SECURITY DEFINER` no schema `public`.
- 68 registos no ledger, por consulta SQL directa a `supabase_migrations.schema_migrations`.
- 68 registos na API de listagem de migrações, confirmados numa segunda leitura comparativa.
- As 68 versões são únicas e coincidem entre a consulta SQL e a API; não foram encontradas versões duplicadas, ausentes ou exclusivas de uma das fontes.
- A última versão aplicada é `20261101111659_harden_partner_account_memberships`.

### Estado da reconciliação do ledger

A diferença inicial 68 vs. 67 não se confirmou: uma nova leitura comparativa encontrou 68 versões na consulta SQL e 68 na API, todas únicas e coincidentes. Este ponto fica resolvido para o ledger consultado.

Permanece uma pendência distinta: o repositório contém `supabase/migrations/20261102190000_atomic_direct_ad_purchase.sql`, mas a versão `20261102190000` não aparece no ledger de produção. O próprio ficheiro declara que é repository-only até revisão e aprovação. Não deve ser considerada aplicada nem ser executada automaticamente.

A reconciliação integral dos ficheiros SQL do repositório com as versões aplicadas e com o esquema nativo continua necessária. Não executar:
- `supabase db push`;
- `migration repair`;
- replay de migrations;
- alteração manual do ledger;
- aplicação directa de migrations de hardening.

### Próximo critério de aceitação da reconciliação

Produzir uma tabela um-para-um com: versão do ledger, nome do ledger, ficheiro SQL do repositório, hash/conteúdo, estado de aplicação, dependências e diferença de esquema. A exportação do esquema activo deve abranger tabelas, constraints, índices, views, funções, triggers, grants e políticas. Qualquer divergência deve ter decisão explícita antes de se alterar produção.

## 3. Modelo de parceiro e autorização

### Confirmado no ambiente activo

A migration `20261101111659_harden_partner_account_memberships.sql` já está no ledger de produção e a definição activa foi consultada. Ela:
- impõe no máximo uma membership activa por utilizador através de índice único parcial;
- resolve o contexto apenas quando existe exactamente uma membership elegível;
- exige membership activa, conta `ACTIVE`, perfil do tipo `parceiro` e perfil `ACTIVE`;
- harmoniza `partner_account_context()` com os mesmos critérios;
- revoga a execução da RPC legada de adição directa de gestor.

O teste de integração em CI foi reforçado para proteger a decisão de manter a adição directa de gestores bloqueada.

### Lacuna funcional deliberadamente não mascarada

A tabela `private.partner_access_grants` activa contém `id`, `email`, `token_hash`, `status`, `created_by`, `accepted_user_id`, `created_at`, `expires_at` e `accepted_at`; não contém `account_id` nem papel pretendido. A RPC `partner_access_create(p_email, p_token_hash, p_expires_at)` só permite criação por Super Admin e grava convite sem destino de conta. A RPC `partner_access_claim(p_token_hash, p_user_id)` valida sessão e correspondência de email, mas cria uma nova conta/membership `owner` quando não encontra associação existente. Isso não implementa um convite de gestor para uma conta existente.

Por segurança, a função `partner_account_add_manager` permanece bloqueada. O fluxo de convites de gestores exige uma migration própria, com:
- conta de destino obrigatória;
- papel permitido e validado;
- criador autorizado como owner/administrador da conta ou Super Admin, conforme a regra aprovada;
- token de uso único, hash armazenado e expiração;
- validação de email/sessão;
- associação à conta indicada, sem criar uma nova conta;
- claim atómico e protegido contra concorrência;
- revogação/reenvio e trilho de auditoria;
- testes de isolamento entre contas e de convite inválido/expirado/reutilizado.

Esta implementação fica para a fase de execução funcional depois de a reconciliação do ledger permitir gerar e validar a migration com segurança.

## 4. Segurança e RLS — findings actuais

O Security Advisor de 10/11/2026 reportou:

### RLS activo sem políticas (4 tabelas)
- `public.partner_accounts`;
- `public.partner_account_members`;
- `public.contact_messages`;
- `public.public_rate_limits`.

Nas duas tabelas de parceiro, o desenho parece privilegiar RPCs controladas em vez de leitura directa. Isso deve ser comprovado rota a rota. Não adicionar políticas genéricas para eliminar o alerta.

A tabela `private.partner_access_grants` permanece sem RLS, com privilégios directos de `anon` e `authenticated` revogados no desenho de referência. Antes de activar RLS, testar o owner/bypass das RPCs `SECURITY DEFINER` que precisam de aceder à tabela.

### Funções SECURITY DEFINER executáveis via API
- 4 funções sinalizadas para `anon`;
- 21 funções sinalizadas para `authenticated`.

A presença no advisor não demonstra, isoladamente, vulnerabilidade: algumas RPCs são interfaces intencionais, incluindo leitura pública de espaços publicitários e validação de convite por token. Cada função deve ser revista individualmente quanto a actor, tenant, validação interna, search_path, grants e exposição de dados. Não revogar em massa.

### Auth
A protecção contra palavras-passe comprometidas continua desactivada no projecto. A activação depende de revisão da configuração de Auth e de teste do onboarding; não foi alterada nesta intervenção.

## 5. Estados e regras financeiras

Foi criado um catálogo TypeScript de estados com base nos checks actualmente activos:

| Processo | Estados confirmados no PostgreSQL |
|---|---|
| Compra de créditos | `REQUESTED`, `PAYMENT_PENDING`, `PAID`, `REJECTED`, `CANCELLED` |
| Pagamento financeiro | `PENDING`, `CONFIRMED`, `FAILED`, `REFUNDED` |
| Ordem de serviço da plataforma | `PENDING_PAYMENT`, `PAID`, `PROCESSING`, `COMPLETED`, `CANCELLED`, `FAILED` |

O catálogo valida apenas a pertença ao vocabulário. Não inventa transições: estas devem ser definidas por processo, actor e tenant e aplicadas por RPC/servidor com controlo de concorrência.

Regras preservadas:
- pedido de pagamento não é pagamento confirmado;
- comprovativo carregado não confirma liquidação;
- créditos só podem ser lançados após confirmação autorizada;
- callbacks e referências têm de ser idempotentes;
- consumo de créditos, movimento financeiro e criação da ordem/campanha devem ser atómicos;
- reembolso/reversão deve criar movimento compensatório auditável;
- marketplace comprador-vendedor permanece fora dos pagamentos da plataforma.

## 6. CI e validação

O workflow `.github/workflows/ci.yml` já contém:
- testes unitários;
- auditoria de dependências;
- TypeScript;
- lint;
- build de produção;
- testes PostgreSQL isolados para hardening de funções, marketplace, publicidade e memberships de parceiros.

Esta intervenção acrescenta ao conjunto:
- testes unitários do catálogo financeiro;
- verificação SQL de que a RPC legada de adição directa de gestores permanece inacessível.

**Estado de execução:** os ficheiros foram escritos em `main`, mas os resultados do CI para estes novos commits ainda têm de ser consultados. Não declarar build, testes ou deploy aprovados antes do resultado do workflow.

## 7. Pendências para fechar a Fase 1

- [x] Confirmar a igualdade entre a consulta SQL e a API de listagem: 68 versões únicas em ambas.
- [ ] Reconciliar todos os ficheiros de migration do repositório com o ledger e o esquema activo.
- [ ] Determinar formalmente o estado de aplicação de `20261102190000_atomic_direct_ad_purchase.sql`.
- [ ] Exportar e comparar o esquema nativo completo.
- [ ] Mapear cada RPC SECURITY DEFINER para actor, finalidade, grants, tenant e testes negativos.
- [ ] Validar o acesso indirecto às tabelas de parceiro sem políticas RLS.
- [ ] Rever a protecção contra palavras-passe comprometidas e activar após teste de onboarding.
- [ ] Especificar e implementar convites de gestores vinculados a uma conta existente.
- [ ] Executar CI e confirmar todos os testes adicionados.
- [ ] Executar testes reais de RLS/isolamento em ambiente isolado antes de qualquer migration em produção.

## 8. Critério de saída da Fase 1

A Fase 1 só pode ser marcada como concluída quando:
1. o ledger e o esquema estiverem reconciliados e reproduzíveis;
2. o modelo de conta de parceiro e os convites estiverem fechados;
3. os limites de autorização e isolamento tiverem testes positivos e negativos;
4. os estados financeiros estiverem alinhados entre PostgreSQL, TypeScript e operações;
5. as decisões de segurança tiverem sido revistas sem revogações ou políticas genéricas;
6. CI passar no commit final da fase.

**Conclusão:** a base de memberships, o catálogo de estados financeiros e as protecções de CI avançaram. A reconciliação de migrations e o convite de gestores continuam como bloqueadores de arquitectura; por isso, não se deve avançar para aplicação de DDL em produção nem declarar a Fase 1 fechada.
