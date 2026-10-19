# Estilo do site — Grimório de Thanato

Referência do visual implementado no front. Os estilos são carregados, nesta ordem, por `src/main.js`: `src/style.css`, `src/ui.css` e `src/home.css`. Regras posteriores podem sobrescrever as anteriores. O tema escolhido é aplicado em `data-theme` no elemento `<html>`.

## Identidade visual

- Interface escura, com fundo azul quase preto, superfícies azul marinho, texto claro e cor de destaque configurável.
- A página inicial usa o banner `/banner.jpg`, sobreposição escura e conteúdo alinhado à esquerda na versão atual (`.home-redesign`).
- Cards e formulários usam bordas discretas; botões e campos têm cantos retos por regra global. Alguns painéis, menus e cartões mantêm arredondamento próprio.
- Ícones usam Material Symbols Outlined.

## Cores e temas

| Uso | Variável | Valor padrão |
| --- | --- | --- |
| Fundo | `--bg` | `#0a0e1a` |
| Superfície | `--surface` | `#141d30` |
| Superfície secundária | `--surface2` | `#1a2740` |
| Texto | `--text` | `#eaeaea` |
| Texto secundário | `--text-dim` | `#a4b0c7` após `ui.css` |
| Borda | `--border` | `#2a2a4a` |
| Linha de interface | `--ui-line` | `#30415e` |
| Sucesso | `--success` | `#4ade80` |
| Erro | `--danger` | `#ef4444` |

| Tema | `--primary` | `--primary-hover` | `--accent` |
| --- | --- | --- | --- |
| Vermelho, padrão | `#b02b3f` | `#f05268` | `#5d1a27` |
| Azul | `#2b6cb0` | `#4299e1` | `#1a365d` |
| Roxo | `#7c3aed` | `#a78bfa` | `#4c1d95` |

As versões `-rgb` dessas cores alimentam fundos translúcidos e realces. A seleção do tema fica no menu de configurações e é salva em `localStorage` com a chave `grimorio_theme`.

## Tipografia

- `Erudite`, carregada de `/fontes/fontes/Erudite font.otf`, marca títulos e a identidade do site.
- O texto corrente usa `Segoe UI`, com fallback para Roboto e Arial após as regras de `ui.css`.
- A página inicial usa Georgia no subtítulo do hero e no texto de destaque inferior.
- O `style.css` define espaçamento de `2px` para vários títulos Erudite. `ui.css` e `home.css` reduzem esse espaçamento em áreas específicas; consulte a regra final do componente antes de reutilizar um valor.
- Tamanho base do documento: `16px`; altura de linha do corpo: `1.6`.

## Estrutura e componentes

| Área | Padrão visual ativo |
| --- | --- |
| Navbar | Fundo `--surface`, borda inferior, posição fixa durante rolagem (`sticky`); marca Erudite e links com ícones. Item ativo usa destaque e borda inferior. |
| Página inicial | Hero com banner e overlay escuro; conteúdo limitado a `1160px`, título de `64px` no desktop e botão primário na cor do tema. A grade informativa tem quatro colunas no desktop. |
| Conteúdo interno | `.main-content` tem respiro lateral; páginas de personagens, campanhas, mestre, referência e perfil usam largura máxima de `1160px`. |
| Cards | Superfície `--surface`, borda `--ui-line`, pouco relevo; no hover, cards interativos destacam a borda. |
| Botões | Primários em `--primary`, hover em `--primary-hover`; secundários usam superfície escura e borda. Controles principais têm altura mínima de `40px`. |
| Formulários | Campos escuros com borda `--ui-line`; foco visível usa `--primary-hover`. Campos comuns têm altura mínima de `44px`. |
| Ficha | `.t20-sheet` contém cabeçalho, atributos, vitais, inventário e abas. A aba ativa usa o destaque do tema e as áreas internas usam linhas finas. |
| Feedback | Toasts globais aparecem no topo; resultados de dados aparecem no canto inferior direito; crítico e falha usam verde e vermelho. |

Na página inicial, `home.css` substitui o botão `.hero-btn` geral por um botão preenchido, sem o efeito de deslizamento usado pela regra base de `style.css`.

## Responsividade e movimento

- Até `1000px`, a navbar passa a organizar marca e links em linhas.
- Até `900px`, os cards informativos da página inicial passam de quatro para duas colunas.
- Até `720px`, a navegação vira uma grade de cinco itens; listas de cards ficam em uma coluna e os campos têm fonte de `16px`.
- Até `600px`, o hero reduz o título para `38px`, empilha os botões e ocupa a altura necessária ao conteúdo.
- `ui.css` respeita `prefers-reduced-motion: reduce`, reduzindo animações e transições.

## Onde editar

- [`src/style.css`](src/style.css): tokens, temas e estilos base da ficha, dados, landing e feedback.
- [`src/ui.css`](src/ui.css): ajustes de usabilidade e aparência das páginas internas.
- [`src/home.css`](src/home.css): versão visual atual da página inicial.
- [`src/main.js`](src/main.js): ordem de importação dos estilos e escolha/persistência do tema.
- [`index.html`](index.html): estrutura e classes das telas.

Ao mudar a aparência, prefira as variáveis CSS de tema e confira os seletores mais específicos de `ui.css` e `home.css`.
