import type { ApplicationNativeCapabilities } from '@zijinhua/app-sdk';

export type HeldSpeechSession = { release: () => void; cancel: () => void; done: Promise<void> };

// System recognition ends a phrase on silence. Keep collecting phrases while the finger is down.
export function holdSpeech(api: ApplicationNativeCapabilities['speech'], initial: string, onText: (text: string) => void): HeldSpeechSession {
  const controller = new AbortController();
  let held = true, recognizing = false, settled = false, text = '', wake: (() => void) | undefined;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  const publish = (partial = '') => onText([initial, [text, partial].filter(Boolean).join(' ')].filter(Boolean).join('\n').slice(0, 8000));
  const finish = () => { void api.finish().catch(() => controller.abort()); };
  const pause = () => new Promise<void>(resolve => {
    const timer = setTimeout(end, 200);
    function end() { clearTimeout(timer); controller.signal.removeEventListener('abort', end); wake = undefined; resolve(); }
    wake = end; controller.signal.addEventListener('abort', end, { once: true });
    if (controller.signal.aborted || !held) end();
  });
  const done = (async () => {
    try {
      const permission = await api.requestPermission();
      if (controller.signal.aborted || !held) return;
      if (!permission.granted) throw new Error('未获得麦克风权限，你仍可以手动输入');
      while (held && !controller.signal.aborted) {
        let partial = '';
        recognizing = true;
        const result = await api.recognize({ language: 'zh-CN', signal: controller.signal,
          onState: state => { if (state === 'listening' && !held && !controller.signal.aborted) finish(); },
          onPartial: value => { if (!controller.signal.aborted) { partial = value.trim(); publish(partial); } },
        });
        recognizing = false;
        if (controller.signal.aborted) return;
        if (result.ok) text = [text, result.text.trim()].filter(Boolean).join(' ');
        else if (result.code === 'NO_MATCH' || result.code === 'TIMEOUT') text = [text, partial].filter(Boolean).join(' ');
        else if (result.code === 'CANCELLED') return;
        else throw new Error(result.error);
        publish();
        if (held) await pause();
      }
    } finally { settled = true; clearTimeout(finishTimer); wake?.(); }
  })();
  return {
    done,
    release: () => {
      if (!held || settled) return;
      held = false; wake?.();
      if (recognizing) { finishTimer = setTimeout(() => controller.abort(), 8000); finish(); }
    },
    cancel: () => { held = false; controller.abort(); wake?.(); },
  };
}
