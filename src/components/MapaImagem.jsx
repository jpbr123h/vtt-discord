import { useEffect } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';

export default function MapaImagem({ url, onMapaCarregado }) {
  const [imagem] = useImage(url);

  useEffect(() => {
    if (imagem) onMapaCarregado({ largura: imagem.width, altura: imagem.height });
  }, [imagem, onMapaCarregado]);

  return <KonvaImage image={imagem} x={0} y={0} listening={false} />;
}
