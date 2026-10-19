import { Circle, Rect, Text } from 'react-konva';

export default function TokenGroupControls({
  limites,
  visivel,
  onArrasteMolduraInicio,
  onArrasteMoldura,
  onArrasteMolduraFim,
  onRedimensionarInicio,
  onRedimensionar,
  onRedimensionarFim,
  onEspelharHorizontal,
  onEspelharVertical,
}) {
  if (!limites || !visivel) return null;
  const meioX = (limites.esquerda + limites.direita) / 2;
  const cantos = [
    ['nw', limites.esquerda, limites.topo],
    ['ne', limites.direita, limites.topo],
    ['sw', limites.esquerda, limites.base],
    ['se', limites.direita, limites.base],
  ];

  return (
    <>
      <Rect
        x={limites.esquerda}
        y={limites.topo}
        width={limites.direita - limites.esquerda}
        height={limites.base - limites.topo}
        stroke="#53a9ff"
        strokeWidth={2}
        dash={[7, 4]}
        draggable
        dragDistance={3}
        onMouseDown={(e) => { e.cancelBubble = true; }}
        onDragStart={onArrasteMolduraInicio}
        onDragMove={onArrasteMoldura}
        onDragEnd={onArrasteMolduraFim}
      />
      {cantos.map(([canto, x, y]) => (
        <Circle
          key={canto}
          x={x}
          y={y}
          radius={7}
          fill="#e7f4ff"
          stroke="#2487dc"
          strokeWidth={2}
          draggable
          onMouseDown={(e) => { e.cancelBubble = true; }}
          onDragStart={() => onRedimensionarInicio(canto)}
          onDragMove={onRedimensionar}
          onDragEnd={onRedimensionarFim}
        />
      ))}
      <Rect
        x={meioX - 28}
        y={limites.topo - 28}
        width={24}
        height={20}
        fill="#333"
        cornerRadius={4}
        onClick={(e) => { e.cancelBubble = true; onEspelharHorizontal(); }}
        onMouseDown={(e) => { e.cancelBubble = true; }}
      />
      <Text x={meioX - 25} y={limites.topo - 26} text="↔" fontSize={16} fill="white" listening={false} />
      <Rect
        x={meioX + 4}
        y={limites.topo - 28}
        width={24}
        height={20}
        fill="#333"
        cornerRadius={4}
        onClick={(e) => { e.cancelBubble = true; onEspelharVertical(); }}
        onMouseDown={(e) => { e.cancelBubble = true; }}
      />
      <Text x={meioX + 7} y={limites.topo - 26} text="↕" fontSize={16} fill="white" listening={false} />
    </>
  );
}
