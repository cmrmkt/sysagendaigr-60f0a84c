

## Adicionar botao WhatsApp no banner de trial

### O que sera feito
Adicionar um botao "Falar no WhatsApp" no banner de periodo de teste (trial), ao lado da mensagem existente. O botao abrira o WhatsApp com o numero **32 99992-6735** e a mensagem predefinida "Ola, Gostaria de pagar a assinatura do sistema de AgendaIGR".

Tambem sera atualizado o link de WhatsApp do banner de bloqueio (linha 48) para usar o mesmo numero correto.

### Detalhes Tecnicos

**Arquivo:** `src/components/layout/SubscriptionBanner.tsx`

**Alteracoes:**
1. No banner de trial (linhas 23-34): adicionar um botao/link com icone do WhatsApp (usando `MessageCircle` do Lucide) que aponta para `https://wa.me/5532999926735?text=Ol%C3%A1%2C%20Gostaria%20de%20pagar%20a%20assinatura%20do%20sistema%20de%20AgendaIGR`
2. Atualizar o link de WhatsApp do banner de bloqueio (linha 48) para usar o mesmo numero `5532999926735`
3. O botao tera estilo compacto (verde WhatsApp) para se destacar no banner amarelo

**Resultado visual:**
```
[relogio] Periodo de teste: 1 dia restante. Entre em contato para ativar sua assinatura. [Falar no WhatsApp]
```

