import { Map, Plus, Ruler, Trash2 } from 'lucide-react';

export default function MesaToolbar({
  medindo,
  quantidadeSelecionada,
  onNovoToken,
  onCarregarMapa,
  onAlternarMedicao,
  onExcluirSelecionados,
}) {
  return (
    <div className="mesa-toolbar">
      <button onClick={onNovoToken}><Plus size={18} /> Novo Token</button>
      <label className="mesa-toolbar__mapa">
        <Map size={18} /> Carregar Mapa
        <input type="file" accept="image/*" onChange={onCarregarMapa} />
      </label>
      <button
        className={medindo ? 'mesa-toolbar__medicao mesa-toolbar__medicao--ativa' : 'mesa-toolbar__medicao'}
        onClick={onAlternarMedicao}
      >
        <Ruler size={18} /> {medindo ? 'Medindo...' : 'Medir'}
      </button>
      {quantidadeSelecionada > 0 && (
        <button className="mesa-toolbar__excluir" onClick={onExcluirSelecionados}>
          <Trash2 size={18} /> Excluir Selecionados ({quantidadeSelecionada})
        </button>
      )}
    </div>
  );
}
