# MozEmpresas — estado de implementação

## Implementado
- Next.js + TypeScript base
- Navegação pública e UI inicial
- Diretório, marketplace, concursos, oportunidades e repositório demonstrativos
- Dashboard base
- Integração-base Supabase SSR
- Migration PostgreSQL inicial com RLS

## Próximas fases
1. Provisionar/configurar Supabase dedicado.
2. Executar e validar migration.
3. Ligar Auth real.
4. Substituir dados demonstrativos por queries reais.
5. CRUD de perfis, empresas e listings.
6. Carrinho, orders e payments.
7. Workflow de concursos e avaliações.
8. Storage e repositório real.
9. Pesquisa transversal.
10. Monetização/entitlements.
11. Backoffice/moderação.
12. Testes unitários, integração e E2E.
13. CI/CD e observabilidade.

Cada módulo só é considerado concluído quando possuir database, regras, ações/API, UI, permissões, validação, erros, testes e documentação.