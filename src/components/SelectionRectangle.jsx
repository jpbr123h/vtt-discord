import { Rect } from 'react-konva';

export default function SelectionRectangle({ area, obterLimites }) {
  if (!area) return null;
  const limites = obterLimites(area);
  return (
    <Rect
      x={limites.esquerda}
      y={limites.topo}
      width={limites.direita - limites.esquerda}
      height={limites.base - limites.topo}
      fill="rgba(55, 145, 255, 0.22)"
      stroke="#53a9ff"
      strokeWidth={1}
      listening={false}
    />
  );
}
