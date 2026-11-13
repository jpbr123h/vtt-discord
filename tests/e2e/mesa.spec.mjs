import { test, expect, abrirMestre, abrirJogador, dados, configurarPermissao, arrastar, colarTexto, colarImagem, abrirClima } from './helpers.mjs';

test('jogador na rota do mestre é redirecionado à visão do jogador', async ({ page }) => {
  await page.goto('/__e2e/mesa/demo?as=player');
  await expect(page.getByText('Visão do jogador', { exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: 'Jogadores da campanha' })).toHaveCount(0);
});

test('visitante não autenticado é encaminhado ao login', async ({ page }) => {
  await page.goto('/__e2e/mesa/demo?as=anonymous');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('canvas')).toHaveCount(0);
});

test('bloquear e liberar mapa se aplica em outra janela', async ({ page, context }) => {
  await abrirMestre(page); const player = await abrirJogador(context);
  await configurarPermissao(page, 'Ver mapa', false);
  await expect(player.getByText('Mapa indisponível', { exact: true })).toBeVisible();
  await expect(player.locator('canvas')).toHaveCount(0);
  await configurarPermissao(page, 'Ver mapa', true);
  await expect(player.locator('canvas').first()).toBeVisible();
});

test('mover tokens não concede escrever/desenhar', async ({ page, context }) => {
  await abrirMestre(page); const player = await abrirJogador(context);
  await configurarPermissao(page, 'Mover tokens', true);
  await arrastar(player, { x: 300, y: 300 }, { x: 430, y: 430 });
  await expect.poll(async () => (await dados(page)).tokens[0].x).not.toBe(300);
  await expect(player.getByRole('button', { name: 'Desenhar', exact: true })).toHaveCount(0);
});

test('token sem permissão permanece no lugar após tentativa de arraste', async ({ page, context }) => {
  await abrirMestre(page); const player = await abrirJogador(context);
  await arrastar(player, { x: 300, y: 300 }, { x: 430, y: 430 });
  expect((await dados(page)).tokens[0]).toMatchObject({ x: 300, y: 300 });
});

test('mestre recebe o movimento do jogador antes de soltar o mouse', async ({ page, context }) => {
  await abrirMestre(page); const player = await abrirJogador(context);
  await configurarPermissao(page, 'Mover tokens', true);
  await arrastar(player, { x: 300, y: 300 }, { x: 430, y: 430 }, false);
  await page.waitForFunction(() => window.__stages[0].find('Circle').some((n) => n.x() > 380));
  await player.mouse.up();
  await expect.poll(async () => (await dados(page)).tokens[0].x).toBe(425);
  expect((await dados(page)).tokens[0]).toMatchObject({ nome: 'Personagem', vida: 10 });
});

test('jogador recebe movimento do mestre durante o arraste', async ({ page, context }) => {
  await abrirMestre(page); const player = await abrirJogador(context);
  await arrastar(page, { x: 300, y: 300 }, { x: 520, y: 420 }, false);
  await player.waitForFunction(() => window.__stages[0].find('Circle').some((n) => n.x() > 450));
  await page.mouse.up();
  await expect.poll(async () => (await dados(page)).tokens[0].x).toBe(525);
});

test('rede lenta conserva a posição final sem sobrescrever atributos do token', async ({ page, context }) => {
  await abrirMestre(page); await abrirJogador(context);
  await page.evaluate(() => window.__fixture.setDelay(120));
  await arrastar(page, { x: 300, y: 300 }, { x: 640, y: 460 });
  await expect.poll(async () => (await dados(page)).tokens[0].x).toBe(625);
  expect((await dados(page)).tokens[0]).toMatchObject({ nome: 'Personagem', vida: 10, vidamax: 10 });
});

test('falha ao salvar permissão não altera o estado do jogador', async ({ page }) => {
  await abrirMestre(page);
  await page.getByRole('button', { name: 'Jogador de teste' }).click();
  await page.evaluate(() => window.__fixture.failNextWrite());
  await page.getByRole('checkbox', { name: /Mover tokens/ }).click({ force: true });
  await expect(page.getByRole('alert')).toContainText('Não foi possível salvar');
  expect((await dados(page)).member.podeMover).toBe(false);
});

