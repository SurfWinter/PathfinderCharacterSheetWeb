// Минимальные DOM-помощники, не зависящие от состояния персонажа.

export function byId(id){
  return document.getElementById(id);
}

export function showToast(message, tone){
  const toast = byId('toast');
  if(!toast) return;
  toast.textContent = message;
  toast.className = 'toast show' + (tone ? ' toast-' + tone : '');
  clearTimeout(showToast.timeoutId);
  showToast.timeoutId = setTimeout(() => {
    toast.classList.remove('show');
  }, 1400);
}
