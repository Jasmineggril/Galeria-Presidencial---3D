/** Local recorded audio + real timed cues. No credentials or generation in the browser. */
import {Narrator} from './narrator.js';
export function validateCues(cues=[]){let last=0;return cues.map(c=>{if(!Number.isFinite(c.start)||!Number.isFinite(c.end)||c.start<last||c.end<=c.start||typeof c.text!=='string'||!c.text.trim())throw new Error('Legendas inválidas: confira tempos e texto.');last=c.end;return {start:c.start,end:c.end,text:c.text.trim()};});}
export function cueAt(cues,time){return cues.findIndex(c=>time>=c.start&&time<c.end);}
export class RecordedNarrator{
 constructor({createAudio=()=>new Audio(),onChange=()=>{}}={}){Object.assign(this,{createAudio,onChange,state:'idle',index:0,parts:[],cues:[],audio:null,transcript:'',generation:0});}
 snapshot(){return {state:this.state,index:this.index,parts:[...this.parts],caption:this.cues.length?(this.cues[this.index]?.text||''):'O roteiro completo está disponível abaixo.',available:!!this.audio,mode:'recorded',synchronized:!!this.cues.length,time:this.audio?.currentTime||0};}
 emit(){this.onChange(this.snapshot());}
 load(text,recording){this.stop();this.cues=validateCues(recording.cues||[]);this.transcript=text;this.parts=this.cues.length?this.cues.map(c=>c.text):[text];this.index=this.cues.length?-1:0;const media=this.createAudio();this.audio=media;media.preload='metadata';media.src=recording.src;
  const active=()=>this.audio===media;
  media.addEventListener('timeupdate',()=>{if(!active())return;const i=cueAt(this.cues,media.currentTime);if(i!==this.index){this.index=i;this.emit();}});
  media.addEventListener('ended',()=>{if(active()&&this.state!=='idle'){this.state='ended';this.index=-1;this.emit();}});
  media.addEventListener('error',()=>{if(active()){this.state='error';this.emit();}});this.state='idle';this.emit();}
 play(){if(!this.audio)return false;if(this.state==='playing'||this.state==='loading')return true;if(this.state==='ended')this.audio.currentTime=0;const media=this.audio,token=++this.generation;this.state='loading';this.emit();Promise.resolve(media.play()).then(()=>{if(token!==this.generation||media!==this.audio)return;this.state='playing';this.index=cueAt(this.cues,media.currentTime);this.emit();}).catch(()=>{if(token!==this.generation||media!==this.audio)return;this.state='error';this.emit();});return true;}
 pause(){if(!this.audio)return;this.generation++;this.audio.pause();this.state='paused';this.emit();}
 stop(){this.generation++;if(this.audio){this.audio.pause();try{this.audio.currentTime=0;}catch{}}this.state='idle';this.index=-1;this.emit();}
 restart(){this.stop();return this.play();}
}
export class AudioGuide{
 constructor({onChange=()=>{},...opts}={}){this.speech=new Narrator({...opts,onChange:s=>{if(this.active===this.speech)onChange({...s,mode:'speech'});}});this.recorded=new RecordedNarrator({createAudio:opts.createAudio,onChange:s=>{if(this.active===this.recorded)onChange(s);}});this.active=this.speech;}
 load(text,recording){this.active.stop();this.active=recording?this.recorded:this.speech;this.active.load(text,recording);}
 play(){return this.active.play();}pause(){this.active.pause();}stop(){this.active.stop();}restart(){return this.active.restart();}
}
