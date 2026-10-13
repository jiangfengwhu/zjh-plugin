import type { ApplicationNativeCapabilities } from '@zijinhua/app-sdk';

export type SpeechSession = { stop: () => void; cancel: () => void; done: Promise<void> };

export function startSpeechSession(api: ApplicationNativeCapabilities['speech'], initial: string, onText: (text: string) => void, onListening: () => void): SpeechSession {
  const controller = new AbortController();
  const prefix = initial ? initial + (/\s$/.test(initial) ? '' : '\n') : '';
  let running = true, recognizing = false, settled = false;
  let finishTimer: ReturnType<typeof setTimeout> | undefined;
  const finish = () => { void api.finish().then(result => { if (!result.ok) controller.abort(); }, () => controller.abort()); };
  const done = (async () => {
    try {
      const permission = await api.requestPermission();
      if (controller.signal.aborted || !running) return;
      if (!permission.granted) throw new Error(permission.status === 'blocked' ? '麦克风权限已关闭，请在系统设置中允许生花使用麦克风。' : '未获得麦克风权限，可继续输入文字回答。');
      recognizing = true;
      const publish = (spoken: string) => { if (!controller.signal.aborted && spoken.trim()) onText((prefix + spoken).slice(0, 6000)); };
      const result = await api.recognize({ language: 'zh-CN', signal: controller.signal,
        onState: state => { if (!controller.signal.aborted && (state === 'listening' || state === 'hearing')) { if (running) onListening(); else finish(); } },
        onPartial: publish,
      });
      if (controller.signal.aborted) return;
      if (result.ok) publish(result.text);
      else if (result.code !== 'CANCELLED') throw new Error(result.error);
    } finally { settled = true; recognizing = false; clearTimeout(finishTimer); }
  })();
  return {
    done,
    stop: () => { if (!running || settled) return; running = false; if (recognizing) { finishTimer = setTimeout(() => controller.abort(), 30000); finish(); } },
    cancel: () => { running = false; controller.abort(); },
  };
}
