# MozEmpresas — Auditoria de UX, negócio e prontidão para produção

**Data:** 2026-11-01  
**Base de código:** `main`, commit `8882107478e9871f2901e22de685bddf6be38e3a`  
**Ambiente:** deployment Vercel de produção `READY`; Supabase activo `zikjvjzbbfzrelbkaaci`  
**Método:** revisão estática de páginas, componentes, acções de servidor, regras de estado e documentação; consultas read-only ao esquema e Security/Performance Advisors; verificação de CI/deployment.  
**Limitação essencial:** não foram executados testes E2E autenticados no browser, testes com contas de cada papel, testes de concorrência contra staging, nem entrevistas/usabilidade com clientes. Este relatório é uma auditoria técnica e heurística baseada em evidência, não uma certificação independente de UX nem uma prova de funcionamento integral em produção.

---

## 1. Parecer executivo

**Decisão: NÃO APROVAR ainda para lançamento comercial amplo.** O deployment está publicado e o pipeline técnico passou, mas a prontidão operacional e a experiência de negócio não estão suficientemente demonstradas. É possível preparar um piloto controlado depois de fechar os bloqueadores P0 abaixo; não é prudente vender ou prometer todos os módulos como serviços plenamente operacionais.

O produto tem uma proposta compreensível no núcleo: **descobrir empresas, conhecer ofertas e iniciar relações comerciais**. A separação entre experiência empresarial, workspace de parceiro e Super Admin é conceptualmente correcta. O problema está na distância entre algumas promessas de valor e o que os fluxos actualmente entregam, sobretudo no workspace de Parceiros, inteligência, gestores, pagamentos, notificações e suporte.

### Estado global

| Dimensão | Parecer | Fundamentação |
|---|---|---|
| Clareza da proposta central | Parcialmente boa | Directório + marketplace são fáceis de explicar; o conjunto de serviços, publicidade, créditos e parceiro precisa de uma hierarquia comercial mais explícita. |
| UX / intuitividade | Parcial | Existem jornadas e CTAs úteis, mas há inconsistências de contexto, nomenclatura, estados vazios e informação por utilizador vs. por conta. |
| Valor para empresas | Promissor, não comprovado | Presença e ofertas têm valor perceptível; pedidos comerciais, serviços e publicidade carecem de validação ponta a ponta e dados reais de utilização. |
| Valor para parceiros | Insuficientemente demonstrado | A conta partilhada por gestores não está fechada; “inteligência” apresenta sobretudo contadores da própria actividade, não inteligência de mercado. |
| Segurança e integridade | Risco elevado por validar | Advisor identifica funções SECURITY DEFINER expostas, RLS sem políticas em tabelas seleccionadas e RLS desactivado na tabela privada de convites. |
| Operação e suporte | Parcial | Existem backoffice, pedidos e notificações, mas cobertura de auditoria, estados, entrega de notificações e suporte não está provada. |
| Qualidade técnica do commit | Aprovada no CI | Unit tests, typecheck, lint, build e teste SQL isolado passaram; isto não substitui integração e E2E. |
| Prontidão para produção | Não aprovada | Divergência do ledger de migrations, ausência de staging validado e fluxos financeiros/conta de parceiro incompletos. |

## 2. Evidência técnica e operacional verificada

### CI e deployment

O workflow `41236714332` terminou com sucesso:
- Unit tests;
- Type check;
- Lint;
- Production build;
- teste isolado PostgreSQL para a migration de hardening de `search_path`.

O deployment Vercel `dpl_5mZ9qifSEogQWjLzYXFioU26iSV4` está `READY`, target `production`, associado ao commit indicado acima. O status combinado do commit reporta Vercel success.

**Interpretação:** a versão compila, passa as verificações incluídas no CI e foi publicada. Não há evidência de que os percursos reais de cada papel tenham sido executados no ambiente publicado.

### Dados activos — dimensão da amostra

