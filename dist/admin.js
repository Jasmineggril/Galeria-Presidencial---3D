import {backendConfig, isGuestMode, loadSession} from './account.js';
import {CATALOG, ROOMS} from './catalog.js';

const status = document.getElementById('admin-status');
const content = document.getElementById('admin-content');

const DRAFT_KEY = 'gp.admin.drafts.v1';
const STATES = ['draft', 'review', 'published', 'archived'];
const REQUIRED = ['id', 'name', 'displayName', 'summary', 'biography', 'years', 'room', 'regime', 'accession'];

let drafts = loadDrafts();
let selectedId = null;

function loadDrafts() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveDrafts() {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
  } catch (error) {
    // Prototype storage may be unavailable; keep in memory.
  }
}

function allRecords() {
  const map = new Map(CATALOG.map((p) => [p.id, { ...p, status: 'published', sourceType: 'catalog' }]));
  for (const [id, draft] of Object.entries(drafts)) {
    map.set(id, { ...draft, status: draft.status || 'draft', sourceType: 'draft' });
  }
  return [...map.values()];
}

function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}

function field(labelText, name, value, type = 'text', options = null) {
  const wrapper = document.createElement('label');
  wrapper.textContent = labelText;
  let input;
  if (options) {
    input = document.createElement('select');
    options.forEach((opt) => {
      const o = document.createElement('option');
      o.value = opt.value;
      o.textContent = opt.label;
      if (String(opt.value) === String(value)) o.selected = true;
      input.append(o);
    });
  } else if (type === 'textarea') {
    input = document.createElement('textarea');
    input.rows = 4;
  } else {
    input = document.createElement('input');
    input.type = type;
  }
  input.name = name;
  input.value = value ?? '';
  input.dataset.field = name;
  wrapper.append(input);
  return wrapper;
}

function readForm(form) {
  const data = {};
  form.querySelectorAll('[data-field]').forEach((input) => {
    data[input.dataset.field] = input.value.trim();
  });
  data.periods = (data.periods || '').split(';').map((s) => s.trim()).filter(Boolean);
  data.sources = (data.sources || '').split(';').map((s) => s.trim()).filter(Boolean);
  data.room = Number(data.room) || 1;
  return data;
}

function validate(data) {
  const errors = [];
  for (const key of REQUIRED) {
    if (!data[key]) errors.push('Campo obrigatório: ' + key);
  }
  if (data.id && !/^[a-z0-9-]+$/.test(data.id)) errors.push('ID deve usar letras minúsculas, números e hífens.');
  if (data.room < 1 || data.room > 6) errors.push('Sala deve estar entre 1 e 6.');
  if (data.status && !STATES.includes(data.status)) errors.push('Estado de publicação inválido.');
  const duplicate = CATALOG.some((p) => p.id === data.id && data.sourceType !== 'draft');
  if (duplicate && !drafts[data.id]) errors.push('ID já existe no catálogo publicado.');
  return errors;
}

function renderList() {
  const list = el('div', undefined, 'admin-list');
  const heading = el('h2', 'Acervo e rascunhos');
  content.replaceChildren();
  content.append(heading);

  const toolbar = el('div', undefined, 'narration-controls');
  const newBtn = el('button', '+ Novo presidente', 'primary');
  newBtn.onclick = () => openForm(null);
  const exportBtn = el('button', 'Exportar rascunhos');
  exportBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(drafts, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rascunhos-admin.json';
    a.click();
    URL.revokeObjectURL(url);
  };
  toolbar.append(newBtn, exportBtn);
  content.append(toolbar);

  const table = el('table');
  const thead = el('thead');
  thead.innerHTML = '<tr><th>ID</th><th>Nome</th><th>Sala</th><th>Estado</th><th>Ações</th></tr>';
  table.append(thead);
  const tbody = document.createElement('tbody');
  allRecords().forEach((record) => {
    const tr = document.createElement('tr');
    tr.append(
      el('td', record.id),
      el('td', record.displayName || record.name),
      el('td', String(record.room)),
      el('td', record.status),
    );
    const actions = el('td');
    const editBtn = el('button', 'Editar');
    editBtn.onclick = () => openForm(record.id);
    const previewBtn = el('button', 'Pré-visualizar');
    previewBtn.onclick = () => previewRecord(record);
    actions.append(editBtn, previewBtn);
    tr.append(actions);
    tbody.append(tr);
  });
  table.append(tbody);
  content.append(table);
}

