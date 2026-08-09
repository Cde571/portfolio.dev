const elements = {
  addSection: document.getElementById('addSectionButton'),
  addSource: document.getElementById('addSourceButton'),
  branch: document.getElementById('branchName'),
  busyLayer: document.getElementById('busyLayer'),
  busyMessage: document.getElementById('busyMessage'),
  busyTitle: document.getElementById('busyTitle'),
  deleteWriting: document.getElementById('deleteWritingButton'),
  editorIndex: document.getElementById('editorIndex'),
  editorTitle: document.getElementById('editorTitle'),
  form: document.getElementById('writingForm'),
  librarySearch: document.getElementById('librarySearch'),
  list: document.getElementById('writingList'),
  miniPreview: document.getElementById('miniPreview'),
  newWriting: document.getElementById('newWritingButton'),
  preview: document.getElementById('previewButton'),
  publish: document.getElementById('publishButton'),
  save: document.getElementById('saveButton'),
  saveState: document.getElementById('saveState'),
  sectionList: document.getElementById('sectionList'),
  sourceList: document.getElementById('sourceList'),
  toast: document.getElementById('toast'),
};

const fields = {
  abstract: document.getElementById('abstractInput'),
  accent: document.getElementById('accentInput'),
  category: document.getElementById('categoryInput'),
  date: document.getElementById('dateInput'),
  excerpt: document.getElementById('excerptInput'),
  image: document.getElementById('imageInput'),
  imageAlt: document.getElementById('imageAltInput'),
  readingMinutes: document.getElementById('readingInput'),
  slug: document.getElementById('slugInput'),
  status: document.getElementById('statusInput'),
  tags: document.getElementById('tagsInput'),
  title: document.getElementById('titleInput'),
};

let writings = [];
let selectedIndex = 0;
let dirty = false;
let slugWasEdited = false;
let toastTimer;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[character]);
}

function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 90);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function createWriting() {
  return {
    slug: `nuevo-escrito-${Date.now().toString().slice(-5)}`,
    title: 'Nuevo escrito',
    excerpt: 'Describe en una frase qué aprenderá la persona que lea este escrito.',
    abstract: 'Explica el contexto, la pregunta principal y el alcance de este borrador.',
    category: 'Estudio',
    status: 'Borrador',
    date: today(),
    dateLabel: '',
    readingMinutes: 5,
    tags: [],
    accent: '#00f5ff',
    image: '',
    imageAlt: '',
    sections: [{ id: 'contexto', title: '01. Contexto', body: ['Empieza a escribir aquí. Separa los párrafos con una línea vacía.'] }],
    sources: [],
  };
}

function currentWriting() {
  return writings[selectedIndex];
}

function markDirty(value = true) {
  dirty = value;
  elements.saveState.parentElement.classList.toggle('is-dirty', value);
  elements.saveState.textContent = value ? 'Cambios sin guardar' : 'Todo guardado';
}

function showToast(message, isError = false) {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.toggle('is-error', isError);
  elements.toast.classList.add('is-visible');
  toastTimer = setTimeout(() => elements.toast.classList.remove('is-visible'), 4200);
}

function setBusy(active, title = 'Procesando…', message = 'Esto puede tardar unos segundos.') {
  elements.busyLayer.hidden = !active;
  elements.busyTitle.textContent = title;
  elements.busyMessage.textContent = message;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await response.json().catch(() => ({ ok: false, error: 'La respuesta local no es válida.' }));
  if (!response.ok || !data.ok) throw new Error(data.error || 'La operación no pudo completarse.');
  return data;
}

