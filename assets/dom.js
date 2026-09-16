// Минимальные DOM-помощники, не зависящие от состояния персонажа.

export function byId(id){
  return document.getElementById(id);
}

export function showToast(message){
  const toast = byId('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => toast.classList.remove('show'), 1800);
}