function openForm(id) {
  selectedId = id;
  const record = id ? (drafts[id] || CATALOG.find((p) => p.id === id) || {}) : {};
  const form = document.createElement('form');
  form.className = 'avatar-form';
  form.append(
    field('ID único', 'id', record.id, 'text'),
    field('Nome completo', 'name', record.name, 'text'),
    field('Nome de exibição', 'displayName', record.displayName || record.name, 'text'),
    field('Biografia', 'biography', record.biography || record.summary, 'textarea'),
    field('Resumo educativo', 'summary', record.summary, 'textarea'),
    field('Períodos de governo (separar por ;)', 'periods', (record.periods || []).join(';'), 'text'),
    field('Sala (1-6)', 'room', record.room || 1, 'number'),
    field('Período histórico', 'era', record.era || '', 'text'),
    field('Classificação política', 'regime', record.regime || '', 'text'),
    field('Forma de chegada ao cargo', 'accession', record.accession || '', 'text'),
    field('Forma de saída do cargo', 'exit', record.exit || '', 'text'),
    field('Retrato - autoria', 'portraitArtist', record.portraitCredit?.artist || '', 'text'),
    field('Retrato - origem', 'portraitPage', record.portraitCredit?.page || '', 'text'),
    field('Retrato - licença', 'portraitLicense', record.portraitCredit?.license || '', 'text'),
    field('Referência visual bustos (pasta)', 'bustReference', record.bustReference || '', 'text'),
    field('Modelo GLB - caminho', 'modelPath', record.modelPath || '', 'text'),
    field('Modelo GLB - autoria', 'modelAuthor', record.modelAuthor || '', 'text'),
    field('Modelo GLB - licença', 'modelLicense', record.modelLicense || '', 'text'),
    field('Modelo GLB - estado de revisão', 'modelReview', record.modelReview || 'provisório', 'text'),
    field('Roteiro da narração', 'narration', record.narration || '', 'textarea'),
    field('Arquivo de áudio', 'audioFile', record.audioFile || '', 'text'),
    field('Identificação da voz', 'voiceId', record.voiceId || '', 'text'),
    field('Legendas temporizadas (JSON)', 'timedCues', record.timedCues ? JSON.stringify(record.timedCues) : '', 'textarea'),
    field('Fontes históricas (separar por ;)', 'sources', (record.sources || []).join(';'), 'text'),
    field('Data de revisão do conteúdo', 'reviewedAt', record.reviewedAt || new Date().toISOString().slice(0, 10), 'date'),
    field('Estado de publicação', 'status', record.status || 'draft', 'select', STATES.map((s) => ({ value: s, label: s }))),
  );

  const actions = el('div', undefined, 'narration-controls');
  const saveBtn = el('button', 'Salvar rascunho', 'primary');
  saveBtn.type = 'button';
  const previewBtn = el('button', 'Pré-visualizar');
  previewBtn.type = 'button';
  const cancelBtn = el('button', 'Cancelar');
  cancelBtn.type = 'button';
  actions.append(saveBtn, previewBtn, cancelBtn);
  form.append(actions);

  const messages = el('p', '', 'disclaimer');
  messages.setAttribute('role', 'status');
  form.append(messages);

  content.replaceChildren();
  content.append(el('h2', id ? 'Editar presidente' : 'Novo presidente'), form);

  saveBtn.onclick = () => {
    const data = readForm(form);
    const errors = validate(data);
    if (errors.length) {
      messages.textContent = errors.join(' ');
      messages.style.color = '#8a3a24';
      return;
    }
    drafts[data.id] = {
      ...data,
      portraitCredit: {
        artist: data.portraitArtist,
        page: data.portraitPage,
        license: data.portraitLicense,
      },
      periods: data.periods,
      sources: data.sources,
      timedCues: parseJson(data.timedCues),
    };
    saveDrafts();
    messages.textContent = 'Rascunho salvo com sucesso.';
    messages.style.color = '#233e34';
    renderList();
  };

  previewBtn.onclick = () => {
    const data = readForm(form);
    const errors = validate(data);
    if (errors.length) {
      messages.textContent = errors.join(' ');
      messages.style.color = '#8a3a24';
      return;
    }
    previewRecord(data);
  };

  cancelBtn.onclick = () => renderList();
}

function parseJson(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    return null;
  }
}

function previewRecord(record) {
  const card = el('article', undefined, 'collection-card');
  card.append(
    el('span', 'SALA ' + String(record.room).padStart(2, '0'), 'card-num'),
    el('h3', record.displayName || record.name),
    el('p', record.years || '', 'years'),
    el('p', record.regime || '', 'era'),
    el('p', record.summary || ''),
  );
  const dialog = document.createElement('dialog');
  dialog.className = 'detail-dialog';
  dialog.append(card);
  const close = el('button', 'Fechar');
  close.onclick = () => dialog.close();
  dialog.append(close);
  document.body.append(dialog);
  dialog.showModal();
  dialog.addEventListener('close', () => dialog.remove());
}

function render() {
  const cfg = backendConfig();
  const session = loadSession();
  if (isGuestMode()) {
    status.textContent = 'Backend não configurado: esta área é um protótipo visual e de rascunho local. Cadastros não são sincronizados nem protegidos por permissão de servidor.';
    content.innerHTML = '';
    const note = el('p', 'Configure um provedor e políticas de acesso no servidor para habilitar o cadastro funcional. Nenhuma credencial deve ser colocada no frontend.');
    content.append(note);
    renderList();
    return;
  }
  if (!session?.accessToken) {
    status.textContent = 'Autenticação necessária. Entre com uma conta autorizada no museu para acessar esta área.';
    content.innerHTML = '<p>Use a página principal para entrar. A verificação de privilégio administrativo ocorre no backend.</p>';
    return;
  }
  status.textContent = 'Sessão detectada. A listagem e edição do acervo exigem endpoint protegido e papel administrativo validado no servidor. Rascunhos locais são apenas protótipo.';
  renderList();
}

render();