function renderLibrary() {
  const query = elements.librarySearch.value.trim().toLowerCase();
  elements.list.innerHTML = writings.map((writing, index) => {
    const searchable = `${writing.title} ${writing.category} ${(writing.tags || []).join(' ')}`.toLowerCase();
    if (query && !searchable.includes(query)) return '';
    return `
      <button class="writing-item ${index === selectedIndex ? 'is-active' : ''}" style="--item-accent:${escapeHtml(writing.accent)}" type="button" data-writing-index="${index}">
        <span class="writing-item-index">${String(index + 1).padStart(2, '0')}</span>
        <span><strong>${escapeHtml(writing.title)}</strong><small>${escapeHtml(writing.category)} · ${escapeHtml(writing.status)}</small></span>
      </button>`;
  }).join('');
}

function renderSections() {
  const writing = currentWriting();
  elements.sectionList.innerHTML = writing.sections.map((section, index) => `
    <article class="section-card" data-section-index="${index}">
      <header class="section-card-head">
        <span class="drag-mark">::</span><strong>BLOCK_${String(index + 1).padStart(2, '0')}</strong>
        <div class="section-card-actions">
          <button class="tiny-button" type="button" data-section-action="up" title="Subir sección" ${index === 0 ? 'disabled' : ''}>↑</button>
          <button class="tiny-button" type="button" data-section-action="down" title="Bajar sección" ${index === writing.sections.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="tiny-button is-danger" type="button" data-section-action="delete" title="Eliminar sección">×</button>
        </div>
      </header>
      <div class="section-card-body">
        <label class="field"><span>Título de sección</span><input data-section-field="title" value="${escapeHtml(section.title)}" /></label>
        <label class="field"><span>ID de enlace</span><input data-section-field="id" value="${escapeHtml(section.id)}" /></label>
        <label class="field"><span>Párrafos <small>separa con una línea vacía</small></span><textarea data-section-field="body" rows="6">${escapeHtml((section.body || []).join('\n\n'))}</textarea></label>
        <label class="field"><span>Lista <small>un elemento por línea</small></span><textarea data-section-field="bullets" rows="4">${escapeHtml((section.bullets || []).join('\n'))}</textarea></label>
        <label class="field"><span>Nota destacada <small>opcional</small></span><textarea data-section-field="note" rows="4">${escapeHtml(section.note || '')}</textarea></label>
      </div>
    </article>`).join('');
}

function renderSources() {
  const sources = currentWriting().sources || [];
  elements.sourceList.innerHTML = sources.length ? sources.map((source, index) => `
    <div class="source-row" data-source-index="${index}">
      <label class="field"><span>Nombre</span><input data-source-field="label" value="${escapeHtml(source.label)}" /></label>
      <label class="field"><span>Enlace</span><input data-source-field="href" type="url" value="${escapeHtml(source.href)}" placeholder="https://…" /></label>
      <button class="tiny-button is-danger" type="button" data-source-action="delete" aria-label="Eliminar fuente">×</button>
    </div>`).join('') : '<p class="mini-more">Sin fuentes todavía. Puedes añadir documentación, artículos o estudios.</p>';
}

