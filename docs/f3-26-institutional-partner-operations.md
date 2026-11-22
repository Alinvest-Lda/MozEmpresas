# F3.26 — Modelo institucional e operação de parceiros

**Estado:** implementado na base de dados e integrado em `main`; validação CI e deploy ainda em acompanhamento.

## Princípio de negócio

Uma conta Parceiro representa a entidade que mantém uma relação comercial ou institucional com a MozEmpresas. Não é sinónimo de empresa listada no directório e não exige utilizador, carteira empresarial ou actividade autónoma no portal.

Modelos suportados:
- `MANAGED`: MozEmpresas recebe pedidos e executa campanhas/serviços no backoffice.
- `STRATEGIC`: relação institucional, reporting e serviços acordados, sem portal obrigatório.
- `HYBRID`: operação interna com possibilidade de acesso externo.
- `SELF_SERVICE`: parceiro opera autonomamente no portal.

A associação a `businesses` permanece opcional e só é relevante para fluxos empresariais de créditos. O acesso ao portal é separado do registo da entidade.

## Fluxo operacional

1. **Registar entidade** em `/dashboard/admin/parceiros/gestao`. Pode ficar sem empresa associada, sem utilizador e com `portal_enabled=false`.
2. **Registar contactos** sem criar contas de acesso. Os contactos podem ser principais, de facturação e destinatários de relatórios.
3. **Formalizar contrato** com código, tipo, valor contratado, frequência de facturação, período e condições de pagamento.
4. **Registar pedido/execução** com origem `EMAIL`, `MEETING`, `CONTRACT`, `PHONE` ou `BACKOFFICE`; actualizar o estado ao longo da execução.
5. **Criar campanha no backoffice** em nome do parceiro. Preços fixos do catálogo não podem ser substituídos; formatos sob proposta aceitam preço negociado. A campanha fica inicialmente `REQUESTED`.
6. **Emitir factura** ligada à entidade e, quando aplicável, ao contrato, execução ou campanha.
7. **Registar transferência bancária** como `PENDING`, com referência, banco, ordenante, data e comprovativo opcional. Pagamentos parciais são permitidos; quando o total confirmado associado à factura atinge exactamente o valor do documento, o estado passa automaticamente para `PAID`. O sistema impede confirmar pagamentos associados a facturas anuladas, em rascunho, já liquidadas ou cujo total exceda o valor facturado. A referência bancária não pode ser repetida para a mesma entidade.
8. **Confirmar transferência** através da RPC transaccional `admin_confirm_partner_bank_transfer`. O registo guarda o responsável, a data e as notas. A confirmação é transaccional e valida que a factura e a campanha pertencem à entidade do pagamento. Se a soma de pagamentos confirmados ligados à campanha atingir o preço, a campanha passa de `REQUESTED` para `APPROVED`; a activação final continua sujeita à revisão operacional.
9. **Registar relatório** com período, destinatários, canal e ficheiro/link. A entrega fica auditável mesmo sem login externo.

## Reconciliação contratual

A view `partner_contract_financial_summary` calcula:
- valor contratado;
- facturação emitida (exclui documentos anulados);
- pagamentos confirmados;
- saldo em aberto = facturado menos recebido.

Não são gravados totais financeiros derivados em colunas duplicadas. Pagamentos pendentes não contam como recebidos.

## Acesso opcional ao portal

Os convites podem ser associados a uma conta Parceiro existente, desde que esteja activa e tenha `portal_enabled=true`. Se o convite não seleccionar uma entidade, mantém-se o fluxo anterior de criação de uma conta Parceiro de auto-serviço.

O claim do convite cria a associação de utilizador à conta indicada. As funções de contexto do parceiro só devolvem conta quando o portal está activo. O acesso é sempre opcional e não condiciona facturação, contratos ou relatórios.

## Segurança e integridade

- RLS activa nas novas tabelas; escrita administrativa condicionada a Super Admin.
- RPC de confirmação de transferência com verificação de Super Admin, bloqueio da linha e transição idempotente por estado.
- Execução da RPC de confirmação revogada para `PUBLIC` e `anon`; concedida apenas a `authenticated`, com validação de Super Admin no corpo.
- Convites e claim associados a uma conta não podem ser usados para associar o utilizador a outra conta activa.
- Acções verificam que contrato, campanha, execução e documento pertencem à entidade seleccionada.
- Índices adicionados às novas chaves estrangeiras e índice único para impedir duplicação da referência bancária por entidade.

## Limitações ainda explícitas

- O registo de relatório documenta a entrega, mas não envia emails automaticamente nem faz upload do ficheiro; o operador indica caminho no Storage ou link externo e regista a evidência.
- O comprovativo bancário é opcional por URL nesta primeira versão; o upload de comprovativo para Storage e a validação bancária via integração externa não estão automatizados.
- A factura é registada na estrutura financeira existente; geração de PDF, assinatura, envio e numeração fiscal automatizada não fazem parte desta intervenção.
- A confirmação de pagamento aprova a campanha quando totalmente liquidada, mas a activação operacional continua a exigir revisão no módulo de publicidade.
- Não foram criados dados fictícios para simular contratos ou pagamentos reais. A base actual contém uma conta Parceiro preexistente; não existem ainda contratos, contactos, execuções, relatórios ou transferências desta nova estrutura.

## Migrações

- `20261122120810_f326_institutional_partner_operations_and_contracts`
- `20261122120940_f326b_correct_contract_financial_aggregation`
- `20261122121038_f326c_partner_financial_backoffice_rls`
- `20261122121114_f326d_scoped_admin_financial_write_policies`
- `20261122121219_f326e_partner_operations_fk_indexes`
- `20261122121357_f326f_partner_campaign_bank_transfer_settlement`
- `20261122121552_f326g_bind_optional_partner_portal_access`\n- `20261122121736_f326h_prevent_duplicate_partner_bank_transfers`\n- `20261122121823_f326i_reconcile_partner_invoices_on_bank_settlement`\n- `20261122121857_f326j_guard_invoice_overpayment_and_void_settlement`
