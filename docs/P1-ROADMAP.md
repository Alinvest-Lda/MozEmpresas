# MozEmpresas — Plano de execução P1

**Base:** branch `main`, estado do repositório em 26/10/2026  
**Estratégia:** implementar incrementalmente sobre a arquitectura existente (Next.js, TypeScript, Supabase/PostgreSQL), sem branches ou PRs.  
**Princípio:** reutilizar tabelas, políticas, funções e fluxos existentes; não recriar módulos nem aplicar migrações históricas por tentativa.

## Objectivo do P1

Transformar as áreas comerciais e operacionais já presentes no repositório em fluxos consistentes, com dados reais, estados claros, permissões por empresa e experiência responsiva. A implementação deve privilegiar o uso quotidiano por empresas e operadores, sem expandir prematuramente o âmbito para módulos novos.

## Ordem de execução

### P1.1 — Fechar os fluxos de empresas e marketplace
- Rever e completar o CRUD de empresas e perfis empresariais.
- Rever publicação, edição, estado e gestão de produtos/serviços anunciados.
- Validar o contexto de empresa activa e a separação de dados entre empresas.
- Completar o percurso comercial: manifestação de interesse/pedido, contacto, negociação, acordo e conclusão, com histórico e transições de estado.
- Garantir que o comprador selecciona a empresa compradora quando aplicável e que essa associação é validada no servidor.
- Confirmar pesquisa transversal e páginas públicas com estados vazios, erros e carregamento.

**Critérios de aceitação**
- Um utilizador autorizado consegue criar, consultar, editar e gerir apenas os registos da empresa a que tem acesso.
- Comprador e vendedor vêem os pedidos relevantes, sem acesso indevido a operações de terceiros.
- As transições de estado são validadas no servidor e o histórico reflecte as alterações.
- Pesquisa, filtros, formulários e navegação funcionam em desktop e dispositivos móveis.

### P1.2 — Ficheiros, anexos e media
- Inventariar os pontos da aplicação que aceitam imagens ou documentos.
- Definir validação de tipo, tamanho, associação ao registo e permissões de leitura/escrita.
- Integrar os componentes de carregamento e visualização nos fluxos de empresas, ofertas e pedidos.
- Tratar falhas de carregamento, ficheiros ausentes e remoção/substituição de anexos.

**Critérios de aceitação**
- Cada ficheiro está associado ao registo e à empresa correctos.
- As regras de acesso não dependem apenas de ocultar botões na interface.
- A aplicação apresenta mensagens claras em caso de erro.

### P1.3 — Serviços MozEmpresas
- Consolidar o catálogo de serviços da plataforma.
- Completar o formulário de solicitação com dados de contacto, empresa, descrição da necessidade e anexos quando aplicável.
- Implementar estados claros para pedido recebido, em análise, em execução, concluído e recusado/cancelado, conforme o modelo existente.
- Disponibilizar ao solicitante acompanhamento do pedido e à equipa interna uma fila operacional.

**Critérios de aceitação**
- Os pedidos são persistidos na base de dados e associados ao solicitante/empresa.
- O solicitante só consulta os seus pedidos autorizados.
- Operadores autorizados conseguem actualizar o estado e registar notas de acompanhamento.
- A interface distingue claramente catálogo, pedido e acompanhamento.

### P1.4 — Backoffice e moderação
- Consolidar as vistas de operação para empresas, anúncios, pedidos de serviço, publicidade e conteúdos sujeitos a moderação.
- Restringir acções globais aos papéis administrativos previstos na implementação actual.
- Incluir pesquisa, filtros por estado, detalhe do registo e histórico de acções.
- Distinguir operações de plataforma de operações de gestores empresariais e parceiros.

**Critérios de aceitação**
- Cada acção administrativa é protegida no servidor e respeita as permissões existentes.
- Utilizadores empresariais não recebem acesso implícito a ferramentas de plataforma.
- As decisões de moderação e alterações relevantes são rastreáveis.

