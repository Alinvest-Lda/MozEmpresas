# MozEmpresas — Fluxo e conceito do módulo de Parceiros

## 1. Decisão de produto

O Parceiro é uma **entidade parceira da MozEmpresas**, não um utilizador que gere empresas de terceiros.

A conta representa uma única entidade parceira. A mesma conta pode ter vários gestores, com permissões internas, mas todos actuam sobre a mesma relação com a MozEmpresas.

A proposta do módulo é gerir e enriquecer essa relação através de:
- publicação e acompanhamento de oportunidades;
- publicidade e exposição dentro do ecossistema;
- serviços da MozEmpresas;
- serviços ou condições exclusivas;
- inteligência de mercado;
- dados, insights e funcionalidades especiais;
- acompanhamento de actividade, utilização e resultados;
- gestão da própria conta e dos seus gestores.

**Princípio:** o parceiro gere a sua relação com a MozEmpresas; não gere um portefólio de empresas.

---

## 2. Experiência transversal

O módulo de parceiro usa o mesmo design system do produto:
- mesmo header e alinhamento;
- mesma tipografia;
- mesmas fundações de cor, raio, sombra e espaçamento;
- mesmos componentes reutilizáveis;
- mesma grelha e content width;
- mesma lógica de responsividade;
- mesma navegação persistente;
- mesmos padrões de estados vazio, carregamento, erro e sucesso.

Pode existir CSS específico de parceiro apenas para composição ou componentes que sejam realmente próprios do módulo. Não pode existir um segundo design system nem breakpoints concorrentes.

**Role-specific ≠ design-specific.**

---

## 3. Estrutura funcional fechada

### VISÃO GERAL
Centro operacional da relação com a MozEmpresas.

Deve responder:
1. O que está activo?
2. O que exige atenção?
3. Que oportunidades existem?
4. Que serviços/benefícios estão disponíveis?
5. Que inteligência ou dados novos existem?
6. Que actividade foi gerada recentemente?

Não mostrar métricas inventadas. Toda a métrica apresentada deve ter fonte de dados definida.

### OPORTUNIDADES
O parceiro é uma entidade publicadora de oportunidades.

Fluxo:
1. consultar oportunidades próprias;
2. criar oportunidade;
3. preencher tipo, título, descrição, requisitos, localização e datas;
4. guardar rascunho;
5. publicar;
6. acompanhar estado;
7. editar enquanto permitido;
8. fechar/arquivar;
9. consultar histórico.

Também pode existir uma área de descoberta de oportunidades relevantes para o parceiro, mas isso é secundário e não deve transformar o módulo num CRM ou gestão de empresas.

### PUBLICIDADE
Área para transformar presença na plataforma em exposição mensurável.

Fluxo:
1. consultar produtos/formatos publicitários disponíveis;
2. escolher posicionamento ou produto;
3. seleccionar activo/conteúdo quando aplicável;
4. definir período e público/segmentação suportada;
5. rever;
6. submeter/contratar;
7. acompanhar estado;
8. acompanhar desempenho quando os dados existirem.

Possíveis produtos futuros:
- destaque no directório;
- destaque em produtos e serviços;
- campanhas;
- banners;
- oportunidades patrocinadas;
- posicionamento por categoria;
- posicionamento geográfico;
- campanhas sazonais.

Publicidade deve ser tratada como produto do ecossistema, não apenas como uma página de banners.

### SERVIÇOS E EXCLUSIVIDADES
Área para serviços disponibilizados pela MozEmpresas ao parceiro.

Fluxo:
1. explorar serviços elegíveis;
2. distinguir disponibilidade geral, elegibilidade de parceiro e exclusividade;
3. consultar condições;
4. solicitar/contratar;
5. acompanhar estado;
6. consultar vigência e renovação quando aplicável.

Exclusividades podem ser territoriais, sectoriais, por categoria, por período ou por outro entitlement definido pela plataforma.

### INTELIGÊNCIA
Área de dados e leitura de mercado disponibilizada ao parceiro.

Possíveis módulos:
- procura por categoria;
- tendências;
- actividade por localização;
- evolução temporal;
- procura por produtos/serviços;
- categorias emergentes;
- sinais derivados da actividade da plataforma;
- recomendações accionáveis.

Só apresentar dados efectivamente recolhidos e com regras de agregação definidas. Inteligência não deve ser apenas um conjunto de contadores decorativos.

### ACTIVIDADE E RESULTADOS
Consolidar a actividade da relação:
- oportunidades;
- publicidade;
- serviços;
- utilização de funcionalidades;
- exposição/desempenho, quando mensurável;
- histórico.

Separar claramente:
- dados observados;
- métricas calculadas;
- interpretações/recomendações.

### CONTA E GESTORES
Uma única entidade parceira pode ter vários gestores.

Estrutura conceptual:
```
partner_account
 ├── entidade parceira
 ├── relação/plano
 ├── oportunidades
 ├── publicidade
 ├── serviços
 ├── inteligência
 └── gestores
```

Papéis internos futuros podem incluir:
- administrador da conta;
- gestor de oportunidades;
- gestor de publicidade;
- analista;
- visualizador.

Os gestores não criam novas empresas parceiras. Apenas actuam sobre a conta da mesma entidade.

---

## 4. Jornada completa do parceiro

### A. Entrada
1. Super Admin cria um acesso dedicado.
2. Parceiro recebe convite/URL de activação.
3. Define nome e credenciais.
4. A conta é criada/associada como parceiro.
5. Primeiro acesso leva directamente à Área do Parceiro.

