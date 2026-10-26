import { useEffect, useRef } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

export default function MapaImagem({ url, onMapaCarregado }) {
  const [imagem] = useImage(url);
  const jaCarregado = useRef(false);

  useEffect(() => {
    if (imagem && !jaCarregado.current) {
      jaCarregado.current = true;
      if (onMapaCarregado) onMapaCarregado({ largura: imagem.width, altura: imagem.height });
    }
  }, [imagem, onMapaCarregado]);

  useEffect(() => {
    jaCarregado.current = false;
  }, [url]);

  return <KonvaImage image={imagem} x={0} y={0} listening={false} />;
}