test('jogador autorizado desenha; revogar anotação cancela editor aberto', async ({ page, context }) => {
  await abrirMestre(page); const player = await abrirJogador(context);
  await configurarPermissao(page, 'Escrever e desenhar', true);
  await player.getByRole('button', { name: 'Desenhar', exact: true }).click();
  await arrastar(player, { x: 450, y: 400 }, { x: 600, y: 500 });
  await expect.poll(async () => (await dados(page)).anotacoes.length).toBe(1);
  expect((await dados(page)).anotacoes[0]).toMatchObject({ tipo: 'traco', autorId: 'player' });
  await player.getByRole('button', { name: 'Escrever', exact: true }).click();
  await player.mouse.click(700, 500);
  await player.getByRole('textbox', { name: 'Editar texto no mapa' }).fill('Rascunho cancelado');
  await configurarPermissao(page, 'Escrever e desenhar', false);
  await expect(player.getByRole('textbox')).toHaveCount(0);
  expect((await dados(page)).anotacoes).toHaveLength(1);
});

test('Ctrl+V cola texto e mantém a quebra de linha', async ({ page }) => {
  await abrirMestre(page); await colarTexto(page, 'Texto colado\nSegunda linha');
  await expect.poll(async () => (await dados(page)).anotacoes.length).toBe(1);
  expect((await dados(page)).anotacoes[0]).toMatchObject({ tipo: 'texto', texto: 'Texto colado\nSegunda linha', x: 500, y: 300 });
});

test('Ctrl+V cola imagem, comprime, permite redimensionar e sincroniza com jogador', async ({ page, context }) => {
  await abrirMestre(page); const player = await abrirJogador(context);
  await colarImagem(page);
  await expect.poll(async () => (await dados(page)).anotacoes.length).toBe(1);
  const image = (await dados(page)).anotacoes[0];
  expect(image).toMatchObject({ tipo: 'imagem', largura: 512, altura: 256 });
  expect(image.imagemUrl.length).toBeLessThanOrEqual(600000);
  await player.waitForFunction(() => window.__stages[0].find('Image').some((n) => n.image()));
  await arrastar(page, { x: image.x + image.largura + 8, y: image.y + image.altura + 8 }, { x: image.x + image.largura + 70, y: image.y + image.altura + 50 });
  await expect.poll(async () => (await dados(page)).anotacoes[0].largura).toBeGreaterThan(512);
});

test('colar dentro do editor não cria outra anotação', async ({ page }) => {
  await abrirMestre(page); await colarTexto(page, 'Original');
  await expect.poll(async () => (await dados(page)).anotacoes.length).toBe(1);
  await page.getByRole('button', { name: 'Adicionar texto', exact: true }).click();
  await page.mouse.dblclick(530, 322);
  const editor = page.getByRole('textbox', { name: 'Editar texto no mapa' });
  await editor.waitFor(); await page.evaluate(() => navigator.clipboard.writeText(' acréscimo'));
  await editor.focus(); await page.keyboard.press('Control+v');
  await expect(editor).toHaveValue('Original acréscimo');
  expect((await dados(page)).anotacoes).toHaveLength(1);
});

test('duplo clique em texto recém-colado selecionado abre edição @known', async ({ page }) => {
  test.fail(true, 'B1: a moldura de seleção intercepta o duplo clique; ver docs/TESTES_E_SUGESTOES.md.');
  await abrirMestre(page); await colarTexto(page, 'Original');
  await expect.poll(async () => (await dados(page)).anotacoes.length).toBe(1);
  await page.mouse.dblclick(530, 322);
  await expect(page.getByRole('textbox', { name: 'Editar texto no mapa' })).toBeVisible({ timeout: 1500 });
});

test('jogador só cola após receber permissão de anotar', async ({ page, context }) => {
  await abrirMestre(page); const player = await abrirJogador(context);
  await colarTexto(player, 'Sem permissão');
  expect((await dados(page)).anotacoes).toHaveLength(0);
  await configurarPermissao(page, 'Escrever e desenhar', true);
  await expect(player.getByRole('button', { name: 'Desenhar', exact: true })).toBeVisible();
  await colarTexto(player, 'Com permissão');
  await expect.poll(async () => (await dados(page)).anotacoes.length).toBe(1);
  expect((await dados(page)).anotacoes[0].autorId).toBe('player');
});

