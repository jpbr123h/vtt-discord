import { ImagePlus, Plus, UserRoundPlus, X } from 'lucide-react';

export default function TokenModal({
  quantidade,
  cor,
  imagem,
  onQuantidadeChange,
  onCorChange,
  onImagemChange,
  onLimparImagem,
  onCriar,
  onFechar,
}) {
  return (
    <div className="token-modal-backdrop">
      <section className="token-modal" role="dialog" aria-modal="true" aria-labelledby="token-modal-titulo">
        <header className="token-modal__cabecalho">
          <div className="token-modal__icone-titulo"><UserRoundPlus size={21} /></div>
          <div>
            <p className="token-modal__sobretitulo">PERSONAGEM</p>
            <h2 id="token-modal-titulo">Adicionar token</h2>
          </div>
          <button className="token-modal__fechar" type="button" onClick={onFechar} aria-label="Fechar janela">
            <X size={18} />
          </button>
        </header>

        <div className="token-modal__conteudo">
          <div className="token-modal__campo">
            <label htmlFor="token-quantidade">Quantidade</label>
            <input
              id="token-quantidade"
              type="number"
              min="1"
              value={quantidade}
              onChange={(e) => onQuantidadeChange(Number(e.target.value))}
            />
            <small>Crie vários tokens com a mesma aparência.</small>
          </div>

          <div className="token-modal__campo">
            <label htmlFor="token-cor">Cor de fundo</label>
            <div className="token-modal__cor-controle">
              <input id="token-cor" type="color" value={cor} onChange={(e) => onCorChange(e.target.value)} />
              <span>{cor.toUpperCase()}</span>
            </div>
          </div>

          <div className="token-modal__campo">
            <span className="token-modal__rotulo">Imagem do token <small>OPCIONAL</small></span>
            <label className={imagem ? 'token-modal__imagem token-modal__imagem--selecionada' : 'token-modal__imagem'} htmlFor="token-imagem">
              {imagem ? (
                <img className="token-modal__imagem-preview" src={imagem} alt="Prévia circular do token" />
              ) : (
                <span className="token-modal__imagem-icone"><ImagePlus size={21} /></span>
              )}
              <span className="token-modal__imagem-texto">
                <strong>{imagem ? 'Imagem selecionada' : 'Escolher uma imagem'}</strong>
                <small>{imagem ? 'Clique para trocar o arquivo' : 'PNG, JPG ou GIF animado do computador'}</small>
              </span>
              {imagem && (
                <button className="token-modal__remover-imagem" type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onLimparImagem(); }} aria-label="Remover imagem">
                  <X size={16} />
                </button>
              )}
            </label>
            <input id="token-imagem" type="file" accept="image/*" onChange={onImagemChange} />
          </div>
        </div>

        <footer className="token-modal__acoes">
          <button className="token-modal__cancelar" type="button" onClick={onFechar}>Cancelar</button>
          <button className="token-modal__criar" type="button" onClick={onCriar}>
            <Plus size={17} /> Criar token{quantidade > 1 ? `s (${quantidade})` : ''}
          </button>
        </footer>
      </section>
    </div>
  );
}
