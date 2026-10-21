import React from 'react';

export default function PainelManager({ isOpen, onClose, tokens, setTokens }) {
  if (!isOpen) return null;

  const alterarVida = (id, delta) => {
    setTokens((atuais) =>
      atuais.map((t) => (t.id === id ? { ...t, vida: t.vida + delta } : t))
    );
  };

  const deletarToken = (id) => {
    setTokens((atuais) => atuais.filter((t) => t.id !== id));
  };

  return (
    <div 
      className="painel-tokens-overlay" 
      onClick={onClose} // Fecha ao clicar no fundo escuro
      onMouseDown={(e) => e.stopPropagation()} // Impede interação com o Konva ao fundo
    >
      <div 
        className="painel-tokens-modal" 
        onClick={(e) => e.stopPropagation()} // Impede de fechar ao clicar DENTRO do modal
      >
        <div className="painel-tokens-header">
          <h2>Status dos Tokens ({tokens.length})</h2>
          <button type="button" className="btn-fechar" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="painel-tokens-lista">
          {tokens.length === 0 ? (
            <p className="tokens-vazio">Nenhum token presente no mapa.</p>
          ) : (
            tokens.map((token) => (
              <div key={token.id} className="token-card">
                <div
                  className="token-card__indicador"
                  style={{ backgroundColor: token.cor || '#ff0044' }}
                />

                <div className="token-card__info">
                  <strong>{token.nome || 'Sem Nome'}</strong>
                  <span className="token-card__vida">
                    Vida: <strong>{token.vida}</strong>
                  </span>
                </div>

                <div className="token-card__acoes">
                  <button type="button" title="Dar +1 de vida" onClick={() => alterarVida(token.id, 1)}>
                    +1
                  </button>

                  <button type="button" title="Tirar 1 de vida" onClick={() => alterarVida(token.id, -1)}>
                    -1
                  </button>

                  <button
                    type="button"
                    className="btn-deletar"
                    title="Excluir token"
                    onClick={() => deletarToken(token.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}