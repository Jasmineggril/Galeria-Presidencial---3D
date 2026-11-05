/** Local recorded audio + real timed cues. No credentials or generation in the browser. */
import {Narrator} from './narrator.js';
export function validateCues(cues=[]){if(!Array.isArray(cues)) throw new Error('Legendas inválidas: confira tempos e texto.');let last=0;return cues.map(c=>{if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<last||c.end<=c.start||typeof c.text!=='string'||!c.text.trim())throw new Error('Legendas inválidas: confira tempos e texto.');last=c.end;return {start:c.start,end:c.end,text:c.text.trim()};});}
export function cueAt(cues,time){if(!Array.isArray(cues)) return -1;return cues.findIndex(c=>time>=c.start&&time<c.end);}
export class RecordedNarrator{
 constructor({createAudio=()=>new Audio(),onChange=()=>{},volume=1}={}){Object.assign(this,{createAudio,onChange,state:'idle',index:0,parts:[],cues:[],audio:null,transcript:'',generation:0});this.volume=Math.max(0,Math.min(1,Number(volume)||1));}
 snapshot(){return {state:this.state,index:this.index,parts:[...this.parts],caption:this.cues.length?(this.cues[this.index]?.text||''):'O roteiro completo está disponível abaixo.',available:!!this.audio,mode:'recorded',synchronized:!!this.cues.length,time:this.audio?.currentTime||0,volume:this.volume};}
 emit(){this.onChange(this.snapshot());}
 load(text,recording){this.stop();const rec=recording||{};this.cues=validateCues(rec.cues||[]);this.transcript=text;this.parts=this.cues.length?this.cues.map(c=>c.text):[text];this.index=this.cues.length?-1:0;const media=this.createAudio();this.audio=media;media.preload='metadata';if(rec.src)media.src=rec.src;media.volume=this.volume;
  const active=()=>this.audio===media;
  media.addEventListener('timeupdate',()=>{if(!active())return;const i=cueAt(this.cues,media.currentTime);if(i!==this.index){this.index=i;this.emit();}});
  media.addEventListener('ended',()=>{if(active()&&this.state!=='idle'){this.state='ended';this.index=-1;this.emit();}});
  media.addEventListener('error',()=>{if(active()){this.state='error';this.emit();}});this.state='idle';this.emit();}
 play(){if(!this.audio)return false;if(this.state==='playing'||this.state==='loading')return true;if(this.state==='ended')this.audio.currentTime=0;const media=this.audio,token=++this.generation;this.state='loading';this.emit();Promise.resolve(media.play()).then(()=>{if(token!==this.generation||media!==this.audio)return;this.state='playing';this.index=cueAt(this.cues,media.currentTime);this.emit();}).catch(()=>{if(token!==this.generation||media!==this.audio)return;this.state='error';this.emit();});return true;}
 pause(){if(!this.audio)return;this.generation++;this.audio.pause();this.state='paused';this.emit();} setVolume(value){this.volume=Math.max(0,Math.min(1,Number(value)||0));if(this.audio)this.audio.volume=this.volume;return this.volume;}
 stop(){this.generation++;if(this.audio){this.audio.pause();try{this.audio.currentTime=0;}catch{}}this.state='idle';this.index=this.cues.length?-1:0;this.emit();}
 restart(){this.stop();return this.play();}
}
export class AudioGuide{
 constructor({onChange=()=>{},...opts}={}){this.speech=new Narrator({...opts,onChange:s=>{if(this.active===this.speech)onChange({...s,mode:'speech'});}});this.recorded=new RecordedNarrator({createAudio:opts.createAudio,onChange:s=>{if(this.active===this.recorded)onChange(s);},volume:opts.volume});this.active=this.speech;this.volume=Math.max(0,Math.min(1,Number(opts.volume)||1));}
 load(text,recording){if(this.active)this.active.stop();this.active=recording?this.recorded:this.speech;if(this.active)this.active.load(text,recording);}
 play(){return this.active.play();}pause(){this.active.pause();}stop(){this.active.stop();}restart(){return this.active.restart();}setVolume(value){const v=Math.max(0,Math.min(1,Number(value)||0));this.volume=v;this.speech?.setVolume?.(v);this.recorded?.setVolume?.(v);return v;}
}
