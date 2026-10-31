# Parceiros — achados de autorização e convite (2026-10-31)

**Âmbito:** revisão estática de migrações e acções na branch `main`. Não foi executado SQL nem alterada a base de dados. Os achados abaixo descrevem o código do repositório consultado; o esquema actualmente activo tem de ser reconfirmado antes de implementar uma correcção.

## Resumo executivo

O modelo de produto exige uma conta por entidade parceira e vários gestores associados à mesma conta. A implementação consultada ainda não demonstra o ciclo completo de gestão de gestores. Há dois riscos prioritários: o convite não identifica a conta de destino; e a função que resolve a conta actual não falha de forma determinística se um utilizador tiver mais do que uma membership elegível.

## Evidência no repositório

### 1. O convite não identifica uma conta de destino

A migração `20261004210000_partner_dedicated_access.sql` cria `private.partner_access_grants` com email, hash do token, estado, criador, utilizador aceite e datas, mas sem `account_id` nem papel pretendido. A função `partner_access_create` também não recebe uma conta de destino.

A migração posterior `20261011092703_require_invitee_identity_for_partner_access_claim.sql` valida a identidade do utilizador autenticado e o email convidado. Ao aceitar, procura uma membership já existente para esse utilizador; se não encontrar, cria uma nova conta e atribui o papel `owner`. Se já encontrar uma membership, não adiciona explicitamente o utilizador a uma conta indicada pelo convite.

**Conclusão:** este fluxo serve para criar/activar um proprietário de conta nova, mas não implementa de forma demonstrável o convite de um gestor para uma conta existente. O fluxo de convite para gestores deve ser tratado como lacuna funcional, não como concluído.

### 2. Resolução da conta pode ser ambígua e não valida todos os estados

A definição de referência de `current_partner_account_id()` selecciona uma membership activa do utilizador com perfil `user_type = 'parceiro'`, usando `limit 1` sem ordenação determinística. Não verifica o estado da conta parceira nem `profiles.account_status`.

A função `current_partner_opportunity_role()` foi posteriormente alterada para restringir o papel à conta devolvida por `current_partner_account_id()` e validar estado da conta e do perfil. Isso reduz alguns riscos, mas não resolve a ambiguidade inicial se houver múltiplas memberships elegíveis; o papel pode ser calculado a partir de um contexto de conta que não é estável.

**Decisão recomendada:** até o produto decidir e o esquema confirmar se um utilizador pode pertencer a várias contas parceiras, a resolução deve falhar em segurança quando existir mais de uma membership elegível, em vez de escolher uma arbitrariamente. A função deve validar simultaneamente membership activa, perfil activo/de tipo parceiro e conta activa.

### 3. Acções de oportunidades aplicam filtros de conta, mas dependem do helper

`lib/opportunities/partner-actions.ts` consulta `current_partner_account_id()` e filtra a oportunidade pelo `partner_account_id`. A alteração de candidaturas verifica também que a oportunidade relacionada pertence à conta resolvida. É uma defesa útil na camada de aplicação, mas depende da correcção do helper e das políticas RLS na base de dados; não substitui os testes de isolamento.

## Plano de correcção — não aplicado

1. **Reconciliar primeiro o ambiente:** comparar as migrações do repositório com o esquema e o ledger activos; não executar `db push`, repair ou replay como atalho.
2. **Fechar a regra de associação:** determinar se cada utilizador só pode pertencer a uma conta parceira ou se pode gerir várias contas. Se forem permitidas várias, o contexto da conta deve ser explícito e validado por operação, não inferido por `limit 1`.
3. **Separar os tipos de convite:** convite de proprietário para criar uma nova conta e convite de gestor para uma conta existente devem identificar o alvo, o papel e o estado pretendido. O alvo e o papel devem ser gravados de forma protegida e validados no claim.
4. **Tornar o claim atómico e de uso único:** verificar sessão, identidade/email, validade, estado, conta activa e permissão de quem criou o convite; associar o utilizador à conta-alvo e consumir o convite numa única transacção. Uma repetição ou convite para outra identidade deve falhar sem alterar dados.
5. **Harmonizar os helpers de autorização:** uma fonte consistente para conta e papel; verificar estado de perfil, membership e conta; recusar contexto ambíguo; rever grants de execução e dependências RLS.
6. **Testar em ambiente isolado antes de migrar:** zero/uma/múltiplas memberships; conta e perfil activos/inactivos; membership suspensa; papéis owner/manager/analyst/viewer; convite para conta nova e para conta existente; email diferente; convite expirado/reutilizado/aceite em concorrência; acesso cruzado a oportunidades e candidaturas. Para cada negação, confirmar que nenhum registo foi alterado.

## Estado da execução

- Revisão estática das duas migrações de acesso e das migrações de contexto/políticas de oportunidades: concluída.
- Alterações ao código de aplicação ou às migrações: nenhuma.
- Alterações ao Supabase activo: nenhuma.
- Testes de regressão: planeados, ainda não executados.
- Build/deploy: não verificados nesta revisão.

## Ficheiros revistos

- `supabase/migrations/20261004210000_partner_dedicated_access.sql`
- `supabase/migrations/20261006180000_harden_account_boundaries.sql`
- `supabase/migrations/20261011085059_partner_account_opportunities_rls.sql`
- `supabase/migrations/20261011085442_scope_partner_opportunity_role_to_current_account.sql`
- `supabase/migrations/20261011092703_require_invitee_identity_for_partner_access_claim.sql`
- `lib/opportunities/partner-actions.ts`


## Actualização posterior — fecho parcial de transições

Depois desta revisão, foram adicionadas regras explícitas de transição de estado para oportunidades e candidaturas de parceiros em `lib/opportunities/state-machine.ts`, aplicadas nas acções de servidor e apresentadas na UI. Também foi criado `tests/opportunity-state-machine.test.ts`. Esta alteração reduz transições inválidas na camada de aplicação, mas não resolve a associação de gestores a uma conta existente, a ambiguidade do helper SQL, a ausência de políticas RLS nem o RLS desactivado em `private.partner_access_grants`. O CI deve ser consultado antes de considerar as novas regras validadas.
