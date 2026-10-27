# MozEmpresas — Relatório de fecho técnico P1

**Data:** 27/10/2026  
**Base:** `main`  
**Último commit de aplicação:** `07cd152b55ba12f699eb316c9f4ed83d4fed4e29`  
**Commit de correcção de dependência:** `0a7444e2737aab432d21e5d43e422ee57fb75b06`

## Resultado executivo

A implementação incremental dos fluxos P1 foi aplicada directamente em `main`. O deploy de produção do commit de aplicação `07cd152` foi confirmado como `READY`. Durante a verificação do CI foi detectada uma vulnerabilidade de severidade alta na dependência transitiva PostCSS; foi adicionada uma resolução explícita para `postcss ^8.5.23` no commit `0a7444e`. A execução de CI e o deploy desse commit ainda estavam pendentes/em curso no momento deste relatório.

**Este relatório não declara o P1 funcionalmente fechado:** o deploy bem-sucedido não substitui testes de ponta a ponta, e a execução de TypeScript, lint e build foi interrompida no CI anterior pela falha da auditoria de dependências.

## Entregas implementadas

### P1.1 — Empresas e marketplace
- Selecção da empresa compradora e leitura dos pedidos associados a empresas que o utilizador gere.
- Verificação de autorização para editar ofertas com base na empresa actualmente associada.
- Limites de tamanho para título e descrição no servidor.
- Publicação de oferta apenas depois do processamento dos anexos; limpeza compensatória em falhas.
- Verificação do resultado efectivo de actualizações e eliminações.
- Transições de estado com comparação do estado actual para reduzir actualizações concorrentes e mensagem visível quando o registo de histórico falha.

### P1.2 — Ficheiros e anexos
- Verificação dos erros de armazenamento e base de dados durante remoção de anexos e eliminação de ofertas.
- Tentativa de limpeza de caminhos de armazenamento mesmo quando o resultado do carregamento é ambíguo.
- Mensagens de estado para operações de anexos.

**Limitação:** Storage e PostgreSQL são operações separadas; a compensação reduz o risco, mas não é transaccional. Os casos de falha precisam de ser testados com ficheiros reais.

### P1.3 — Serviços MozEmpresas
- Pedidos personalizados para serviços cujo preço depende de análise.
- Associação a empresas autorizadas e validação de que o serviço permanece activo.
- Consulta de pedidos e respectivos estados no painel do solicitante.
- Preservação da descrição original durante actualizações administrativas.

### P1.4 — Backoffice e moderação
- Vistas administrativas existentes para empresas, ofertas, pedidos de serviço e alertas operacionais.
- Acções de moderação protegidas por contexto de super-administrador e verificações de registos actualizados.

**Limitação:** não foi concluída uma auditoria transversal de todas as acções administrativas nem comprovado um registo de auditoria para cada acção. Não foi criada uma nova tabela nem aplicada migração para esse efeito.

### P1.5 — Publicidade e monetização
- Validação no servidor da campanha, estado, período, espaço e posição antes de aceitar eventos.
- Rejeição de cliques sem impressão recente correspondente e deduplicação de cliques repetidos num intervalo curto.

**Limitação:** não constitui uma solução completa antifraude; impressões falsas, abuso distribuído e concorrência entre pedidos ainda requerem testes e controlos adicionais. Pagamentos reais não foram configurados nem validados nesta entrega.

### P1.6 — Notificações e auditoria
- A actualização de pedidos de serviços gera uma notificação para o solicitante quando a actualização é feita por outro utilizador.

**Limitação:** a cobertura de notificações e auditoria não foi validada para todos os eventos de negócio. A falha de inserção de uma notificação não é actualmente uma operação atómica com a alteração do estado.

### P1.7 — Qualidade e experiência
- Feedback de estado em operações de anexos e mensagens de erro mais explícitas em fluxos de marketplace.
- Não foram executados testes manuais de ponta a ponta nesta entrega.

## Verificações e estado

| Verificação | Estado |
|---|---|
| Código em `main` | Implementado |
| Deploy de `07cd152` | `READY` confirmado |
| CI de `07cd152` | Falhou na auditoria de dependências por alerta de alta severidade do PostCSS; typecheck, lint e build foram ignorados |
| Resolução PostCSS em `0a7444e` | Commit efectuado; CI ainda pendente no momento do registo |
| TypeScript / lint / build do commit final | Não confirmados |
| Testes funcionais comprador/vendedor, anexos e serviços | Pendentes |
| Testes de permissões/RLS em ambiente de teste | Pendentes |
| Migrações ou alterações à base de dados de produção | Nenhuma executada nesta entrega |
| Reconciliação completa do histórico de migrações e restauração PostgreSQL limpa | Pendente |

## Checklist obrigatória antes de declarar P1 fechado

1. Confirmar que o CI do commit `0a7444e` termina com sucesso, incluindo auditoria, TypeScript, lint e build.
2. Confirmar o deploy de produção do mesmo commit como `READY`.
3. Testar com duas contas e empresas distintas: criar/editar/publicar oferta, solicitar contacto, negociar, aceitar, concluir e cancelar; verificar que nenhum utilizador vê ou altera pedidos alheios.
4. Testar anexos: carregamento válido, tipo/tamanho inválido, falha de armazenamento, remoção, eliminação de oferta e reconciliação de ficheiros órfãos.
5. Testar pedidos personalizados de serviços, estados administrativos e notificações.
6. Testar campanhas inactivas/fora do prazo, espaço/posição incompatíveis, clique sem impressão e cliques repetidos.
7. Rever todas as políticas RLS e acções administrativas; validar registo de actor/acção/objecto nas operações críticas.
8. Rever e reconciliar as migrações contra uma exportação nativa da base de dados e executar testes num ambiente PostgreSQL isolado. Não executar migrações históricas ou alterações de produção sem revisão e aprovação explícitas.

## Regra de segurança operacional

Nenhuma migração foi aplicada e nenhum dado de produção foi alterado como parte deste fecho. A migração de política RLS previamente adicionada ao repositório continua a necessitar de validação e aplicação controlada; a sua presença no Git não comprova que esteja activa em produção.
