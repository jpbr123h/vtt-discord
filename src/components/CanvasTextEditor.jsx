import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export default function CanvasTextEditor({ stageRef, editor, onChange, onCommit, onCancel }) {
  const inputRef = useRef(null);
  const finalizado = useRef(false);
  const ajustarTamanho = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${Math.max(editor.boxHeight || 44, input.scrollHeight)}px`;
    const linhas = input.value.split('\n');
    const maiorLinha = Math.max(0, ...linhas.map((linha) => linha.length));
    input.style.width = `${editor.boxWidth || Math.min(420, Math.max(200, maiorLinha * (editor.fontSize || 20) * 0.62 + 32))}px`;
  }, [editor.boxHeight, editor.boxWidth, editor.fontSize]);

  useLayoutEffect(() => { ajustarTamanho(); }, [ajustarTamanho]);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return undefined;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    let frame;
    const posicionar = () => {
      const stage = stageRef.current;
      if (stage) {
        const rect = stage.container().getBoundingClientRect();
        const escala = stage.scaleX();
        input.style.left = `${rect.left + stage.x() + editor.x * escala}px`;
        input.style.top = `${rect.top + stage.y() + editor.y * escala}px`;
        input.style.transform = `scale(${escala})`;
        input.style.transformOrigin = 'top left';
      }
      frame = requestAnimationFrame(posicionar);
    };
    posicionar();
    return () => cancelAnimationFrame(frame);
  }, [editor.x, editor.y, stageRef]);

  if (!editor) return null;
  return (
    <textarea
      ref={inputRef}
      className="canvas-texto-editor"
      value={editor.texto}
      placeholder="Digite aqui..."
      aria-label="Editar texto no mapa"
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => { if (!finalizado.current) { finalizado.current = true; onCommit(); } }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') { e.preventDefault(); finalizado.current = true; onCancel(); }
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); finalizado.current = true; onCommit(); }
      }}
      style={{ color: editor.cor, fontSize: `${editor.fontSize || 20}px`, fontFamily: editor.fontFamily || 'Arial, sans-serif' }}
    />
  );
}
