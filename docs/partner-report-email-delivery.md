# Entrega de relatórios institucionais

O backoffice usa Resend para enviar relatórios por email. Antes de activar a função no ambiente Vercel, configurar:

- `RESEND_API_KEY`: chave privada da conta Resend.
- `RESEND_FROM_EMAIL`: remetente autorizado num domínio verificado no Resend.

O envio só é marcado como concluído depois de a API Resend devolver um identificador. A referência `resend:<id>` é gravada no histórico operacional através da transição de entrega existente. As tentativas falhadas são marcadas como `FAILED`; erros de configuração não alteram o estado do relatório.

Os ficheiros são armazenados no bucket privado `partner-documents`, com limite de 10 MB, tipos MIME permitidos, verificação de assinatura do conteúdo, hash SHA-256 e versões imutáveis por título e associação. Os links de email expiram após 72 horas; os links de consulta no backoffice expiram após 10 minutos.

A funcionalidade não depende de uma chave Resend durante o build. Sem as duas variáveis, o envio permanece indisponível e o backoffice apresenta instruções de configuração.
