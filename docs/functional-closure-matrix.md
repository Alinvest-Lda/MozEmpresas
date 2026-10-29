# MozEmpresas — Matriz de fecho funcional e regras de negócio

**Estado:** versão inicial de auditoria estática; não representa certificação de produção.  
**Base consultada:** branch `main`, commit `77d318a39bc4c35bb9caebfa1e028d3f1cc953bf`.  
**Objectivo:** estabelecer uma única referência de trabalho antes de retomar P0–P5, distinguindo regras definidas, implementação observada e validações ainda necessárias.

## 1. Como interpretar esta matriz

- **Definido**: a regra está documentada ou é explícita no modelo de dados/código.
- **Parcial**: existe parte do fluxo, mas o ciclo completo ou os efeitos transversais não estão comprovados.
- **A validar**: exige testes, inspecção adicional do esquema activo ou confirmação de operação.
- **Não declarar concluído**: não existe evidência suficiente para fechar o fluxo.

Esta revisão é documental e estática. A presença de uma página, acção de servidor, tabela ou migração não prova, por si só, que o fluxo funciona em produção.

## 2. Decisões de produto preservadas

1. MozEmpresas é um directório empresarial e balcão digital para descoberta de empresas, produtos e serviços em Moçambique.
2. O produto final-user cobre directório, perfis empresariais, marketplace, gestão de empresas/acessos, serviços MozEmpresas, publicidade e funcionalidades de conta.
3. O módulo Concursos foi removido e não deve ser reintroduzido como parte deste fecho.
4. O módulo de Parceiros é uma área distinta: o parceiro é uma entidade própria, não uma empresa que gere um portefólio de terceiros.
5. O Super Admin controla a operação global, moderação, contas de parceiro, oportunidades, publicidade, monetização e suporte.
6. Não declarar pagamentos reais integrados ou validados quando o código só cria pedidos/registos pendentes ou depende de validação manual.
7. Não executar migrações em produção, reparar o histórico de migrações ou alterar RLS sem reconciliação e plano explícito.
8. Manter compatibilidade com PostgreSQL e evitar dependência desnecessária de funcionalidades específicas de fornecedor.

## 3. Matriz por módulo

