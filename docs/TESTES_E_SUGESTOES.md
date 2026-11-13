# Testes, melhorias e novas funcionalidades

Revisão de 29/10/2026 — Grimório / mesa virtual.

A aplicação já atende aos fluxos centrais de mesa: permissões, movimento compartilhado, anotações, colagem, clima e névoa. Esta revisão deixa uma bateria repetível de testes e uma lista priorizada do que vale melhorar. Os problemas abaixo não foram corrigidos automaticamente: o objetivo desta entrega é testar e orientar as próximas mudanças.

## Resultado da revisão

| Verificação | Resultado |
| --- | --- |
| Testes de lógica (`npm test`) | 67 casos aprovados. |
| Navegador (`npm run test:e2e`) | 22 cenários: 21 aprovados e 1 falha conhecida esperada, detalhada em B1. |
| Build de produção | Aprovada; mantém aviso de pacote JavaScript grande. |
| Lint | Sem erros; 9 avisos existentes em componentes e efeitos React. |
| Cobertura unitária | 92,11% das linhas, 97,04% das ramificações e 91,67% das funções **dos módulos instrumentados**, não da aplicação inteira. |
| Auditoria de dependências (`npm audit`) | 4 entradas classificadas como altas na cadeia do Firebase/gRPC. Ver detalhes adiante. |

Ambiente: Node 22.12.0, npm 11.19.1 e Playwright 1.64.1. Navegador usado: Brave/Chromium em modo headless no Linux. Não foram testados Firefox, WebKit ou aparelhos físicos.

**Limite importante:** os testes de navegador usam a interface real com autenticação e Firestore simulados. Eles verificam comportamento, comunicação entre janelas e falhas controladas, mas não validam login real, regras publicadas, latência da internet, faturamento ou persistência no Firebase de produção. Nenhuma campanha real foi modificada.

A falha conhecida usa `test.fail`, não `skip`: o cenário é executado e precisa continuar reproduzindo o problema. Quando a edição passar a funcionar, o Playwright sinalizará sucesso inesperado e pedirá a atualização do teste. O resumo do Playwright pode contar esse caso como esperado; isso não significa que a funcionalidade esteja corrigida.

## Como rodar depois

Na pasta do projeto:

```bash
npm ci
npm test
npm run test:coverage
npm run lint
npm run build
```

Para rodar os testes de navegador com o Chromium do Playwright:

```bash
npx playwright install chromium
npm run test:e2e
```

