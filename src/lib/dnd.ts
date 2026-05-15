const INTERACTIVE_DND_BLOCKER =
  'button, a, input, textarea, select, option, [role="button"], [role="menuitem"], [data-no-dnd="true"]';

export function isDndBlockedElement(
  target: EventTarget | null,
  currentTarget?: EventTarget | null,
) {
  if (!(target instanceof HTMLElement)) return false;

  const blocker = target.closest(INTERACTIVE_DND_BLOCKER);
  return Boolean(blocker && blocker !== currentTarget);
}
