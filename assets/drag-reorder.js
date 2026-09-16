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
      group: groupForItem(item),
      startY: event.clientY,
      originalIds: itemIds(root, itemSelector, groupForItem(item), groupForItem),
      moved: false,
    };
    handle.setPointerCapture(event.pointerId);
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', finish, { once: true });
    handle.addEventListener('pointercancel', cancel, { once: true });
  });

  function move(event) {
    if (!drag) return;
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

  function finish() {
    if (!drag) return;
    const currentIds = itemIds(root, itemSelector, drag.group, groupForItem);
    drag.item.classList.remove('is-dragging');
    if (drag.moved && currentIds.join('|') !== drag.originalIds.join('|')) onReorder(drag.group, currentIds);
    drag = null;
  }

  function cancel() {
    if (!drag) return;
    drag.item.classList.remove('is-dragging');
    drag = null;
  }
}

function itemIds(root, selector, group, groupForItem) {
  return [...root.querySelectorAll(selector)]
    .filter(item => groupForItem(item) === group)
    .map(item => item.dataset.reorderId);
}