Consulta read-only em 2026-11-01:
- 1 empresa;
- 1 publicação de marketplace, das quais 1 publicada;
- 0 pedidos comerciais;
- 1 conta de parceiro e 1 membership;
- 25 serviços MozEmpresas activos;
- 25 produtos publicitários empresariais activos;
- 9 produtos publicitários de parceiro activos;
- 0 campanhas empresariais;
- 0 campanhas de parceiro;
- 0 pedidos de serviço;
- 0 notificações;
- 0 tickets de suporte;
- 0 pedidos de compra de créditos;
- 0 registos financeiros;
- 1 membro activo de plataforma.

Esta amostra é demasiado pequena para validar satisfação, comportamento em escala, isolamento entre várias empresas/contas, capacidade publicitária concorrente ou operações financeiras reais. Os módulos de monetização, marketplace, suporte e notificações não têm histórico real suficiente para uma validação operacional.

### Supabase — findings actuais

O Security Advisor, observado em 2026-11-01, reportou:
- 4 tabelas com RLS activo e sem políticas: `contact_messages`, `partner_account_members`, `partner_accounts`, `public_rate_limits`;
- 4 funções `SECURITY DEFINER` executáveis por `anon`;
- 22 funções `SECURITY DEFINER` executáveis por `authenticated`.

Consulta directa read-only confirmou:
- `private.partner_access_grants`: RLS desactivado, sem políticas;
- `public.partner_accounts` e `public.partner_account_members`: RLS activo, zero políticas;
- `current_partner_account_id()`: SECURITY DEFINER, `search_path=public`, não valida estado da conta nem `profiles.account_status`, e escolhe membership com `limit 1`;
- `partner_account_context()`: também usa `limit 1`, sem selecção explícita de contexto quando há múltiplas memberships;
- `partner_access_claim()`: valida identidade/email e cria uma nova conta owner se o utilizador ainda não tiver membership; não recebe uma conta-alvo no convite;
- `partner_account_add_manager()`: só associa um utilizador já existente, já classificado como parceiro; não convida nem activa um novo gestor comum para a conta existente.

O Performance Advisor reportou 36 foreign keys sem índice de cobertura. Não é prova de degradação actual, mas requer priorização por tabelas/consultas mais utilizadas.

**Importante:** não foram alteradas tabelas, funções, RLS, Auth ou migrations em produção. Não revogar em massa funções nem adicionar políticas genéricas para eliminar os avisos.

## 3. Auditoria por módulo

Legenda: **Verde** = evidência suficiente para uso controlado; **Amarelo** = funcionalidade presente, mas falta validação/fecho; **Vermelho** = bloqueador ou promessa de negócio que não está suportada.

