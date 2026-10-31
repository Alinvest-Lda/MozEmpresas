# MozEmpresas — Achados da verificação read-only do ambiente activo

**Data:** 2026-10-29  
**Projecto Supabase:** `zikjvjzbbfzrelbkaaci`  
**Método:** consultas SQL read-only, inventário de tabelas, lista de migrações e Security Advisors.  
**Não foi feita qualquer alteração ao banco de dados.**

## 1. Resultado geral

- Projecto Supabase está activo e saudável.
- Foram confirmadas as tabelas de parceiro, monetização, publicidade, pagamentos, suporte e administração referidas na matriz funcional.
- O ledger activo apresenta **67 migrações**; o snapshot de reconciliação do repositório documenta **53 ficheiros SQL** e vários nomes sem correspondência exacta. Não fazer `db push`, repair ou replay antes de reconciliar.
- O Security Advisor devolveu alertas concretos descritos abaixo. A presença de uma função `SECURITY DEFINER` acessível por um papel autenticado/anónimo não prova automaticamente uma exploração; exige análise da intenção, validação interna e privilégio mínimo.

## 2. Achados prioritários

### S0 — Tabelas de parceiro com RLS activado, mas sem políticas

O Security Advisor reportou RLS activo sem políticas em:
- `public.partner_accounts`
- `public.partner_account_members`

Também reportou esta condição em `public.contact_messages` e `public.public_rate_limits`.

**Interpretação:** sem políticas, utilizadores com privilégios SQL adequados não conseguem aceder por RLS a essas tabelas; isso pode ser intencional para forçar acesso por RPCs `SECURITY DEFINER`, mas deve ser confirmado contra o modelo de acesso e o código. Não adicionar políticas genéricas apenas para remover o alerta.

**Verificação/aceitação:** mapear cada acesso esperado (página, server action, RPC, papel) e provar que o utilizador correcto consegue executar a operação e que outro utilizador/conta não consegue. Confirmar também que nenhuma página depende de leitura directa destas tabelas via Data API.

### S0 — Helper de contexto de parceiro não aplica todos os controlos de estado

A definição activa de `public.current_partner_account_id()` exige membership activa e `profiles.user_type = 'parceiro'`, mas não verifica `partner_accounts.status = 'ACTIVE'` nem `profiles.account_status = 'ACTIVE'`. A função `public.current_partner_opportunity_role()` faz essas verificações, mas chama primeiro o helper de ID.

**Risco:** diferentes operações podem resolver um contexto de parceiro mesmo quando a conta/perfil foi suspenso, dependendo das verificações subsequentes. A consequência efectiva depende das políticas e RPCs que consomem o helper.

**Verificação/aceitação:** testes com conta activa/inactiva, perfil activo/inactivo, membership activa/inactiva e utilizador com mais de uma membership. A correcção deve ser preparada como migration versionada e revista; não alterar a função directamente no ambiente activo nesta fase.

### S1 — Funções privilegiadas expostas por RPC

O Security Advisor sinalizou como executáveis por `anon`:
- `public.get_ad_decision(...)`
- `public.home_ad_slots()`
- `public.partner_access_validate(text)`
- `public.record_ad_interest(...)`

Sinalizou como executáveis por `authenticated`, entre outras:
- `public.current_partner_account_id()`
- `public.current_partner_opportunity_role()`
- `public.partner_access_claim(text, uuid)`
- `public.partner_access_create(text, text, timestamptz)`
- `public.partner_account_add_manager(text, text)`
- `public.partner_account_context()`
- `public.partner_account_members_list()`
- `public.partner_account_profile()`
- `public.partner_ad_campaign_metrics()`
- `public.partner_ad_campaigns_list()`
- `public.partner_ad_products_list()`
- `public.partner_ad_request(...)`
- `public.partner_entitlements_list()`
- RPCs de compra de serviços/publicidade com créditos.

**Interpretação:** funções `SECURITY DEFINER` podem ser necessárias para acesso controlado através de RLS; o alerta é um convite a rever o corpo e o público autorizado, não a revogar indiscriminadamente todas as funções.

**Verificação/aceitação:** por função, registar propósito, papéis permitidos, validação de `auth.uid()`, validação de tenant/propriedade, search_path fixo, privilégio mínimo e testes positivos/negativos. As funções de criação de convite e de compras precisam de autorização forte e idempotência.

### S1 — Protecção contra palavras-passe comprometidas desactivada

O Security Advisor reporta a protecção contra palavras-passe comprometidas como desactivada.

**Acção:** rever a configuração de Auth e activar a protecção após confirmar impacto no onboarding e comunicação aos utilizadores. Não é uma alteração SQL nem foi aplicada nesta execução.

## 3. Modelo de parceiro confirmado no esquema activo

- `partner_accounts`: identidade e estado da entidade parceira.
- `partner_account_members`: associação conta-utilizador, papel, flag `active` e timestamps.
- `private.partner_access_grants`: convites; o schema é privado e a migração de referência revoga privilégios directos de `anon` e `authenticated`.
- A função activa `partner_access_claim` valida o utilizador autenticado e email convidado, cria a conta e o membership `owner` quando não encontra conta associada e consome o convite.

