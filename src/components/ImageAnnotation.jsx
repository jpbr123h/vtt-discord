import { forwardRef } from 'react';
import { Group, Image as KonvaImage, Rect, Text } from 'react-konva';
import useImage from 'use-image';

const ImageAnnotation = forwardRef(function ImageAnnotation({ item, ...eventos }, ref) {
  const [imagem, status] = useImage(item.imagemUrl);
  return <Group ref={ref} x={item.x} y={item.y} {...eventos}>
    {imagem ? <KonvaImage image={imagem} width={item.largura} height={item.altura} /> : <>
      <Rect width={item.largura} height={item.altura} fill="rgba(30,40,60,0.6)" stroke="#7c8da8" />
      <Text x={8} y={8} width={Math.max(1, item.largura - 16)} text={status === 'failed' ? 'Imagem indisponível' : 'Carregando imagem…'} fill="#d6dfef" fontSize={14} />
    </>}
  </Group>;
});
export default ImageAnnotation;
