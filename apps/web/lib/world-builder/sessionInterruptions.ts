interface XrSessionSource extends EventTarget {
  isPresenting: boolean;
  getSession(): (EventTarget & { visibilityState?: string }) | null;
}

/**
 * Reports when timed activity should wait: a hidden browser tab, a VR session
 * that ended, or a VR session behind the headset's system menu. In VR only the
 * session's own visibility counts, because a headset may report the page as
 * hidden for the whole session.
 */
export function watchInterruptions({
  document,
  xr,
  onPausedChange,
}: {
  document: Pick<Document, 'hidden' | 'addEventListener' | 'removeEventListener'>;
  xr: XrSessionSource;
  onPausedChange(paused: boolean): void;
}): () => void {
  let session: (EventTarget & { visibilityState?: string }) | null = null;

  const onPageVisibility = () => {
    if (!xr.isPresenting) onPausedChange(document.hidden);
  };
  const onSessionVisibility = () => {
    onPausedChange(session?.visibilityState !== 'visible');
  };
  const detachSession = () => {
    session?.removeEventListener('visibilitychange', onSessionVisibility);
    session = null;
  };
  const onSessionStart = () => {
    detachSession();
    session = xr.getSession();
    session?.addEventListener('visibilitychange', onSessionVisibility);
    onPausedChange(false);
  };
  const onSessionEnd = () => {
    detachSession();
    onPausedChange(true);
  };

  document.addEventListener('visibilitychange', onPageVisibility);
  xr.addEventListener('sessionstart', onSessionStart);
  xr.addEventListener('sessionend', onSessionEnd);

  return () => {
    detachSession();
    document.removeEventListener('visibilitychange', onPageVisibility);
    xr.removeEventListener('sessionstart', onSessionStart);
    xr.removeEventListener('sessionend', onSessionEnd);
  };
}