function renderMiniPreview() {
  const writing = currentWriting();
  const sections = writing.sections.slice(0, 2);
  elements.miniPreview.style.setProperty('--preview-accent', writing.accent || '#00f5ff');
  elements.miniPreview.innerHTML = `
    ${writing.image ? `<img class="mini-cover" src="${escapeHtml(writing.image)}" alt="${escapeHtml(writing.imageAlt || '')}" />` : ''}
    <div class="mini-category">${escapeHtml(writing.category)} / ${escapeHtml(writing.status)}</div>
    <h2>${escapeHtml(writing.title)}</h2>
    <p class="mini-abstract">${escapeHtml(writing.abstract || writing.excerpt)}</p>
    <div class="mini-meta"><span>${escapeHtml(writing.readingMinutes)} MIN</span>${(writing.tags || []).slice(0, 3).map((tag) => `<span>#${escapeHtml(tag)}</span>`).join('')}</div>
    ${sections.map((section) => `<section class="mini-section"><h3>${escapeHtml(section.title)}</h3><p>${escapeHtml(section.body?.[0] || '')}</p></section>`).join('')}
    ${writing.sections.length > 2 ? `<p class="mini-more">+ ${writing.sections.length - 2} secciones en el artículo completo</p>` : ''}`;
}

function populateEditor() {
  const writing = currentWriting();
  Object.entries(fields).forEach(([name, field]) => {
    if (name === 'tags') field.value = (writing.tags || []).join(', ');
    else field.value = writing[name] ?? '';
  });
  elements.editorIndex.textContent = `LOG_${String(selectedIndex + 1).padStart(2, '0')}`;
  elements.editorTitle.textContent = writing.title;
  slugWasEdited = false;
  renderLibrary();
  renderSections();
  renderSources();
  renderMiniPreview();
}

function updateGlobalField(field) {
  const writing = currentWriting();
  const name = field.dataset.writingField;
  if (!name) return;
  if (name === 'tags') writing.tags = field.value.split(',').map((tag) => tag.trim()).filter(Boolean);
  else if (name === 'readingMinutes') writing[name] = Math.max(1, Number.parseInt(field.value, 10) || 1);
  else writing[name] = field.value;
  if (name === 'title' && !slugWasEdited) {
    writing.slug = slugify(field.value);
    fields.slug.value = writing.slug;
  }
  if (name === 'slug') {
    slugWasEdited = true;
    writing.slug = slugify(field.value);
  }
  elements.editorTitle.textContent = writing.title || 'Sin título';
  markDirty();
  renderLibrary();
  renderMiniPreview();
}

function updateSectionField(target) {
  const card = target.closest('[data-section-index]');
  if (!card) return;
  const section = currentWriting().sections[Number(card.dataset.sectionIndex)];
  const name = target.dataset.sectionField;
  if (name === 'body') section.body = target.value.split(/\n\s*\n/).map((value) => value.trim()).filter(Boolean);
  else if (name === 'bullets') section.bullets = target.value.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
  else section[name] = target.value;
  markDirty();
  renderMiniPreview();
}

function moveSection(index, direction) {
  const sections = currentWriting().sections;
  const next = index + direction;
  if (next < 0 || next >= sections.length) return;
  [sections[index], sections[next]] = [sections[next], sections[index]];
  markDirty();
  renderSections();
  renderMiniPreview();
}

async function save() {
  setBusy(true, 'Guardando borrador…', 'Creando una copia de seguridad local.');
  try {
    const data = await api('/api/writings', { method: 'PUT', body: JSON.stringify({ writings }) });
    writings = data.writings;
    markDirty(false);
    populateEditor();
    showToast(data.message);
    return true;
  } catch (error) {
    showToast(error.message, true);
    return false;
  } finally {
    setBusy(false);
  }
}

async function preview() {
  const tab = window.open('about:blank', 'cde-writing-preview');
  if (!(await save())) {
    tab?.close();
    return;
  }
  setBusy(true, 'Generando vista previa…', 'El portfolio se está preparando con tus cambios.');
  try {
    await api('/api/build', { method: 'POST', body: '{}' });
    const url = `/escritos/${currentWriting().slug}/`;
    if (tab) tab.location.href = url;
    else window.open(url, '_blank', 'noopener');
    showToast('Vista previa lista.');
  } catch (error) {
    tab?.close();
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function publish() {
  if (!window.confirm('Se guardará el escrito, se comprobará todo el portfolio y se enviará un commit a GitHub. ¿Continuar?')) return;
  if (!(await save())) return;
  const message = `Update writing: ${currentWriting().title}`;
  setBusy(true, 'Publicando en GitHub…', 'Comprobando el portfolio, creando el commit y haciendo push.');
  try {
    const data = await api('/api/publish', { method: 'POST', body: JSON.stringify({ message }) });
    elements.branch.textContent = data.branch || elements.branch.textContent;
    showToast(data.published ? `${data.message} ${data.commit}` : data.message);
  } catch (error) {
    showToast(error.message, true);
  } finally {
    setBusy(false);
  }
}

elements.list.addEventListener('click', (event) => {
  const item = event.target.closest('[data-writing-index]');
  if (!item) return;
  if (dirty && !window.confirm('Hay cambios sin guardar. ¿Cambiar de escrito de todas formas?')) return;
  selectedIndex = Number(item.dataset.writingIndex);
  markDirty(false);
  populateEditor();
});

elements.form.addEventListener('input', (event) => {
  if (event.target.matches('[data-writing-field]')) updateGlobalField(event.target);
  if (event.target.matches('[data-section-field]')) updateSectionField(event.target);
  if (event.target.matches('[data-source-field]')) {
    const row = event.target.closest('[data-source-index]');
    currentWriting().sources[Number(row.dataset.sourceIndex)][event.target.dataset.sourceField] = event.target.value;
    markDirty();
  }
});

elements.sectionList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-section-action]');
  if (!button) return;
  const index = Number(button.closest('[data-section-index]').dataset.sectionIndex);
  if (button.dataset.sectionAction === 'up') moveSection(index, -1);
  if (button.dataset.sectionAction === 'down') moveSection(index, 1);
  if (button.dataset.sectionAction === 'delete') {
    if (currentWriting().sections.length === 1) return showToast('El escrito necesita al menos una sección.', true);
    if (!window.confirm('¿Eliminar esta sección?')) return;
    currentWriting().sections.splice(index, 1);
    markDirty();
    renderSections();
    renderMiniPreview();
  }
});

elements.sourceList.addEventListener('click', (event) => {
  const button = event.target.closest('[data-source-action="delete"]');
  if (!button) return;
  const index = Number(button.closest('[data-source-index]').dataset.sourceIndex);
  currentWriting().sources.splice(index, 1);
  markDirty();
  renderSources();
});

elements.newWriting.addEventListener('click', () => {
  if (dirty && !window.confirm('Hay cambios sin guardar. ¿Crear un escrito nuevo de todas formas?')) return;
  writings.push(createWriting());
  selectedIndex = writings.length - 1;
  markDirty();
  populateEditor();
  fields.title.select();
});

elements.deleteWriting.addEventListener('click', () => {
  if (writings.length === 1) return showToast('Debe existir al menos un escrito.', true);
  if (!window.confirm(`¿Eliminar “${currentWriting().title}”? La copia anterior seguirá en backups hasta guardar.`)) return;
  writings.splice(selectedIndex, 1);
  selectedIndex = Math.max(0, selectedIndex - 1);
  markDirty();
  populateEditor();
});

elements.addSection.addEventListener('click', () => {
  const index = currentWriting().sections.length + 1;
  currentWriting().sections.push({ id: `seccion-${index}`, title: `${String(index).padStart(2, '0')}. Nueva sección`, body: ['Escribe aquí el contenido de esta sección.'] });
  markDirty();
  renderSections();
  renderMiniPreview();
  elements.sectionList.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

elements.addSource.addEventListener('click', () => {
  currentWriting().sources ||= [];
  currentWriting().sources.push({ label: 'Nueva fuente', href: 'https://' });
  markDirty();
  renderSources();
});

elements.librarySearch.addEventListener('input', renderLibrary);
elements.save.addEventListener('click', save);
elements.preview.addEventListener('click', preview);
elements.publish.addEventListener('click', publish);

document.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey)) return;
  if (event.key.toLowerCase() === 's') {
    event.preventDefault();
    save();
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    preview();
  }
});

window.addEventListener('beforeunload', (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = '';
});

async function init() {
  try {
    const data = await api('/api/writings');
    writings = data.writings;
    elements.branch.textContent = data.git.branch;
    markDirty(false);
    populateEditor();
  } catch (error) {
    elements.saveState.textContent = 'No se pudo iniciar';
    showToast(error.message, true);
  }
}

init();
