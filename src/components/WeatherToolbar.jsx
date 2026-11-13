import { CloudRain, Sun, Snowflake, Flame, X, Trash2 } from 'lucide-react';

const opcoes = [
  { id: 'chuva', nome: 'Chuva', Icone: CloudRain },
  { id: 'sol', nome: 'Sol', Icone: Sun },
  { id: 'inverno', nome: 'Inverno', Icone: Snowflake },
  { id: 'lava', nome: 'Fogo', Icone: Flame },
];
const niveis = ['Leve', 'Moderado', 'Intenso'];

export default function WeatherToolbar({ clima, intensidade, onClimaChange, onIntensidadeChange, areas, onRemover, onFechar, erro, salvando }) {
  return <section className="clima-barra" aria-label="Clima no mapa">
    <div className="clima-barra__controles">
      <div className="clima-barra__grupo" role="group" aria-label="Tipo de clima">
        {opcoes.map(({ id, nome, Icone }) => <button key={id} type="button" aria-pressed={clima === id} onClick={() => onClimaChange(id)}>
          <Icone size={18} /><span>{nome}</span>
        </button>)}
      </div>
      <div className="clima-barra__grupo" role="group" aria-label="Intensidade do clima">
        {niveis.map((nome, i) => <button key={nome} type="button" aria-pressed={intensidade === i + 1} onClick={() => onIntensidadeChange(i + 1)}>{nome}</button>)}
      </div>
      <button type="button" className="clima-barra__fechar" aria-label="Fechar ferramenta de clima" onClick={onFechar}><X size={18} /></button>
    </div>
    <p className="clima-barra__dica">{salvando ? 'Salvando área de clima…' : `Arraste no mapa para criar uma área de clima. Esc cancela a seleção.${clima === 'chuva' && intensidade === 3 ? ' Chuva intensa inclui relâmpagos.' : ''}`}</p>
    {areas.length > 0 && <div className="clima-barra__areas" role="group" aria-label="Áreas de clima ativas">
      {areas.map((area, i) => <button key={area.id} type="button" disabled={salvando} onClick={() => onRemover(area.id)} title={`Remover área ${i + 1}`}>
        <span>{i + 1}. {opcoes.find((opcao) => opcao.id === area.clima)?.nome} · {niveis[area.intensidade - 1]}</span><Trash2 size={14} />
      </button>)}
    </div>}
    {erro && <p className="clima-barra__erro" role="alert">{erro}</p>}
  </section>;
}
