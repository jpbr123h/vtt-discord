import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Circle, Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from 'use-image';
import useAnimatedGif from '../hooks/useAnimatedGif';

const TokenNode = forwardRef(function TokenNode({ token, raio, selecionado, medindo, ferramenta = 'selecionar', onSelecionar, onDuploClique, onArrasteInicio, onArraste, onArrasteFim, onMenuContexto }, ref) {
  const [imagem] = useImage(token.imagem || '');
  const imagemGrupoRef = useRef(null);
  const circuloRef = useRef(null);
  const nomeGrupoRef = useRef(null);
  const gifAnimado = token.imagem?.startsWith('data:image/gif');
  const [canvasGif, gifPronto] = useAnimatedGif(token.imagem, gifAnimado, imagemGrupoRef);
  const imagemExibida = gifAnimado && gifPronto ? canvasGif : imagem;
  const raioAtual = raio * (token.escala || 1);
  const escalaAtual = token.escala || 1;
  const nomeToken = token.nome || '';
  const larguraNome = Math.min(140, Math.max(28, nomeToken.length * 7 + 8)) * escalaAtual;
  const ladoCorte = imagemExibida ? Math.min(imagemExibida.width, imagemExibida.height) : 0;
  const cropX = imagemExibida ? (imagemExibida.width - ladoCorte) / 2 : 0;
  const cropY = imagemExibida ? (imagemExibida.height - ladoCorte) / 2 : 0;

  useImperativeHandle(ref, () => ({
    moverPara(x, y) {
      circuloRef.current?.position({ x, y });
      imagemGrupoRef.current?.position({ x, y });
      nomeGrupoRef.current?.position({ x: x - larguraNome / 2, y: y + raioAtual + 4 });
    },
  }), [larguraNome, raioAtual]);

  const sincronizarVisuais = (e) => {
    const { x, y } = e.target.position();
    imagemGrupoRef.current?.position({ x, y });
    nomeGrupoRef.current?.position({ x: x - larguraNome / 2, y: y + raioAtual + 4 });
    onArraste(e, token.id);
  };

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
        ref={circuloRef}
        x={token.x}
        y={token.y}
        radius={raioAtual}
        fill={token.imagem ? 'rgba(0,0,0,0.001)' : token.cor}
        stroke={selecionado ? '#53a9ff' : 'white'}
        strokeWidth={selecionado ? 4 : 2}
        draggable={!medindo}
        onClick={(e) => onSelecionar(e, token.id)}
        onContextMenu={(e) => { e.evt.preventDefault(); e.cancelBubble = true; onMenuContexto?.(e, token.id); }}
        onDblClick={(e) => onDuploClique(e, token.id)}
        onDragStart={(e) => onArrasteInicio(e, token.id)}
        onDragMove={sincronizarVisuais}
        onDragEnd={(e) => onArrasteFim(e, token.id)}
        onMouseEnter={(e) => { e.target.getStage().container().style.cursor = ferramenta === 'texto' ? 'text' : 'pointer'; }}
        onMouseLeave={(e) => { e.target.getStage().container().style.cursor = ferramenta === 'texto' ? 'text' : 'default'; }}
      />
      {token.nome && (
        <Group
          ref={nomeGrupoRef}
          x={token.x - larguraNome / 2}
          y={token.y + raioAtual + 4}
          listening={false}
        >
          <Rect
            x={0}
            y={0}
            width={larguraNome}
            height={18 * (token.escala || 1)}
            fill="rgba(0, 0, 0, 0.5)"
            cornerRadius={3 * (token.escala || 1)}
          />
          <Text
            x={2 * escalaAtual}
            y={1 * escalaAtual}
            width={larguraNome - 4 * escalaAtual}
            height={16 * escalaAtual}
            text={token.nome}
            align="center"
            verticalAlign="middle"
            fontSize={12 * escalaAtual}
            fontStyle="bold"
            fill="#ffffff"
          />
        </Group>
      )}
    </>
  );
});

export default TokenNode;
