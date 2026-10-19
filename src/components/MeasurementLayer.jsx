import { Layer, Line, Text } from 'react-konva';

export default function MeasurementLayer({ inicio, atual, distancia }) {
  if (!inicio || !atual) return null;
  return (
    <Layer>
      <Line
        points={[inicio.x, inicio.y, atual.x, atual.y]}
        stroke="#ffcc00"
        strokeWidth={3}
        dash={[10, 5]}
      />
      <Text
        x={(inicio.x + atual.x) / 2}
        y={(inicio.y + atual.y) / 2 - 15}
        text={`${distancia(inicio, atual)} m`}
        fontSize={18}
        fill="white"
        fontStyle="bold"
      />
    </Layer>
  );
}
