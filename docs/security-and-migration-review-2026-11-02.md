# Revisão de segurança e reconciliação — 2026-11-02

## Âmbito e método

Revisão read-only do projecto Supabase activo `zikjvjzbbfzrelbkaaci`, do ledger de migrações, dos ficheiros SQL em `supabase/migrations`, dos grants PostgreSQL, das definições de funções e dos advisors. O deploy da aplicação foi confirmado pelo responsável do projecto nesta data.

**Não foi executada qualquer alteração DDL, DML, grant ou configuração de Auth na base de produção.**

## 1. Reconciliação de migrações

Estado observado:

- Ledger Supabase: **68 migrações aplicadas**; última versão `20261101111659`.
- Repositório: **57 ficheiros SQL** em `supabase/migrations`.
- Correspondência exacta por nome: **33**.
- Entradas do ledger sem ficheiro com o mesmo nome: **35**.
- Ficheiros sem entrada do ledger com o mesmo nome: **24**.

A comparação por nome não prova ausência de SQL. Os ficheiros não correspondentes podem representar migrações renomeadas, combinadas, divididas, antigas ou já substituídas. Existem ainda sete ficheiros históricos `0001`–`0007` sem timestamp de migração.

O repositório já contém uma reconciliação histórica de 25/10/2026 e uma revisão de conteúdo. A observação de 02/11 confirma que a divergência persiste, com o ledger agora em 68 entradas. **Não executar `db push`, repair, replay ou renumeração automática.**

Próxima acção técnica: exportar um snapshot schema-only do projecto activo com `scripts/export-live-schema.sh` e comparar, por objecto, funções, tabelas, colunas, constraints, índices, triggers, policies, grants e enums. O script requer `SUPABASE_SOURCE_DATABASE_URL` com acesso PostgreSQL; a exportação ainda não foi realizada nesta sessão.

## 2. Quatro tabelas com RLS activo e sem policies

O advisor reporta:

- `public.contact_messages`
- `public.partner_account_members`
- `public.partner_accounts`
- `public.public_rate_limits`

A consulta aos catálogos confirmou que as quatro tabelas têm RLS activo e que os únicos grants de tabela observados são para `postgres` e `service_role`. Não existem grants de tabela para `anon` ou `authenticated`.

**Classificação actual: fail-closed por privilégios, não uma exposição pública demonstrada.** A ausência de policies significa que os papéis sujeitos a RLS não têm linhas autorizadas; os grants observados também não lhes permitem aceder directamente às tabelas. O advisor é informativo neste caso. Não criar policies genéricas só para eliminar o alerta. Acesso operacional via `service_role` deve permanecer exclusivamente no servidor.

## 3. Funções SECURITY DEFINER expostas

### 3.1 Quatro funções executáveis por anon

| Função | Contrato observado | Classificação |
|---|---|---|
| `get_ad_decision(...)` | Escolhe uma campanha publicitária activa para superfície/slot e visitante. Usa `auth.uid()` para identidade autenticada; não confia no `p_user_id` recebido. | Endpoint público funcional, requer limites de abuso e validação dos parâmetros/contexto. |
| `home_ad_slots()` | Devolve até dois conteúdos publicitários activos da homepage. | Leitura pública de inventário publicitário; exposição compatível com a função pública do site. |
| `record_ad_interest(...)` | Regista interesses por visitor key; associa utilizador apenas por `auth.uid()`, não pelo `p_user_id` recebido. | Escrita pública de telemetria; rever limites, tamanho/estrutura de `p_context` e retenção. |
| `partner_access_validate(p_token_hash)` | Procura um convite pendente pelo hash do token e devolve email e validade. | Endpoint público de validação de convite; a aplicação gera token aleatório de 32 bytes e envia apenas o SHA-256 à RPC. Manter resposta mínima e testar expiração, reutilização e tentativas inválidas. |

As quatro funções têm grants para `anon` e `authenticated`; são endpoints deliberadamente públicos ou pré-autenticação segundo os consumidores observados. Não revogar em lote. A função `partner_access_validate` é usada antes do registo/login no fluxo de activação, pelo que o grant a `authenticated` aparenta ser dispensável, mas a alteração deve ser feita numa migração testada após confirmação do contrato de cliente.

### 3.2 Funções executáveis por authenticated

O advisor reporta **21 funções SECURITY DEFINER** executáveis por `authenticated`. A lista inclui helpers de contexto de conta, funções de leitura do portal parceiro, pedidos publicitários, métricas e compras com créditos. A existência de grant não prova vulnerabilidade: cada função deve ser validada quanto a `auth.uid()`, ownership/associação, validação de parâmetros, search_path, efeitos laterais, idempotência e contrato do consumidor.

A revisão de `current_partner_account_id()` e `partner_account_context()` confirma que ambas exigem exactamente uma associação elegível, membership activa, conta activa e perfil activo do tipo parceiro. O índice único parcial aplicado em 01/11 impede mais de uma associação activa por utilizador.

### 3.3 Lacuna funcional de convites

O fluxo em `lib/auth/partner-access.ts` cria uma conta de parceiro através de `signUp` e depois executa `partner_access_claim`. Não implementa ainda convite de um utilizador existente para uma conta parceira existente com `account_id` e papel explícitos. O claim actual não deve ser tratado como sistema de convites multi-gestor. Esta lacuna permanece na Fase 4; não alterar a regra aprovada de uma associação activa por utilizador.

## 4. Outros avisos

- Auth: protecção contra passwords comprometidas (HaveIBeenPwned) desactivada. Recomenda-se activar após confirmar o impacto esperado na experiência de registo e recuperação de password.
- Performance: o advisor reporta 26 casos de policies permissivas múltiplas e dois pares de índices duplicados. Não eliminar policies ou índices automaticamente; verificar sobreposição semântica, plano de execução e utilização real.
- Os avisos de índices não usados devem ser observados durante tráfego representativo antes de remoção.

## 5. Decisões de execução

1. Manter produção sem alterações de esquema enquanto a reconciliação não estiver concluída.
2. Não criar policies nas quatro tabelas sem grants para papéis públicos/autenticados apenas para silenciar o advisor.
3. Não revogar funções SECURITY DEFINER em lote.
4. Preparar ambiente PostgreSQL isolado e testes de autorização negativa antes de alterações de DDL.
5. Completar o inventário de funções, grants e consumidores, começando pelas quatro RPCs públicas e pelas funções de compra/gestão de parceiro.
6. Só depois iniciar as tabelas e operações do plano de controlo do Super Admin.

## Estado

- Deploy da aplicação: confirmado pelo responsável do projecto.
- Revisão read-only do ledger, grants, funções e advisors: concluída nesta etapa.
- Exportação nativa schema-only: pendente de acesso PostgreSQL directo.
- Reconciliação conteúdo-a-conteúdo das 68 migrações: pendente.
- DDL de produção: nenhuma alteração nesta etapa.
- Ambiente de integração PostgreSQL/Supabase: ainda não criado.
