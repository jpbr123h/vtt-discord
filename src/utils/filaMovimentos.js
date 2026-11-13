// Envia durante o arraste; enquanto a rede está ocupada, guarda só a posição mais recente.
export function criarFilaMovimentos(gravar, intervalo = 60) {
  const pendentes = new Map();
  let timer = null;
  let ultimoEnvio = -Infinity;
  let emVoo = null;

  const programar = () => {
    if (timer !== null || emVoo || !pendentes.size) return;
    timer = setTimeout(() => { enviar().catch(() => {}); }, Math.max(0, intervalo - (Date.now() - ultimoEnvio)));
  };

  const enviar = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (emVoo) return emVoo.catch(() => {}).then(enviar);
    if (!pendentes.size) return Promise.resolve(true);
    const lote = [...pendentes.values()];
    pendentes.clear();
    ultimoEnvio = Date.now();
    emVoo = Promise.resolve().then(() => gravar(lote)).finally(() => {
      emVoo = null;
      programar();
    });
    return emVoo;
  };

  return {
    adicionar(itens) {
      itens.forEach((item) => pendentes.set(`${item.colecao}:${item.id}`, item));
      programar();
    },
    finalizar: enviar,
    cancelar() {
      if (timer !== null) clearTimeout(timer);
      timer = null;
      pendentes.clear();
    },
  };
}
