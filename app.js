(function () {
  'use strict';

  const COLORS = [
    { id: 'yellow', label: '黄', value: '#f5dc58' },
    { id: 'green', label: '緑', value: '#86c878' },
    { id: 'blue', label: '青', value: '#72b8e8' },
    { id: 'pink', label: 'ピンク', value: '#ee91ad' },
    { id: 'purple', label: '紫', value: '#b296df' }
  ];

  // PDFごとの設定を追加すれば、年度を増やせます。PDFはIPA公式のURLから取得します。
  const YEARS = {
    '2025-spring': {
      label: '令和7年度', season: '春期', sourcePage: 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2025r07.html',
      docs: [
        { id: 'question', title: '問題', subtitle: '午後Ⅰ · 問題冊子', url: 'https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_st_pm1_qs.pdf' },
        { id: 'answer', title: '解答例', subtitle: '午後Ⅰ · 解答例', url: 'https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_st_pm1_ans.pdf' },
        { id: 'comment', title: '採点講評', subtitle: '午後Ⅰ · 採点講評', url: 'https://www.ipa.go.jp/shiken/mondai-kaiotu/nl10bi0000009lh8-att/2025r07h_st_pm1_cmnt.pdf' }
      ]
    }
  };

  const panelsEl = document.getElementById('panels');
  const yearSelect = document.getElementById('year-select');
  const seasonLabel = document.getElementById('season-label');
  const cacheStatus = document.getElementById('cache-status');
  const toastEl = document.getElementById('toast');
  const nameDialog = document.getElementById('name-dialog');
  const bookmarkForm = document.getElementById('bookmark-form');
  const bookmarkName = document.getElementById('bookmark-name');
  const dbPromise = openCacheDb();
  let toastTimer;
  let pendingBookmark = null;
  const panelInstances = [];

  window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  Object.keys(YEARS).forEach(function (id) {
    const option = document.createElement('option');
    option.value = id;
    option.textContent = YEARS[id].label;
    yearSelect.appendChild(option);
  });
  yearSelect.addEventListener('change', renderYear);
  document.getElementById('source-link').href = YEARS[yearSelect.value].sourcePage;
  document.getElementById('clear-cache').addEventListener('click', clearPdfCache);
  bookmarkForm.addEventListener('submit', saveBookmarkFromDialog);
  nameDialog.addEventListener('close', function () { pendingBookmark = null; });
  renderYear();
  updateCacheStatus();

  function renderYear() {
    const yearId = yearSelect.value;
    const year = YEARS[yearId];
    seasonLabel.textContent = year.season;
    document.getElementById('source-link').href = year.sourcePage;
    panelInstances.length = 0;
    panelsEl.replaceChildren();
    year.docs.forEach(function (doc, index) {
      const instance = makePanel(yearId, doc, index);
      panelInstances.push(instance);
      panelsEl.appendChild(instance.root);
      if (instance.open) loadDocument(instance);
    });
  }

  function makePanel(yearId, doc, index) {
    const key = 'st-study-v1:' + yearId + ':' + doc.id;
    const state = readState(key);
    const panel = {
      yearId: yearId, doc: doc, key: key, state: state,
      open: state.open !== false, color: state.color || 'yellow', mode: 'read',
      root: el('article', 'document-panel'), pages: [], scroll: null, stack: null,
      strip: null, count: null, selectionHint: null
    };

    const heading = el('div', 'panel-heading');
    const headingMain = el('div', 'panel-heading-main');
    const idx = el('span', 'doc-index', String(index + 1).padStart(2, '0'));
    const titleWrap = el('div');
    const title = el('h2', '', doc.title);
    const subtitle = el('span', 'panel-subtitle', doc.subtitle);
    titleWrap.append(title, subtitle);
    headingMain.append(idx, titleWrap);
    const collapse = el('button', 'collapse-button', panel.open ? '閉じる －' : '開く ＋');
    collapse.type = 'button';
    collapse.setAttribute('aria-expanded', String(panel.open));
    collapse.addEventListener('click', function () {
      panel.open = !panel.open;
      panel.root.classList.toggle('collapsed', !panel.open);
      collapse.textContent = panel.open ? '閉じる －' : '開く ＋';
      collapse.setAttribute('aria-expanded', String(panel.open));
      panel.state.open = panel.open;
      writeState(panel);
      if (panel.open && !panel.pages.length) loadDocument(panel);
      if (panel.open) setTimeout(function () { restorePosition(panel); }, 50);
    });
    heading.append(headingMain, collapse);
    panel.root.appendChild(heading);

    const toolbar = el('div', 'panel-tools');
    const left = el('div', 'tool-group');
    const highlightButton = el('button', 'tool-button', '▨ マーカー');
    highlightButton.type = 'button';
    highlightButton.title = 'PDFの文字を選択してハイライト';
    const bookmarkButton = el('button', 'tool-button', '― しおり');
    bookmarkButton.type = 'button';
    bookmarkButton.title = 'ページ上をクリックして横線しおりを置く';
    highlightButton.addEventListener('click', function () { setMode(panel, panel.mode === 'highlight' ? 'read' : 'highlight'); });
    bookmarkButton.addEventListener('click', function () { setMode(panel, panel.mode === 'bookmark' ? 'read' : 'bookmark'); });
    left.append(highlightButton, bookmarkButton);
    const picker = el('div', 'color-pick');
    COLORS.forEach(function (color) {
      const swatch = el('button', 'color-swatch');
      swatch.type = 'button';
      swatch.style.backgroundColor = color.value;
      swatch.title = color.label + 'を選択';
      swatch.setAttribute('aria-label', color.label + 'を選択');
      swatch.addEventListener('click', function () {
        panel.color = color.id;
        panel.state.color = color.id;
        updateSwatches(panel);
        writeState(panel);
      });
      picker.appendChild(swatch);
    });
    left.appendChild(picker);
    panel.count = el('span', 'panel-count', 'PDF準備中');
    toolbar.append(left, panel.count);
    panel.root.appendChild(toolbar);
    panel.buttons = { highlight: highlightButton, bookmark: bookmarkButton, swatches: Array.from(picker.children) };

    panel.strip = el('div', 'annotation-strip');
    panel.root.appendChild(panel.strip);
    panel.scroll = el('div', 'pdf-scroll');
    panel.scroll.setAttribute('aria-label', doc.title + ' PDF');
    panel.stack = el('div', 'page-stack');
    panel.scroll.appendChild(panel.stack);
    panel.root.appendChild(panel.scroll);
    panel.selectionHint = el('div', 'selection-hint');
    panel.selectionHint.hidden = true;
    panel.scroll.appendChild(panel.selectionHint);
    panel.scroll.addEventListener('scroll', function () { schedulePositionSave(panel); }, { passive: true });
    panel.scroll.addEventListener('pointerup', function (event) { handlePointerUp(panel, event); });
    panel.scroll.addEventListener('click', function (event) { handlePageClick(panel, event); });
    panel.root.classList.toggle('collapsed', !panel.open);
    updateSwatches(panel);
    drawAnnotationList(panel);
    return panel;
  }

  function setMode(panel, mode) {
    panel.mode = mode;
    panel.buttons.highlight.classList.toggle('active', mode === 'highlight');
    panel.buttons.bookmark.classList.toggle('bookmark-active', mode === 'bookmark');
    panel.selectionHint.hidden = mode === 'read';
    panel.selectionHint.textContent = mode === 'highlight'
      ? 'PDFの文字をドラッグして選択すると、ハイライトを保存します'
      : mode === 'bookmark' ? 'ページのしおりを置きたい高さをクリックしてください' : '';
    panel.scroll.classList.toggle('selecting', mode === 'highlight');
  }

  function updateSwatches(panel) {
    panel.buttons.swatches.forEach(function (button, index) {
      button.classList.toggle('selected', COLORS[index].id === panel.color);
    });
  }

  async function loadDocument(panel) {
    if (panel.loading || panel.pages.length) return;
    panel.loading = true;
    panel.stack.replaceChildren();
    panel.count.textContent = 'PDFを読み込み中…';
    const message = el('div', 'pdf-empty');
    message.innerHTML = '<strong>公式PDFを準備しています</strong>初回は取得後にこのブラウザへ保存します。次回からは保存済み資料を優先します。';
    panel.stack.appendChild(message);
    try {
      const bytes = await getPdfBytes(panel.doc.url);
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      panel.stack.replaceChildren();
      panel.pdf = pdf;
      panel.count.textContent = pdf.numPages + 'ページ';
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(220, panel.scroll.clientWidth - 34);
        const scale = Math.min(1.55, availableWidth / baseViewport.width);
        const viewport = page.getViewport({ scale: scale });
        const wrapper = el('div', 'pdf-page');
        wrapper.dataset.page = String(pageNumber);
        wrapper.style.width = viewport.width + 'px';
        wrapper.style.height = viewport.height + 'px';
        const canvas = document.createElement('canvas');
        const ratio = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.ceil(viewport.width * ratio);
        canvas.height = Math.ceil(viewport.height * ratio);
        canvas.style.width = viewport.width + 'px';
        canvas.style.height = viewport.height + 'px';
        wrapper.appendChild(canvas);
        const textLayer = el('div', 'text-layer');
        textLayer.style.width = viewport.width + 'px';
        textLayer.style.height = viewport.height + 'px';
        wrapper.appendChild(textLayer);
        const annotationLayer = el('div', 'annotation-layer');
        wrapper.appendChild(annotationLayer);
        panel.stack.appendChild(wrapper);
        const context = canvas.getContext('2d', { alpha: false });
        await page.render({ canvasContext: context, viewport: viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] }).promise;
        const textContent = await page.getTextContent();
        await window.pdfjsLib.renderTextLayer({ textContent: textContent, container: textLayer, viewport: viewport, textDivs: [] }).promise;
        panel.pages.push({ number: pageNumber, wrapper: wrapper, overlay: annotationLayer, viewport: viewport });
        drawAnnotations(panel);
      }
      panel.stack.querySelectorAll('.pdf-empty').forEach(function (node) { node.remove(); });
      panel.loading = false;
      restorePosition(panel);
      updateCacheStatus();
    } catch (error) {
      panel.loading = false;
      panel.count.textContent = '読み込みできません';
      panel.stack.replaceChildren();
      const notice = el('div', 'pdf-empty');
      notice.innerHTML = '<strong>PDFを表示できませんでした</strong>通信または公式サイト側の設定をご確認ください。下のリンクから公式PDFを開けます。';
      const link = el('a', '', 'IPA公式PDFを開く ↗');
      link.href = panel.doc.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      notice.appendChild(link);
      panel.stack.appendChild(notice);
      console.error('PDF load failed:', error);
      toast('PDFを読み込めませんでした。公式PDFリンクをお試しください');
    }
  }

  function handlePointerUp(panel, event) {
    if (panel.mode !== 'highlight') return;
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) return;
    const range = selection.getRangeAt(0);
    const pageElement = range.commonAncestorContainer.nodeType === 1
      ? range.commonAncestorContainer.closest('.pdf-page')
      : range.commonAncestorContainer.parentElement.closest('.pdf-page');
    if (!pageElement || !panel.scroll.contains(pageElement)) return;
    const page = panel.pages.find(function (item) { return item.wrapper === pageElement; });
    if (!page) return;
    const pageRect = pageElement.getBoundingClientRect();
    const rects = Array.from(range.getClientRects()).filter(function (rect) { return rect.width > 1 && rect.height > 1; });
    const marks = rects.map(function (rect) {
      return { x: (rect.left - pageRect.left) / pageRect.width, y: (rect.top - pageRect.top) / pageRect.height, w: rect.width / pageRect.width, h: rect.height / pageRect.height };
    });
    if (!marks.length) return;
    panel.state.highlights = panel.state.highlights || [];
    panel.state.highlights.push({ id: makeId(), page: page.number, color: panel.color, rects: marks, text: selection.toString().trim().slice(0, 42) });
    selection.removeAllRanges();
    writeState(panel);
    drawAnnotations(panel);
    drawAnnotationList(panel);
    toast('ハイライトを保存しました');
  }

  function handlePageClick(panel, event) {
    if (panel.mode !== 'bookmark') return;
    if (event.target.closest('.bookmark-mark')) return;
    const pageElement = event.target.closest('.pdf-page');
    if (!pageElement) return;
    const page = panel.pages.find(function (item) { return item.wrapper === pageElement; });
    if (!page) return;
    const rect = pageElement.getBoundingClientRect();
    pendingBookmark = { panel: panel, page: page.number, y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
    bookmarkName.value = '';
    nameDialog.showModal();
    setTimeout(function () { bookmarkName.focus(); }, 0);
  }

  function saveBookmarkFromDialog(event) {
    if (!pendingBookmark) return;
    event.preventDefault();
    const name = bookmarkName.value.trim();
    if (!name) return;
    const panel = pendingBookmark.panel;
    panel.state.bookmarks = panel.state.bookmarks || [];
    panel.state.bookmarks.push({ id: makeId(), page: pendingBookmark.page, y: pendingBookmark.y, color: panel.color, name: name });
    writeState(panel);
    drawAnnotations(panel);
    drawAnnotationList(panel);
    nameDialog.close();
    setMode(panel, 'read');
    toast('しおりを保存しました');
  }

  function drawAnnotations(panel) {
    panel.pages.forEach(function (page) {
      page.overlay.replaceChildren();
      (panel.state.highlights || []).filter(function (mark) { return mark.page === page.number; }).forEach(function (mark) {
        const color = COLORS.find(function (item) { return item.id === mark.color; }) || COLORS[0];
        mark.rects.forEach(function (rect) {
          const node = el('div', 'highlight-mark');
          node.style.left = (rect.x * 100) + '%'; node.style.top = (rect.y * 100) + '%';
          node.style.width = (rect.w * 100) + '%'; node.style.height = (rect.h * 100) + '%';
          node.style.backgroundColor = color.value;
          node.title = mark.text || 'クリックして削除';
          node.addEventListener('click', function (event) { event.stopPropagation(); removeAnnotation(panel, 'highlights', mark.id); });
          page.overlay.appendChild(node);
        });
      });
      (panel.state.bookmarks || []).filter(function (mark) { return mark.page === page.number; }).forEach(function (mark) {
        const color = COLORS.find(function (item) { return item.id === mark.color; }) || COLORS[0];
        const line = el('div', 'bookmark-mark');
        line.style.top = (mark.y * 100) + '%'; line.style.color = color.value;
        const label = el('span', '', mark.name); line.appendChild(label);
        line.title = mark.name + ' · クリックして削除';
        line.addEventListener('click', function (event) { event.stopPropagation(); removeAnnotation(panel, 'bookmarks', mark.id); });
        page.overlay.appendChild(line);
      });
    });
  }

  function drawAnnotationList(panel) {
    panel.strip.replaceChildren();
    const bookmarks = panel.state.bookmarks || [];
    const highlights = panel.state.highlights || [];
    if (!bookmarks.length && !highlights.length) {
      panel.strip.appendChild(el('span', 'annotation-empty', 'しおり・ハイライトはまだありません'));
      return;
    }
    bookmarks.forEach(function (mark) {
      const color = COLORS.find(function (item) { return item.id === mark.color; }) || COLORS[0];
      const chip = el('button', 'annotation-chip jump');
      chip.type = 'button';
      chip.append(el('i', 'chip-dot'), document.createTextNode(mark.name + ' · p.' + mark.page));
      chip.querySelector('.chip-dot').style.backgroundColor = color.value;
      chip.title = 'クリックして該当位置へ移動';
      chip.addEventListener('click', function () { jumpTo(panel, mark.page, mark.y); });
      const remove = el('button', 'chip-delete', '×'); remove.type = 'button'; remove.title = 'しおりを削除';
      remove.addEventListener('click', function (event) { event.stopPropagation(); removeAnnotation(panel, 'bookmarks', mark.id); });
      chip.appendChild(remove); panel.strip.appendChild(chip);
    });
    highlights.forEach(function (mark) {
      const color = COLORS.find(function (item) { return item.id === mark.color; }) || COLORS[0];
      const chip = el('span', 'annotation-chip');
      chip.append(el('i', 'chip-dot'), document.createTextNode('マーカー p.' + mark.page));
      chip.querySelector('.chip-dot').style.backgroundColor = color.value;
      const remove = el('button', 'chip-delete', '×'); remove.type = 'button'; remove.title = 'ハイライトを削除';
      remove.addEventListener('click', function () { removeAnnotation(panel, 'highlights', mark.id); });
      chip.appendChild(remove); panel.strip.appendChild(chip);
    });
  }

  function removeAnnotation(panel, collection, id) {
    panel.state[collection] = (panel.state[collection] || []).filter(function (item) { return item.id !== id; });
    writeState(panel); drawAnnotations(panel); drawAnnotationList(panel);
  }

  function jumpTo(panel, pageNumber, y) {
    const page = panel.pages.find(function (item) { return item.number === pageNumber; });
    if (!page) return;
    const rect = page.wrapper.getBoundingClientRect();
    const scrollRect = panel.scroll.getBoundingClientRect();
    const top = panel.scroll.scrollTop + rect.top - scrollRect.top + page.wrapper.offsetHeight * y - 52;
    panel.scroll.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
  }

  let saveTimers = new WeakMap();
  function schedulePositionSave(panel) {
    clearTimeout(saveTimers.get(panel));
    saveTimers.set(panel, setTimeout(function () {
      const scrollRect = panel.scroll.getBoundingClientRect();
      const visible = panel.pages.map(function (page) {
        return { page: page, distance: Math.abs(page.wrapper.getBoundingClientRect().top - scrollRect.top - 20) };
      }).sort(function (a, b) { return a.distance - b.distance; })[0];
      if (!visible) return;
      const pageRect = visible.page.wrapper.getBoundingClientRect();
      panel.state.position = { page: visible.page.number, y: Math.max(0, Math.min(1, (scrollRect.top + 20 - pageRect.top) / pageRect.height)) };
      writeState(panel);
    }, 220));
  }

  function restorePosition(panel) {
    const position = panel.state.position;
    if (!position) return;
    jumpTo(panel, position.page, position.y);
  }

  function readState(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); } catch (_) { return {}; }
  }
  function writeState(panel) {
    try { localStorage.setItem(panel.key, JSON.stringify(panel.state)); } catch (_) { toast('保存容量が不足しています'); }
  }

  function openCacheDb() {
    return new Promise(function (resolve) {
      if (!window.indexedDB) { resolve(null); return; }
      const request = indexedDB.open('it-strategy-pdf-cache', 1);
      request.onupgradeneeded = function () { request.result.createObjectStore('pdfs', { keyPath: 'url' }); };
      request.onsuccess = function () { resolve(request.result); };
      request.onerror = function () { resolve(null); };
    });
  }

  async function getPdfBytes(url) {
    const db = await dbPromise;
    if (db) {
      const cached = await dbGet(db, url);
      if (cached && cached.data) return new Uint8Array(cached.data);
    }
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const buffer = await response.arrayBuffer();
    if (db) {
      try { await dbPut(db, { url: url, data: buffer, savedAt: Date.now() }); } catch (_) { toast('資料キャッシュに保存できませんでした'); }
    }
    return new Uint8Array(buffer);
  }

  function dbGet(db, url) {
    return new Promise(function (resolve) { const request = db.transaction('pdfs', 'readonly').objectStore('pdfs').get(url); request.onsuccess = function () { resolve(request.result); }; request.onerror = function () { resolve(null); }; });
  }
  function dbPut(db, value) {
    return new Promise(function (resolve, reject) { const request = db.transaction('pdfs', 'readwrite').objectStore('pdfs').put(value); request.onsuccess = function () { resolve(); }; request.onerror = function () { reject(request.error); }; });
  }

  async function updateCacheStatus() {
    const db = await dbPromise;
    if (!db) { cacheStatus.textContent = 'ローカルキャッシュ未対応'; return; }
    const request = db.transaction('pdfs', 'readonly').objectStore('pdfs').getAll();
    request.onsuccess = function () {
      const count = request.result.length;
      cacheStatus.textContent = count ? 'PDF ' + count + '件を保存済み' : '初回閲覧時にPDFを保存';
    };
  }

  async function clearPdfCache() {
    const db = await dbPromise;
    if (!db) { toast('このブラウザではPDFキャッシュを利用できません'); return; }
    const tx = db.transaction('pdfs', 'readwrite');
    tx.objectStore('pdfs').clear();
    tx.oncomplete = function () { updateCacheStatus(); toast('保存済みPDFを削除しました'); };
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, 2400);
  }
  function makeId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
}());