### B. Primeiro acesso
A experiência deve explicar:
- relação da entidade com a MozEmpresas;
- oportunidades que pode publicar;
- serviços/benefícios disponíveis;
- publicidade;
- inteligência;
- gestores da conta.

O onboarding não deve pedir criação de várias empresas.

### C. Operação recorrente
No regresso:
1. Visão geral;
2. alertas/pendências;
3. oportunidades;
4. publicidade;
5. serviços/exclusividades;
6. inteligência;
7. actividade;
8. conta.

### D. Conversão/activação de valor
O sistema deve conduzir o parceiro para acções concretas:
- publicar oportunidade;
- activar publicidade;
- solicitar serviço;
- explorar novo benefício;
- consultar insight;
- renovar/continuar serviço.

Cada superfície deve ter uma acção primária clara.

---

## 5. Navegação proposta

```
ÁREA DO PARCEIRO

VISÃO GERAL

OPORTUNIDADES
  • Minhas oportunidades
  • Publicar oportunidade

CRESCIMENTO
  • Publicidade
  • Campanhas / Exposição

INTELIGÊNCIA
  • Mercado
  • Tendências
  • Insights

SERVIÇOS
  • Serviços disponíveis
  • Meus serviços
  • Exclusividades

ACTIVIDADE
  • Desempenho
  • Histórico

CONTA
  • Perfil da entidade
  • Gestores
  • Acesso
```

Os nomes podem ser refinados durante a implementação se a informação real do backend exigir outra nomenclatura, mas a separação conceptual fica fechada.

---

## 6. O que fica fora do módulo

Não fazem parte do conceito central:
- gestão de várias empresas;
- CRM de empresas;
- portefólio de clientes;
- indicações/recomendações como eixo principal;
- relações empresariais genéricas criadas pelo parceiro;
- marketplace interno de empresas;
- gestão de negócios de terceiros.

Uma empresa pode aparecer como contexto de uma oportunidade ou de um dado de mercado, mas isso não significa que o parceiro a esteja a gerir.

---

## 7. Modelo de dados actual vs. necessário

Estruturas existentes que podem ser reutilizadas:
- `profiles` para identidade/autenticação;
- `opportunities` para publicação;
- `platform_services`, `service_requests`, `platform_service_orders` e `platform_service_subscriptions` para serviços;
- `business_promotions`, `business_promotion_targets` e `ad_products` como referência para a infraestrutura de publicidade existente;
- `notifications` para alertas;
- `partner_access_grants` para acesso dedicado.

Estruturas que não devem ser forçadas a representar o novo conceito:
- `business_partner_relationships` como núcleo da conta;
- `businesses` como entidade do parceiro;
- `business_members` para modelar gestores de parceiro.

Antes da implementação funcional, deve ser definida uma entidade própria de conta de parceiro e uma relação clara entre conta, gestores, oportunidades, publicidade, serviços, entitlements e inteligência.

---

## 8. Regra de segurança

Não alterar RLS existente como parte desta redefinição.

Qualquer nova estrutura de parceiro deve ter permissões próprias e ser desenhada para não reintroduzir a recursão anteriormente corrigida.

A criação de contas de parceiro continua reservada ao Super Admin. Não existe opção pública para o utilizador escolher `parceiro) no registo normal.

---

## 9. Arquitectura recomendada

O módulo deve evoluir em camadas:

1. **Identidade da entidade parceira**
2. **Gestores e permissões da conta**
3. **Oportunidades**
4. **Serviços e exclusividades**
5. **Publicidade**
6. **Actividade e desempenho**
7. **Inteligência e dados**
8. **Notificações e alertas**
9. **Administração da relação pelo Super Admin**

A implementação deve começar pela camada de identidade/conta e pelo fluxo de oportunidades, porque estas duas áreas estabelecem a base do restante workspace.

Publicidade, serviços, exclusividades e inteligência devem ligar-se à mesma conta, não criar experiências paralelas.

---

## 10. Definition of Done do módulo

O módulo só será considerado concluído quando:
- o acesso dedicado estiver fechado;
- a entidade parceira estiver correctamente modelada;
- vários gestores puderem actuar na mesma conta;
- permissões forem explícitas;
- oportunidades tiverem CRUD e estados;
- publicidade tiver fluxo e estados;
- serviços tiverem fluxo e estados;
- exclusividades forem suportadas por entitlement;
- inteligência tiver fontes e métricas reais;
- actividade tiver histórico factual;
- conta permitir gestão dos gestores;
- estados vazio/carregamento/erro/sucesso existirem;
- desktop/tablet/mobile seguirem o contrato transversal;
- não houver CSS concorrente;
- não houver alteração do header aprovado;
- não houver alterações RLS não acordadas;
- o fluxo de Super Admin → convite → activação → operação estiver fechado;
- documentação e testes acompanharem cada fase.

---

## 11. Decisão de implementação

O workspace de parceiro actualmente existente é considerado **protótipo estrutural**, não referência final de produto.

Antes de desenvolver novas funcionalidades, a implementação deve:
- remover a dependência conceptual de “Empresas” como função do parceiro;
- não reutilizar `business_partner_relationships` como núcleo da conta;
- preservar as fundações visuais partilhadas;
- substituir páginas artificiais/placeholder por fluxos baseados no modelo de parceiro acima;
- criar o modelo de dados próprio apenas onde as estruturas existentes não representam correctamente a entidade.

Esta especificação fecha o fluxo funcional e serve como contrato para a fase de desenvolvimento.
