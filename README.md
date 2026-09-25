# MozEmpresas

Plataforma digital para centralizar perfis públicos, empresas, produtos e serviços, compra e venda, concursos, oportunidades e recursos/documentos.

## Estado

**MVP foundation implementada no repositório.**

### Stack
- Next.js + React + TypeScript
- Supabase SSR / PostgreSQL
- RLS preparada desde o schema
- Arquitetura modular monolith

### Já implementado
- Landing page e navegação pública
- Diretório empresarial demonstrativo
- Marketplace demonstrativo
- Concursos, oportunidades e repositório demonstrativos
- Login/registo/dashboard como shell de produto
- Clientes Supabase browser/server/proxy
- Migration core PostgreSQL com perfis, empresas, membros, listings, oportunidades, notificações e auditoria
- CI para typecheck, lint e build

### Próxima etapa
Ligar o projeto a um Supabase dedicado, executar/validar a migration e transformar os fluxos demonstrativos em CRUD real.

A especificação de produto e arquitetura de referência encontra-se no documento técnico entregue para o projeto.