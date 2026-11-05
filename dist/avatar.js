/** Avatar personalizável do visitante.
 *
 * Este módulo cuida apenas da aparência do visitante. Ele não é o busto do
 * presidente nem um retrato histórico. A persistência é local para convidados;
 * a sincronização entre dispositivos depende de backend configurado.
 */
export const AVATAR_STORAGE_KEY = 'gp.avatar.v1';

export const AVATAR_OPTIONS = {
  skinTones: [
    {id:'porcelain',label:'Pele clara',color:'#f2d6c6'},
    {id:'light',label:'Pele clara média',color:'#e6bfa3'},
    {id:'medium',label:'Pele média',color:'#c99a73'},
    {id:'tan',label:'Pele morena clara',color:'#a87652'},
    {id:'brown',label:'Pele morena',color:'#8a5a3b'},
    {id:'deep',label:'Pele escura',color:'#5a3a2b'}
  ],
  hairStyles: [
    {id:'short',label:'Curto'},
    {id:'medium',label:'Médio'},
    {id:'long',label:'Longo'},
    {id:'curly',label:'Cacheado'},
    {id:'buzz',label:'Raspado'},
    {id:'bun',label:'Coque'}
  ],
  hairColors: [
    {id:'black',label:'Preto',color:'#1f1a17'},
    {id:'brown',label:'Castanho',color:'#4a3424'},
    {id:'blonde',label:'Loiro',color:'#c9a35a'},
    {id:'red',label:'Ruivo',color:'#8a3a24'},
    {id:'gray',label:'Grisalho',color:'#9b9b9b'},
    {id:'blue',label:'Azul',color:'#3a6ea5'}
  ],
  outfits: [
    {id:'blazer',label:'Blazer'},
    {id:'shirt',label:'Camisa'},
    {id:'hoodie',label:'Moletom'},
    {id:'dress',label:'Vestido'},
    {id:'coat',label:'Casaco'}
  ],
  outfitColors: [
    {id:'green',label:'Verde museu',color:'#233e34'},
    {id:'cream',label:'Creme',color:'#e8dfc9'},
    {id:'navy',label:'Azul-marinho',color:'#1f2a44'},
    {id:'terracotta',label:'Terracota',color:'#a85a3a'},
    {id:'gray',label:'Cinza',color:'#6b6b6b'},
    {id:'white',label:'Branco',color:'#f4f1e8'}
  ],
  shoes: [
    {id:'sneaker',label:'Tênis'},
    {id:'loafer',label:'Mocassim'},
    {id:'boot',label:'Bota'}
  ],
  accessories: [
    {id:'none',label:'Nenhum'},
    {id:'glasses',label:'Óculos'},
    {id:'hat',label:'Chapéu'},
    {id:'scarf',label:'Cachecol'}
  ]
};

const DEFAULT_AVATAR = {
  displayName: 'Visitante',
  skinTone: 'medium',
  hairStyle: 'short',
  hairColor: 'brown',
  outfit: 'blazer',
  outfitColor: 'green',
  shoes: 'sneaker',
  accessory: 'none'
};

function optionGroup(group, value) {
  return AVATAR_OPTIONS[group].find(item => item.id === value) || AVATAR_OPTIONS[group][0];
}

export function normalizeAvatar(input) {
  const avatar = {...DEFAULT_AVATAR, ...(input || {})};
  for (const group of ['skinTone','hairStyle','hairColor','outfit','outfitColor','shoes','accessory']) {
    const optionId = avatar[group === 'skinTone' ? 'skinTone' : group];
    // map field names
  }
  // Validate each field against option lists.
  const fieldToGroup = {
    skinTone: 'skinTones',
    hairStyle: 'hairStyles',
    hairColor: 'hairColors',
    outfit: 'outfits',
    outfitColor: 'outfitColors',
    shoes: 'shoes',
    accessory: 'accessories'
  };
  for (const [field, group] of Object.entries(fieldToGroup)) {
    if (!AVATAR_OPTIONS[group].some(item => item.id === avatar[field])) {
      avatar[field] = DEFAULT_AVATAR[field];
    }
  }
  avatar.displayName = String(avatar.displayName || DEFAULT_AVATAR.displayName).trim().slice(0, 24) || DEFAULT_AVATAR.displayName;
  return avatar;
}

export function loadAvatar() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY);
    if (!raw) return {...DEFAULT_AVATAR};
    return normalizeAvatar(JSON.parse(raw));
  } catch (error) {
    return {...DEFAULT_AVATAR};
  }
}

export function saveAvatar(avatar) {
  const normalized = normalizeAvatar(avatar);
  try {
    localStorage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(normalized));
  } catch (error) {
    // Guest storage may be unavailable; keep in memory only.
  }
  return normalized;
}

export function clearAvatar() {
  try { localStorage.removeItem(AVATAR_STORAGE_KEY); } catch (error) {}
  return {...DEFAULT_AVATAR};
}

export function avatarSummary(avatar) {
  const a = normalizeAvatar(avatar);
  return `${a.displayName} · ${optionGroup('skinTones', a.skinTone).label} · ${optionGroup('hairStyles', a.hairStyle).label} · ${optionGroup('outfits', a.outfit).label}`;
}

export function renderAvatarPreview(container, avatar) {
  if (!container) return;
  const a = normalizeAvatar(avatar);
  const skin = optionGroup('skinTones', a.skinTone).color;
  const hair = optionGroup('hairColors', a.hairColor).color;
  const outfit = optionGroup('outfitColors', a.outfitColor).color;
  const accessory = a.accessory;
  container.innerHTML = '';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 160 220');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Prévia do avatar ' + a.displayName);
  svg.innerHTML = `
    <rect x="0" y="0" width="160" height="220" fill="#efe8d8"/>
    <ellipse cx="80" cy="195" rx="46" ry="12" fill="#b8a98a" opacity=".35"/>
    <rect x="46" y="132" width="68" height="70" rx="18" fill="${outfit}"/>
    <rect x="54" y="120" width="52" height="24" rx="12" fill="${skin}"/>
    <circle cx="80" cy="78" r="34" fill="${skin}"/>
    <path d="M46 78 Q80 34 114 78" fill="${hair}" />
    ${a.hairStyle === 'long' ? '<path d="M46 78 Q40 120 52 150 M114 78 Q120 120 108 150" stroke="' + hair + '" stroke-width="10" fill="none"/>' : ''}
    ${a.hairStyle === 'bun' ? '<circle cx="80" cy="40" r="12" fill="' + hair + '"/>' : ''}
    ${accessory === 'glasses' ? '<rect x="52" y="72" width="20" height="14" rx="4" fill="none" stroke="#222" stroke-width="2"/><rect x="88" y="72" width="20" height="14" rx="4" fill="none" stroke="#222" stroke-width="2"/><line x1="72" y1="79" x2="88" y2="79" stroke="#222" stroke-width="2"/>' : ''}
    ${accessory === 'hat' ? '<ellipse cx="80" cy="46" rx="42" ry="10" fill="#3a2a1a"/><rect x="52" y="30" width="56" height="18" rx="8" fill="#3a2a1a"/>' : ''}
    ${accessory === 'scarf' ? '<rect x="56" y="118" width="48" height="10" rx="5" fill="#b33a2a"/>' : ''}
    <circle cx="68" cy="80" r="3" fill="#2a221c"/>
    <circle cx="92" cy="80" r="3" fill="#2a221c"/>
    <path d="M70 92 Q80 98 90 92" stroke="#2a221c" stroke-width="2" fill="none"/>
  `;
  container.append(svg);
}

export {DEFAULT_AVATAR};
