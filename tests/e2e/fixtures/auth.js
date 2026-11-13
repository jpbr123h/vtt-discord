const role = new URLSearchParams(location.search).get('as') || (location.pathname.includes('/jogador/') ? 'player' : 'master');
const user = role === 'anonymous' ? null : { uid: role, displayName: role === 'master' ? 'Mestre de teste' : 'Jogador de teste', email: `${role}@example.invalid` };
export function useAuth() { return { user, configured: true, loading: false }; }
export function AuthProvider({ children }) { return children; }
