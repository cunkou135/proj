export function uuid() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).substr(2, 12) + Date.now().toString(36);
}
