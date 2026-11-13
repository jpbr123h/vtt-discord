import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../auth/firebase.js';
import { areaClimaValida } from '../utils/clima.js';

export default function useClima(sessaoId, habilitado = true) {
  const [areas, setAreas] = useState([]);
  const [erro, setErro] = useState('');
  useEffect(() => {
    if (!db || !sessaoId || !habilitado) return;
    return onSnapshot(doc(db, 'sessoes', sessaoId, 'estado', 'clima'), (snap) => {
      const lista = snap.data()?.areas;
      setAreas(Array.isArray(lista) ? lista.filter(areaClimaValida) : []);
      setErro('');
    }, () => setErro('Não foi possível carregar o clima da campanha.'));
  }, [sessaoId, habilitado]);
  return { areas: habilitado ? areas : [], setAreas, erro, setErro };
}