A estrutura base existe; o módulo não deve recriar estas tabelas. Continuam por validar: constraints e papéis de membership, múltiplas memberships por utilizador, suspensão, convite de uso único sob concorrência, gestores, isolamento de tenants e ligação a oportunidades/publicidade/serviços/entitlements.

## 4. Sequência de execução recomendada

1. **Primeiro:** reproduzir o comportamento do helper de contexto e mapear as dependências de todas as RPCs de parceiro.
2. **Depois:** criar testes negativos de isolamento e suspensão para tabelas/RPCs; não escrever políticas novas até o modelo de acesso estar comprovado.
3. **Em paralelo:** rever função a função os alertas `SECURITY DEFINER`, sem revogações em massa.
4. Rever e activar a protecção de palavras-passe comprometidas nas definições de Auth.
5. Reconciliar o ledger de migrações antes de qualquer migration de correcção.
6. Só depois retomar P0–P5 e executar testes automatizados/build em ambiente apropriado.

## 5. Limitações da execução

- Não foram feitas alterações ao banco de dados nem às definições de Auth.
- Não foi executado um build local nesta sessão.
- O estado Vercel do commit documental mais recente estava `pending`; portanto, não declarar deploy/build concluído.
- A revisão de advisors é um sinal de triagem; cada finding precisa de validação contra a intenção de produto e os fluxos reais.


## 6. Actualização read-only de 2026-10-31

Nova consulta read-only ao projecto activo confirmou os seguintes pontos. Esta secção complementa, sem apagar, o snapshot de 29/10.

### S0 — RLS desactivado em `private.partner_access_grants`

O inventário actual reporta `private.partner_access_grants` com RLS **desactivado**. A tabela tem privilégios directos revogados para `anon` e `authenticated` na migração de referência, e as funções de acesso usam `SECURITY DEFINER`; ainda assim, o advisor do Supabase classifica a ausência de RLS como crítica.

**Não aplicar isoladamente** `ALTER TABLE private.partner_access_grants ENABLE ROW LEVEL SECURITY` em produção antes de testar as RPCs privilegiadas e confirmar o owner/bypass RLS e o fluxo de claim. A correcção deve ser versionada e verificada num ambiente isolado; não criar políticas de acesso directo à tabela para utilizadores normais.

### S0 — Tabelas de parceiro sem políticas RLS

O advisor actualizado a 2026-10-31 19:54 UTC voltou a assinalar RLS activo sem políticas em `public.partner_accounts` e `public.partner_account_members`, além de `public.contact_messages` e `public.public_rate_limits`. Isto pode ser intencional se todo o acesso for feito por RPC controlada, mas essa hipótese deve ser provada por rota/RPC. Não adicionar políticas genéricas para eliminar o alerta.

### S1 — Funções SECURITY DEFINER executáveis via API

O advisor reportou 4 funções privilegiadas acessíveis a `anon` e 22 acessíveis a `authenticated`. A lista inclui `partner_access_validate`, `partner_access_claim`, `partner_access_create`, `partner_account_add_manager`, `current_partner_account_id`, `partner_account_context`, `partner_account_members_list` e `partner_account_profile`, além de funções de publicidade. A presença do alerta não prova exploração; cada função precisa de revisão de propósito, grants, autenticação, validação de actor/tenant, search_path e testes negativos. `partner_access_validate` é chamado antes do registo, pelo que a execução anónima pode ser intencional e deve ser avaliada pelo token de alta entropia e pelos dados devolvidos.

### Estado actual de memberships e constraints

A consulta read-only encontrou uma conta parceira activa e uma membership activa; não encontrou utilizadores com múltiplas memberships no estado actual. `partner_account_members` tem chave única `(account_id, user_id)`, mas não tem unicidade global em `user_id`, pelo que o modelo permite tecnicamente um utilizador pertencer a mais de uma conta. A função `current_partner_account_id()` usa `limit 1` sem ordenação e não valida o estado da conta nem `profiles.account_status`. A resolução deve falhar em segurança quando houver zero ou múltiplos contextos elegíveis, e validar perfil, membership e conta activa.

### Estado do ledger de migrações

A lista read-only activa termina em versões até `20261025080200` e inclui versões/nomes diferentes dos ficheiros existentes no repositório, incluindo migrações de acesso de parceiro e conta/gestores que não correspondem um-para-um aos nomes da pasta `supabase/migrations`. Não aplicar/reparar o ledger até uma reconciliação detalhada entre definições activas, migrações históricas e repositório.

### Alterações efectuadas nesta revisão

- Nenhuma alteração ao banco de dados.
- Nenhuma alteração às definições de Auth.
- Nenhuma migration aplicada.
- Os estados de convite, permissões e isolamento continuam a exigir teste num ambiente isolado antes do fecho.
