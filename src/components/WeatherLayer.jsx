import { useEffect, useRef } from 'react';
import { Layer, Shape } from 'react-konva';
import Konva from 'konva';
import useLightningSprites from '../hooks/useLightningSprites';
import { desenharFogo } from '../utils/fogo.js';
import { obterRelampago } from '../utils/relampagos.js';
import { areaClimaValida } from '../utils/clima.js';

const fracao = (n) => n - Math.floor(n);

// Um único canvas animado, sem atualizar o estado React a cada quadro.
export default function WeatherLayer({ areas = [] }) {
  const layerRef = useRef(null);
  const tempo = useRef(0);
  const validas = areas.filter(areaClimaValida);
  const ativo = validas.length > 0;
  const movimentoReduzido = useRef(false);
  const spritesRelampago = useLightningSprites(validas.some((area) => area.clima === 'chuva' && area.intensidade === 3));

  useEffect(() => {
    if (!ativo) return;
    const movimento = window.matchMedia('(prefers-reduced-motion: reduce)');
    const animacao = new Konva.Animation((frame) => {
      tempo.current = frame.time / 1000;
    }, layerRef.current);
    const atualizar = () => {
      movimentoReduzido.current = movimento.matches;
      animacao.stop();
      if (!movimento.matches && !document.hidden) animacao.start();
      else layerRef.current?.batchDraw();
    };
    atualizar();
    movimento.addEventListener('change', atualizar);
    document.addEventListener('visibilitychange', atualizar);
    return () => {
      animacao.stop();
      movimento.removeEventListener('change', atualizar);
      document.removeEventListener('visibilitychange', atualizar);
    };
  }, [ativo]);

  return <Layer ref={layerRef} listening={false}>
    {validas.map((area) => <Shape key={area.id} listening={false}
      sceneFunc={(context) => {
        const ctx = context._context;
        const { x, y, largura: w, altura: h, intensidade: nivel, clima } = area;
        const t = tempo.current;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.translate(x, y);
        if (clima === 'lava') {
          desenharFogo(ctx, w, h, nivel, t, validas.length);
        } else if (clima === 'sol') {
          const brilho = 0.055 + nivel * 0.025 + Math.sin(t * 0.8) * 0.015;
          ctx.fillStyle = `rgba(255, 195, 65, ${brilho})`;
          ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 5 + nivel * 2; i++) {
            const centro = fracao(i * 0.618 + t * 0.008) * (w + h) - h / 2;
            const gradiente = ctx.createLinearGradient(centro - 40, 0, centro + 80, 0);
            gradiente.addColorStop(0, 'rgba(255,230,150,0)');
            gradiente.addColorStop(0.5, `rgba(255,230,150,${0.04 + nivel * 0.02})`);
            gradiente.addColorStop(1, 'rgba(255,230,150,0)');
            ctx.fillStyle = gradiente;
            ctx.beginPath();
            ctx.moveTo(centro - 40, 0); ctx.lineTo(centro + 80, 0);
            ctx.lineTo(centro + h * 0.5 + 80, h); ctx.lineTo(centro + h * 0.5 - 40, h);
            ctx.fill();
          }
        } else {
          const neve = clima === 'inverno';
          ctx.fillStyle = neve ? `rgba(190,220,255,${nivel * 0.035})` : `rgba(40,65,100,${nivel * 0.04})`;
          ctx.fillRect(0, 0, w, h);
          const quantidade = Math.min(Math.max(12, Math.ceil(w * h / 3000) * nivel), Math.max(30, Math.floor(900 / validas.length)));
          ctx.strokeStyle = `rgba(170,210,255,${0.3 + nivel * 0.12})`;
          ctx.fillStyle = 'rgba(245,250,255,0.85)';
          ctx.lineWidth = 1 + nivel * 0.2;
          ctx.beginPath();
          for (let i = 0; i < quantidade; i++) {
            const velocidade = neve ? 16 + nivel * 9 : 220 + nivel * 100;
            const py = fracao(i * 0.754877 + t * velocidade / (h + 30)) * (h + 30) - 15;
            const px = fracao(i * 0.618034 + t * (neve ? 8 : -50) / (w + 30)) * (w + 30) - 15;
            if (neve) {
              const sx = px + Math.sin(t + i) * 8;
              const raio = 1.3 + fracao(i * 0.381) * nivel;
              ctx.moveTo(sx + raio, py); ctx.arc(sx, py, raio, 0, Math.PI * 2);
            } else {
              ctx.moveTo(px, py); ctx.lineTo(px - 4 - nivel, py + 9 + nivel * 5);
            }
          }
          if (neve) ctx.fill(); else ctx.stroke();
        }
        const relampago = obterRelampago(clima, nivel, t, movimentoReduzido.current);
        if (relampago) {
          // O recorte da área também limita o clarão e o halo do raio.
          ctx.fillStyle = `rgba(195, 218, 255, ${relampago.brilho * 0.18})`;
          ctx.fillRect(0, 0, w, h);
          const quadros = spritesRelampago[relampago.ciclo % 2];
          const imagem = quadros?.[Math.min(quadros.length - 1, Math.floor(relampago.progresso * quadros.length))];
          if (imagem) {
            const semente = [...String(area.id)].reduce((soma, letra) => soma + letra.charCodeAt(0), 0);
            const lado = Math.min(w * 0.9, h * 0.9, 460);
            const px = (w - lado) * (0.2 + fracao(semente * 0.618 + relampago.ciclo * 0.381) * 0.6);
            const py = (h - lado) * 0.35;
            ctx.globalAlpha = relampago.brilho * 0.85;
            ctx.shadowColor = '#9bbfff';
            ctx.shadowBlur = 12;
            ctx.drawImage(imagem, px, py, lado, lado);
          }
        }
        ctx.restore();
      }} />)}
  </Layer>;
}
