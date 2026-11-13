export const TIPOS_CLIMA = ['chuva', 'sol', 'inverno', 'lava'];

// Coordenadas do mapa: continuam corretas ao mover ou aproximar a câmera.
export function obterAreaClima(inicio, fim, tamanho) {
  const limitar = (valor, maximo) => Math.max(0, Math.min(maximo, valor));
  const x1 = limitar(inicio.x, tamanho.largura);
  const y1 = limitar(inicio.y, tamanho.altura);
  const x2 = limitar(fim.x, tamanho.largura);
  const y2 = limitar(fim.y, tamanho.altura);
  const largura = Math.abs(x2 - x1);
  const altura = Math.abs(y2 - y1);
  if (largura < 12 || altura < 12) return null;
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), largura, altura };
}

export function areaClimaValida(area) {
  return area && TIPOS_CLIMA.includes(area.clima) &&
    [1, 2, 3].includes(area.intensidade) &&
    [area.x, area.y, area.largura, area.altura].every(Number.isFinite) &&
    area.largura > 0 && area.altura > 0;
}

export function removerAreasClimaCobertas(areas) {
  const contem = (maior, menor) => maior.x <= menor.x && maior.y <= menor.y &&
    maior.x + maior.largura >= menor.x + menor.largura &&
    maior.y + maior.altura >= menor.y + menor.altura;

  return areas.filter((area, indice) => !areas.some((outra, outroIndice) =>
    indice !== outroIndice && area.clima === outra.clima && contem(outra, area) &&
    // Em áreas idênticas, conserva a mais recente, inclusive sua intensidade.
    (!contem(area, outra) || outroIndice > indice)));
}
