import { useRef } from 'react';
import { Circle, Group, Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import useAnimatedGif from '../hooks/useAnimatedGif';

export default function TokenNode({ token, raio, selecionado, medindo, onSelecionar, onDuploClique, onArrasteInicio, onArraste, onArrasteFim }) {
  const [imagem] = useImage(token.imagem || '');
  const imagemGrupoRef = useRef(null);
  const gifAnimado = token.imagem?.startsWith('data:image/gif');
  const [canvasGif, gifPronto] = useAnimatedGif(token.imagem, gifAnimado, imagemGrupoRef);
  const imagemExibida = gifAnimado && gifPronto ? canvasGif : imagem;
  const raioAtual = raio * (token.escala || 1);
  const ladoCorte = imagemExibida ? Math.min(imagemExibida.width, imagemExibida.height) : 0;
  const cropX = imagemExibida ? (imagemExibida.width - ladoCorte) / 2 : 0;
  const cropY = imagemExibida ? (imagemExibida.height - ladoCorte) / 2 : 0;

  return (
    <>
      {imagemExibida && (
        <Group
          ref={imagemGrupoRef}
          x={token.x}
          y={token.y}
          clipFunc={(context) => context.arc(0, 0, raioAtual, 0, Math.PI * 2, false)}
          listening={false}
        >
          <KonvaImage
            image={imagemExibida}
            x={-raioAtual}
            y={-raioAtual}
            width={raioAtual * 2}
            height={raioAtual * 2}
            cropX={cropX}
            cropY={cropY}
            cropWidth={ladoCorte}
            cropHeight={ladoCorte}
            listening={false}
          />
        </Group>
      )}
      <Circle
        x={token.x}
        y={token.y}
        radius={raioAtual}
        fill={token.imagem ? 'rgba(0,0,0,0.001)' : token.cor}
        stroke={selecionado ? '#53a9ff' : 'white'}
        strokeWidth={selecionado ? 4 : 2}
        draggable={!medindo}
        onClick={(e) => onSelecionar(e, token.id)}
        onDblClick={(e) => onDuploClique(e, token.id)}
        onDragStart={(e) => onArrasteInicio(e, token.id)}
        onDragMove={(e) => onArraste(e, token.id)}
        onDragEnd={(e) => onArrasteFim(e, token.id)}
        onMouseEnter={(e) => { e.target.getStage().container().style.cursor = 'pointer'; }}
        onMouseLeave={(e) => { e.target.getStage().container().style.cursor = 'default'; }}
      />
    </>
  );
}
