import type { ApplicationNativeCapabilities } from '@zijinhua/app-sdk';

export type SpeechSession = { stop: () => void; cancel: () => void; done: Promise<void> };

// System recognition ends a phrase on silence. Continue until the user explicitly stops.
export function startSpeechSession(api: ApplicationNativeCapabilities['speech'], initial: string, onText: (text: string) => void, language = 'zh-CN'): SpeechSession {
  const controller = new AbortController();
  let running = true, recognizing = false, settled = false, text = '', wake: (() => void) | undefined;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  const publish = (partial = '') => onText([initial, [text, partial].filter(Boolean).join(' ')].filter(Boolean).join('\n').slice(0, 8000));
  const finish = () => { void api.finish().catch(() => controller.abort()); };
  const pause = () => new Promise<void>(resolve => {
    const timer = setTimeout(end, 200);
    function end() { clearTimeout(timer); controller.signal.removeEventListener('abort', end); wake = undefined; resolve(); }
    wake = end; controller.signal.addEventListener('abort', end, { once: true });
    if (controller.signal.aborted || !running) end();
  });
  const done = (async () => {
    try {
      const permission = await api.requestPermission();
      if (controller.signal.aborted || !running) return;
      if (!permission.granted) throw new Error('未获得麦克风权限，你仍可以手动输入');
      while (running && !controller.signal.aborted) {
        let partial = '';
        recognizing = true;
        const result = await api.recognize({ language, signal: controller.signal,
          onState: state => { if (state === 'listening' && !running && !controller.signal.aborted) finish(); },
          onPartial: value => { if (!controller.signal.aborted) { partial = value.trim(); publish(partial); } },
        });
        recognizing = false;
        if (controller.signal.aborted) return;
        if (result.ok) text = [text, result.text.trim()].filter(Boolean).join(' ');
        else if (result.code === 'NO_MATCH' || result.code === 'TIMEOUT') text = [text, partial].filter(Boolean).join(' ');
        else if (result.code === 'CANCELLED') return;
        else throw new Error(result.error);
        publish();
        if (running) await pause();
      }
    } finally { settled = true; clearTimeout(finishTimer); wake?.(); }
  })();
  return {
    done,
    stop: () => {
      if (!running || settled) return;
      running = false; wake?.();
      if (recognizing) { finishTimer = setTimeout(() => controller.abort(), 8000); finish(); }
    },
    cancel: () => { running = false; controller.abort(); wake?.(); },
  };
}
