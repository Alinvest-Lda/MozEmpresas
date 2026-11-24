# Acesso de utilizador à conta Parceiro — regra operacional vigente

**Estado:** contrato anterior de convites de gestores substituído pela regra de um utilizador activo por organização.  
**Projecto:** MozEmpresas — Supabase `zikjvjzbbfzrelbkaaci`.  
**Actualização:** 24/11/2026.

## 1. Decisão de produto vigente

Cada organização Parceiro pode ter **um único utilizador activo** no portal. Esta regra é aplicada na base de dados por índice único parcial em `partner_account_members(account_id)` para memberships activas, em conjunto com a regra de utilizador não associado simultaneamente a várias contas.

Não existe fluxo de convite de gestores adicionais. Os papéis adicionais `manager`, `analyst` e `viewer` permanecem valores históricos/compatibilidade do modelo, mas não constituem uma funcionalidade de gestão multiutilizador disponível no produto.

## 2. Criação e activação de acesso

1. O Super Admin cria o convite para um email.
2. O convite pode criar uma nova conta Parceiro de auto-serviço ou ser associado a uma conta Parceiro existente, activa e com portal habilitado.
3. Uma conta existente só pode receber convite se ainda não tiver membership activa nem convite pendente.
4. O sistema guarda apenas o hash SHA-256 do token, com validade máxima de 30 dias.
5. O utilizador activa o acesso com o mesmo email do convite.
6. A RPC `partner_access_claim(text, uuid)` exige que `p_user_id = auth.uid()`, bloqueia o convite, valida o email, estado/portal da conta e ausência de outra associação activa.
7. A membership é criada com papel `owner`; o convite é marcado `ACCEPTED` na mesma transacção.
8. A activação não cria um segundo utilizador para uma organização já ocupada, não transfere ownership e não permite escolher o papel através de metadados fornecidos pelo utilizador.

## 3. Regras de autorização e integridade

- Só o Super Admin activo pode criar convites através do backoffice.
- O endpoint legado de associação directa de gestores permanece bloqueado.
- A conta de destino tem de estar `ACTIVE` e com `portal_enabled=true`.
- Um utilizador com membership activa noutra conta não pode aceitar o convite.
- Uma conta com membership activa não pode receber um novo convite.
- Convites expirados, revogados, aceites ou pendentes duplicados não podem ser reutilizados.
- O token em claro só é apresentado no momento da criação; a base de dados conserva apenas o hash.
- A suspensão da conta/perfil ou a desactivação da membership impede o acesso ao workspace.

## 4. Compatibilidade e histórico

Este documento substitui a proposta anterior de convites de gestores com papéis `manager`, `analyst` e `viewer`. A especificação antiga foi arquivada conceptualmente, mas não deve ser usada como contrato de implementação.

A tabela privada `private.partner_access_grants` pode conter convites históricos sem conta-alvo. Esses registos não devem ser associados a uma organização por inferência. A função de claim mantém o comportamento de criar uma conta de auto-serviço para convites legados sem `account_id`, enquanto convites associados a uma conta usam a associação explícita.

## 5. Implementação registada

- `20261124214209_f375_enforce_single_active_partner_user_per_organization`: regra de membership única e hardening do acesso.
- `20261124221000_f334_align_partner_activation_with_single_user_account_rule.sql`: alinhamento da activação inicial para papel `owner`.\n- `20261124223500_f335_partner_single_user_access_revocation.sql`: listagem administrativa e revogação auditada do utilizador único.
- Commit `4517bcf2e3270552dfbb941f0ac419ecad668a1f`: alteração de activação.
- Commit `870c8f420bff1a4b5fa31a803191c2cb6056eaf5`: interface administrativa alinhada com utilizador único por organização.

## 6. Trabalho de implementação ainda distinto da validação

A conclusão funcional global ainda exige fechar o ciclo operacional de gestão do acesso: substituição/revogação de um acesso existente, transferência controlada do responsável único, tratamento de conta suspensa e recuperação de acesso sem criar uma segunda membership. Esses mecanismos devem preservar o histórico e a regra de utilizador único.

Os testes de convite, expiração, replay, concorrência e isolamento ficam reservados à fase de validação final, depois do fecho integral da implementação.