test('falha ao salvar colagem exibe erro sem criar item fantasma', async ({ page }) => {
  await abrirMestre(page); await page.evaluate(() => window.__fixture.failNextWrite());
  await colarTexto(page, 'Não salva');
  await expect(page.getByRole('alert')).toContainText('Não foi possível salvar o item colado');
  expect((await dados(page)).anotacoes).toHaveLength(0);
});

test('chuva, sol, inverno e fogo podem coexistir em áreas diferentes', async ({ page }) => {
  await abrirMestre(page); await abrirClima(page);
  for (const [i, nome] of ['Chuva', 'Sol', 'Inverno', 'Fogo'].entries()) {
    await page.getByRole('button', { name: nome, exact: true }).click();
    await arrastar(page, { x: 400 + i * 150, y: 350 }, { x: 520 + i * 150, y: 600 });
    await expect.poll(async () => (await dados(page)).estado.clima.areas.length).toBe(i + 1);
  }
  expect((await dados(page)).estado.clima.areas.map((a) => a.clima).sort()).toEqual(['chuva', 'inverno', 'lava', 'sol']);
});

test('clima maior elimina o menor do mesmo tipo e persiste depois de recarregar', async ({ page }) => {
  await abrirMestre(page); await abrirClima(page);
  await arrastar(page, { x: 500, y: 400 }, { x: 600, y: 500 });
  await expect.poll(async () => (await dados(page)).estado.clima.areas.length).toBe(1);
  await arrastar(page, { x: 450, y: 350 }, { x: 700, y: 600 });
  await expect.poll(async () => (await dados(page)).estado.clima.areas[0].largura).toBe(250);
  expect((await dados(page)).estado.clima.areas).toHaveLength(1);
  await page.reload(); await page.locator('canvas').first().waitFor();
  expect((await dados(page)).estado.clima.areas).toHaveLength(1);
});

test('Escape cancela o desenho de uma área de clima', async ({ page }) => {
  await abrirMestre(page); await abrirClima(page);
  await arrastar(page, { x: 500, y: 400 }, { x: 650, y: 600 }, false);
  await page.keyboard.press('Escape'); await page.mouse.up();
  expect((await dados(page)).estado.clima.areas).toHaveLength(0);
});

test('chuva intensa carrega os dois GIFs e a opção de movimento reduzido mantém canvas estático', async ({ page }) => {
  await abrirMestre(page); await abrirClima(page, 'Chuva', 'Intenso');
  await arrastar(page, { x: 450, y: 350 }, { x: 800, y: 650 });
  await expect.poll(async () => page.evaluate(() => performance.getEntriesByType('resource').filter((r) => /lightning-[ab]\.gif$/.test(r.name)).length)).toBe(2);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const frame = () => page.evaluate(() => {
    const shape = window.__stages[0].find((node) => node.getClassName() === 'Shape')[0];
    return shape?.getLayer().getCanvas()._canvas.toDataURL();
  });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const first = await frame(); expect(first).toBeTruthy();
  await page.waitForTimeout(150); expect((await frame()) === first).toBe(true);
});

test('névoa totalmente coberta esconde token e impede colocação nessa célula', async ({ page, context }) => {
  await abrirMestre(page);
  await page.evaluate(() => { const d = window.__fixture.read(); window.__fixture.patch({ member: { ...d.member, podeAdicionar: true }, estado: { ...d.estado, fog: { ativo: true, celulas: {} } } }); });
  const player = await context.newPage(); await player.goto('/__e2e/jogador/demo?as=player');
  await expect(player.getByRole('button', { name: /Colocar personagem/ })).toBeVisible();
  expect(await player.evaluate(() => window.__stages[0].find('Circle').length)).toBe(0);
  await player.getByRole('button', { name: /Colocar personagem/ }).click(); await player.mouse.click(300, 300);
  expect((await dados(page)).tokens).toHaveLength(1);
});

test('barra de clima cabe em viewport de celular', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await abrirMestre(page); await abrirClima(page, 'Fogo', 'Intenso');
  const box = await page.getByRole('region', { name: 'Clima no mapa' }).boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(390);
  await expect(page.getByRole('button', { name: 'Fogo', exact: true })).toBeVisible();
});
