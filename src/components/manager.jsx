import { Heart, Minus, Plus, Trash2, X } from 'lucide-react';

export default function PainelManager({ isOpen, onClose, tokens, onAlterarVida, onExcluirToken }) {
  if (!isOpen) return null;

  const alterarVida = (id, delta) => onAlterarVida?.(id, delta);

  const deletarToken = (id) => onExcluirToken?.(id);

  return (
    <div className="painel-tokens-overlay" onClick={onClose} onMouseDown={(e) => e.stopPropagation()}>
      <section
        className="painel-tokens-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="painel-tokens-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="painel-tokens-header">
          <div className="painel-tokens-titulo">
            <span className="painel-tokens-sobretitulo">MESA • PERSONAGENS</span>
            <h2 id="painel-tokens-titulo">Status dos tokens <span>{tokens.length}</span></h2>
            <p>Acompanhe e ajuste a vida de cada token.</p>
          </div>
          <button type="button" className="painel-tokens-fechar" onClick={onClose} aria-label="Fechar status dos tokens">
            <X size={18} />
          </button>
        </header>

        <div className="painel-tokens-lista">
          {tokens.length === 0 ? (
            <div className="tokens-vazio">
              <span className="tokens-vazio__icone"><Heart size={20} /></span>
              <strong>Nenhum token no mapa</strong>
              <p>Adicione um token para acompanhar seu status aqui.</p>
            </div>
          ) : tokens.map((token) => {
            const vida = Math.max(0, Number(token.vida || 0));
            const vidaMaxima = Math.max(1, Number(token.vidamax || vida || 1));
            const percentualVida = Math.min(100, (vida / vidaMaxima) * 100);

            return (
              <article key={token.id} className="token-card">
                <div className="token-card__avatar" style={{ backgroundColor: token.cor || '#ff0044' }}>
                  {token.imagem
                    ? <img src={token.imagem} alt="" />
                    : <span>{(token.nome || '?').trim().charAt(0).toUpperCase()}</span>}
                </div>
                <div className="token-card__info">
                  <strong title={token.nome || 'Sem nome'}>{token.nome || 'Sem nome'}</strong>
                  <div className="token-card__vida">
                    <Heart size={13} aria-hidden="true" />
                    <span>{vida} <small>/ {vidaMaxima} PV</small></span>
                  </div>
                  <div className="token-card__barra" role="progressbar" aria-label={`Vida de ${token.nome || 'token'}`} aria-valuenow={vida} aria-valuemin={0} aria-valuemax={vidaMaxima}>
                    <span style={{ width: `${percentualVida}%` }} />
                  </div>
                </div>
                <div className="token-card__acoes" aria-label={`Ações para ${token.nome || 'token'}`}>
                  <button type="button" title="Tirar 1 de vida" aria-label={`Tirar 1 de vida de ${token.nome || 'token'}`} onClick={() => alterarVida(token.id, -1)}>
                    <Minus size={15} />
                  </button>
                  <button type="button" title="Adicionar 1 de vida" aria-label={`Adicionar 1 de vida a ${token.nome || 'token'}`} onClick={() => alterarVida(token.id, 1)}>
                    <Plus size={15} />
                  </button>
                  <button type="button" className="token-card__deletar" title="Excluir token" aria-label={`Excluir ${token.nome || 'token'}`} onClick={() => deletarToken(token.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
        <footer className="painel-tokens-rodape">As alterações são aplicadas imediatamente.</footer>
      </section>
    </div>
  );
}
