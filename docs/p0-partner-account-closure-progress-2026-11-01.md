# Fecho P0 — modelo de conta de parceiros (2026-11-01)

## Decisão de negócio

Regra confirmada: **um utilizador por organização parceira**. Cada conta pode ter vários membros, mas cada utilizador pode manter no máximo uma associação activa a uma organização parceira. O histórico de associações suspensas pode ser preservado; reactivação ou transferência exige validação explícita.

## Verificações no Supabase activo

Project ref: `zikjvjzbbfzrelbkaaci`.

- `partner_account_members` tem chave única em `(account_id, user_id)`, mas não tem unicidade global por `user_id`.
- Foi encontrada uma associação activa e um utilizador activo; não há duplicação activa nos dados observados.
- `current_partner_account_id()` selecciona uma associação activa com `LIMIT 1`, sem validar a unicidade, o estado da conta ou `profiles.account_status`.
- `partner_account_context()` também usa `LIMIT 1` e não valida o estado da conta/perfil.
- `partner_account_add_manager(email, role)` associa utilizadores já existentes, não recebe um convite nem um `account_id` explícito, e não impede que o utilizador já esteja activo noutra organização.
- O claim de convite existente é para criação/activação de conta do proprietário; não é um fluxo completo de convite para uma conta existente.

## Intervenção aplicada no repositório

- Na página `/parceiro/conta`, foi suspensa a associação directa de gestores.
- A página continua a permitir consulta dos dados e membros, mas informa o proprietário que os convites estão em preparação.
- A alteração evita apresentar como funcional uma operação que não garante a regra de negócio aprovada.
- O formulário antigo permanece no código partilhado, mas deixou de ser apresentado nesta página; a protecção definitiva deve ser aplicada também no RPC/base de dados antes de produção.

Commit: `9d1ced727223c89038af546a226492b5d3848903`.

## Bloqueio para a intervenção de base de dados

O ledger activo do Supabase contém 67 migrações (última versão observada: `20261025080200`). O baseline de 2026-10-25 registou 53 ficheiros SQL no repositório; uma nota anterior indicou 56, mas essa contagem não foi novamente apurada. A divergência de nomes/versões permanece por reconciliar e não deve ser resolvida por correspondência aproximada.

Não existe actualmente uma branch de desenvolvimento Supabase para validar DDL. A criação de uma branch pode gerar custos de compute; não foi criada nenhuma branch nem aplicada qualquer alteração DDL à produção.

## Próximas alterações de base de dados (pendentes de ambiente seguro)

1. Adicionar índice único parcial em `partner_account_members(user_id) WHERE active = true`, após confirmar que não existem duplicações.
2. Reescrever `current_partner_account_id()` para devolver uma conta apenas quando existir exactamente uma associação elegível e a conta/perfil estiverem activos.
3. Reescrever `partner_account_context()` para usar a mesma regra e devolver contexto inequívoco.
4. Substituir o RPC directo `partner_account_add_manager` por erro explícito/retirada de execução pública, depois de identificar todos os consumidores.
5. Criar convites de gestores vinculados a `account_id`, papel, email normalizado, hash de token, validade, criador e estado. O claim deve exigir sessão autenticada, email coincidente, conta activa, permissão do proprietário e ausência de outra associação activa; associação e consumo do convite devem ser atómicos.
6. Testar concorrência, convite expirado/reutilizado, email divergente, conta suspensa, utilizador já associado, papéis e tentativas de acesso cruzado.

## Estado

- Regra de negócio: confirmada.
- Revisão do esquema activo e funções relevantes: concluída para o fluxo de conta/membros.
- Bloqueio da associação directa na UI: aplicado no repositório.
- CI do commit: em execução no momento da actualização; não declarar validado até terminar.
- DDL Supabase: não aplicado.
- Deploy Vercel: não confirmado.
- Produção: ainda não aprovada.

## Actualização de verificação — 2026-11-01

- O estado do projecto Supabase continua `ACTIVE_HEALTHY`.
- A consulta actual ao ledger confirma 67 migrações aplicadas, com última versão `20261025080200`.
- Os estados Vercel associados aos commits `9d1ced7` (correcção da associação directa) e `a7f365e` (documentação) passaram a `success`.
- O advisor de segurança voltou a reportar 4 tabelas com RLS sem políticas, 4 funções `SECURITY DEFINER` executáveis por `anon` e 22 executáveis por `authenticated`. Estes avisos exigem análise por função e por contrato de acesso; não justificam revogações em lote.
- O advisor de performance reporta políticas permissivas múltiplas em 26 tabelas e 2 pares de índices duplicados. Não foram removidos índices nem alteradas políticas, pois isso requer validação de utilização e impacto.
- Não foram executadas alterações à base de dados de produção. A revisão do repositório e os testes de CI/deploy podem prosseguir sem branch pago.


## Actualização de execução directa na main — 2026-11-01

Foi aplicada à base Supabase activa a migração `20261101111659_harden_partner_account_memberships` e o respectivo ficheiro foi registado em `supabase/migrations/20261101111659_harden_partner_account_memberships.sql`.

Alterações:
- Índice único parcial em `partner_account_members(user_id)` para impedir duas associações activas do mesmo utilizador.
- `current_partner_account_id()` e `partner_account_context()` passam a exigir exactamente uma associação elegível, conta ACTIVE, perfil ACTIVE e tipo de utilizador parceiro; contexto ambíguo ou inelegível falha fechado.
- `partner_account_add_manager()` passa a devolver erro explícito `PARTNER_MANAGER_INVITES_REQUIRED`; a execução foi revogada para `PUBLIC`, `anon` e `authenticated`.

Verificações após aplicação:
- A consulta de permissões confirmou que nem `anon` nem `authenticated` podem executar a antiga função de associação directa.
- O Security Advisor passou de 22 para 21 funções SECURITY DEFINER executáveis por authenticated; as restantes exigem revisão individual.
- Permanecem 4 tabelas com RLS sem políticas, 4 funções SECURITY DEFINER acessíveis a anon e o aviso de protecção contra passwords comprometidas desactivada.
- O fluxo de convites multi-gestor vinculado a `account_id` ainda não foi implementado. O actual `partner_access_claim()` não satisfaz esse contrato e não deve ser usado como substituto.
- A migração foi aplicada directamente na produção por decisão de execução na main; não houve branch de staging.

Esta intervenção fecha o bypass de associação directa e a ambiguidade do contexto da conta, mas **não encerra todo o P0 de parceiros nem autoriza lançamento comercial amplo**.