| Módulo | UX e valor percebido | Estado funcional / produção | Parecer |
|---|---|---|---|
| Página inicial e navegação pública | Mensagem central de descoberta empresarial é compreensível. A página tenta promover empresas, ofertas, oportunidades e registo. | Consultas e anúncios dependem do Supabase/RPC; não foi feito teste browser, de links, mobile ou estados de falha. Há mais categorias na homepage do que na taxonomia fixa do marketplace. | Amarelo |
| Directório de empresas | Pesquisa por empresa, actividade e localização, perfis públicos e destaque pago fazem sentido para o mercado. | RLS e publicação precisam de teste com empresas públicas, privadas, arquivadas e suspensas. Pesquisa por categoria/localização e paginação não foram testadas com volume real. | Amarelo |
| Perfil público de empresa | Identidade, contactos, actividade e portefólio são uma proposta fácil de entender. | É necessário testar completude, privacidade dos campos, imagens, links e visibilidade após suspensão/arquivo. | Amarelo |
| Registo, login e estado da conta | Separação empresa/profissional/parceiro é correcta em conceito. | `getCurrentAccountContext()` trata erro de `is_partner_account()` como se o utilizador não fosse parceiro; como `normalizeAccountType()` converte tipos desconhecidos em empresa, uma falha RPC pode encaminhar parceiro para o dashboard errado. Testar confirmação, recuperação, conta inactiva e sessões. | Vermelho |
| Dashboard empresarial | “O que merece atenção agora” e próxima acção ajudam a orientar utilizadores. | Indicadores combinam ofertas, pedidos e notificações; precisam de definições estáveis. Não há E2E com múltiplas empresas/membros. | Amarelo |
| Gestão de empresas e equipa | A página explica identidade, presença e actividade; completude do perfil é um incentivo útil. | Rever associação, convites, papéis, suspensão, arquivo e permissões em duas empresas. A auditoria actual não prova o ciclo de equipa completo. | Amarelo |
| Marketplace público | Produtos/serviços, filtros e detalhe têm proposta clara. | A consulta filtra por publicação, mas a visibilidade da empresa associada depende também das políticas e dos dados relacionados; validar explicitamente empresa suspensa/privada. Categorias públicas são fixas e não coincidem integralmente com categorias do directório. | Amarelo |
| Marketplace empresarial — publicar e gerir ofertas | O modelo de rascunho/publicação/pausa/esgotado/arquivo é compreensível. As transições foram reforçadas na camada de aplicação. | Anexos atravessam Storage e DB, exigindo teste de falhas parciais, limpeza e permissões. A máquina de estados ainda não foi provada em todas as vias SQL/RLS. | Amarelo |
| Pedidos e negociações do marketplace | A distinção entre interesse, contacto, negociação, acordo e conclusão é adequada. A regra de negociação fora da plataforma evita prometer checkout inexistente. | 0 pedidos reais; falta testar comprador/vendedor, acesso cruzado, concorrência, histórico, cancelamento e notificações. Pagamento/entrega devem continuar explicitamente fora da plataforma. | Amarelo |
| Serviços MozEmpresas — catálogo e pedido | Catálogo com 25 serviços activos; o utilizador consegue distinguir catálogo, pedido personalizado e acompanhamento. | 0 pedidos activos na base observada. Testar pedido, cotação, aceitação, execução, conclusão, cancelamento, anexos e notificações. O estado de serviço e o estado de pagamento/ordem não podem divergir. | Amarelo |
| Publicidade empresarial | A distinção entre presença orgânica gratuita e exposição paga é boa e comercialmente importante. O selector de espaço/duração simplifica a escolha. | Compra com créditos usa RPC; M-Pesa cria pedido pendente e não foi comprovada integração de pagamento end-to-end. A verificação de capacidade na via M-Pesa é feita por leitura antes de inserir, não sendo demonstradamente atómica sob concorrência. 0 campanhas activas no esquema observado. | Vermelho |
| Carteira e créditos | Créditos podem simplificar compras recorrentes de publicidade/serviços. | Falta provar aprovação de comprovativos, crédito único, idempotência, reconciliação, reversão e histórico. Nunca apresentar pedido pendente como pagamento confirmado. | Vermelho |
| Workspace de Parceiros — visão geral | A proposta de gerir relação, oportunidades, exposição e serviços é coerente. A próxima acção é uma boa orientação. | A página consulta oportunidades por `owner_id=user.id`, enquanto a página de oportunidades usa `partner_account_id`; gestores da mesma conta podem ver métricas e actividade diferentes. Alguns indicadores podem não representar a conta inteira. | Vermelho |
| Parceiros — oportunidades e candidaturas | CRUD, rascunho/publicação/fecho/arquivo e gestão de candidaturas são processos reconhecíveis. As transições de estado foram reforçadas. | A validação actual é sobretudo na camada de aplicação. Falta validar RLS/RPC, janela de candidatura, concorrência, histórico e isolamento entre contas no ambiente isolado. | Amarelo |
| Parceiros — publicidade | Catálogo de formatos, período, objectivo e pedido para análise constituem um fluxo comercial razoável. | É necessário provar aprovação, pagamento, capacidade, activação, expiração, entrega e métricas reais. 9 produtos activos, mas 0 campanhas registadas. | Amarelo |
| Parceiros — serviços e exclusividades | O catálogo comunica possíveis serviços e benefícios. | Pedidos são gravados por `requester_user_id`, não como actividade partilhada da conta. Um gestor pode não ver pedidos submetidos por outro. Exclusividades dependem de entitlements cuja vigência, âmbito e efeitos devem ser testados. | Vermelho |
| Parceiros — inteligência e mercado | O nome e a descrição prometem leitura de procura, tendências, posicionamento e mercado. | A implementação observada calcula essencialmente contagens de oportunidades, pedidos e benefícios da própria entidade. As camadas de dados de audiência, mercado, tendências e benchmarks são descritas como possibilidades futuras, não como inteligência já entregue. Esta diferença pode gerar frustração e perda de confiança. | Vermelho |
| Parceiros — actividade e resultados | A página declara correctamente que o histórico é factual, não uma previsão. | Consulta oportunidades por `owner_id=user.id`, serviços por solicitante e campanhas por conta. Não é uma linha temporal integral da conta; gestores podem ver registos incompletos. | Vermelho |
| Parceiros — conta e gestores | O conceito de conta única com vários gestores é adequado. | O formulário actual só adiciona utilizador que já tenha conta de parceiro activa. Não convida um gestor novo nem associa o convite à conta-alvo. A jornada de gestão partilhada não está pronta. | Vermelho |
| Super Admin — centro de controlo | Indicadores e alertas podem ajudar a equipa a operar a plataforma. | Guardas server-side de Super Admin existem. Ainda é necessário verificar todas as acções administrativas, transições, efeitos secundários, auditoria, reversão e feedback de falha. | Amarelo |
| Super Admin — empresas, utilizadores, oportunidades, publicidade e campanhas | A separação por módulos é adequada à operação. | Não foi possível provar todos os percursos de moderação com actor real, duas contas e histórico completo. Verificar que cada mutação confirma o registo actualizado e não apenas a ausência de erro SQL. | Amarelo |
| Super Admin — monetização | A central consolida planos, produtos, campanhas e eventos e assinala erros de consulta. | A página observada é sobretudo de consulta; a capacidade real de configurar preços, inventário, disponibilidade e condições deve ser confirmada noutros ecrãs. 0 campanhas e 0 movimentos financeiros observados. | Amarelo |
| Suporte | Ticket e mensagem inicial estão modelados. | 0 tickets observados. Falta validar ciclo de resposta, reabertura, encerramento, SLA, acesso por utilizador e falhas parciais entre mensagem e estado. | Amarelo |
| Notificações | Há componente transversal e contagem de não lidas. | 0 notificações observadas; cobertura evento→destinatário→conteúdo→destino não está fechada nem provada como atómica. Erros em consultas são ignorados em algumas páginas, podendo aparecer como lista vazia. | Vermelho |
| Auditoria operacional | Existem estruturas de auditoria e access audit. | Cobertura de todas as acções financeiras, administrativas e de acesso não está comprovada. Deve ser possível identificar actor, alvo, acção, momento e resultado. | Vermelho |
| Pesquisa guardada, favoritos e alertas | São funcionalidades úteis para retenção e descoberta recorrente. | Migrações existem; falta testar filtros combinados, elegibilidade, deduplicação, opt-out e alterações de estado de oportunidades. | Amarelo |
| Anexos e Storage | Validação de MIME, tamanho e limpeza compensatória já existe em alguns fluxos. | Storage e DB não são uma transacção única; testar uploads ambíguos, remoção, órfãos e autorização de leitura. | Amarelo |
| Configuração, esquema e migrations | Arquitectura Next.js/Supabase/PostgreSQL está documentada. | O ledger activo tem 67 entradas no snapshot anterior, com divergências de nomes/versões face aos ficheiros SQL do repositório. O estado precisa de reconciliação integral. Não executar `db push`, repair ou replay em produção. | Vermelho |
| Observabilidade, desempenho e acessibilidade | CI está configurado. | 36 foreign keys sem índice de cobertura no Performance Advisor. Não foram medidos Core Web Vitals, tempos de consulta, uso móvel, teclado, contraste ou leitores de ecrã. | Amarelo |

