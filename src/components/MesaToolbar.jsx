import { Map, Plus, Ruler, Trash2, Pencil, Type, MousePointer2, Eraser, X, Settings, Minus, Circle, Square, RectangleHorizontal, Triangle, Star, UserRound, CloudFog, Eye } from 'lucide-react';

export default function MesaToolbar({
  medindo, quantidadeSelecionada, onNovoToken, onCarregarMapa, onAlternarMedicao, onExcluirSelecionados,
  ferramenta = 'selecionar', onFerramentaChange, corAnotacao = '#ffcc00', onCorAnotacaoChange,
  formaDesenho = 'livre', onFormaDesenhoChange,
  espessuraTraco = 4, onEspessuraTracoChange,
  quantidadeAnotacoes = 0, onLimparAnotacoes, anotacaoSelecionada, onAnotacaoChange, onExcluirAnotacao, onDeselecionarAnotacao,
  fonteAnotacao = 'Arial, sans-serif', onFonteAnotacaoChange,
  tamanhoFonte = 20, onTamanhoFonteChange, espacoTexto = { boxWidth: 220, boxHeight: 72 }, onEspacoTextoChange,
  quantidadeAnotacoesSelecionadas = 0, mostrarOpcoesAnotacao = false, onJanelaManager, managerAberto = false, onPerfil,
  nevoaAtiva = false, nevoaClareada = 0, modoNevoa = 'clarear', onModoNevoaChange, onCobrirNevoa, onRevelarNevoa, onDefinirNevoaAtiva,
}) {
  const painelAberto = ferramenta === 'desenhar' || ferramenta === 'texto' || ferramenta === 'nevoa' ||
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
  const opcoesForma = [
    { id: 'livre', nome: 'Livre', Icone: Pencil },
    { id: 'linha', nome: 'Linha', Icone: Minus },
    { id: 'circulo', nome: 'Círculo', Icone: Circle },
    { id: 'quadrado', nome: 'Quadrado', Icone: Square },
    { id: 'retangulo', nome: 'Retângulo', Icone: RectangleHorizontal },
    { id: 'triangulo', nome: 'Triângulo', Icone: Triangle },
    { id: 'estrela', nome: 'Estrela', Icone: Star },
    { id: 'borracha', nome: 'Borracha', Icone: Eraser },
  ];
  const opcoesNevoa = [
    { id: 'clarear', nome: 'Clarear', Icone: Eye },
    { id: 'cobrir', nome: 'Cobrir', Icone: CloudFog },
  ];

  return (
    <div className="mesa-toolbox">
      <div className="mesa-toolbar" aria-label="Ferramentas da mesa">
        <button className="mesa-toolbar__icone" onClick={onNovoToken} title="Novo token" aria-label="Novo token"><Plus size={19} /></button>
        <button className="mesa-toolbar__icone" onClick={() => onFerramentaChange?.('selecionar')} title="Selecionar" aria-label="Selecionar" aria-pressed={ferramenta === 'selecionar'}>
          <MousePointer2 size={18} />
        </button>
        <button className="mesa-toolbar__icone" onClick={() => onFerramentaChange?.('desenhar')} title="Draw" aria-label="Draw" aria-pressed={ferramenta === 'desenhar'}>
          <Pencil size={18} />
        </button>
        <button className="mesa-toolbar__icone" onClick={() => onFerramentaChange?.('texto')} title="Adicionar texto" aria-label="Adicionar texto" aria-pressed={ferramenta === 'texto'}>
          <Type size={18} />
        </button>
        <button className={`mesa-toolbar__icone ${ferramenta === 'nevoa' ? 'mesa-toolbar__icone--ativa' : ''}`} onClick={() => onFerramentaChange?.('nevoa')} title="Névoa (fog)" aria-label="Névoa" aria-pressed={ferramenta === 'nevoa'}>
          <CloudFog size={18} />
        </button>
        <label className="mesa-toolbar__icone mesa-toolbar__arquivo" title="Carregar mapa" aria-label="Carregar mapa">
          <Map size={18} /><input type="file" accept="image/*" onChange={onCarregarMapa} />
        </label>
        <button className={`mesa-toolbar__icone ${medindo ? 'mesa-toolbar__icone--ativa' : ''}`} onClick={onAlternarMedicao} title="Medir distância" aria-label="Medir distância" aria-pressed={medindo}>
          <Ruler size={18} />
        </button>
        <button className="mesa-toolbar__icone mesa-toolbar__manager" title="Status dos tokens" aria-label="Abrir status dos tokens" aria-haspopup="dialog" aria-expanded={managerAberto} onClick={onJanelaManager}>
          <Settings size={18} />
        </button>
        <button className="mesa-toolbar__icone mesa-toolbar__perfil" title="Meu perfil" aria-label="Ver meu perfil" onClick={onPerfil}>
          <UserRound size={18} />
        </button>
        {quantidadeSelecionada > 0 && (
          <button className="mesa-toolbar__icone mesa-toolbar__icone--perigo" onClick={onExcluirSelecionados} title={`Excluir ${quantidadeSelecionada} token(s)`} aria-label="Excluir tokens selecionados"><Trash2 size={18} /></button>
        )}
      </div>

      {ferramenta === 'desenhar' && (
        <div className="mesa-draw-tabs" role="toolbar" aria-label="Formato do desenho">
          {opcoesForma.map(({ id, nome, Icone }) => (
            <button key={id} type="button" className={formaDesenho === id ? 'mesa-draw-tabs__opcao mesa-draw-tabs__opcao--ativa' : 'mesa-draw-tabs__opcao'}
              title={nome} aria-label={nome} aria-pressed={formaDesenho === id} onClick={() => onFormaDesenhoChange?.(id)}>
              <Icone size={17} /><span>{nome}</span>
            </button>
          ))}
        </div>
      )}

      {painelAberto && (
        <section className="anotacao-painel" aria-label="Opções da ferramenta">
          <header className="anotacao-painel__cabecalho">
            <div>
              <strong>{anotacaoSelecionada ? (anotacaoSelecionada.tipo === 'texto' ? 'Editar texto' : 'Editar desenho') : ferramenta === 'texto' ? 'Adicionar texto' : ferramenta === 'nevoa' ? 'Névoa' : 'Draw'}</strong>
              <span>{anotacaoSelecionada ? 'Personalize o item selecionado' : ferramenta === 'texto' ? 'Digite e clique no mapa' : ferramenta === 'nevoa' ? 'Clique ou arraste para clarear o mapa' : formaDesenho === 'borracha' ? 'Clique ou arraste sobre desenhos e textos para apagar' : 'Escolha o formato e arraste no mapa'}</span>
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

          {ferramenta !== 'nevoa' && !(ferramenta === 'desenhar' && formaDesenho === 'borracha' && !anotacaoSelecionada) && (
            <label className="anotacao-painel__campo anotacao-painel__cor">
              <span>Cor</span>
              <input type="color" value={anotacaoSelecionada?.cor ?? corAnotacao}
                onChange={(e) => anotacaoSelecionada ? alterarAnotacao({ cor: e.target.value }) : onCorAnotacaoChange?.(e.target.value)} />
            </label>
          )}

          {((['traco', 'forma'].includes(anotacaoSelecionada?.tipo)) || (!anotacaoSelecionada && ferramenta === 'desenhar' && formaDesenho !== 'borracha')) && (
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

          {ferramenta === 'nevoa' && !anotacaoSelecionada && (
            <>
              <div className="anotacao-painel__campo">
                <span>Pincel</span>
                <div className="anotacao-painel__nevoa-modos" role="group" aria-label="Modo do pincel de névoa">
                  {opcoesNevoa.map(({ id, nome, Icone }) => (
                    <button key={id} type="button"
                      className={modoNevoa === id ? 'anotacao-painel__tamanho anotacao-painel__tamanho--ativo' : 'anotacao-painel__tamanho'}
                      aria-pressed={modoNevoa === id}
                      onClick={() => onModoNevoaChange?.(id)}>
                      <Icone size={14} /> {nome}
                    </button>
                  ))}
                </div>
              </div>
              <p className="anotacao-painel__dica">
                {nevoaAtiva
                  ? modoNevoa === 'cobrir'
                    ? 'Clique ou arraste para colocar névoa de volta (revelada → 50% → coberta).'
                    : 'Clique ou arraste para clarear as células do grid (coberta → 50% → revelada).'
                  : nevoaClareada > 0
                    ? 'A névoa está desativada, mas o desenho foi mantido.'
                    : 'A névoa ainda não está ativa. Use "Cobrir mapa inteiro" para começar.'}
              </p>
              <button type="button" className="anotacao-painel__limpar" onClick={onCobrirNevoa}>
                <CloudFog size={16} /> Cobrir mapa inteiro
              </button>
              <button type="button" className="anotacao-painel__limpar" onClick={onRevelarNevoa}>
                <Eye size={16} /> Revelar mapa inteiro
              </button>
              {!nevoaAtiva && nevoaClareada > 0 && (
                <button type="button" className="anotacao-painel__limpar" onClick={() => onDefinirNevoaAtiva?.(true)}>
                  <CloudFog size={16} /> Reativar névoa salva
                </button>
              )}
              {nevoaAtiva && (
                <button type="button" className="anotacao-painel__apagar" onClick={() => onDefinirNevoaAtiva?.(false)}>
                  Desativar névoa (mantém o desenho)
                </button>
              )}
            </>
          )}

          {anotacaoSelecionada ? (
            <button className="anotacao-painel__apagar" onClick={onExcluirAnotacao}><Trash2 size={16} /> Apagar item</button>
          ) : quantidadeAnotacoes > 0 && (
            <button className="anotacao-painel__limpar" onClick={onLimparAnotacoes}><Eraser size={16} /> Limpar desenhos e textos</button>
          )}
        </section>
      )}
    </div>
  );
}
