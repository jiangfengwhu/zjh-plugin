import type { ApplicationNativeCapabilities } from '@zijinhua/app-sdk';

export type SpeechSession = { stop: () => void; cancel: () => void; done: Promise<void> };

// Keep the user's recording session alive when the system ends an utterance.
export function startSpeechSession(api: ApplicationNativeCapabilities['speech'], initial: string, onText: (text: string) => void, onListening: () => void): SpeechSession {
  const controller = new AbortController();
  const prefix = initial ? `${initial}${/\s$/.test(initial) ? '' : '\n'}` : '';
  let running = true, recognizing = false, settled = false, text = '', wake: (() => void) | undefined;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  const publish = (partial = '') => {
    const spoken = [text, partial].filter(Boolean).join(' ');
    if (spoken) onText((prefix + spoken).slice(0, 6000));
  };
  const finish = () => { void api.finish().then(result => { if (!result.ok) controller.abort(); }, () => controller.abort()); };
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
      if (!permission.granted) throw new Error(permission.status === 'blocked' ? '麦克风权限已关闭，请在系统设置中允许生花使用麦克风。' : '未获得麦克风权限，可继续输入文字回答。');
      while (running && !controller.signal.aborted) {
        let partial = '';
        recognizing = true;
        const result = await api.recognize({ language: 'zh-CN', signal: controller.signal,
          onState: state => {
            if (controller.signal.aborted) return;
            if (state === 'listening' || state === 'hearing') { if (running) onListening(); else finish(); }
          },
          onPartial: value => { if (!controller.signal.aborted) { partial = value.trim(); publish(partial); } },
        });
        recognizing = false;
        if (controller.signal.aborted) return;
        if (result.ok) text = [text, result.text.trim() || partial].filter(Boolean).join(' ');
        else if (result.code === 'NO_MATCH' || result.code === 'TIMEOUT') text = [text, partial].filter(Boolean).join(' ');
        else if (result.code === 'CANCELLED') return;
        else throw new Error(result.error);
        publish();
        if (prefix.length + text.length >= 6000) running = false;
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
