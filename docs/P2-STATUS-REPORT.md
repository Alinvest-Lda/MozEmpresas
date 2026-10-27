# MozEmpresas — Relatório de estado e fecho P2

**Data:** 27/10/2026  
**Repositório:** `Alinvest-Lda/MozEmpresas`  
**Branch de trabalho:** `main`  
**Commit de aplicação de referência:** `5c7d953317bc2285fab9a95591bcbb0781c0559b`  
**Migração de hardening (versão actual):** `7b6bd1287dcd462a8c0ce0ff3bedfbe0ee5ef243`  
**Teste PostgreSQL isolado adicionado ao CI:** `.github/workflows/ci.yml`

## Resultado executivo

A etapa de qualidade automatizada passou no commit de aplicação de referência e o respectivo deployment Vercel ficou em estado `READY`. Isto comprova que a pipeline terminou e que o artefacto foi publicado; **não comprova que todos os fluxos estejam funcionalmente validados em produção**.

Foi acrescentada a migração `supabase/migrations/20261027100000_harden_security_definer_search_path.sql` para colocar `pg_temp` explicitamente no fim do `search_path` das funções `SECURITY DEFINER` do esquema `public`, preservando os caminhos existentes (incluindo `public, private`). A migração está **apenas no repositório** e ainda não foi aplicada à base de dados activa. Foi adicionado ao CI um teste que cria funções de exemplo num PostgreSQL isolado, executa a migração e verifica os caminhos `public`, `public, private` e o caso já endurecido.

**Não declarar o P2 nem o fecho global do MozEmpresas concluídos** enquanto os testes de integração, a reconciliação da base de dados e a revisão de segurança não forem executados e registados.

## Verificações confirmadas

| Verificação | Resultado | Evidência |
|---|---|---|
| CI do commit de aplicação `5c7d953` | Sucesso | [GitHub Actions — run 40525316753](https://github.com/Alinvest-Lda/MozEmpresas/actions/runs/40525316753) |
| Auditoria de dependências, testes unitários, TypeScript, lint e build | Sucesso no CI acima | Job `validate` |
| Deploy Vercel do commit de aplicação | `READY` | [Inspecção do deploy](https://vercel.com/alinvest-lda-s-projects/moz-empresas/GEdnghKdoFdzV8LZhnZy6LaQCFSa) |
| Estado Supabase | Projecto `ACTIVE_HEALTHY`; 59 tabelas públicas observadas, todas com RLS activo | Consulta de leitura ao projecto |
| Migrações executadas na base de dados activa nesta fase | Nenhuma | Registo desta entrega |

## Resultados preliminares dos Advisors Supabase

Consulta apenas de leitura, em 27/10/2026:

- **4 tabelas com RLS activo e sem políticas:** `public.contact_messages`, `public.partner_account_members`, `public.partner_accounts` e `public.public_rate_limits`. Confirmar que o acesso pretendido é exclusivamente por operações privilegiadas/rotas controladas. Não criar políticas genéricas para silenciar o aviso.
- **4 funções SECURITY DEFINER executáveis por `anon`** e **22 funções SECURITY DEFINER executáveis por `authenticated`**, segundo o linter. Rever a intenção de exposição, validação de identidade/autorização, privilégios do proprietário, `search_path` e dados devolvidos. Não revogar em massa: algumas funções fazem parte de fluxos públicos ou de activação.
- **Protecção de palavras-passe comprometidas desactivada**, segundo o Advisor de Auth. Rever e activar na configuração do projecto se for compatível com a política de autenticação.
- **36 chaves estrangeiras sem índice de cobertura** assinaladas pelo Advisor. Priorizar com base em consultas, cardinalidade e planos de execução antes de criar índices em produção.

Referências:
- [RLS activo sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Funções SECURITY DEFINER executáveis por anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Funções SECURITY DEFINER executáveis por utilizadores autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)

## Pendências que bloqueiam o fecho global

### 1. Validar a migração de hardening
- [ ] Aplicar a migração numa base PostgreSQL/Supabase isolada e verificar a sintaxe e o resultado de `pg_proc.proconfig`.
- [ ] Confirmar que todas as funções preservam os esquemas necessários e que `pg_temp` fica no fim.
- [ ] Só depois de reconciliar o histórico, preparar plano de aplicação e rollback para o ambiente activo.

### 2. Integração e smoke tests
- [ ] Validar dois utilizadores e empresas distintas: criação/edição/publicação de oferta, pedido comercial, transições, conclusão e cancelamento.
- [ ] Confirmar isolamento entre comprador, vendedor, administradores e utilizadores sem permissões.
- [ ] Testar carregamento, rejeição, remoção e falha de anexos; confirmar a limpeza de ficheiros órfãos.
- [ ] Testar pedidos de serviços, actualizações administrativas e notificações.
- [ ] Testar eventos publicitários válidos e inválidos, incluindo concorrência e repetição.

### 3. Base de dados e migrações
- [ ] Obter uma exportação **nativa** do esquema com `scripts/export-live-schema.sh` e `SUPABASE_SOURCE_DATABASE_URL`.
- [ ] Reconciliar a exportação, o inventário, o histórico de migrações e os ficheiros SQL do repositório.
- [ ] Restaurar num PostgreSQL isolado e aplicar apenas migrações revistas, numa sequência documentada.
- [ ] Comparar esquema, funções, políticas, índices, triggers e permissões depois da restauração.

Os ficheiros de baseline existentes são referências reconstruídas e inventário; não substituem uma exportação nativa. Diferenças entre o ledger e os nomes dos ficheiros de migração precisam de análise individual.

### 4. Segurança e desempenho
- [ ] Rever manualmente as funções SECURITY DEFINER sinalizadas e confirmar a intenção de acesso.
- [ ] Confirmar o modelo de acesso das quatro tabelas RLS sem políticas.
- [ ] Rever transversalmente as políticas RLS e as acções administrativas.
- [ ] Rever a protecção de palavras-passe comprometidas.
- [ ] Priorizar índices com base em consultas e planos de execução; não criar os 36 indiscriminadamente.

### 5. Validação final
- [ ] Executar smoke tests no ambiente de teste e guardar resultados.
- [ ] Verificar funcionalmente o deployment publicado sem alterar dados reais.
- [ ] Registar limitações aceites, riscos remanescentes e decisão explícita de entrada em produção.

## Restrições de segurança

- Não executar `supabase db push`, `supabase migration repair` ou repetir migrações históricas sem reconciliação, plano de execução e aprovação explícita.
- Não introduzir dados de demonstração na produção.
- Não declarar RLS, anexos, notificações, pagamentos ou fluxos comerciais validados apenas porque TypeScript, lint, testes unitários e build passaram.
- Preservar compatibilidade PostgreSQL e a camada de adaptação existente.

## Decisão

**Estado actual: uma melhoria de hardening foi adicionada ao repositório, mas ainda não aplicada nem validada numa base isolada. O fecho global continua bloqueado por testes de integração, reconciliação nativa do esquema e revisão manual dos alertas de segurança.**
