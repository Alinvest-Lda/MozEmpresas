# MozEmpresas — Relatório de estado e fecho P2

**Data:** 27/10/2026  
**Repositório:** `Alinvest-Lda/MozEmpresas`  
**Branch de trabalho:** `main`  
**Último commit de aplicação verificado:** `5c7d953317bc2285fab9a95591bcbb0781c0559b`

## Resultado executivo

A etapa de qualidade automatizada avançou e o commit de aplicação indicado passou no CI. O deploy Vercel associado a esse commit está em estado `READY`. Isto comprova que a pipeline terminou e que o artefacto foi publicado; **não comprova que os fluxos estejam funcionalmente validados em produção**.

Não declarar o P2 nem o fecho global do MozEmpresas concluídos enquanto os testes de integração, a reconciliação da base de dados e a revisão de segurança não forem executados e registados.

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
| Migrações ou alterações à base de dados de produção nesta fase | Nenhuma executada | Registo desta entrega |

A cobertura automatizada acrescentada nesta fase inclui testes unitários para validação/elegibilidade de eventos publicitários e regras de transição de estados das encomendas. Estes testes não substituem testes de integração com PostgreSQL, Storage, RLS ou autenticação real.

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
- [ ] Rever transversalmente todas as políticas RLS e todas as acções administrativas.
- [ ] Verificar autorização no servidor em cada operação crítica e testar casos negativos.
- [ ] Testar rate limiting, falhas de Storage, erros de notificação, concorrência e consistência dos registos de histórico.
- [ ] Rever logs/observabilidade para garantir que não expõem tokens, segredos ou dados pessoais desnecessários.
- [ ] Confirmar sinais operacionais e procedimentos de recuperação.

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

**Estado actual: CI e deploy confirmados; fecho técnico global ainda bloqueado por validações de integração, reconciliação nativa do esquema e auditoria de segurança.** O próximo passo seguro é executar os testes isolados e obter a exportação nativa do esquema; não modificar a base de dados de produção como atalho para fechar o processo.
