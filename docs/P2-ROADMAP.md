# MozEmpresas — Plano de execução P2

**Data:** 27/10/2026  
**Base:** branch `main`  
**Objectivo:** tornar a qualidade e a operação verificáveis, sem declarar fluxos concluídos apenas porque compilam.

## Ordem de execução

### P2.1 — Testes automatizados de regras críticas
- Introduzir um runner de testes integrado no CI.
- Cobrir validação de eventos publicitários e elegibilidade de campanhas.
- Expandir a cobertura para transições de encomendas, autorização por empresa, validação de anexos e pedidos de serviços.
- Manter testes determinísticos e sem dependência da base de dados de produção.

**Aceitação:** testes executados automaticamente no CI; falhas bloqueiam a validação do commit.

### P2.2 — Testes de integração e smoke tests
- Preparar um ambiente isolado de PostgreSQL/Supabase compatível com os fluxos necessários.
- Testar comprador/vendedor com empresas distintas, RLS, anexos, serviços e notificações.
- Registar resultados, pré-condições e limitações; não usar dados fictícios em produção.

### P2.3 — Observabilidade operacional
- Uniformizar logs estruturados sem tokens, segredos ou dados pessoais desnecessários.
- Registar erros e correlação de pedidos nas rotas críticas.
- Definir sinais para falhas de armazenamento, notificações e registo de eventos.

### P2.4 — Segurança e robustez
- Rever rate limiting, autorização no servidor, validação de entradas e comportamento em indisponibilidade.
- Rever operações multi-etapa e mecanismos de compensação para ficheiros.
- Não aplicar migrações ou alterar políticas de produção sem reconciliação do esquema e aprovação explícita.

### P2.5 — Desempenho e acessibilidade
- Medir percursos prioritários antes de optimizar.
- Rever consultas repetidas, carregamento de listas, navegação por teclado e mensagens de erro.
- Evitar optimizações sem evidência mensurável.

### P2.6 — Fecho documental
- Actualizar estado de implementação, arquitectura, riscos conhecidos e instruções operacionais.
- Separar claramente validações de CI, testes funcionais, testes de integração e validação em produção.

## Regras de execução
- Trabalhar directamente na `main`, sem branches ou PRs.
- Não executar migrações históricas nem modificar dados de produção como parte dos testes.
- Manter compatibilidade com PostgreSQL independente e a camada de adaptação existente.
- Cada entrega deve indicar commit, verificações efectivamente executadas e limitações remanescentes.
