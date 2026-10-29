# MozEmpresas

Plataforma digital para descoberta de empresas, produtos e serviços em Moçambique, com directório empresarial, marketplace, serviços MozEmpresas, publicidade e uma área dedicada a parceiros estratégicos.

## Estado actual

**Base funcional em evolução; fecho de lógica de negócio ainda em curso.** A existência de páginas, acções, migrações ou deployments não é considerada prova suficiente de conclusão funcional.

A matriz de fecho funcional e regras de negócio é a referência de trabalho para esta etapa:
- [Matriz de fecho funcional](docs/functional-closure-matrix.md)
- [Estado de implementação](docs/architecture/implementation-status.md)
- [Contrato do módulo de Parceiros](docs/architecture/partner-module.md)
- [Roadmap P1](docs/P1-ROADMAP.md)
- [Roadmap P2](docs/P2-ROADMAP.md)

## Stack

- Next.js, React e TypeScript
- Supabase SSR / PostgreSQL
- Row Level Security (RLS)
- Arquitectura modular monolith

## Áreas presentes no repositório

- Landing page e navegação pública
- Directório empresarial e perfis públicos
- Marketplace de produtos e serviços
- Autenticação, dashboard e gestão de empresas/acessos
- Catálogo e pedidos de serviços MozEmpresas
- Publicidade, campanhas, eventos e produtos publicitários
- Créditos, pedidos de compra e registos financeiros
- Oportunidades e candidaturas associadas ao módulo de parceiros
- Acesso dedicado de parceiros, com convite/activação
- Super Admin, moderação, suporte e notificações
- Migrações PostgreSQL, políticas RLS e testes unitários de regras seleccionadas

A presença destas áreas no código **não significa que todos os percursos estejam fechados ou validados em produção**. Consultar a matriz para conhecer o estado, os riscos e os critérios de aceitação por módulo.

## Regras de execução do projecto

- Preservar o produto sem reintroduzir o módulo Concursos.
- Trabalhar directamente na `main`, conforme a orientação actual do projecto.
- Não executar migrações em produção, reparar o histórico de migrações ou alterar políticas RLS sem reconciliação do esquema, plano explícito e validação.
- Não apresentar pagamentos pendentes/manuais como pagamentos reais confirmados.
- Manter compatibilidade com PostgreSQL independente.
- Distinguir CI/build, testes unitários, testes de integração, smoke tests e validação em produção.
- Actualizar a documentação de estado apenas com evidência reproduzível.
