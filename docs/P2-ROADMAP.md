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


## Progresso de execução — 02/11/2026

### P2.1 — isolamento de conta parceira em PostgreSQL
- Acrescentados fixtures descartáveis em `scripts/ci/setup-partner-account-hardening.sql` e asserções em `scripts/ci/verify-partner-account-hardening.sql`.
- O job `migration-hardening` aplica a migração `20261101111659_harden_partner_account_memberships.sql` numa instância PostgreSQL efémera e verifica a restrição de uma única associação activa por utilizador, a preservação de associações inactivas e o comportamento fail-closed dos helpers `current_partner_account_id()` e `partner_account_context()`.
- O teste PostgreSQL passou no workflow CI `41492256029`. A validação geral (auditoria, testes unitários, typecheck, lint e build) ainda estava em execução no momento do registo.
- Nenhuma migração foi aplicada à base de dados activa; o teste usa exclusivamente o serviço PostgreSQL efémero do GitHub Actions.
- Próxima cobertura: acrescentar testes de autorização negativa e concorrência para operações comerciais e pedidos de serviços, sem usar dados de produção.


### Reavaliação do histórico e expansão da P2.1 — 02/11/2026

A revisão dos commits, testes existentes e relatórios anteriores identificou cobertura já concluída. Estes itens deixam de ser tratados como trabalho pendente e não serão repetidos:

- Runner Vitest no CI, auditoria de dependências, typecheck, lint e build: já fazem parte do job `validate`.
- Validação de eventos publicitários e elegibilidade de campanhas: coberta por `tests/advertising-event-validation.test.ts`.
- Transições de pedidos comerciais e publicações do marketplace: cobertas por `tests/commerce-state-machine.test.ts`.
- Transições de oportunidades e candidaturas: cobertas por `tests/opportunity-state-machine.test.ts`.
- Permissões de gestão empresarial (proprietário, papéis de gestão, viewer, empresa arquivada e associação cruzada): cobertas por `tests/business-permissions.test.ts`.
- Hardening do `search_path` de funções/procedures SECURITY DEFINER e contexto/membership de parceiro: já verificados em PostgreSQL descartável pelo job `migration-hardening`.

Implementado nesta tranche:
- Validador partilhado de anexos para marketplace e publicações, com testes para allowlist MIME, ficheiros vazios, contagem máxima e limite de 10 MiB.
- Validação extraída e testável dos pedidos de serviços, incluindo UUIDs, notas até 2.000 caracteres, estados conhecidos e preço não negativo com vírgula decimal.
- Actualização administrativa de pedidos de serviços agora usa compare-and-set pelo estado previamente lido; duas actualizações concorrentes não sobrescrevem silenciosamente uma à outra.
- Testes adicionados em `tests/attachment-validation.test.ts` e `tests/service-validation.test.ts`.

Ficam fora desta tranche, por exigirem ambiente/schema reconciliado ou contrato de negócio ainda não confirmado: testes end-to-end de RLS entre comprador/vendedor, falhas e compensação de Storage para anexos, concorrência de capacidade de campanhas M-Pesa, ciclo financeiro de créditos/pagamentos, transições completas de pedidos de serviços e validação visual autenticada. A suspensão da reconciliação da Fase 0 e da frente P0–P5 mantém-se.

Commits desta tranche: `fc6bd51`, `6c8c6be`, `a904bb7`, `f148057`, `8c44798`, `62c908e`, `7e3a78b`.
CI gerado para esta sequência: workflows `41494982052`, `41494990423`, `41495141211`, `41495151081` e `41495158198`; resultados finais a confirmar. Nenhuma alteração foi feita ao Supabase activo, RLS, grants ou dados.