Neste computador, também é possível usar o Brave instalado:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/brave.com/brave/brave npm run test:e2e
```

Outros comandos úteis:

```bash
npm run check             # lint + testes de lógica + build
npm run test:e2e:ui       # execução visual e depuração
npm run test:e2e:report   # abre o relatório HTML da última execução
npm run test:e2e -- --grep '@known'  # reproduz a falha conhecida
npm audit                # consulta atualizada dos alertas de dependências
```

O servidor de teste usa `127.0.0.1:5190`. Essa porta precisa estar livre. Os cenários de clipboard usam permissões concedidas pelo próprio contexto de teste. Cada teste começa com um contexto de navegador separado, evitando reaproveitar os dados do anterior.

Os comandos de lógica enumeram explicitamente `tests/*.test.js` para não misturar os testes Node com as fixtures de navegador. A opção `--experimental-test-isolation=none` permite contar os casos individuais neste ambiente. O comando de cobertura é experimental no Node usado e mede apenas arquivos carregados por essa suíte.

## Onde estão os testes e as evidências

| Arquivo ou pasta | Finalidade |
| --- | --- |
| [tests/regressoes.test.js](../tests/regressoes.test.js) | Matriz de 16 combinações de permissão; 100 retângulos de clima; repetição de clarear/cobrir névoa; recuperação e cancelamento da fila. |
| [tests/e2e/mesa.spec.mjs](../tests/e2e/mesa.spec.mjs) | Cenários de navegador da mesa, com interação real de mouse e Ctrl+V. |
| [tests/e2e/helpers.mjs](../tests/e2e/helpers.mjs) | Abertura de mestre/jogador, ações comuns e bloqueio de requisições externas. |
| [tests/e2e/fixtures](../tests/e2e/fixtures) | Dados fictícios, autenticação simulada e Firestore em memória/localStorage, com comunicação entre janelas. |
| [tests/e2e/server.mjs](../tests/e2e/server.mjs) | Servidor isolado que substitui o Firebase apenas durante o teste. |
| [playwright.config.mjs](../playwright.config.mjs) | Configuração, navegador, relatórios, screenshots e traces. |
| `playwright-report/index.html` | Relatório HTML gerado localmente. |
| `test-results/e2e.json` | Resultado estruturado da última execução de navegador. |
| `test-results/…/trace.zip` | Trilha das ações quando um cenário falha. |
| `test-results/…/test-failed-1.png` | Captura da falha para inspeção. |

Os relatórios gerados ficam fora do Git; este arquivo Markdown é o registro durável da revisão. As fixtures são exclusivas da entrada E2E, não da build normal. Não dependem de credenciais do `.env` e as requisições externas dos testes são bloqueadas.

## O que a bateria cobre

### Lógica — 67 casos

- Configuração e mensagens de erro de autenticação.
- Atalhos preservados em campos editáveis e entradas numéricas.
- Geometria das áreas de clima nos dois sentidos de arraste, recorte no mapa e rejeição de cliques mínimos.
- Remoção de clima menor totalmente coberto; áreas idênticas; intensidades diferentes; coexistência de tipos diferentes; idempotência da limpeza.
- Interpretação do clipboard, preferência por imagem, texto multilinha e posicionamento nos limites do mapa.
- Combinações de permissões, bloqueio de visualização e autoria das anotações.
- Coalescência de movimentos, ordem de envio, confirmação final, cancelamento e recuperação depois de erro de rede.
- Névoa progressiva, células ausentes, recobertura e recorte em mapas com dimensões não múltiplas do grid.
- Frequência dos relâmpagos, movimento reduzido e integridade/transparência dos dois GIFs locais.

A cobertura de `clipboard.js` é menor porque a compressão depende de APIs do navegador; ela é exercitada pelo teste real de colagem de imagem. Componentes, hooks React e efeitos visuais não estão representados no percentual unitário informado acima.

### Navegador — 22 cenários

| Grupo | Cenários |
| --- | --- |
| Acesso | Jogador redirecionado da rota do mestre; visitante enviado ao login. |
| Permissões | Bloquear/reabrir mapa; mover sem anotar; impedir movimento não autorizado; falha ao salvar permissão; revogar anotação com editor aberto. |
| Realtime | Movimento jogador → mestre e mestre → jogador antes de soltar; posição final em rede simulada lenta; preservação de nome e vida. |
| Clipboard | Texto multilinha; imagem comprimida e redimensionável vista por outro usuário; colagem nativa no editor; permissão para colar; erro sem item fantasma. |
| Clima | Quatro tipos coexistindo; substituição do menor e recarga; Escape; carregamento dos GIFs e movimento reduzido. |
| Névoa | Token escondido e colocação impedida em célula totalmente coberta. |
| Layout | Barra de clima dentro de viewport de 390 × 844. Isso não valida gestos de toque. |
| Problema conhecido | Duplo clique no texto recém-colado ainda selecionado não abre a edição no fluxo reproduzido. |

As falhas de gravação e a rede lenta são injetadas no simulador. Não representam um teste de queda real de conexão do SDK Firebase.

## Problema reproduzido

### B1 — Duplo clique em texto recém-colado selecionado

**Prioridade:** alta para usabilidade. **Situação:** reproduzido no navegador; ainda não corrigido.

Como repetir:

1. Abra a mesa como mestre.
2. Copie um texto e cole com Ctrl+V.
3. Mantenha o item selecionado, com a moldura azul visível.
4. Dê duplo clique no texto.
5. No fluxo testado, o editor não abre.

Contorno validado: escolha **Adicionar texto** na lateral e depois dê duplo clique no texto para abrir o editor. A colagem dentro desse editor funciona normalmente.

A moldura acima das anotações é a causa provável da interceptação. Rever os eventos de [TokenGroupControls.jsx](../src/components/TokenGroupControls.jsx) e sua posição na árvore de [App.jsx](../src/App.jsx), preservando tanto o arraste pela moldura quanto o acesso ao conteúdo.

Critério para considerar corrigido: o teste marcado `@known` deve passar sem `test.fail`, e clicar/arrastar as bordas e as alças deve continuar funcionando.

## Melhorias sugeridas, em ordem de prioridade

As estimativas abaixo são de esforço relativo, não compromissos de prazo. “Revisão” indica uma conclusão pela leitura do código; não é um teste de produção.

| Prioridade | Melhoria | Evidência e próximo passo | Esforço |
| --- | --- | --- | --- |
| P0 | Validar e publicar autorização no Firebase | O repositório só tem [um exemplo de regras](firestore-permissoes.rules.example). Não foi possível verificar o que está publicado. Testar no emulador leitura sem vínculo, alteração das próprias permissões, autoria, visualização e acesso de mestre. | Médio |
| P0 | Revisar dependências e versão do Node | A auditoria apontou a cadeia Firebase/gRPC e a instalação avisou sobre Node mínimo. Avaliar atualização compatível, executar a bateria e repetir a auditoria. Detalhes abaixo. | Médio |
| P1 | Corrigir B1 | Há reprodução automatizada do problema de edição de texto selecionado. Ajustar os eventos e retirar a marcação de falha esperada quando corrigido. | Pequeno/médio |
| P1 | Consumir convite de forma atômica | Em [SessionsPage.jsx](../src/pages/SessionsPage.jsx), a criação do membro e a marcação do convite como usado são escritas separadas, também presentes em [App.jsx](../src/App.jsx). Revisão: aceitar um convite em duas janelas pode produzir uma disputa. Usar transação ou operação validada no servidor. [Referência: transações Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions). | Médio |
| P1 | Completar a exclusão de campanhas | `excluirSessao` remove sessão, membros e convites; não percorre `tokens`, `anotacoes` e `estado`. Revisão: podem ficar dados órfãos. Excluir subcoleções numa rotina confiável do servidor. Excluir o documento pai não exclui automaticamente suas subcoleções. [Referência oficial](https://firebase.google.com/docs/firestore/manage-data/delete-data). | Médio |
| P1 | Buscar somente as sessões do usuário | `carregar` em [SessionsPage.jsx](../src/pages/SessionsPage.jsx) lê a coleção de sessões e filtra localmente para participações. Buscar os IDs já conhecidos evita leitura global e facilita regras restritivas. | Pequeno/médio |
| P1 | Mover arquivos grandes para armazenamento próprio | Mapas são divididos em documentos e imagens coladas ficam em data URLs. Avaliar Firebase Storage com URLs e miniaturas; medir redução de tráfego ao mover imagens. [Upload de arquivos](https://firebase.google.com/docs/storage/web/upload-files). | Médio/alto |
| P1 | Padronizar aviso de gravação e falha | Há caminhos que fazem atualização otimista e ignoram o retorno de persistência. Mostrar “salvando”, “salvo” e “falha”; oferecer nova tentativa e restauração quando necessário. Evidência: chamadas diretas em [PlayerView.jsx](../src/pages/PlayerView.jsx) e [App.jsx](../src/App.jsx). | Médio |
| P1 | Limitar o desfazer às ações do autor | O histórico em [App.jsx](../src/App.jsx) guarda estados completos de tokens, anotações e mapa, enquanto snapshots remotos também atualizam esses estados. Revisão: avaliar se Ctrl+Z pode desfazer ações de outra pessoa. Preferir histórico de operações e incluir clima/névoa de forma explícita. | Alto |
| P2 | Separar a mesa em componentes e hooks menores | `App.jsx` tem aproximadamente 1.900 linhas, reunindo autenticação, campanha, seleção, anotações e canvas. Separar responsabilidades facilita testes e reduz diferenças entre mestre e jogador. | Médio/alto |
| P2 | Reduzir o pacote inicial e o número de camadas | A build gera cerca de 1,34 MB de JavaScript, 407 KB gzip. O Konva avisou sobre 6–7 camadas nos cenários testados. Carregar rotas sob demanda, revisar camadas estáticas e medir antes/depois. Não foi feito benchmark de FPS nesta revisão. | Médio |
| P2 | Suporte real a toque e teclado | Boa parte dos fluxos usa `onMouseDown/Move/Up`. Migrar interações para eventos de ponteiro, prever gestos, foco de modais, Escape e uma alternativa para ações apenas por clique direito. | Médio/alto |
| P2 | Esquema e migração dos dados da mesa | Centralizar a validação dos tipos de anotação, tamanhos, permissões e clima. Hoje o identificador `lava` representa Fogo; preservar compatibilidade, mas documentar ou migrar o esquema. | Médio |
| P2 | Conflitos de edição no mesmo item | A fila local ordena os envios do próprio cliente; ela não resolve duas pessoas arrastando o mesmo token. Avaliar indicação de quem está movendo, posse temporária e confirmação da posição final. Validar primeiro em duas contas reais. | Médio/alto |
| P2 | Troca de campanha sem reaproveitar estado | `sessaoAtiva` no mestre é inicializada com `useState(sessaoId)`. Revisão: testar navegação direta entre IDs sem desmontagem; remontar a mesa por sessão ou sincronizar explicitamente esse estado. | Pequeno/médio |

P0 = revisar antes de tratar como pronta para produção; P1 = estabilidade e uso diário; P2 = evolução e manutenção. Uma ausência de regras no repositório não prova que o Firebase publicado esteja aberto: isso permanece não verificado.

### Dependências: o que o audit realmente mostrou

A auditoria de 29/10/2026 retornou quatro entradas de severidade alta: `firebase`, `@firebase/firestore`, `@firebase/firestore-compat` e `@grpc/grpc-js`. Elas pertencem à mesma cadeia; não são necessariamente quatro problemas independentes. A árvore local é `firebase@13.1.0 → @firebase/firestore@4.19.0 → @grpc/grpc-js@1.9.16`.

O pacote gRPC tem avisos relacionados a autenticação de certificados em certas configurações de servidor e exposição de mensagens de erro do servidor. Os advisories são [GHSA-m9gg-hp2v-232j](https://github.com/advisories/GHSA-m9gg-hp2v-232j) e [GHSA-f596-whhp-79r4](https://github.com/advisories/GHSA-f596-whhp-79r4). O segundo é classificado como baixo no advisory individual, embora o pacote apareça como alto no resumo agregado do npm.

Isso não comprova exploração na aplicação web. É preciso verificar se o caminho vulnerável chega ao ambiente executado. A ação recomendada é revisar versões e aplicabilidade, não usar `npm audit fix --force` às cegas: a sugestão automática observada propunha mudar o Firebase para 9.14.0, uma mudança incompatível com a faixa atual.

A instalação também informou que pacotes Firebase atuais exigem Node `>=24.12.0`, enquanto o ambiente desta revisão usa 22.12.0. Build e testes passaram aqui, mas vale alinhar Node, arquivo de versão e ambiente de CI antes de depender desse resultado em outra máquina.

## Possíveis novas funcionalidades

Sugestões de produto; nenhuma foi implementada nesta entrega. O esforço é relativo à estrutura atual.

| Ideia | Como ajudaria na sessão | Primeira versão útil | Esforço |
| --- | --- | --- | --- |
| Biblioteca de imagens e tokens | Evita colar ou enviar a mesma arte toda hora. | Galeria por campanha com nome, busca e arrastar para o mapa. | Médio |
| Camadas e bloqueio de objetos | Evita mover o cenário ao tentar selecionar um personagem. | Separar cenário, objetos, tokens e anotações; bloquear itens. | Médio |
| Cenas salvas | Facilita trocar de sala ou encontro. | Salvar mapa, tokens, névoa e clima por cena, com prévia. | Alto |
| Iniciativa e turnos | Organiza os combates. | Lista ordenada, próximo turno e destaque no token ativo. | Médio |
| Condições nos tokens | Torna estados visíveis sem abrir fichas. | Ícones de envenenado, caído e concentração, com duração opcional. | Médio |
| Dados e histórico de rolagens | Mantém as rolagens perto da mesa. | `1d20+5`, resultado público ou privado para o mestre. | Médio |
| Ping no mapa | Ajuda a chamar atenção para um local. | Clique com modificador para ping temporário visto pelos demais. | Pequeno/médio |
| Presença e cursores | Mostra quem está conectado e interagindo. | Lista online e indicador “movendo token”. | Médio |
| Controles de clima por área | Dá mais controle aos efeitos já existentes. | Editar intensidade, pausar, ocultar, mover e redimensionar áreas. | Médio |
| Áudio ambiente | Complementa clima e cena. | Faixa de chuva/fogo com volume local e botão de silenciar. | Médio |
| Visão por personagem | Permite exploração com informação parcial. | Fonte de visão por token e alcance configurável; oclusão em etapa posterior. | Alto |
| Áreas de magia | Facilita medir alcance e efeitos. | Círculo, cone e linha com medidas em metros e encaixe no grid. | Médio |
| Régua com caminho | Ajuda a planejar movimento tático. | Pontos intermediários e distância acumulada por token. | Médio |
| Notas privadas e marcadores | Aproxima preparação e mapa. | Nota visível só ao mestre ou ao dono, fixada num ponto. | Médio |
| Exportação e backup de campanha | Facilita recuperar uma mesa ou transferi-la. | Exportar JSON com versão do esquema e importar com validação. | Médio/alto |
| Ajuda de atalhos | Torna as ações existentes mais fáceis de descobrir. | Tela com Ctrl+V, Ctrl+Z, Shift, Delete e navegação do mapa. | Pequeno |

Se fosse escolher uma sequência curta: corrigir B1, validar regras e convites, melhorar salvamento e depois implementar biblioteca de tokens, cenas e iniciativa.

## Roteiro manual que ainda falta executar

Usar uma campanha descartável e duas contas diferentes. Não considerar estes itens aprovados com base nas simulações locais.

| ID | Teste | Resultado esperado | Situação |
| --- | --- | --- | --- |
| M01 | Login, cadastro, saída e sessão expirada com Firebase real | Erros legíveis e nenhuma mesa acessível sem autenticação. | Pendente |
| M02 | Aceitar o mesmo convite simultaneamente em duas contas | O resultado deve obedecer à política de uso único. | Pendente; revisar atomicidade |
| M03 | Tentar promover o próprio usuário ou escrever sem permissão pela API | O servidor deve negar mesmo sem usar a interface. | Pendente; requer regras reais/emulador |
| M04 | Bloquear mapa durante arraste, edição e decodificação de imagem | Interação cessa e a regra do servidor impede ações não autorizadas. | Pendente em Firebase real |
| M05 | Mover e anotar com duas contas, conexão lenta, queda e reconexão | Posição final consistente, sem duplicações nem desaparecimentos. | Pendente |
| M06 | Colar PNG transparente, JPEG grande, arquivo inválido e texto longo | Conteúdo correto ou mensagem clara; nenhuma anotação fantasma. | Parcial: PNG e texto simples automatizados |
| M07 | Excluir campanha com mapa, imagens, tokens, anotações e clima | Remover todos os dados associados e confirmar pelo servidor. | Pendente; rotina incompleta na revisão |
| M08 | Cena com 100 tokens, várias imagens e 24 áreas de clima | Medir FPS, memória, leituras/escritas e tempo de carregamento. | Pendente; sem medição de carga |
| M09 | Celular/tablet com toque, zoom e desenho | Gestos corretos sem scroll acidental ou controles inacessíveis. | Pendente; apenas viewport foi testada |
| M10 | Firefox, WebKit/Safari e colagem com Cmd+V no macOS | Recursos equivalentes ou limitação comunicada. | Pendente |
| M11 | Abrir duas campanhas seguidas sem recarregar a aplicação | Nenhum token, clima ou histórico de uma campanha aparece na outra. | Pendente |
| M12 | Desfazer após outro jogador editar a mesa | Desfazer não sobrescreve a ação de outra pessoa. | Pendente |
| M13 | Recarregar depois de todas as ações com Firebase real | Dados persistidos são iguais aos vistos antes da recarga. | Pendente |

## Próxima rodada de testes

Acrescentar testes de regras com Firebase Emulator Suite e rodar esta bateria em CI a cada mudança. Depois, ampliar para upload/troca de mapa, seleção mista, espelhamento, grupos, desfazer/refazer e isolamento entre campanhas. Para regressões visuais, definir capturas de referência com tempo de animação controlado antes de comparar imagens.
