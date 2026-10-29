# MozEmpresas — estado de implementação

## Estado de fecho funcional

A experiência da plataforma está publicada, mas o fecho funcional global **não está comprovado**. A matriz [Matriz de fecho funcional e regras de negócio](../functional-closure-matrix.md) é a referência para a auditoria actual e prevalece sobre descrições genéricas de módulos como “concluídos”.

Esta documentação distingue:
- presença de uma funcionalidade no código;
- implementação parcial de um fluxo;
- validação por testes automatizados;
- validação de integração com base de dados/serviços;
- confirmação funcional no ambiente publicado.

Não declarar pagamentos reais, fluxo completo de parceiros, auditoria transversal, notificações ou segurança integral como concluídos sem evidência específica. A revisão actual é estática e não substitui testes end-to-end nem reconciliação do esquema activo.

## Estado actual
A experiência final-user está publicada e separada de funcionalidades reservadas a serviços pagos e do módulo independente de Parceiros. A publicação não comprova o fecho de todos os ciclos de negócio; consultar a matriz de fecho funcional.

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
- Concursos removidos do produto, da navegação pública e do catálogo de serviços.
- Oportunidades e Parceiros retirados do workspace do utilizador final.
- Rotas públicas de oportunidades/parceiros retiradas da navegação principal.
- Rota legada de publicação de oportunidade neutralizada até à criação do módulo de parceiros.
- CI configurado no repositório.
- Deploy Vercel ligado ao branch `main`.
- Acesso dedicado de parceiro reservado ao Super Admin.
- Modelo inicial de convite/activação de parceiro implementado sem alteração do RLS existente.
- Contrato funcional do novo módulo de Parceiros documentado em `docs/architecture/partner-module.md`.

## Arquitectura preservada para evolução
- As estruturas de oportunidades permanecem disponíveis para o módulo de Parceiros; concursos não fazem parte do produto MozEmpresas.
- O módulo de serviços permite adicionar serviços pagos relevantes sem introduzir módulos que não fazem parte da proposta de valor do produto.
- A separação actual é: **final-user → directório/marketplace/serviços**; **parceiros → workspace próprio da relação estratégica com a MozEmpresas**.
- O parceiro representa uma entidade única; vários gestores podem actuar sobre a mesma conta.
- `business_partner_relationships` não é o núcleo conceptual da conta de parceiro.
- O design do parceiro reutiliza as fundações transversais do produto; não será criado um segundo design system.

## Próxima fase — desenvolvimento do módulo de Parceiros
A especificação fechada está em `docs/architecture/partner-module.md`.

Ordem prevista:
1. Modelar a entidade de conta de parceiro e os gestores.
2. Fechar permissões e integração com o acesso dedicado existente.
3. Implementar publicação/gestão de oportunidades.
4. Implementar serviços e exclusividades.
5. Implementar publicidade e exposição.
6. Implementar actividade e desempenho.
7. Implementar inteligência, dados e insights.
8. Integrar notificações e alertas.
9. Completar administração da relação no Super Admin.
10. Testar o fluxo completo e documentar a conclusão.

**Nota:** o workspace de parceiro actualmente existente é protótipo estrutural e não deve ser tomado como referência final de produto.

Cada módulo só é considerado concluído quando possuir database, regras, acções/API, UI, permissões, validação, estados de erro, testes e documentação.
