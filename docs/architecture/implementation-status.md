# MozEmpresas — estado de implementação

## Implementado nesta fase
- Landing page orientada a directório/portal empresarial.
- Hero publicitário com fotografia empresarial moçambicana e rotação de anúncios.
- Directório público de empresas com pesquisa por nome/actividade e localização.
- Perfil público de empresa com contactos, ofertas e avaliações.
- Marketplace público com pesquisa por palavra-chave, tipo e localização.
- Página de detalhe de produto/serviço.
- Área pública de oportunidades com pesquisa e filtros.
- Página de detalhe de oportunidade.
- Área pública de concursos com pesquisa e filtros.
- Página de detalhe de concurso e requisitos.
- Repositório público com pesquisa e filtros.
- Página de detalhe de recurso e listagem de ficheiros.
- Login, registo e área de gestão autenticada.
- Dashboard com métricas da conta e empresas associadas.
- Gestão inicial de empresas com criação de perfil.
- UI responsiva para desktop, tablet e mobile.

## Infraestrutura disponível
- Next.js + TypeScript.
- Integração SSR com Supabase.
- Schema PostgreSQL versionado em supabase/migrations.
- RLS e permissões base definidas na migration.
- CI configurado no repositório.
- Deploy Vercel ligado ao branch main.

## Ainda pendente para considerar o produto operacional
1. Provisionar/configurar Supabase dedicado para o projecto MozEmpresas.
2. Validar migrations no projecto de produção e executar testes de acesso/RLS.
3. Completar CRUD de perfis, empresas e listings.
4. Criar publicação/edição de produtos e serviços no dashboard.
5. Criar publicação/edição de oportunidades e concursos no dashboard.
6. Implementar submissão real de candidaturas e manifestações de interesse.
7. Implementar Storage e downloads seguros do repositório.
8. Implementar carrinho, orders e pagamentos.
9. Pesquisa transversal e indexação.
10. Reviews, favoritos, follows e denúncias com UI completa.
11. Monetização, planos e entitlements.
12. Backoffice, moderação e auditoria.
13. Testes unitários, integração e E2E.
14. Observabilidade e validação final de CI/CD.

Cada módulo só é considerado concluído quando possuir database, regras, ações/API, UI, permissões, validação, estados de erro, testes e documentação.
