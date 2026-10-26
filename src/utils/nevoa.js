// Regras da névoa (fog of war) alinhada ao grid.
// Cada célula guarda sua opacidade de 0 a 1. Ausente = 1 (coberta).
export const OPACIDADE_MAXIMA_NEVOA = 0.94;
export const PASSO_CLAREAR = 0.5;

export function chaveCelula(coluna, linha) {
  return `${coluna},${linha}`;
}

export function opacidadeDaCelula(celulas, coluna, linha) {
  const valor = celulas?.[chaveCelula(coluna, linha)];
  if (valor === undefined) return 1;
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 1;
  return Math.max(0, Math.min(1, numero));
}

// Clarear nunca remove a célula do mapa: só reduz a opacidade.
export function clarearCelula(celulas, coluna, linha, passo = PASSO_CLAREAR) {
  const atual = opacidadeDaCelula(celulas, coluna, linha);
  const proximo = Math.max(0, Math.round((atual - passo) * 100) / 100);
  if (proximo === atual) return celulas;
  return { ...(celulas || {}), [chaveCelula(coluna, linha)]: proximo };
}

// Cobrir é o caminho inverso: sobe a opacidade até 1 e, ao chegar lá,
// remove a chave (ausente já significa totalmente coberta).
export function cobrirCelula(celulas, coluna, linha, passo = PASSO_CLAREAR) {
  const atual = opacidadeDaCelula(celulas, coluna, linha);
  const proximo = Math.min(1, Math.round((atual + passo) * 100) / 100);
  if (proximo === atual) return celulas;
  const proximas = { ...(celulas || {}) };
  const chave = chaveCelula(coluna, linha);
  if (proximo === 1) delete proximas[chave];
  else proximas[chave] = proximo;
  return proximas;
}

// Revela o mapa inteiro: marca todas as células do grid como 0.
// A névoa continua ativa, então dá para voltar a cobrir áreas específicas.
export function revelarTodasAsCelulas({ largura, altura, tamanhoCelula = 50 }) {
  const celulas = {};
  if (!largura || !altura || !tamanhoCelula) return celulas;
  const colunas = Math.ceil(largura / tamanhoCelula);
  const linhas = Math.ceil(altura / tamanhoCelula);
  for (let linha = 0; linha < linhas; linha++) {
    for (let coluna = 0; coluna < colunas; coluna++) {
      celulas[chaveCelula(coluna, linha)] = 0;
    }
  }
  return celulas;
}

// Agrupa células vizinhas de mesma opacidade em retângulos para desenhar menos nós no Konva.
export function calcularAreasNevoa({ largura, altura, celulas, tamanhoCelula = 50, opacidadeMaxima = OPACIDADE_MAXIMA_NEVOA }) {
  if (!largura || !altura || !tamanhoCelula) return [];
  const colunas = Math.ceil(largura / tamanhoCelula);
  const linhas = Math.ceil(altura / tamanhoCelula);
  const resultado = [];

  for (let linha = 0; linha < linhas; linha++) {
    let inicio = -1;
    let valorAtual = 0;
    for (let coluna = 0; coluna <= colunas; coluna++) {
      const valor = coluna < colunas ? opacidadeDaCelula(celulas, coluna, linha) : -1;
      if (inicio >= 0 && valor !== valorAtual) {
        resultado.push({
          x: inicio * tamanhoCelula,
          y: linha * tamanhoCelula,
          width: Math.min((coluna - inicio) * tamanhoCelula, largura - inicio * tamanhoCelula),
          height: Math.min(tamanhoCelula, altura - linha * tamanhoCelula),
          opacity: valorAtual * opacidadeMaxima,
        });
        inicio = -1;
      }
      if (coluna < colunas && valor > 0 && inicio < 0) {
        inicio = coluna;
        valorAtual = valor;
      }
    }
  }

  return resultado;
}
