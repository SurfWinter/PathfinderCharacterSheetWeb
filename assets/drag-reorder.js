// Сенсорное переупорядочивание списков. Запускается только с drag-handle.
export function enableTouchReorder({ root, itemSelector, handleSelector, canReorder = () => true, groupForItem = () => '', onReorder }) {
  let drag = null;

  root.addEventListener('pointerdown', event => {
    const handle = event.target.closest(handleSelector);
    if (!handle || !root.contains(handle) || !canReorder()) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    const item = handle.closest(itemSelector);
    if (!item) return;
    event.preventDefault();
    drag = {
      handle,
      item,
      pointerId: event.pointerId,
      group: groupForItem(item),
      startY: event.clientY,
      originalIds: itemIds(root, itemSelector, groupForItem(item), groupForItem),
      moved: false,
    };
    // Нельзя полагаться на setPointerCapture: при insertBefore браузер может
    // отменить захват, так как перетаскиваемый узел меняет родителя.
    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', cancel);
  });

  function move(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moved && Math.abs(event.clientY - drag.startY) < 5) return;
    drag.moved = true;
    drag.item.classList.add('is-dragging');
    event.preventDefault();

    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(itemSelector);
    if (target && target !== drag.item && root.contains(target) && groupForItem(target) === drag.group) {
      const rect = target.getBoundingClientRect();
      target.parentElement.insertBefore(drag.item, event.clientY > rect.top + rect.height / 2 ? target.nextSibling : target);
    }

    if (event.clientY < 72) window.scrollBy(0, -10);
    if (event.clientY > window.innerHeight - 72) window.scrollBy(0, 10);
  }

  function finish(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const currentIds = itemIds(root, itemSelector, drag.group, groupForItem);
    drag.item.classList.remove('is-dragging');
    if (drag.moved && currentIds.join('|') !== drag.originalIds.join('|')) onReorder(drag.group, currentIds);
    stopListening();
    drag = null;
  }

  function cancel(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.item.classList.remove('is-dragging');
    restoreOriginalOrder();
    stopListening();
    drag = null;
  }

  function stopListening() {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', finish);
    window.removeEventListener('pointercancel', cancel);
  }

  function restoreOriginalOrder() {
    const items = [...root.querySelectorAll(itemSelector)]
      .filter(item => groupForItem(item) === drag.group);
    const parent = items[0]?.parentElement;
    if (!parent) return;
    const byId = new Map(items.map(item => [item.dataset.reorderId, item]));
    drag.originalIds.forEach(id => parent.appendChild(byId.get(id)));
  }
}

function itemIds(root, selector, group, groupForItem) {
  return [...root.querySelectorAll(selector)]
    .filter(item => groupForItem(item) === group)
    .map(item => item.dataset.reorderId);
}
