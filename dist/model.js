/** Regras independentes da interface, compartilhadas pelo quiz 2D e XR. */
export function createQuiz(questions) {
 let index=0, answers=[];
 return {
  get index(){return index;},get answers(){return [...answers];},
  get current(){return questions[index];},get complete(){return index>=questions.length;},
  get answered(){return answers[index]!==undefined;},
  get score(){return answers.reduce((n,a,i)=>n+(a===questions[i].answer?1:0),0);},
  get total(){return questions.length;},
  answer(choice){
   if(index>=questions.length||answers[index]!==undefined||!Number.isInteger(choice)||choice<0||choice>=questions[index].options.length)return false;
   answers[index]=choice;return true;
  },
  next(){if(answers[index]===undefined)return false;index++;return true;},
  reset(){index=0;answers=[];}
 };
}
export function clampPosition(position,bounds={minX:-7.2,maxX:7.2,minZ:-16,maxZ:7.2}){
 return {x:Math.max(bounds.minX,Math.min(bounds.maxX,position.x)),y:position.y,z:Math.max(bounds.minZ,Math.min(bounds.maxZ,position.z))};
}