## 4. Achados críticos com impacto directo na satisfação

### P0 — Conta de parceiro não é verdadeiramente multi-gestor

O produto promete uma entidade parceira com vários gestores. No estado observado:
1. O convite de acesso não identifica uma conta de destino.
2. O claim cria uma nova conta owner quando o utilizador ainda não tem membership.
3. O RPC de adicionar gestor exige que a pessoa já tenha utilizador e perfil de parceiro activo.
4. O dashboard e a página de resultados consultam oportunidades por `owner_id`, enquanto a gestão de oportunidades consulta por `partner_account_id`.
5. Pedidos de serviço são associados ao utilizador individual.

**Efeito:** dois gestores da mesma organização podem ter experiências, contadores e histórico diferentes; a organização não opera como uma única conta partilhada. Não vender a gestão multi-gestor como pronta.

### P0 — “Inteligência e mercado” excede o que está entregue

A página apresenta contagens de actividade própria como leitura de inteligência. Tendências, procura, dados de audiência, benchmarks e insights sectoriais estão descritos como camadas que a plataforma poderá vir a produzir.

**Efeito:** o parceiro pode esperar informação de mercado accionável e encontrar apenas indicadores operacionais básicos. Renomear temporariamente a área para “Indicadores da actividade” ou entregar dados reais com fontes, período, metodologia e volume mínimo antes de prometer inteligência de mercado.