### P1.5 — Monetização e direitos de acesso
- Consolidar os produtos publicitários, posições de destaque, campanhas e pedidos de publicidade já modelados.
- Validar o ciclo de vida de campanhas: rascunho/submissão, revisão, aprovação, publicação, pausa e término, de acordo com os estados existentes.
- Validar no servidor os eventos de impressão/clique e impedir atribuições falsificadas a campanhas ou empresas.
- Relacionar planos, créditos e funcionalidades apenas onde a estrutura actual já prevê essa relação.
- Tornar explícitos os estados de pagamento e confirmação; não apresentar pagamentos simulados como pagamentos reais.

**Critérios de aceitação**
- Só utilizadores autorizados podem criar e gerir campanhas da sua empresa.
- A moderação e publicação respeitam os estados e permissões existentes.
- Eventos de publicidade são validados no servidor e associados a campanhas elegíveis.
- A interface distingue claramente pendente, confirmado, falhado e simulado.

### P1.6 — Notificações e auditoria operacional
- Identificar eventos existentes que devem gerar notificações: pedidos, alterações de estado, solicitações de serviço, moderação e publicidade.
- Reutilizar a estrutura de notificações já presente, evitando duplicar modelos.
- Definir leitura/não leitura, destino e acesso por utilizador.
- Registar acções administrativas e comerciais importantes através da estrutura de auditoria existente.

**Critérios de aceitação**
- As notificações são criadas a partir de eventos reais, não de dados demonstrativos.
- Cada utilizador só vê notificações a que tem acesso.
- As acções críticas deixam registo suficiente para identificar actor, acção, objecto e momento.

### P1.7 — Experiência, responsividade e qualidade
- Rever o dashboard e a sidebar responsiva, preservando espaços próprios para empresa, parceiro e administração.
- Uniformizar carregamento, erros, estados vazios, confirmação de acções e feedback de formulários.
- Fazer uma revisão de acessibilidade básica e navegação por teclado.
- Actualizar o documento de estado da implementação e a documentação dos fluxos realmente entregues.

**Critérios de aceitação**
- Os principais percursos podem ser concluídos sem depender de dados de demonstração.
- Não existem erros de TypeScript, lint ou build nos commits de entrega.
- Os fluxos críticos são verificados por testes automatizados ou checklist de smoke test registada.

## Sequência de entrega

1. **P1.1 — Empresas e marketplace**: primeiro, porque é o núcleo de valor da plataforma.
2. **P1.2 — Ficheiros e media**: apoiar os registos e transacções reais.
3. **P1.3 — Serviços MozEmpresas**: converter o catálogo em pedidos acompanháveis.
4. **P1.4 — Backoffice e moderação**: dar capacidade de operação à equipa da plataforma.
5. **P1.5 — Monetização**: consolidar publicidade, créditos e direitos sem confundir estados simulados e reais.
6. **P1.6 — Notificações e auditoria**: ligar os eventos operacionais e melhorar rastreabilidade.
7. **P1.7 — Qualidade transversal**: executar testes e fechar a experiência dos fluxos prioritários.

## Regras técnicas de execução

- Trabalhar directamente na `main`, sem abrir branches ou PRs.
- Antes de modificar uma tabela ou política, consultar o esquema e as políticas existentes; preferir alterações pequenas e reversíveis.
- Não reproduzir migrações históricas nem executar reparações automáticas do histórico de migrações.
- Manter a possibilidade de utilizar PostgreSQL independente: evitar acoplar nova lógica de negócio a funcionalidades exclusivas do fornecedor sem uma camada de adaptação explícita.
- Validar permissões no servidor/base de dados; a interface não substitui autorização.
- Não introduzir dados fictícios nos fluxos de produção.
- Em cada entrega, registar: ficheiros alterados, comportamento entregue, verificações executadas, resultado e limitações conhecidas.

## Fora do primeiro ciclo P1

- Reintrodução do módulo Concursos removido.
- Expansão do portal de Parceiros para além das capacidades já existentes antes de consolidar os fluxos centrais.
- Integrações de pagamento reais não configuradas e verificadas.
- Reestruturação integral da base de dados ou troca da base de produção.
- Novos módulos sem relação directa com os fluxos prioritários acima.

## Definição de P1 concluído

P1 estará concluído quando os fluxos prioritários forem operacionais com dados reais, autorização validada no servidor, estados e histórico consistentes, experiência responsiva e verificações de qualidade registadas. A existência de páginas ou tabelas, por si só, não conta como conclusão.
