export type LocalConversation = {
  id: string;
  name: string;
  lastMessage?: string;
  avatar?: string | null;
};

let items: LocalConversation[] = [];
const listeners: ((items: LocalConversation[]) => void)[] = [];

export function getLocalConversations() {
  return items.slice();
}

export function addLocalConversation(conv: LocalConversation) {
  // keep newest first, avoid duplicates
  items = [conv, ...items.filter((c) => c.id !== conv.id)];
  listeners.forEach((l) => l(items.slice()));
}

export function clearLocalConversations() {
  items = [];
  listeners.forEach((l) => l(items.slice()));
}

export function removeLocalConversation(id: string) {
  items = items.filter((c) => c.id !== id);
  listeners.forEach((l) => l(items.slice()));
}

export function subscribeLocalConversations(cb: (items: LocalConversation[]) => void) {
  listeners.push(cb);
  // call immediately
  cb(items.slice());
  return () => {
    const idx = listeners.indexOf(cb);
    if (idx !== -1) listeners.splice(idx, 1);
  };
}
