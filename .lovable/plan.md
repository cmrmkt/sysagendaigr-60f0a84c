

## Corrigir Erro de Build: `react-is` ausente

### Problema
O `recharts` v3 precisa do pacote `react-is` como dependencia, mas ele nao esta instalado no projeto. Isso causa falha no build.

### Solucao
Adicionar `react-is` como dependencia direta no `package.json`.

### Alteracao
- **package.json**: Adicionar `"react-is": "^18.3.1"` nas dependencies

Esta e uma correcao simples de uma linha que resolve o erro de build imediatamente.

