import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, runFixture) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    // Mesmo que o fixture seja alterado por acidente, o teste não acessa serviços reais.
    await page.context().route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
    });
    await runFixture(page);
    expect(errors, 'erros JavaScript não tratados').toEqual([]);
  },
});
export { expect };
export async function abrirMestre(page) {
  await page.goto('/__e2e/mesa/demo');
  await page.locator('canvas').first().waitFor();
}
export async function abrirJogador(context) {
  const player = await context.newPage();
  await player.goto('/__e2e/jogador/demo?as=player');
  await player.locator('canvas').first().waitFor();
  return player;
}
export const dados = (page) => page.evaluate(() => window.__fixture.read());
export async function configurarPermissao(gm, campo, permitido) {
  await gm.bringToFront();
  await gm.getByRole('button', { name: 'Jogador de teste' }).click();
  await gm.getByRole('checkbox', { name: new RegExp(campo) }).setChecked(permitido, { force: true });
  await gm.getByRole('button', { name: 'Fechar', exact: true }).click();
}
export async function arrastar(page, inicio, fim, soltar = true) {
  await page.bringToFront();
  await page.mouse.move(inicio.x, inicio.y);
  await page.mouse.down();
  await page.mouse.move(fim.x, fim.y, { steps: 12 });
  if (soltar) await page.mouse.up();
}
export async function colarTexto(page, texto, ponto = { x: 500, y: 300 }) {
  await page.bringToFront();
  await page.evaluate((value) => navigator.clipboard.writeText(value), texto);
  await page.mouse.move(ponto.x, ponto.y);
  await page.keyboard.press('Control+v');
}
export async function colarImagem(page) {
  await page.bringToFront();
  await page.evaluate(async () => {
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 600;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ef7a32'; ctx.fillRect(50, 50, 1100, 500);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
  });
  await page.mouse.move(150, 440);
  await page.keyboard.press('Control+v');
}
export async function abrirClima(page, clima = 'Chuva', intensidade = 'Moderado') {
  await page.getByRole('button', { name: 'Clima', exact: true }).click();
  await page.getByRole('button', { name: clima, exact: true }).click();
  await page.getByRole('button', { name: intensidade, exact: true }).click();
}