| ID | Módulo / processo | Regra de negócio a fechar | Evidência observada no repositório | Estado de fecho | Critério de aceitação |
|---|---|---|---|---|---|
| F01 | Identidade e estado da conta | Só utilizadores autenticados e activos executam operações permitidas ao seu papel. | Há verificações de autenticação e estado de perfil em várias acções; a cobertura é distribuída por módulos. | Parcial / validar transversalmente | Testes de sessão ausente, conta inactiva, utilizador normal, gestor de empresa, parceiro e Super Admin em cada fluxo crítico. |
| F02 | Empresa e gestores | Cada operação empresarial verifica associação e papel no servidor/base de dados. | Existem `businesses`, `business_members`, helpers de permissões e políticas RLS. | Parcial / validar | Matriz de permissões por papel; testes cruzados com duas empresas e utilizadores não associados; verificar convites, remoção, suspensão e arquivo. |
| F03 | Directório público | Apenas perfis e ofertas publicáveis são expostos; os dados públicos não revelam informação privada. | Directório e perfis públicos existem; há migrações de hardening de perfis e políticas. | Parcial / validar | Testes anónimos/autenticados; campos públicos explicitamente allowlisted; contas e ofertas suspensas não aparecem. |
| F04 | Marketplace — publicações | Oferta passa por rascunho, publicação, edição permitida, arquivo/remoção, respeitando propriedade e validação. | `lib/commerce/actions.ts` cria ofertas em `DRAFT`, valida campos, empresa, anexos e autorização. | Parcial | Testar CRUD com anexos reais em ambiente isolado, estados, limpeza de ficheiros, falhas parciais e visibilidade pública. |
| F05 | Marketplace — pedido comercial | Comprador e vendedor têm acesso correcto; transições são permitidas e ficam registadas. | `lib/commerce/state-machine.ts` define `INTERESTED → CONTACTED → NEGOTIATING → AGREED → COMPLETED`, com cancelamento nos estados intermédios previstos; a migração `20260930003000_marketplace_offline_commerce.sql` define que pagamentos/liquidação ocorrem fora da plataforma. | Parcial / validar | Testes de transições válidas/inválidas, papéis dos participantes, concorrência, histórico, cancelamento e isolamento. Preservar a regra: marketplace regista intenção comercial, não processa pagamento entre comprador e vendedor. |
| F06 | Serviços MozEmpresas | Serviço activo pode ser solicitado/contratado; estados, preço, vigência e cancelamento são coerentes. | Existem catálogo, pedidos e acção de checkout; contratação com créditos usa RPC; M-Pesa cria ordem e pagamento pendentes. | Parcial | Definir estados finais, aprovação/cotação, pagamento, activação, expiração, renovação, cancelamento, reembolso e notificações. |
| F07 | Créditos e carteira | Créditos só são creditados após confirmação de pagamento; consumo é atómico e rastreável. | Existe pedido de compra de créditos com comprovativo opcional/obrigatório conforme método; há carteiras e transacções. | Parcial / risco financeiro | Confirmar fluxo de aprovação/recusa, idempotência, crédito uma única vez, reconciliação, histórico e tratamento de comprovativos; testar concorrência. |
| F08 | Publicidade para empresas | Produto, preço, capacidade, datas, alvo, pagamento e entrega são consistentes. | Catálogo de produtos e RPC de compra com créditos; pedidos/campanhas M-Pesa; validação de eventos publicitários. | Parcial / risco comercial | Testar capacidade concorrente, períodos sobrepostos, elegibilidade, moderação, pagamento confirmado, activação, expiração e métricas. |
| F09 | Publicidade para parceiros | Campanhas e produtos de parceiro pertencem à conta parceira certa e respeitam entitlement/permissões. | Migrações de produtos/campanhas/alvos/entitlements e políticas RLS existem no histórico. | Parcial / dependente de conta de parceiro | Verificar o esquema real, associação à conta, ciclo de pedido-aprovação-pagamento-entrega e isolamento entre duas contas parceiras. |
| F10 | Oportunidades de parceiros | Só a conta autorizada gere as suas oportunidades; candidatos submetem dentro da janela e estados válidos. | Migrações definem `partner_account_id`, políticas de leitura/gestão e candidatura; há acções de parceiro. | Parcial | Testar publicação, rascunho, datas, candidatura, actualização de estado, encerramento e acesso entre contas. |
| F11 | Conta de parceiro e gestores | Uma entidade parceira tem vários gestores e papéis; convite, activação, suspensão e revogação mantêm associação coerente. | `partner_access_grants` e RPCs de convite/validação/claim existem; migrações posteriores referem `partner_accounts` e `partner_account_members`. A documentação também marca o workspace como protótipo. | Parcial / prioridade alta | Reconciliar criação de tabelas com todas as migrações e esquema activo; validar associação de cada conta, gestores e papéis, convite de uso único, suspensão e acesso ao workspace. |
| F12 | Serviços e exclusividades de parceiro | Elegibilidade, condições e período são representados como direitos verificáveis da conta. | A especificação descreve o fluxo; existem estruturas de entitlements e serviços gerais, mas não está provado o ciclo completo de exclusividade. | A validar / provavelmente incompleto | Definir tipos de entitlement, âmbito, vigência, conflitos, renovação, revogação e efeitos em publicidade/serviços. |
| F13 | Inteligência e desempenho | Métricas são derivadas de dados reais, com definições, período e limites de agregação. | A especificação do parceiro exige fontes reais e separa dados observados, calculados e interpretações. | A validar | Cada indicador tem consulta/fonte, fórmula, janela temporal, regras de privacidade e teste de reconciliação; sem fonte, não mostrar métrica. |
| F14 | Super Admin e moderação | Cada acção é autorizada, transita de estado permitido, deixa histórico e produz efeitos relacionados. | Páginas e acções administrativas existem; contexto Super Admin valida papel; relatórios anteriores reconhecem cobertura incompleta de auditoria. | Parcial / prioridade alta | Inventariar todas as acções administrativas; verificar transições, autorização, resultado de update, auditoria, notificações e reversão/compensação. |
| F15 | Suporte | Ticket e mensagem inicial são consistentes; respostas e estados reflectem quem deve agir. | Criação de ticket e mensagem inicial são separadas com limpeza compensatória; resposta de staff actualiza estado. | Parcial | Testar concorrência e falhas entre mensagem/estado; definir estados, reabertura, encerramento, acesso, tempos e histórico. |
| F16 | Notificações | Eventos relevantes geram notificações correctas sem expor dados a outros utilizadores. | Existem notificações e alguns fluxos inserem-nas; relatório P1 indica cobertura incompleta e não atomicidade. | Parcial | Mapa evento→destinatário→conteúdo→destino; testes de falha, duplicação, leitura e isolamento. Decidir quando usar transacção/outbox. |
| F17 | Auditoria operacional | Operações críticas identificam actor, acção, objecto, momento e resultado. | Há estrutura de auditoria; relatórios anteriores dizem que a cobertura global não foi comprovada. | Parcial / prioridade alta | Matriz de eventos auditáveis, testes de escrita e protecção contra alteração indevida; cobrir operações financeiras, moderação, acesso e estados. |
| F18 | Pagamentos e reconciliação | Estados de pedido, pagamento e serviço/campanha não se contradizem; callbacks são idempotentes. | O checkout M-Pesa consultado cria `PENDING_PAYMENT` e registo `PENDING`; não foi comprovada integração real end-to-end nesta auditoria. | Não fechado | Só fechar após integração configurada e testes de sucesso, falha, timeout, callback repetido, valor/referência incorrectos, cancelamento e reconciliação. |
| F19 | Anexos e Storage | Tipo, tamanho, autorização, ciclo de vida e limpeza são controlados. | Há validações de MIME/tamanho e compensação em algumas acções; Storage e PostgreSQL não são transaccionais. | Parcial | Testes com ficheiros reais, falhas ambíguas, remoção, permissões de leitura, ficheiros órfãos e limites no servidor. |
| F20 | Pesquisa, favoritos e alertas | Filtros guardados correspondem à definição de pesquisa e só notificam sobre resultados elegíveis. | Migrações de pesquisas guardadas/favoritos/alertas e correcções de filtros existem. | Parcial / validar | Testes por tipo de oportunidade, filtros combinados, alteração de publicação, duplicação e opt-out. |
| F21 | Configuração, dados e migrações | O esquema no ambiente corresponde ao histórico e às migrações aprovadas. | Relatório P2 indica que o hardening está no repositório, mas ainda não aplicado; recomenda exportação nativa e reconciliação. | Bloqueador de validação | Exportar esquema nativo, comparar tabelas/funções/políticas/triggers/índices e ledger; testar migrações numa base isolada antes de qualquer aplicação. |
| F22 | CI, integração e produção | Build verde é distinto de teste funcional, integração e validação de produção. | Existem testes unitários para máquina de estados e validação de eventos; relatórios registam testes end-to-end pendentes. | Parcial | CI cobre regras críticas; ambiente isolado cobre RLS/SQL; smoke test documentado cobre percursos; resultados e commit ficam registados. |

