# Convites de gestores — contrato técnico para a Fase 1

**Estado:** especificação técnica preparada a partir do esquema activo em 2026-11-10. Ainda não aplicada ao PostgreSQL.
**Projecto:** MozEmpresas — Supabase `zikjvjzbbfzrelbkaaci`.

## 1. Diagnóstico confirmado

A tabela `private.partner_access_grants` actualmente contém:

- `id`, `email`, `token_hash`, `status`, `created_by`;
- `accepted_user_id`, `created_at`, `expires_at`, `accepted_at`.

Não contém `account_id` nem papel pretendido. A função `partner_access_create(p_email, p_token_hash, p_expires_at)` só permite criação por Super Admin e não associa o convite a uma conta. A função `partner_access_claim(p_token_hash, p_user_id)` valida a sessão e o email, mas cria uma nova conta e membership `owner` quando o utilizador ainda não tem associação. Não serve para convidar um gestor para uma conta existente.

A tabela `public.partner_account_members` já limita os papéis a `owner`, `manager`, `analyst` e `viewer`. Tem unicidade por `(account_id, user_id)`, índice único por `user_id` e índice único parcial por utilizador activo. A regra actual é, portanto, uma conta de parceiro por utilizador, mesmo quando uma membership anterior está inactiva; a nova implementação não deve tentar contornar essa regra.

A RPC `partner_account_add_manager(text,text)` deve permanecer bloqueada até o fluxo abaixo ser implementado e testado.

## 2. Contrato de produto e autorização

1. Um convite de gestor é sempre dirigido a uma conta existente e activa.
2. Só o Super Admin ou o owner activo da conta pode criar, revogar ou reenviar convites. Não conceder essa capacidade a `manager` por omissão.
3. Papéis convidáveis: `manager`, `analyst`, `viewer`. O papel `owner` não é convidável por este fluxo.
4. Um convite não cria conta de parceiro, não altera o owner e não permite escolher `user_type` através de metadados editáveis pelo utilizador.
5. O utilizador tem de autenticar-se com o mesmo endereço de email normalizado do convite.
6. Um utilizador com qualquer membership de parceiro existente não pode aceitar um convite para outra conta. O fluxo deve falhar sem modificar dados.
7. O convite é de uso único, expira, pode ser revogado e deixa rasto de auditoria.
8. Nenhuma política RLS genérica deve ser adicionada para tornar este fluxo funcional. A operação deve ser mediada por RPCs estreitas, com grants explícitos e validação interna.

## 3. Alteração de dados proposta

Adicionar à tabela privada existente:

- `account_id uuid NOT NULL REFERENCES public.partner_accounts(id) ON DELETE CASCADE`;
- `intended_role text NOT NULL CHECK (intended_role IN ('manager','analyst','viewer'))`;
- `revoked_at timestamptz NULL`;
- `revoked_by uuid NULL REFERENCES auth.users(id)`.

Preservar `created_by`, `accepted_user_id`, `created_at`, `expires_at`, `accepted_at`, `token_hash` e o check de estado existente.

Criar índice para consulta por conta/email/estado e índice único parcial para impedir mais de um convite pendente para o mesmo par `(account_id, lower(email))`. A migração deve primeiro auditar os registos existentes; como os convites antigos não têm conta-alvo, não atribuir-lhes uma conta por inferência. Preservar convites antigos no fluxo legado ou expirá-los/revogá-los por decisão explícita, sem os converter em convites de gestor.

## 4. RPCs pretendidas

### `partner_account_invite_create(account_id, email, role, token_hash, expires_at)`

- Actor autenticado obrigatório.
- Confirmar que a conta está `ACTIVE`.
- Confirmar que o actor é Super Admin activo ou owner activo dessa mesma conta.
- Validar email normalizado, papel permitido, validade e prazo máximo de expiração.
- Recusar utilizador já associado a qualquer conta de parceiro.
- Recusar convite pendente duplicado para a mesma conta/email.
- Guardar apenas hash do token; nunca guardar token em claro.
- Registar evento de auditoria.
- Retornar apenas identificador e dados não secretos necessários à camada de envio.