### P0 — Pagamentos e monetização não estão fechados

A criação de um pedido M-Pesa pendente não prova uma cobrança M-Pesa integrada. A compra com créditos também exige prova de crédito, reconciliação e reversão. A via M-Pesa da publicidade verifica capacidade antes de inserir o pedido, sem prova de atomicidade perante pedidos concorrentes.

**Efeito:** risco financeiro, overbooking de espaços e expectativas erradas. Não activar campanhas nem creditar carteiras sem confirmação inequívoca e idempotente.

### P0 — Segurança e contexto de parceiro exigem validação isolada

RLS e SECURITY DEFINER apresentam findings concretos. A função de contexto usa `limit 1` sem resolver explicitamente múltiplas memberships. A tabela privada de grants não tem RLS activo. A existência de grants revogados pode ser uma parte intencional do desenho, mas falta defesa em profundidade e teste dos caminhos privilegiados.

**Efeito:** não é possível certificar isolamento de contas e gestão de convites sem testes negativos em staging. Não aplicar correcções directas em produção.

### P1 — Erros podem parecer ausência de dados

Em várias páginas de Parceiro e em páginas de utilizador, consultas Supabase ignoram o campo `error` e usam `data ?? []`. Um erro de rede/permissão pode aparecer como “ainda não existem registos” ou catálogo vazio.

**Efeito:** o utilizador pode pensar que não tem actividade, que o catálogo está vazio ou que perdeu dados. Padronizar estados distintos: carregado vazio, erro de carregamento, sem permissão e indisponibilidade temporária.

### P1 — Vocabulário e promessa comercial

Há mistura de português e inglês no workspace de Parceiros (“Partner Workspace”, “Command Center”, “CTR”, “Campaign”). A linguagem de produto deve ser consistente e orientada a tarefas, sobretudo para gestores não técnicos. Distinguir sempre: pedido submetido, pedido aprovado, pagamento pendente, pagamento confirmado, campanha activa e campanha concluída.

## 5. Prioridades antes de produção

### P0 — Bloqueadores (não lançar comercialmente antes de fechar)

1. **Fechar o modelo multi-gestor de parceiro:** convite para conta existente com account_id e papel, claim atómico, expiração, revogação, uso único e testes com dois gestores.
2. **Uniformizar contexto e escopo de conta:** oportunidades, candidaturas, serviços, campanhas, inteligência, resultados, notificações e dashboard devem consultar pelo mesmo account_id e permissões.
3. **Reconciliar migrations e esquema activo:** exportar esquema, comparar funções, políticas, triggers, índices e ledger; preparar ambiente isolado antes de qualquer migration.
4. **Rever SECURITY DEFINER e RLS função a função:** validar auth.uid(), tenant, papel, search_path, grants e comportamento negativo; rever `partner_access_grants` com teste de owner/bypass.
5. **Fechar o fluxo financeiro:** especificar M-Pesa real vs. pedido manual; callback/verificação, idempotência, timeout, reconciliação, crédito, reversão e capacidade atómica.
6. **Corrigir a promessa de inteligência:** limitar a área a indicadores factuais até existirem fontes reais, metodologia e amostra suficiente.
7. **Testar o marketplace de ponta a ponta:** comprador, vendedor, duas empresas, transições, cancelamento, histórico, anexos e isolamento.

