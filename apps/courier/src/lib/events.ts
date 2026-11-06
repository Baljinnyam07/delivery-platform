// Tiny pub/sub so any screen can ask the others to refetch after a change
// (claim, status update, payment, realtime event). No state library needed.
type Listener = () => void;
const listeners = new Set<Listener>();

export function onDeliveriesChanged(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function emitDeliveriesChanged() {
  listeners.forEach((l) => l());
}
