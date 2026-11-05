/** Regras independentes da interface, compartilhadas pelo quiz 2D e XR. */
export function createQuiz(questions) {
 if(!Array.isArray(questions)) questions=[];
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

const DEFAULT_BOUNDS = {minX:-7.2,maxX:7.2,minZ:-16,maxZ:7.2};

function normalizeBounds(input) {
 if (!input) return {...DEFAULT_BOUNDS};
 if (Array.isArray(input)) return {...DEFAULT_BOUNDS};
 if (typeof input === 'object') {
  if ('minX' in input || 'maxX' in input || 'minZ' in input || 'maxZ' in input) {
   return {
    minX: Number.isFinite(input.minX) ? input.minX : DEFAULT_BOUNDS.minX,
    maxX: Number.isFinite(input.maxX) ? input.maxX : DEFAULT_BOUNDS.maxX,
    minZ: Number.isFinite(input.minZ) ? input.minZ : DEFAULT_BOUNDS.minZ,
    maxZ: Number.isFinite(input.maxZ) ? input.maxZ : DEFAULT_BOUNDS.maxZ,
   };
  }
 }
 return {...DEFAULT_BOUNDS};
}

function normalizeObstacles(input) {
 if (Array.isArray(input)) return input;
 if (input && Array.isArray(input.obstacles)) return input.obstacles;
 if (input && Array.isArray(input.pedestals)) return input.pedestals;
 return [];
}

export function clampPosition(position, boundsOrOptions = DEFAULT_BOUNDS) {
 const bounds = normalizeBounds(boundsOrOptions);
 const obstacles = normalizeObstacles(boundsOrOptions);
 if(!position) return {x:0,y:0,z:0};
 let x = Math.max(bounds.minX, Math.min(bounds.maxX, position.x));
 let z = Math.max(bounds.minZ, Math.min(bounds.maxZ, position.z));
 const y = position.y;
 // Avoid simple circular obstacles (pedestals/walls markers) when provided.
 for (const obs of obstacles) {
  if (!obs) continue;
  const ox = Number.isFinite(obs.x) ? obs.x : 0;
  const oz = Number.isFinite(obs.z) ? obs.z : 0;
  const r = Number.isFinite(obs.radius) ? obs.radius : (Number.isFinite(obs.r) ? obs.r : 0.6);
  const dx = x - ox;
  const dz = z - oz;
  const dist = Math.hypot(dx, dz);
  if (dist < r && dist > 0) {
   const scale = r / dist;
   x = ox + dx * scale;
   z = oz + dz * scale;
   // keep inside bounds after push
   x = Math.max(bounds.minX, Math.min(bounds.maxX, x));
   z = Math.max(bounds.minZ, Math.min(bounds.maxZ, z));
  } else if (dist === 0) {
   x = ox + r;
   z = oz;
  }
 }
 return {x, y, z};
}