### P1 — Antes de escalar a operação

8. Normalizar estados vazios, erro, loading, sucesso e permissões em todos os módulos.
9. Fechar notificações por evento e destinatário, com retry/outbox ou registo de falha.
10. Completar auditoria de operações administrativas, financeiras e de acesso.
11. Validar serviços, cotações, execução, conclusão, cancelamento e suporte.
12. Confirmar a configuração comercial: catálogo, preços, capacidade, prazos, IVA/condições, elegibilidade e o que está incluído.
13. Fazer revisão mobile-first, acessibilidade, navegação por teclado, formulários e desempenho.
14. Rever os 36 índices de foreign keys por impacto real; priorizar tabelas com maior volume e consultas críticas.

## 6. Plano de validação para poder declarar “pronto”

A aprovação exige ambiente isolado com dados de teste e execução documentada dos seguintes cenários:

- Visitante anónimo: pesquisar empresa, filtrar ofertas, abrir perfil e contactar/manifestar interesse conforme o fluxo.
- Empresa A e Empresa B: criar perfil, publicar oferta, editar, pausar, arquivar e tentar aceder a dados uma da outra.
- Comprador e vendedor: criar interesse, avançar estados, cancelar, concluir e verificar histórico.
- Parceiro owner e gestor: convite de novo utilizador, aceitação, revogação, dois gestores a operar a mesma conta e tentativa de aceder a outra conta.
- Candidato: submeter candidatura dentro/fora da janela, actualizar os seus dados permitidos e tentar alterar estado reservado ao parceiro.
- Publicidade: comprar com créditos, pedido M-Pesa, pagamento confirmado/recusado/duplicado, concorrência por último espaço, activação e expiração.
- Serviços: pedido, cotação, aceitação, execução, conclusão, cancelamento e notificação.
- Suporte: ticket, resposta, espera pelo utilizador, reabertura, resolução e acesso indevido.
- Super Admin: cada acção com utilizador sem papel, papel inactivo, sucesso, falha e trilho de auditoria.
- Resiliência: Supabase indisponível, RPC com erro, upload interrompido, callback repetido e notificação falhada.

Para cada cenário registar: actor, pré-condições, passos, resultado esperado, resultado observado, evidência, severidade e commit.

## 7. Estratégia de lançamento recomendada

**Não abrir todos os módulos de uma vez.** Depois de fechar os P0 e validar os percursos críticos, iniciar um piloto limitado com:
1. Directório público e perfis empresariais;
2. Marketplace como descoberta e manifestação de interesse, mantendo pagamento/entrega fora da plataforma;
3. Serviços MozEmpresas por pedido e acompanhamento manual claramente identificado;
4. Parceiros apenas com oportunidades e publicidade em modo de pedido para análise, até a conta multi-gestor e o ciclo financeiro estarem fechados.

Manter carteira/créditos, pagamentos automatizados, inteligência de mercado e promessas de resultados fora do lançamento até haver confirmação técnica e dados reais.

## 8. Conclusão

O MozEmpresas tem uma arquitectura e uma proposta de produto com potencial, e o núcleo de descoberta empresarial está bem encaminhado. **A versão publicada não deve ser confundida com um produto integralmente pronto para produção.** O maior risco de insatisfação não é visual: é prometer gestão partilhada, inteligência, campanhas pagas ou pagamentos que ainda não têm o ciclo operacional comprovado.

A recomendação é fechar primeiro os P0, executar os testes de aceitação em staging e só depois emitir uma aprovação de produção por módulo. Esta auditoria não aplicou alterações no código nem na base de dados.
