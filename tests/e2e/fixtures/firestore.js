// Simulação exclusiva do servidor E2E. Não usa SDK, credenciais ou banco real.
const KEY = 'vtt:e2e';
const initial = {
  sessao: { nome: 'Campanha de teste', mestreId: 'master', criadoEm: 1 },
  member: { sessaoId: 'demo', usuarioId: 'player', nome: 'Jogador de teste', papel: 'jogador', podeVerMapa: true, podeMover: false, podeAnotar: false, podeAdicionar: false },
  tokens: [{ id: 'token-1', x: 300, y: 300, nome: 'Personagem', cor: '#7c3aed', vida: 10, vidamax: 10 }],
  anotacoes: [], estado: { fog: { ativo: false, celulas: {} }, clima: { areas: [] } },
};
const read = () => JSON.parse(localStorage.getItem(KEY) || JSON.stringify(initial));
const callbacks = new Set();
const channel = new BroadcastChannel(KEY);
let failNext = false;
let delay = 0;
const notify = () => callbacks.forEach((emit) => emit());
channel.onmessage = notify;
function write(data) { localStorage.setItem(KEY, JSON.stringify(data)); notify(); channel.postMessage('changed'); }
window.__fixture = {
  read,
  patch(changes) { write({ ...read(), ...changes }); },
  failNextWrite() { failNext = true; },
  setDelay(ms) { delay = ms; },
};
export const collection = (_db, ...parts) => ({ path: parts.join('/'), kind: 'collection' });
export const doc = (parent, ...parts) => ({ path: [parent?.path, ...parts].filter(Boolean).join('/'), kind: 'doc' });
export const where = (...args) => args;
export const query = (ref, ...filters) => ({ ...ref, filters });
export const serverTimestamp = () => 1;
const entry = (id, data, path) => ({ id, ref: doc(null, path, id), exists: () => data !== undefined, data: () => data });
function snapshot(ref) {
  const d = read();
  const path = ref.path;
  if (ref.kind === 'collection') {
    let rows = path === 'sessoesMembros' ? [{ id: 'demo_player', ...d.member }] : path === 'sessoes' ? [{ id: 'demo', ...d.sessao }]
      : path.endsWith('/tokens') ? d.tokens : path.endsWith('/anotacoes') ? d.anotacoes
      : path.endsWith('/estado') ? Object.entries(d.estado).map(([id, value]) => ({ id, ...value })) : [];
    for (const [field, operation, value] of ref.filters || []) {
      if (operation === '==') rows = rows.filter((row) => row[field] === value);
    }
    const docs = rows.map(({ id, ...row }) => entry(id, row, path));
    return { docs, empty: !docs.length, forEach: (fn) => docs.forEach(fn) };
  }
  const parts = path.split('/');
  const value = path === 'sessoes/demo' ? d.sessao : path === 'sessoesMembros/demo_player' ? d.member
    : parts[2] === 'estado' ? d.estado[parts[3]] : undefined;
  return entry(parts.at(-1), value, parts.slice(0, -1).join('/'));
}
export function onSnapshot(ref, fn) {
  let active = true;
  const emit = () => { if (active) fn(snapshot(ref)); };
  callbacks.add(emit); queueMicrotask(emit);
  return () => { active = false; callbacks.delete(emit); };
}
export const getDoc = async (ref) => snapshot(ref);
export const getDocs = async (ref) => snapshot(ref);
async function beforeWrite() {
  if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
  if (failNext) { failNext = false; throw new Error('E2E: falha de gravação simulada'); }
}
function apply(data, ref, item, operation, merge) {
  const p = ref.path.split('/');
  if (p[0] === 'sessoesMembros') {
    data.member = operation === 'delete' ? undefined : { ...data.member, ...item };
  } else if (p[2] === 'estado') {
    if (operation === 'delete') delete data.estado[p[3]];
    else data.estado[p[3]] = merge ? { ...data.estado[p[3]], ...item } : item;
  } else if (p[2] === 'tokens' || p[2] === 'anotacoes') {
    const list = data[p[2]], id = p[3];
    const previous = list.find((row) => row.id === id);
    if (operation === 'update' && !previous) throw new Error('E2E: item não encontrado');
    data[p[2]] = list.filter((row) => row.id !== id);
    if (operation !== 'delete') data[p[2]].push({ ...(merge ? previous : {}), ...item, id });
  }
}
export async function setDoc(ref, item, options) { await beforeWrite(); const d = read(); apply(d, ref, item, 'set', options?.merge); write(d); }
export async function updateDoc(ref, item) { await beforeWrite(); const d = read(); apply(d, ref, item, 'update', true); write(d); }
export async function deleteDoc(ref) { await beforeWrite(); const d = read(); apply(d, ref, null, 'delete'); write(d); }
export const addDoc = async (ref, item) => { const id = crypto.randomUUID(); await setDoc(doc(null, ref.path, id), item); return { id }; };
export const writeBatch = () => {
  const ops = [];
  return {
    update(ref, item) { ops.push([ref, item, 'update', true]); },
    set(ref, item, options) { ops.push([ref, item, 'set', options?.merge]); },
    delete(ref) { ops.push([ref, null, 'delete']); },
    async commit() { await beforeWrite(); const d = read(); ops.forEach((args) => apply(d, ...args)); write(d); },
  };
};
