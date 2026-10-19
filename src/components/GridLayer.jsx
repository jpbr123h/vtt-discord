import { Layer, Line } from 'react-konva';

export default function GridLayer({ largura, altura, tamanhoCelula }) {
  const linhas = [];
  for (let x = 0; x < largura / tamanhoCelula; x += 1) {
    linhas.push(
      <Line
        key={`vertical-${x}`}
        points={[x * tamanhoCelula, 0, x * tamanhoCelula, altura]}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
        listening={false}
      />
    );
  }
  for (let y = 0; y < altura / tamanhoCelula; y += 1) {
    linhas.push(
      <Line
        key={`horizontal-${y}`}
        points={[0, y * tamanhoCelula, largura, y * tamanhoCelula]}
        stroke="rgba(255,255,255,0.2)"
        strokeWidth={1}
        listening={false}
      />
    );
  }
  return <Layer>{linhas}</Layer>;
}
