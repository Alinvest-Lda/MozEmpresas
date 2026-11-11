# Contrato técnico — aprovação de compras de créditos

**Estado:** desenho de implementação; não aplicado à base de dados.  
**Projecto:** MozEmpresas · Supabase `zikjvjzbbfzrelbkaaci`  
**Data:** 2026-11-11

## 1. Situação confirmada

A tabela `credit_purchase_requests` contém `id`, `business_id`, `package_id`, `requester_user_id`, `status`, `amount_mzn`, `credits`, `payment_method`, `notes`, `created_at`, `updated_at` e `proof_path`. Os estados activos são `REQUESTED`, `PAYMENT_PENDING`, `PAID`, `REJECTED` e `CANCELLED`.

A carteira `business_credit_wallets` contém `business_id` e `balance_credits`. O ledger `credit_transactions` regista carteira, tipo, quantidade, montante, referência e descrição. A verificação read-only encontrou apenas a chave primária como índice único de `credit_transactions`; não encontrou unicidade por referência de compra.

A página `/dashboard/admin/monetizacao/creditos` é explicitamente de consulta. Não existe, no conjunto de funções públicas consultado, RPC de aprovação de compra de créditos.

## 2. Máquina de estados proposta

- `REQUESTED → PAYMENT_PENDING/PAID/REJECTED/CANCELLED`
- `PAYMENT_PENDING → PAID/REJECTED/CANCELLED`
- `PAID`, `REJECTED` e `CANCELLED` são terminais.

`PAID` só pode ser definido depois de validação efectiva do pagamento pelo operador autorizado. O envio de comprovativo, isoladamente, nunca comprova liquidação.

## 3. Operação atómica obrigatória para PAID

A confirmação tem de ocorrer numa única função transaccional PostgreSQL, chamada por acção Super Admin autenticada:

1. Validar actor Super Admin no servidor da base de dados; não confiar em campos de formulário ou metadata editável pelo utilizador.
2. Bloquear o pedido com `SELECT ... FOR UPDATE` e validar estado actual elegível.
3. Confirmar que valor, pacote, quantidade de créditos, empresa e método correspondem ao pedido persistido; não aceitar valores enviados pelo browser.
4. Confirmar pagamento real fora da aplicação e guardar referência de pagamento/verificação, actor, data e observação.
5. Bloquear/criar a carteira da empresa de forma concorrente-segura.
6. Inserir um único movimento `PURCHASE` em `credit_transactions`, com `reference_type='CREDIT_PURCHASE_REQUEST'` e `reference_id=request.id`.
7. Impor unicidade da referência de compra no ledger (índice único parcial ou constraint equivalente) para impedir duplicação, mesmo perante retry.
8. Incrementar o saldo da carteira e mudar o pedido para `PAID` na mesma transacção.
9. Registar auditoria e emitir evento/notificação de forma idempotente, preferencialmente via outbox.
10. Em retry, devolver o resultado já confirmado sem voltar a creditar.

Se qualquer passo falhar, toda a transacção deve fazer rollback. Nunca executar o update do estado e o crédito em chamadas REST separadas.

## 4. Recusa e cancelamento

A recusa deve ser uma transição condicional e auditada, com motivo obrigatório. Não cria movimento financeiro. O cancelamento só é permitido antes da confirmação e não pode apagar comprovativos ou histórico. Reabertura de estados terminais não faz parte deste contrato.

## 5. Dados e migração a preparar

A migração deverá adicionar campos explícitos de decisão (actor, instante, motivo e referência externa validada) ou uma tabela de decisões/auditoria com FK ao pedido. O desenho final deve primeiro verificar as tabelas de auditoria e outbox já existentes para reutilizar os mecanismos da plataforma.

Também deverá adicionar a protecção única do ledger e a RPC transaccional. A autorização deve reutilizar a fonte de verdade do Super Admin já existente e limitar EXECUTE ao papel necessário. Rever SECURITY DEFINER, search_path fixo, privilégios e RLS antes de instalar.

**Não criar/aplicar esta migração enquanto o comando Supabase CLI `supabase migration new` e a reconciliação de migrations não estiverem disponíveis.** Nenhuma DDL foi executada nesta entrega.

## 6. Critérios de aceitação

- Dois pedidos simultâneos de confirmação para o mesmo pedido geram um único crédito.
- Retry após timeout devolve o pedido já pago sem duplicar saldo ou ledger.
- Um actor não Super Admin não consegue confirmar nem recusar.
- Pedido recusado/cancelado/pago não pode ser decidido novamente.
- Falha ao inserir ledger não altera saldo nem estado.
- Valor/quantidade/empresa adulterados no formulário são ignorados.
- A recusa exige motivo e não gera crédito.
- Testes SQL isolados cobrem concorrência, rollback, autorização e idempotência.
