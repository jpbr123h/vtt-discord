import { Heart, Trash2, X } from 'lucide-react';

export default function PainelManager({ isOpen, onClose, tokens, selecionados = [], onSelecionarToken, onAlterarVida, onExcluirToken }) {
  if (!isOpen) return null;

  const alterarVida = (id, delta) => onAlterarVida?.(id, delta);

  const deletarToken = (id) => onExcluirToken?.(id);

  return (
    <div className="painel-tokens-overlay">
      <section
        className="painel-tokens-modal"
        role="dialog"
        aria-labelledby="painel-tokens-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="painel-tokens-header">
          <div className="painel-tokens-titulo">
            <span className="painel-tokens-sobretitulo">MESA • PERSONAGENS</span>
            <h2 id="painel-tokens-titulo">Status dos tokens <span>{tokens.length}</span></h2>
            <p>Acompanhe e ajuste a vida. Clique em um token para selecioná-lo no mapa (Shift/Ctrl para vários).</p>
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
            const vidaNumero = Number(token.vida);
            const vida = Number.isFinite(vidaNumero) ? vidaNumero : 0;
            const vidaMaxima = Math.max(1, Number(token.vidamax) || Math.max(0, vida) || 1);
            const percentualVida = Math.max(0, Math.min(100, (vida / vidaMaxima) * 100));
            const acimaDoMaximo = vida > vidaMaxima;
            const estadoVida = vida < 0
              ? ' token-card--negativo'
              : vida === 0
                ? ' token-card--zerado'
                : percentualVida <= 25 ? ' token-card--critico' : '';
            const selecionado = selecionados.includes(token.id);
            const alternarSelecao = (e) => {
              e.preventDefault();
              onSelecionarToken?.(token.id, e.shiftKey || e.ctrlKey || e.metaKey);
            };

            return (
              <article
                key={token.id}
                className={`token-card${estadoVida}${selecionado ? ' token-card--selecionado' : ''}`}
              >
                <button
                  type="button"
                  className="token-card__alvo"
                  aria-pressed={selecionado}
                  title={`Selecionar ${token.nome || 'token'} no mapa`}
                  onClick={alternarSelecao}
                >
                  <span className="token-card__avatar" style={{ backgroundColor: token.cor || '#ff0044' }}>
                    {token.imagem
                      ? <img src={token.imagem} alt="" />
                      : <span>{(token.nome || '?').trim().charAt(0).toUpperCase()}</span>}
                  </span>
                  <span className="token-card__info">
                    <strong title={token.nome || 'Sem nome'}>{token.nome || 'Sem nome'}</strong>
                    <span className="token-card__vida">
                      <Heart size={13} aria-hidden="true" />
                      <span>{vida} <small>/ {vidaMaxima} PV</small></span>
                      {acimaDoMaximo && <em className="token-card__buff" title="Vida temporária (buff)">+{vida - vidaMaxima}</em>}
                    </span>
                    <span
                      className={`token-card__barra${acimaDoMaximo ? ' token-card__barra--buff' : ''}`}
                      role="progressbar"
                      aria-label={`Vida de ${token.nome || 'token'}`}
                      aria-valuenow={Math.max(0, Math.min(vidaMaxima, vida))}
                      aria-valuemin={0}
                      aria-valuemax={vidaMaxima}
                    >
                      <span style={{ width: `${percentualVida}%` }} />
                    </span>
                  </span>
                </button>
                <div className="token-card__acoes" aria-label={`Ações para ${token.nome || 'token'}`}>
                  <button type="button" className="token-card__vida-btn" title="Tirar 5 de vida" aria-label={`Tirar 5 de vida de ${token.nome || 'token'}`} onClick={() => alterarVida(token.id, -5)}>
                    −5
                  </button>
                  <button type="button" className="token-card__vida-btn" title="Tirar 1 de vida" aria-label={`Tirar 1 de vida de ${token.nome || 'token'}`} onClick={() => alterarVida(token.id, -1)}>
                    −1
                  </button>
                  <button type="button" className="token-card__vida-btn" title="Adicionar 1 de vida" aria-label={`Adicionar 1 de vida a ${token.nome || 'token'}`} onClick={() => alterarVida(token.id, 1)}>
                    +1
                  </button>
                  <button type="button" className="token-card__vida-btn" title="Adicionar 5 de vida" aria-label={`Adicionar 5 de vida a ${token.nome || 'token'}`} onClick={() => alterarVida(token.id, 5)}>
                    +5
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
