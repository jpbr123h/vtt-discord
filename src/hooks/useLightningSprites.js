import { useEffect, useState } from 'react';
import { parseGIF, decompressFrames } from 'gifuct-js';

const urls = ['lightning-a.gif', 'lightning-b.gif'].map((nome) => `${import.meta.env.BASE_URL}weather/${nome}`);
let carregamento;

async function carregarGif(url) {
  const resposta = await fetch(url);
  if (!resposta.ok) throw new Error(`Não foi possível carregar ${url}`);
  const gif = parseGIF(await resposta.arrayBuffer());
  // Os GIFs locais têm quadros completos e disposal=2; cada quadro é independente.
  return decompressFrames(gif, true).map((quadro) => {
    const canvas = document.createElement('canvas');
    canvas.width = gif.lsd.width;
    canvas.height = gif.lsd.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(new ImageData(quadro.patch, quadro.dims.width, quadro.dims.height), quadro.dims.left, quadro.dims.top);
    // O GIF guarda a máscara original; a cor do relâmpago vem da própria cena.
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#e9f3ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
  });
}

export default function useLightningSprites(habilitado) {
  const [sprites, setSprites] = useState([]);
  useEffect(() => {
    if (!habilitado) return;
    let cancelado = false;
    if (!carregamento) {
      carregamento = Promise.all(urls.map(carregarGif)).catch((erro) => {
        carregamento = undefined;
        throw erro;
      });
    }
    carregamento.then((quadros) => { if (!cancelado) setSprites(quadros); })
      .catch((erro) => console.error('Não foi possível carregar os relâmpagos:', erro));
    return () => { cancelado = true; };
  }, [habilitado]);
  return sprites;
}
