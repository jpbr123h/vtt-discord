import { Map, Plus, Ruler, Trash2, Pencil, Type, MousePointer2, Eraser, X ,Settings,} from 'lucide-react';

export default function MesaToolbar({
  medindo, quantidadeSelecionada, onNovoToken, onCarregarMapa, onAlternarMedicao, onExcluirSelecionados,
  ferramenta = 'selecionar', onFerramentaChange, corAnotacao = '#ffcc00', onCorAnotacaoChange,
  espessuraTraco = 4, onEspessuraTracoChange, textoAnotacao = '', onTextoAnotacaoChange,
  quantidadeAnotacoes = 0, onLimparAnotacoes, anotacaoSelecionada, onAnotacaoChange, onExcluirAnotacao, onDeselecionarAnotacao,
  fonteAnotacao = 'Arial, sans-serif', onFonteAnotacaoChange,
  tamanhoFonte = 20, onTamanhoFonteChange, espacoTexto = { boxWidth: 220, boxHeight: 72 }, onEspacoTextoChange,
  quantidadeAnotacoesSelecionadas = 0, mostrarOpcoesAnotacao = false, onJanelaManager,
}) {
  const painelAberto = ferramenta === 'desenhar' || ferramenta === 'texto' ||
    (Boolean(anotacaoSelecionada) && mostrarOpcoesAnotacao && quantidadeAnotacoesSelecionadas === 1 && quantidadeSelecionada === 0);
  const alterarAnotacao = (alteracoes) => {
    if (anotacaoSelecionada) onAnotacaoChange?.(anotacaoSelecionada.id, alteracoes);
  };
  const espessuraAtual = anotacaoSelecionada?.espessura ?? espessuraTraco;
  const opcoesEspessura = [
    { nome: 'Fina', valor: 2 },
    { nome: 'Média', valor: 5 },
    { nome: 'Grossa', valor: 10 },
  ];

  return (
    <div className="mesa-toolbox">
      <div className="mesa-toolbar" aria-label="Ferramentas da mesa">
        <button className="mesa-toolbar__icone" onClick={onNovoToken} title="Novo token" aria-label="Novo token"><Plus size={19} /></button>
        <button className="mesa-toolbar__icone" onClick={() => onFerramentaChange?.('selecionar')} title="Selecionar" aria-label="Selecionar" aria-pressed={ferramenta === 'selecionar'}>
          <MousePointer2 size={18} />
        </button>
        <button className="mesa-toolbar__icone" onClick={() => onFerramentaChange?.('desenhar')} title="Desenhar" aria-label="Desenhar" aria-pressed={ferramenta === 'desenhar'}>
          <Pencil size={18} />
        </button>
        <button className="mesa-toolbar__icone" onClick={() => onFerramentaChange?.('texto')} title="Adicionar texto" aria-label="Adicionar texto" aria-pressed={ferramenta === 'texto'}>
          <Type size={18} />
        </button>
        <label className="mesa-toolbar__icone mesa-toolbar__arquivo" title="Carregar mapa" aria-label="Carregar mapa">
          <Map size={18} /><input type="file" accept="image/*" onChange={onCarregarMapa} />
        </label>
        <button className={`mesa-toolbar__icone ${medindo ? 'mesa-toolbar__icone--ativa' : ''}`} onClick={onAlternarMedicao} title="Medir distância" aria-label="Medir distância" aria-pressed={medindo}>
          <Ruler size={18} />
        </button>
        <button className="mesa-toolbat__icone mesa-toolbar__manger" title="manger" onClick={onJanelaManager}>
          <Settings size={18} />
        </button>
        {quantidadeSelecionada > 0 && (
          <button className="mesa-toolbar__icone mesa-toolbar__icone--perigo" onClick={onExcluirSelecionados} title={`Excluir ${quantidadeSelecionada} token(s)`} aria-label="Excluir tokens selecionados"><Trash2 size={18} /></button>
        )}
      </div>

      {painelAberto && (
        <section className="anotacao-painel" aria-label="Opções da anotação">
          <header className="anotacao-painel__cabecalho">
            <div>
              <strong>{anotacaoSelecionada ? (anotacaoSelecionada.tipo === 'texto' ? 'Editar texto' : 'Editar desenho') : ferramenta === 'texto' ? 'Adicionar texto' : 'Desenhar'}</strong>
              <span>{anotacaoSelecionada ? 'Personalize o item selecionado' : ferramenta === 'texto' ? 'Digite e clique no mapa' : 'Escolha a cor e o traço'}</span>
            </div>
            {anotacaoSelecionada && <button className="anotacao-painel__fechar" onClick={onDeselecionarAnotacao} title="Fechar opções"><X size={16} /></button>}
          </header>

          {((anotacaoSelecionada?.tipo === 'texto') || (!anotacaoSelecionada && ferramenta === 'texto')) && (
            <p className="anotacao-painel__dica">{anotacaoSelecionada ? 'Clique no texto no mapa para editar. Enter cria linhas; Ctrl + Enter salva.' : 'Clique no mapa para escrever. Enter cria linhas; Ctrl + Enter salva.'}</p>
          )}
          {((anotacaoSelecionada?.tipo === 'texto') || (!anotacaoSelecionada && ferramenta === 'texto')) && (
            <label className="anotacao-painel__campo">
              <span>Fonte</span>
              <select value={anotacaoSelecionada?.fontFamily || fonteAnotacao}
                onChange={(e) => {
                  const fonte = e.target.value;
                  if (anotacaoSelecionada) alterarAnotacao({ fontFamily: fonte });
                  onFonteAnotacaoChange?.(fonte);
                }}>
                <option value="Arial, sans-serif">Sem serifa</option>
                <option value="Georgia, serif">Serifada</option>
                <option value="Courier New, monospace">Monoespaçada</option>
              </select>
            </label>
          )}
          {((anotacaoSelecionada?.tipo === 'texto') || (!anotacaoSelecionada && ferramenta === 'texto')) && (
            <>
              <div className="anotacao-painel__campo">
                <span>Tamanho do texto</span>
                <div className="anotacao-painel__tamanhos" role="group" aria-label="Tamanho do texto">
                  {[16, 20, 28].map((tamanho, indice) => {
                    const selecionado = (anotacaoSelecionada?.fontSize || tamanhoFonte) === tamanho;
                    return <button key={tamanho} type="button" className={selecionado ? 'anotacao-painel__tamanho anotacao-painel__tamanho--ativo' : 'anotacao-painel__tamanho'}
                      aria-pressed={selecionado}
                      onClick={() => {
                        if (anotacaoSelecionada) alterarAnotacao({ fontSize: tamanho });
                        onTamanhoFonteChange?.(tamanho);
                      }}>{['Pequeno', 'Médio', 'Grande'][indice]}</button>;
                  })}
                </div>
              </div>
              <div className="anotacao-painel__campo">
                <span>Área do texto</span>
                <div className="anotacao-painel__espaco">
                  {['boxWidth', 'boxHeight'].map((dimensao) => (
                    <div key={dimensao}>
                      <span>{dimensao === 'boxWidth' ? 'Largura' : 'Altura'}</span>
                      <button type="button" aria-label={`Diminuir ${dimensao === 'boxWidth' ? 'largura' : 'altura'}`}
                        onClick={() => {
                          const dimensoes = { [dimensao]: Math.max(80, (anotacaoSelecionada?.[dimensao] || espacoTexto[dimensao]) - 20) };
                          if (anotacaoSelecionada) alterarAnotacao(dimensoes);
                          else onEspacoTextoChange?.(dimensoes);
                        }}>−</button>
                      <b>{anotacaoSelecionada?.[dimensao] || espacoTexto[dimensao]} px</b>
                      <button type="button" aria-label={`Aumentar ${dimensao === 'boxWidth' ? 'largura' : 'altura'}`}
                        onClick={() => {
                          const dimensoes = { [dimensao]: Math.min(600, (anotacaoSelecionada?.[dimensao] || espacoTexto[dimensao]) + 20) };
                          if (anotacaoSelecionada) alterarAnotacao(dimensoes);
                          else onEspacoTextoChange?.(dimensoes);
                        }}>+</button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <label className="anotacao-painel__campo anotacao-painel__cor">
            <span>Cor</span>
            <input type="color" value={anotacaoSelecionada?.cor ?? corAnotacao}
              onChange={(e) => anotacaoSelecionada ? alterarAnotacao({ cor: e.target.value }) : onCorAnotacaoChange?.(e.target.value)} />
          </label>

          {((anotacaoSelecionada?.tipo === 'traco') || (!anotacaoSelecionada && ferramenta === 'desenhar')) && (
            <div className="anotacao-painel__campo">
              <span>Espessura</span>
              <div className="anotacao-painel__espessuras" role="group" aria-label="Espessura do traço">
                {opcoesEspessura.map((opcao) => (
                  <button key={opcao.valor} type="button"
                    className={espessuraAtual === opcao.valor ? 'anotacao-painel__espessura anotacao-painel__espessura--ativa' : 'anotacao-painel__espessura'}
                    aria-pressed={espessuraAtual === opcao.valor}
                    onClick={() => anotacaoSelecionada ? alterarAnotacao({ espessura: opcao.valor }) : onEspessuraTracoChange?.(opcao.valor)}>
                    <i style={{ height: `${Math.max(2, opcao.valor)}px` }} />{opcao.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {anotacaoSelecionada ? (
            <button className="anotacao-painel__apagar" onClick={onExcluirAnotacao}><Trash2 size={16} /> Apagar item</button>
          ) : quantidadeAnotacoes > 0 && (
            <button className="anotacao-painel__limpar" onClick={onLimparAnotacoes}><Eraser size={16} /> Limpar todas as anotações</button>
          )}
        </section>
      )}
    </div>
  );
}
