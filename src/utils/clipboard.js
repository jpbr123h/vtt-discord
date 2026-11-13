export function lerConteudoColado(clipboard) {
  if (!clipboard) return null;
  for (const item of Array.from(clipboard.items || [])) {
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const arquivo = item.getAsFile();
      if (arquivo) return { tipo: 'imagem', arquivo };
    }
  }
  const arquivo = Array.from(clipboard.files || []).find((file) => file.type.startsWith('image/'));
  if (arquivo) return { tipo: 'imagem', arquivo };
  const texto = clipboard.getData('text/plain').replace(/\r\n?/g, '\n');
  return texto.trim() ? { tipo: 'texto', texto } : null;
}

export function posicionarColagem(ponto, largura, altura, mapa) {
  return {
    x: Math.max(0, Math.min(Math.max(0, mapa.largura - largura), ponto.x)),
    y: Math.max(0, Math.min(Math.max(0, mapa.altura - altura), ponto.y)),
  };
}

// Mantém a transparência e deixa margem abaixo do limite de um documento do Firestore.
export async function prepararImagemColada(arquivo) {
  if (arquivo.size > 30 * 1024 * 1024) throw new Error('Escolha uma imagem de até 30 MB.');
  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    imagem.src = url;
    await imagem.decode().catch(() => { throw new Error('Não foi possível ler a imagem copiada. Copie a imagem novamente e tente colar.'); });
    const canvas = document.createElement('canvas');
    let escala = Math.min(1, 1600 / Math.max(imagem.naturalWidth, imagem.naturalHeight));
    for (let tentativa = 0; tentativa < 8; tentativa++) {
      canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala));
      canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala));
      canvas.getContext('2d').drawImage(imagem, 0, 0, canvas.width, canvas.height);
      const imagemUrl = canvas.toDataURL('image/webp', 0.85);
      if (imagemUrl.length <= 600_000) return { imagemUrl, largura: canvas.width, altura: canvas.height };
      escala *= 0.7;
    }
    throw new Error('A imagem é grande demais para colar. Reduza a resolução.');
  } finally {
    URL.revokeObjectURL(url);
  }
}
