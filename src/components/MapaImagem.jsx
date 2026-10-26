import { useEffect, useRef, useState } from 'react';
import { Image as KonvaImage } from 'react-konva';
import useImage from 'use-image';
import { carregarImagemMapa } from '../services/mapas.js';

export default function MapaImagem({ url, onMapaCarregado, onErro }) {
  const [urlImagem, setUrlImagem] = useState('');
  const [imagem, status] = useImage(urlImagem);
  const jaCarregado = useRef(false);
  const onErroRef = useRef(onErro);
  onErroRef.current = onErro;

  useEffect(() => {
    let cancelado = false;
    jaCarregado.current = false;
    setUrlImagem('');
    if (!url) return undefined;
    carregarImagemMapa(url)
      .then((urlResolvida) => { if (!cancelado) setUrlImagem(urlResolvida); })
      .catch((erro) => {
        console.error('Erro ao carregar imagem do mapa:', erro);
        if (!cancelado) onErroRef.current?.();
      });
    return () => { cancelado = true; };
  }, [url]);

  useEffect(() => {
    if (imagem && !jaCarregado.current) {
      jaCarregado.current = true;
      if (onMapaCarregado) onMapaCarregado({ largura: imagem.width, altura: imagem.height });
    }
  }, [imagem, onMapaCarregado]);

  useEffect(() => {
    if (status === 'failed') onErroRef.current?.();
  }, [status]);

  return <KonvaImage image={imagem} x={0} y={0} listening={false} />;
}
