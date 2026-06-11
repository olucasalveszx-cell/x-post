// Armazena imagens temporárias em memória para acesso via URL pública
export const store = new Map<string, { b64: string; mime: string; exp: number }>();

export function cleanup() {
  const now = Date.now();
  store.forEach((v, k) => { if (v.exp < now) store.delete(k); });
}
