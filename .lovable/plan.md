
## Atualizar mensagem do WhatsApp no banner

### O que sera feito
Atualizar o texto da mensagem predefinida na funcao `buildWhatsAppLink` no arquivo `src/components/layout/SubscriptionBanner.tsx`, linha 12:

- **De:** `"Olá, Gostaria de pagar a assinatura do sistema de AgendaIGR"`
- **Para:** `"Olá, Gostaria de renovar a assinatura do sistema AgendaIGR"`

O nome da igreja ja esta sendo adicionado entre parenteses automaticamente pela linha 13: `const fullMessage = orgName ? \`${baseMessage} (${orgName})\` : baseMessage;`

Resultado final da mensagem enviada: **"Olá, Gostaria de renovar a assinatura do sistema AgendaIGR (Nome da Igreja)"**

### Detalhe Tecnico
**Arquivo:** `src/components/layout/SubscriptionBanner.tsx`  
**Linha:** 12 — apenas o texto da constante `baseMessage` sera alterado.