## 4. Regras transversais obrigatórias

### 4.1 Estados
Cada processo deve ter um catálogo de estados e uma tabela de transições com:
- estado de origem;
- estado de destino;
- actor autorizado;
- pré-condições;
- efeitos secundários;
- evento de auditoria;
- notificações;
- comportamento em falha.

Uma validação de enumeração não basta: também é preciso validar se a transição é permitida a partir do estado actual.

### 4.2 Operações financeiras
- Um pedido de pagamento não é um pagamento confirmado.
- Um comprovativo carregado não é prova automática de liquidação.
- A mesma referência/callback não pode gerar créditos ou activar serviços mais de uma vez.
- O consumo de créditos, o registo da transacção e a criação da campanha/ordem devem ser atómicos na base de dados quando pertencem à mesma operação.
- Reembolsos e reversões devem produzir movimentos compensatórios, sem apagar o histórico original.

### 4.3 Multi-tenancy e autorização
- Toda a operação de negócio valida autorização no servidor e/ou base de dados; a UI não é uma fronteira de segurança.
- Utilizadores de uma empresa não podem aceder a outra empresa por alteração de IDs.
- Gestores de uma conta parceira não podem ler ou alterar outra conta parceira.
- Operações de Super Admin usam verificação centralizada e ficam auditadas.
- Não alterar RLS existente sem analisar dependências, migrações e risco de regressão.

### 4.4 Falhas parciais
Para fluxos que atravessam base de dados, Storage, notificações ou fornecedor de pagamentos, definir:
- ordem das operações;
- ponto de confirmação;
- compensação ou retry;
- idempotência;
- estado visível ao utilizador;
- alerta operacional.

## 5. Prioridade de fecho funcional

### F0 — Bloqueadores antes do fecho
1. Reconciliar documentação com código e esquema real.
2. Fechar modelo de conta de parceiro e gestores.
3. Definir o ciclo financeiro real versus manual/simulado.
4. Fechar transições e permissões de publicidade, serviços e marketplace.
5. Confirmar estado do esquema e migrações sem alterar produção.

### F1 — Processos operacionais
6. Fechar Super Admin, moderação e auditoria.
7. Fechar notificações e suporte.
8. Fechar anexos e limpeza de falhas.
9. Fechar métricas e fontes de dados.

### F2 — Prova de conclusão
10. Testes automatizados das regras críticas.
11. Testes de integração com utilizadores e empresas distintos.
12. Smoke tests em ambiente de teste.
13. Actualizar o estado de implementação apenas com evidência reproduzível.

## 6. Documentos de execução relacionados\n\n- [Inventário de estados e transições](business-state-transition-inventory.md) — estados encontrados, transições conhecidas e lacunas por processo.\n\n## 7. Próximas acções desta roadmap

| Acção | Entrega | Estado |
|---|---|---|
| R1.1 | Publicar esta matriz como referência funcional única | Em execução |
| R1.2 | Corrigir README e estado de implementação para apontarem para a matriz e não confundirem deploy com fecho funcional | Pendente |
| R1.3 | Fazer inventário de estados/transições por módulo e assinalar divergências | Pendente |
| R1.4 | Reconciliar o modelo de parceiros com as migrações do repositório e o esquema activo | Pendente; exige acesso de leitura ao esquema activo |
| R1.5 | Definir contrato de pagamento/monetização com estados explícitos | Pendente |
| R1.6 | Mapear eventos de auditoria e notificações | Pendente |
| R1.7 | Converter lacunas prioritárias em plano de implementação testável | Pendente |

## 8. Limitações conhecidas desta revisão

- Não foram executados testes de browser ou end-to-end nesta etapa.
- Não foi consultado o esquema actual da base de dados; as conclusões sobre migrações são limitadas ao repositório e aos relatórios existentes.
- Não foi confirmada uma integração real de pagamento.
- Não foi confirmada a aplicação de migrações pendentes.
- O estado “parcial” significa falta de prova de fecho, não necessariamente que toda a funcionalidade esteja avariada.
