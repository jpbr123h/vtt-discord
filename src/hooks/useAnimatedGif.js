import { useEffect, useState } from 'react';
import { decompressFrame, parseGIF } from 'gifuct-js';

export default function useAnimatedGif(dataUrl, enabled, nodeRef) {
  const [animacao, setAnimacao] = useState({ canvas: null, dataUrl: null });

  useEffect(() => {
    if (!enabled || !dataUrl || typeof document === 'undefined') return undefined;

    let timer;
    let frameIndex = 0;
    let quadroAnterior = null;
    let canvasAnterior = null;
    let primeiroQuadro = true;
    const canvas = document.createElement('canvas');
    const contexto = canvas.getContext('2d');

    try {
      const conteudoBase64 = dataUrl.split(',')[1];
      const bytes = Uint8Array.from(atob(conteudoBase64), (caractere) => caractere.charCodeAt(0));
      const gif = parseGIF(bytes.buffer);
      const quadros = gif.frames.filter((quadro) => quadro.image);
      if (quadros.length < 2) return undefined;

      canvas.width = gif.lsd.width;
      canvas.height = gif.lsd.height;
      const desenharProximoQuadro = () => {
        const quadro = decompressFrame(quadros[frameIndex], gif.gct, true);

        if (quadroAnterior?.disposalType === 2) {
          const { left, top, width, height } = quadroAnterior.dims;
          contexto.clearRect(left, top, width, height);
        } else if (quadroAnterior?.disposalType === 3 && canvasAnterior) {
          contexto.clearRect(0, 0, canvas.width, canvas.height);
          contexto.drawImage(canvasAnterior, 0, 0);
        }

        canvasAnterior = null;
        if (quadro.disposalType === 3) {
          canvasAnterior = document.createElement('canvas');
          canvasAnterior.width = canvas.width;
          canvasAnterior.height = canvas.height;
          canvasAnterior.getContext('2d').drawImage(canvas, 0, 0);
        }

        const patchCanvas = document.createElement('canvas');
        patchCanvas.width = quadro.dims.width;
        patchCanvas.height = quadro.dims.height;
        patchCanvas.getContext('2d').putImageData(
          new ImageData(quadro.patch, quadro.dims.width, quadro.dims.height),
          0,
          0
        );
        contexto.drawImage(patchCanvas, quadro.dims.left, quadro.dims.top);

        quadroAnterior = quadro;
        if (primeiroQuadro) {
          setAnimacao({ canvas, dataUrl });
          primeiroQuadro = false;
        }
        nodeRef.current?.getLayer()?.batchDraw();
        frameIndex = (frameIndex + 1) % quadros.length;
        timer = window.setTimeout(desenharProximoQuadro, Math.max(20, quadro.delay || 100));
      };

      desenharProximoQuadro();
    } catch (erro) {
      console.error('Não foi possível animar este GIF:', erro);
    }

    return () => window.clearTimeout(timer);
  }, [dataUrl, enabled, nodeRef]);

  const pronto = enabled && animacao.dataUrl === dataUrl;
  return [pronto ? animacao.canvas : null, pronto];
}