### `partner_account_invite_claim(token_hash, user_id)`

- Exigir `auth.uid() = user_id`; nunca confiar apenas no argumento.
- Bloquear a linha do convite com `FOR UPDATE`.
- Validar estado `PENDING`, expiração, hash e email da sessão.
- Confirmar conta de destino ainda `ACTIVE`.
- Confirmar que o utilizador não tem membership noutra conta nem membership duplicada.
- Inserir membership na conta indicada com `intended_role`; não criar conta nova.
- Actualizar convite para `ACCEPTED` na mesma transacção.
- Qualquer falha deve deixar convite e membership sem alterações parciais.

### `partner_account_invite_revoke(invite_id)`

- Permitir apenas Super Admin activo ou owner activo da conta do convite.
- Fazer transição condicional de `PENDING` para `REVOKED`.
- Guardar actor e momento; não apagar o registo.

## 5. Concorrência e invariantes

- O claim deve bloquear o convite e depender das constraints únicas existentes em `partner_account_members`.
- Duas tentativas simultâneas do mesmo convite não podem criar duas memberships.
- Dois convites concorrentes para o mesmo utilizador não podem ultrapassar a regra de uma conta por utilizador.
- Revogação e claim concorrentes devem produzir exactamente um resultado vencedor.
- A criação do convite e o claim devem usar transacções SQL; não dividir a escrita do convite e a membership por várias chamadas.
- As funções `SECURITY DEFINER` devem ter `search_path` fixo, grants mínimos e validação explícita de actor/tenant. Não expor acesso directo à tabela privada.

## 6. Testes obrigatórios antes de activar o fluxo

1. Super Admin cria convite válido.
2. Owner da conta A cria convite para a conta A.
3. Manager, analyst e viewer não podem criar convites.
4. Owner da conta A não pode criar convite para a conta B.
5. Conta suspensa não aceita nem emite convites.
6. Email diferente do convite falha.
7. Utilizador com membership activa noutra conta falha.
8. Utilizador com membership inactiva noutra conta falha, respeitando a constraint única existente.
9. Convite expirado, revogado ou já aceite falha.
10. Claim repetido e claim concorrente resultam numa única membership.
11. Revogação concorrente com claim tem um único resultado final.
12. Papel `owner`, papel desconhecido e token em claro são rejeitados.
13. Utilizador anónimo não pode executar as RPCs.
14. Utilizador de uma conta não consegue consultar convites de outra conta.
15. A criação/claim/revogação gera auditoria sem guardar token em claro.

Os testes devem correr numa base PostgreSQL isolada, com pelo menos duas contas, dois owners e utilizadores independentes. Incluir testes positivos e negativos de autorização.

## 7. Sequência de implementação segura

1. Reconciliar os ficheiros SQL e o esquema nativo, incluindo constraints, grants, funções e triggers.
2. Criar o ficheiro de migração com Supabase CLI `supabase migration new` (não inventar timestamp/nome de migração).
3. Implementar primeiro a alteração de tabela e constraints, com compatibilidade para convites legados.
4. Implementar RPCs e grants mínimos; manter `partner_account_add_manager` bloqueada.
5. Adicionar testes PostgreSQL isolados para todos os casos acima.
6. Executar Security Advisor e rever cada função `SECURITY DEFINER`.
7. Validar o fluxo de envio de email e claim em ambiente isolado.
8. Só depois de aprovação explícita e de CI verde preparar aplicação em produção.

**Bloqueio operacional actual:** as ferramentas de GitHub/Supabase disponíveis nesta sessão permitem consultar e alterar o repositório e executar SQL, mas não disponibilizam a execução de `supabase migration new` no workspace do projecto. Por isso, este contrato fica preparado, mas não será criada uma migration com timestamp inventado nem aplicada DDL em produção.
