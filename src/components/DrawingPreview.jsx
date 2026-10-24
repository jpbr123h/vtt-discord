import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Ellipse, Line, Rect } from 'react-konva';

const DrawingPreview = forwardRef(function DrawingPreview(_, ref) {
  const [preview, setPreview] = useState(null);
  const frame = useRef(0);
  const queued = useRef(null);

  useImperativeHandle(ref, () => ({
    update(nextPreview) {
      queued.current = nextPreview;
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(() => {
        setPreview(queued.current);
        frame.current = 0;
      });
    },
    clear() {
      if (frame.current) window.cancelAnimationFrame(frame.current);
      frame.current = 0;
      queued.current = null;
      setPreview(null);
    },
  }), []);

  useEffect(() => () => {
    if (frame.current) window.cancelAnimationFrame(frame.current);
  }, []);

  if (!preview) return null;
  if (preview.tipo === 'traco') {
    return <Line points={preview.pontos} stroke={preview.cor} strokeWidth={preview.espessura}
      lineCap="round" lineJoin="round" listening={false} />;
  }

  const forma = preview;
  return (
    <>
      {forma.forma === 'circulo' ? (
        <Ellipse x={forma.x + forma.largura / 2} y={forma.y + forma.altura / 2}
          radiusX={forma.largura / 2} radiusY={forma.altura / 2}
          stroke={forma.cor} strokeWidth={forma.espessura} listening={false} />
      ) : forma.forma === 'quadrado' || forma.forma === 'retangulo' ? (
        <Rect x={forma.x} y={forma.y} width={forma.largura} height={forma.altura}
          stroke={forma.cor} strokeWidth={forma.espessura} listening={false} />
      ) : (
        <Line points={forma.pontos.map((ponto, indice) => ponto + (indice % 2 === 0 ? forma.x : forma.y))}
          closed={forma.forma === 'triangulo' || forma.forma === 'estrela'} fill="rgba(0,0,0,0)"
          stroke={forma.cor} strokeWidth={forma.espessura} lineCap="round" lineJoin="round" listening={false} />
      )}
    </>
  );
});

export default DrawingPreview;
