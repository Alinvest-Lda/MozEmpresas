# MozEmpresas — Relatório de estado e fecho P2

**Data:** 27/10/2026  
**Repositório:** `Alinvest-Lda/MozEmpresas`  
**Branch de trabalho:** `main`  
**Último commit de aplicação verificado:** `5c7d953317bc2285fab9a95591bcbb0781c0559b`

## Resultado executivo

A etapa de qualidade automatizada avançou e o commit de aplicação indicado passou no CI. O deploy Vercel associado a esse commit está em estado `READY`. Isto comprova que a pipeline terminou e que o artefacto foi publicado; **não comprova que os fluxos estejam funcionalmente validados em produção**.

A consulta de leitura aos Supabase Advisors da base de dados MozEmpresas também identificou pontos que exigem revisão de segurança e desempenho. Os avisos não são, isoladamente, prova de exploração ou vulnerabilidade confirmada: as funções e tabelas devem ser revistas à luz do modelo de acesso esperado antes de alterar permissões.

**Não declarar o P2 nem o fecho global do MozEmpresas concluídos** enquanto os testes de integração, a reconciliação da base de dados e a revisão de segurança não forem executados e registados.

## Verificações confirmadas

| Verificação | Resultado | Evidência |
|---|---|---|
| CI do commit `5c7d953` | Sucesso | [GitHub Actions — run 40525316753](https://github.com/Alinvest-Lda/MozEmpresas/actions/runs/40525316753) |
| Auditoria de dependências | Sucesso no CI acima | Job `validate`, passo `Dependency audit` |
| Testes unitários | Sucesso no CI acima | Job `validate`, passo `Unit tests` |
| TypeScript | Sucesso no CI acima | Job `validate`, passo `Type check` |
| Lint | Sucesso no CI acima | Job `validate`, passo `Lint` |
| Build de produção | Sucesso no CI acima | Job `validate`, passo `Production build` |
| Deploy Vercel do commit `5c7d953` | `READY` | [Inspecção do deploy](https://vercel.com/alinvest-lda-s-projects/moz-empresas/GEdnghKdoFdzV8LZhnZy6LaQCFSa) |
| Estado Supabase | Projecto `ACTIVE_HEALTHY`; 59 tabelas públicas observadas, todas com RLS activo | Consulta de leitura ao projecto |
| Migrações ou alterações à base de dados de produção nesta fase | Nenhuma executada | Registo desta entrega |

A cobertura automatizada acrescentada nesta fase inclui testes unitários para validação/elegibilidade de eventos publicitários e regras de transição de estados das encomendas. Estes testes não substituem testes de integração com PostgreSQL, Storage, RLS ou autenticação real.

## Resultados preliminares dos Advisors Supabase

Consulta apenas de leitura, em 27/10/2026:

- **4 tabelas com RLS activo e sem políticas:** `public.contact_messages`, `public.partner_account_members`, `public.partner_accounts` e `public.public_rate_limits`. Confirmar que o acesso pretendido é exclusivamente por operações privilegiadas/rotas controladas e que não há necessidade de políticas directas. Não criar políticas genéricas para silenciar o aviso.
- **4 funções SECURITY DEFINER executáveis por `anon`** e **22 funções SECURITY DEFINER executáveis por `authenticated`**, segundo o linter. Cada função tem de ser analisada quanto à intenção de exposição, validação de identidade/autorização, privilégios do proprietário, `search_path` e dados devolvidos. Não revogar em massa: algumas funções podem ser deliberadamente públicas ou ser usadas pelo fluxo de autenticação.
- **Protecção de palavras-passe comprometidas desactivada**, segundo o Advisor de Auth. Rever e activar na configuração do projecto se for compatível com a política de autenticação adoptada.
- **36 chaves estrangeiras sem índice de cobertura** assinaladas pelo Advisor de desempenho. Priorizar com base em consultas, cardinalidade e plano de execução antes de criar índices em produção.

Referências de remediação indicadas pelo Supabase:
- [RLS activo sem políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)
- [Funções SECURITY DEFINER executáveis por anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Funções SECURITY DEFINER executáveis por utilizadores autenticados](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)

Estes resultados foram consultados directamente no projecto activo, mas não constituem uma auditoria manual completa nem justificam alterações imediatas de permissões em produção.

## Pendências que bloqueiam o fecho global

### 1. Integração e smoke tests
- [ ] Executar num ambiente isolado compatível com PostgreSQL/Supabase.
- [ ] Validar dois utilizadores e empresas distintas: criação/edição/publicação de oferta, pedido comercial, transições, conclusão e cancelamento.
- [ ] Confirmar isolamento entre comprador, vendedor, administradores e utilizadores sem permissões.
- [ ] Testar carregamento, rejeição, remoção e falha de anexos; confirmar a limpeza de ficheiros órfãos.
- [ ] Testar pedidos de serviços, actualizações administrativas e notificações.
- [ ] Testar eventos publicitários válidos e inválidos, incluindo concorrência e repetição.

### 2. Base de dados e migrações
- [ ] Obter uma exportação **nativa** do esquema da base de dados de origem com `scripts/export-live-schema.sh` e `SUPABASE_SOURCE_DATABASE_URL`.
- [ ] Reconciliar a exportação, o inventário, o histórico de migrações e os ficheiros SQL do repositório.
- [ ] Restaurar num PostgreSQL isolado e aplicar apenas migrações revistas, numa sequência documentada.
- [ ] Comparar esquema, funções, políticas, índices, triggers e permissões depois da restauração.

Os ficheiros de baseline existentes são referências reconstruídas e inventário; não devem ser tratados como substituto de uma exportação nativa. Diferenças entre o ledger e os nomes dos ficheiros de migração precisam de análise individual e não provam, por si só, que falte SQL.

### 3. Segurança e operação
- [ ] Rever manualmente as 26 exposições de funções SECURITY DEFINER sinalizadas pelo Advisor, incluindo o corpo, permissões, `search_path` e intenção de exposição.
- [ ] Confirmar o modelo de acesso das quatro tabelas RLS sem políticas.
- [ ] Rever transversalmente todas as políticas RLS e todas as acções administrativas.
- [ ] Verificar autorização no servidor em cada operação crítica e testar casos negativos.
- [ ] Testar rate limiting, falhas de Storage, erros de notificação, concorrência e consistência dos registos de histórico.
- [ ] Rever logs/observabilidade para garantir que não expõem tokens, segredos ou dados pessoais desnecessários.
- [ ] Rever a activação da protecção de palavras-passe comprometidas e priorizar os índices em falta.

### 4. Validação final
- [ ] Executar o guião de smoke tests no ambiente de teste e guardar resultados.
- [ ] Fazer verificação funcional do deployment publicado, sem alterar dados reais.
- [ ] Registar limitações aceites, riscos remanescentes, responsável e decisão explícita de entrada em produção.

## Restrições de segurança

- Não executar `supabase db push`, `supabase migration repair` ou repetir migrações históricas sem reconciliação, plano de execução e aprovação explícita.
- Não introduzir dados de demonstração na produção.
- Não declarar RLS, anexos, notificações, pagamentos ou fluxos comerciais validados apenas porque TypeScript, lint, testes unitários e build passaram.
- Preservar compatibilidade PostgreSQL e a camada de adaptação existente.

## Decisão

**Estado actual: CI e deploy confirmados; fecho técnico global ainda bloqueado por testes de integração, reconciliação nativa do esquema e revisão manual dos alertas de segurança.** O próximo passo seguro é executar os testes isolados e obter a exportação nativa do esquema; não modificar a base de dados de produção como atalho para fechar o processo.
