const INTERVALO = 4;
const INICIO = 3;
const DURACAO = 0.5;

// Um clarão breve por ciclo, sincronizado entre áreas para evitar flashes acumulados.
export function obterRelampago(clima, intensidade, tempo, movimentoReduzido = false) {
  if (clima !== 'chuva' || intensidade !== 3 || movimentoReduzido || !Number.isFinite(tempo) || tempo < 0) return null;
  const ciclo = Math.floor(tempo / INTERVALO);
  const decorrido = tempo - ciclo * INTERVALO - INICIO;
  if (decorrido < 0 || decorrido >= DURACAO) return null;
  const progresso = decorrido / DURACAO;
  return { ciclo, progresso, brilho: Math.sin(progresso * Math.PI) };
}
