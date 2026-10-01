# MozEmpresas — estado de implementação

## Estado actual
O produto encontra-se em produção com a experiência final-user separada de funcionalidades reservadas a serviços pagos e do futuro módulo de parceiros.

## Concluído nesta fase
- Landing page orientada ao directório empresarial e descoberta de mercado.
- Hero publicitário com rotação de anúncios.
- Directório público de empresas com pesquisa por nome/actividade e localização.
- Perfil público de empresa com contactos e ofertas.
- Marketplace público com pesquisa, filtros e detalhe de produto/serviço.
- Login, registo e área autenticada.
- Dashboard com navegação persistente e separação entre Trabalho, Empresa, Serviços e Conta.
- Gestão inicial de empresas e acessos/equipa.
- Catálogo de serviços MozEmpresas e pedidos de serviço.
- Serviço pago de concursos empresariais registado em `platform_services`.
- Concursos retirados do workspace do utilizador final.
- Oportunidades e Parceiros retirados do workspace do utilizador final.
- Rotas públicas de oportunidades/parceiros retiradas da navegação principal.
- Rota legada de publicação de oportunidade neutralizada até à criação do módulo de parceiros.
- CI configurado no repositório.
- Deploy Vercel ligado ao branch `main`.

## Arquitectura preservada para evolução
- As tabelas e estruturas de backend relacionadas com oportunidades, concursos e anexos permanecem disponíveis para reutilização no futuro módulo de parceiros e para o serviço de concursos.
- O módulo de serviços permite adicionar novos serviços pagos sem voltar a introduzir esses recursos no dashboard final-user.
- A separação actual é: **final-user → directório/marketplace/serviços**; **parceiros → módulo futuro**.

## Pendentes para a próxima fase
1. Completar CRUD de perfis, empresas e listings.
2. Completar publicação/edição de produtos e serviços no dashboard.
3. Melhorar pesquisa transversal e indexação.
4. Completar pedidos, negociação, orders e pagamentos do marketplace.
5. Completar monetização, planos e entitlements.
6. Completar backoffice, moderação, auditoria e estados operacionais.
7. Implementar testes unitários, integração e E2E.
8. Validar CI/CD e observabilidade de produção.
9. Endurecer configuração de segurança do Supabase, incluindo protecção contra palavras-passe comprometidas.
10. Criar posteriormente o módulo independente de Parceiros, incluindo Oportunidades e respectivos fluxos.

Cada módulo só é considerado concluído quando possuir database, regras, acções/API, UI, permissões, validação, estados de erro, testes e documentação.
