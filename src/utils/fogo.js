const fracao = (valor) => valor - Math.floor(valor);

// Atmosfera de calor translúcida; o mapa continua visível sob os efeitos.
export function desenharFogo(ctx, largura, altura, intensidade, tempo, quantidadeAreas = 1) {
  const opacidade = 0.08 + intensidade * 0.065;
  const pulso = Math.sin(tempo * 0.65) * 0.015;
  const gradiente = ctx.createLinearGradient(0, 0, largura * 0.2, altura);
  gradiente.addColorStop(0, `rgba(190, 30, 5, ${opacidade + pulso})`);
  gradiente.addColorStop(0.45, `rgba(245, 75, 5, ${opacidade + 0.025 + pulso})`);
  gradiente.addColorStop(0.8, `rgba(255, 125, 12, ${opacidade + 0.04 + pulso})`);
  gradiente.addColorStop(1, `rgba(255, 185, 45, ${opacidade + 0.015 + pulso})`);
  ctx.fillStyle = gradiente;
  ctx.fillRect(0, 0, largura, altura);

  const centroX = largura * (0.5 + Math.sin(tempo * 0.2) * 0.15);
  const centroY = altura * (0.8 + Math.cos(tempo * 0.25) * 0.1);
  const calor = ctx.createRadialGradient(centroX, centroY, 0, centroX, centroY, Math.hypot(largura, altura) * 0.7);
  calor.addColorStop(0, `rgba(255, 150, 30, ${0.025 + intensidade * 0.035})`);
  calor.addColorStop(1, 'rgba(255, 80, 0, 0)');
  ctx.fillStyle = calor;
  ctx.fillRect(0, 0, largura, altura);

  // Faixas onduladas sobem lentamente como correntes de ar quente.
  const ondas = 2 + intensidade;
  for (let i = 0; i < ondas; i++) {
    const fase = fracao(i / ondas + tempo * (0.025 + intensidade * 0.008));
    const y = altura * (1.15 - fase * 1.3);
    const visibilidade = Math.sin(fase * Math.PI);
    ctx.beginPath();
    for (let x = -20; x <= largura + 20; x += 16) {
      const ondulacao = Math.sin(x / 85 + tempo * 1.1 + i * 2) * (5 + intensidade * 3) +
        Math.sin(x / 170 - tempo * 0.6 + i) * 7;
      if (x === -20) ctx.moveTo(x, y + ondulacao);
      else ctx.lineTo(x, y + ondulacao);
    }
    ctx.strokeStyle = `rgba(255, 145, 45, ${visibilidade * (0.02 + intensidade * 0.012)})`;
    ctx.lineWidth = 18 + intensidade * 8;
    ctx.stroke();
    ctx.strokeStyle = `rgba(255, 205, 120, ${visibilidade * (0.025 + intensidade * 0.015)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // Focos de luz difusa dão profundidade ao degradê, sem formar labaredas.
  for (let i = 0; i < 3; i++) {
    const x = largura * (0.2 + i * 0.3 + Math.sin(tempo * 0.35 + i * 3) * 0.1);
    const y = altura * (0.5 + Math.cos(tempo * 0.3 + i * 2) * 0.3);
    const raio = Math.max(1, Math.min(largura, altura) * 0.6);
    const brilho = (0.5 + Math.sin(tempo * 1.1 + i * 2) * 0.25) * intensidade * 0.035;
    const halo = ctx.createRadialGradient(x, y, 0, x, y, raio);
    halo.addColorStop(0, `rgba(255, 175, 45, ${brilho})`);
    halo.addColorStop(1, 'rgba(255, 95, 0, 0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, largura, altura);
  }

  const limite = Math.max(8, Math.floor(360 / quantidadeAreas));
  const brasas = Math.min(limite, 55, Math.max(4, Math.ceil(largura * altura / 18000)) * intensidade);
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 0; i < brasas; i++) {
    const fase = fracao(i * 0.754877 + tempo * (18 + intensidade * 10) / (altura + 30));
    const x = fracao(i * 0.618034) * largura + Math.sin(tempo * 1.2 + i * 2) * 12;
    const y = altura + 15 - fase * (altura + 30);
    const tamanho = 0.7 + fracao(i * 0.381966) * intensidade * 0.6;
    const brilho = Math.sin(fase * Math.PI) * (0.5 + intensidade * 0.1);
    ctx.strokeStyle = `rgba(255, 135, 30, ${brilho * 0.3})`;
    ctx.lineWidth = tamanho;
    ctx.beginPath();
    ctx.moveTo(x, y + 3 + intensidade * 2);
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.fillStyle = `rgba(255, 215, 115, ${brilho})`;
    ctx.beginPath();
    ctx.arc(x, y, tamanho, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
