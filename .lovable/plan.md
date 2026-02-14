

## Guia de Inicio com Capturas de Tela

Criar o guia interativo com screenshots reais de cada tela do sistema, mostrando exatamente onde clicar e o que fazer em cada passo.

### Abordagem

Para cada um dos 8 passos do guia, vou:

1. Navegar ate a pagina correspondente no app usando o browser
2. Capturar screenshots reais da tela
3. Salvar as imagens na pasta `public/guide/`
4. Exibir as imagens dentro de cada passo do Accordion, com legendas explicativas

### Estrutura de Cada Passo

Cada passo tera:
- Numero e titulo do passo
- Descricao do que fazer e por que
- **Imagem real da tela** com setas/destaques visuais via CSS
- Instrucoes escritas tipo "Clique no botao X", "Preencha o campo Y"
- Botao de acao direta para ir a pagina

### Passos com Screenshots

1. **Cadastrar Membros** - Screenshot da tela `/membros` mostrando o botao "Novo Membro" e o formulario
2. **Criar Ministerios** - Screenshot da tela `/ministerios` mostrando como criar e associar lideres
3. **Criar Eventos Padroes** - Screenshot da tela `/eventos-padroes` mostrando o formulario de template
4. **Criar Atividades na Agenda** - Screenshot da tela `/agenda` mostrando como criar nova atividade
5. **Configurar WhatsApp** - Screenshot da tela `/configuracoes/whatsapp` mostrando a conexao
6. **Configurar Lembretes** - Screenshot da tela `/configuracoes/lembretes` mostrando as regras
7. **Publicar no Mural** - Screenshot da tela `/mural` mostrando como criar aviso
8. **Gerenciar Tarefas** - Screenshot da tela `/meus-quadros` mostrando os quadros Kanban

### Processo de Execucao

1. Fazer login no sistema como admin
2. Navegar para cada uma das 8 paginas
3. Capturar screenshot de cada tela
4. Criar a pagina `GettingStartedGuide.tsx` com as imagens embutidas
5. Adicionar a rota e o item no menu lateral

### Arquivos

**Criar:**
- `src/pages/GettingStartedGuide.tsx` - Pagina do guia com imagens e instrucoes
- `public/guide/*.png` - Screenshots de cada tela (8 imagens)

**Modificar:**
- `src/App.tsx` - Adicionar rota `/guia-inicio`
- `src/components/layout/AppSidebar.tsx` - Adicionar item "Guia de Inicio" no menu (visivel apenas para admins, antes do Dashboard)

### Observacao Importante

Para capturar as screenshots, precisarei fazer login no sistema. Vou precisar das credenciais de um usuario admin para acessar todas as telas. Se preferir, posso usar as credenciais que voce ja utilizou anteriormente no sistema.

