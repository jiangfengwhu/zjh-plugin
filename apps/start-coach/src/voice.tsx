import { useEffect, useRef, useState } from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '@zijinhua/app-sdk/ui';
import { app } from './store';
import { TextButton, styles } from './ui';

export function VoiceButton({ active, value, onText, onBusy }: { active: boolean; value: string; onText: (text: string) => void; onBusy: (busy: boolean) => void }) {
  const { colors: c } = useTheme(), current = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<'idle'|'starting'|'listening'|'ending'>('idle'), [error,setError] = useState('');
  const output = useRef(onText), busy = useRef(onBusy); output.current = onText; busy.current = onBusy;
  useEffect(() => {
    if (!active) { current.current?.abort(); current.current=null; setPhase('idle'); busy.current(false); }
    return () => { current.current?.abort(); current.current=null; busy.current(false); };
  }, [active]);
  const begin = async () => {
    if (!active || current.current) return;
    const controller = new AbortController(); current.current=controller; setPhase('starting'); setError(''); busy.current(true);
    const prefix=value.trim() ? value.trim()+'\n' : '';
    try {
      const permission=await app.phone.speech.requestPermission();
      if(controller.signal.aborted)return;
      if(!permission.granted)throw new Error('麦克风未授权，可继续输入文字。');
      const result=await app.phone.speech.recognize({signal:controller.signal,onState:state=>{if(current.current===controller&&(state==='listening'||state==='hearing'))setPhase(previous=>previous==='ending'?previous:'listening');},onPartial:text=>{if(current.current===controller&&!controller.signal.aborted)output.current((prefix+text).slice(0,1000));}});
      if(current.current===controller&&!controller.signal.aborted){if(result.ok)output.current((prefix+result.text).slice(0,1000));else if(result.code!=='CANCELLED')setError(result.error);}
    } catch(e){if(current.current===controller&&!controller.signal.aborted)setError(e instanceof Error?e.message:'语音录入未完成，已有文字保留。');}
    finally{if(current.current===controller){current.current=null;setPhase('idle');busy.current(false);}}
  };
  return <View><TextButton label={phase==='starting'?'正在准备语音…':phase==='ending'?'正在确认文字…':phase==='listening'?'结束语音录入':'用语音说一句'} disabled={!active||phase==='starting'||phase==='ending'} onPress={()=>{if(current.current){setPhase('ending');void app.phone.speech.finish().catch(()=>current.current?.abort());}else void begin();}} />{error?<Text accessibilityLiveRegion="polite" style={[styles.small,{color:c.ink2}]}>{error}</Text>:null}</View>;
}
