import { useMemo } from 'react';
import { Layer, Rect } from 'react-konva';
import { calcularAreasNevoa } from '../utils/nevoa.js';

// Névoa desenhada em blocos alinhados ao grid.
// Células ausentes em `celulas` são consideradas totalmente cobertas (1).
// Cada célula guarda sua opacidade (0 a 1), então clarear não apaga a névoa:
// basta baixar o valor e, se quiser, cobrir de novo depois.
// `opaco` força qualquer célula com névoa a ficar 100% escura (usado no jogador),
// independente do quanto o mestre já clareou.
const COR_NEVOA = '#05070c';

export default function FogLayer({ largura, altura, ativo, celulas, tamanhoCelula = 50, opacidadeMaxima, cor = COR_NEVOA, opaco = false }) {
  const areas = useMemo(
    () => (ativo ? calcularAreasNevoa({ largura, altura, celulas, tamanhoCelula, opacidadeMaxima }) : []),
    [ativo, celulas, largura, altura, tamanhoCelula, opacidadeMaxima],
  );

  if (!ativo || areas.length === 0) return null;

  return (
    <Layer listening={false}>
      {areas.map((area, indice) => (
        <Rect
          key={`${area.x}-${area.y}-${indice}`}
          x={area.x}
          y={area.y}
          width={area.width}
          height={area.height}
          fill={cor}
          opacity={opaco ? 1 : area.opacity}
        />
      ))}
    </Layer>
  );
}
