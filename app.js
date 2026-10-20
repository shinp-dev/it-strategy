(function () {
  'use strict';

  const COLORS = [
    { id: 'yellow', label: '黄', value: '#f5dc58' },
    { id: 'green', label: '緑', value: '#86c878' },
    { id: 'blue', label: '青', value: '#72b8e8' },
    { id: 'pink', label: 'ピンク', value: '#ee91ad' },
    { id: 'purple', label: '紫', value: '#b296df' }
  ];

  const DOCS = [
    { id: 'question', title: '問題', subtitle: '午後Ⅰ · 問題冊子', suffix: 'qs' },
    { id: 'answer', title: '解答例', subtitle: '午後Ⅰ · 解答例', suffix: 'ans' },
    { id: 'comment', title: '採点講評', subtitle: '午後Ⅰ · 採点講評', suffix: 'cmnt' }
  ];

  function exam(id, label, season, sourcePage, assetDirectory, filePrefix) {
    return {
      label: label, season: season, sourcePage: sourcePage,
      docs: DOCS.map(function (doc) {
        return {
          id: doc.id, title: doc.title, subtitle: doc.subtitle,
          url: '/api/pdf/' + doc.id + '?year=' + id,
          sourceUrl: 'https://www.ipa.go.jp/shiken/mondai-kaiotu/' + assetDirectory + '/' + filePrefix + '_st_pm1_' + doc.suffix + '.pdf'
        };
      })
    };
  }

  // IPAが午後Ⅰの資料を公開している試験回。令和2年度はITストラテジスト試験の実施なし。
  const YEARS = {
    '2025-spring': exam('2025-spring', '令和7年度', '春期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2025r07.html', 'nl10bi0000009lh8-att', '2025r07h'),
    '2024-spring': exam('2024-spring', '令和6年度', '春期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2024r06.html', 'm42obm000000afqx-att', '2024r06h'),
    '2023-spring': exam('2023-spring', '令和5年度', '春期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2023r05.html', 'ps6vr70000010d6y-att', '2023r05h'),
    '2022-spring': exam('2022-spring', '令和4年度', '春期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2022r04.html', 'gmcbt80000009sgk-att', '2022r04h'),
    '2021-spring': exam('2021-spring', '令和3年度', '春期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2021r03.html', 'gmcbt8000000d5ru-att', '2021r03h'),
    '2019-autumn': exam('2019-autumn', '令和元年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2019h31.html', 'gmcbt8000000dict-att', '2019r01a'),
    '2018-autumn': exam('2018-autumn', '平成30年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2018h30.html', 'gmcbt8000000f01f-att', '2018h30a'),
    '2017-autumn': exam('2017-autumn', '平成29年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2017h29.html', 'gmcbt8000000fqpm-att', '2017h29a'),
    '2016-autumn': exam('2016-autumn', '平成28年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2016h28.html', 'gmcbt8000000g6fw-att', '2016h28a'),
    '2015-autumn': exam('2015-autumn', '平成27年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2015h27.html', 'gmcbt8000000gxj0-att', '2015h27a'),
    '2014-autumn': exam('2014-autumn', '平成26年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2014h26.html', 'ug65p90000000ye5-att', '2014h26a'),
    '2013-autumn': exam('2013-autumn', '平成25年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2013h25.html', 'ug65p900000027za-att', '2013h25a'),
    '2012-autumn': exam('2012-autumn', '平成24年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2012h24.html', 'ug65p90000002h5m-att', '2012h24a'),
    '2011-autumn': exam('2011-autumn', '平成23年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2011h23.html', 'ug65p90000003ojp-att', '2011h23a'),
    '2010-autumn': exam('2010-autumn', '平成22年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2010h22.html', 'ug65p90000004d6f-att', '2010h22a'),
    '2009-autumn': exam('2009-autumn', '平成21年度', '秋期', 'https://www.ipa.go.jp/shiken/mondai-kaiotu/2009h21.html', 'gmcbt8000000f3yi-att', '2009h21a')
  };

  const panelsEl = document.getElementById('panels');
  const documentPickerEl = document.getElementById('document-picker');
  const yearSelect = document.getElementById('year-select');
  const seasonLabel = document.getElementById('season-label');
  const cacheStatus = document.getElementById('cache-status');
  const toastEl = document.getElementById('toast');
  const nameDialog = document.getElementById('name-dialog');
  const bookmarkForm = document.getElementById('bookmark-form');
  const bookmarkName = document.getElementById('bookmark-name');
  const dbPromise = openCacheDb();
  let toastTimer;
  let panelLayoutTimer;
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
    documentPickerEl.replaceChildren();
    year.docs.forEach(function (doc, index) {
      const instance = makePanel(yearId, doc, index);
      panelInstances.push(instance);
      panelsEl.appendChild(instance.root);
      const label = el('label', 'document-toggle');
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = instance.visible;
      checkbox.setAttribute('aria-label', doc.title + 'を表示');
      checkbox.addEventListener('change', function () { setPanelVisibility(instance, checkbox.checked); });
      label.append(checkbox, document.createTextNode(doc.title));
      documentPickerEl.appendChild(label);
      instance.root.hidden = !instance.visible;
      if (instance.visible) loadDocument(instance);
    });
    updatePanelLayout();
  }

  function setPanelVisibility(panel, visible) {
    panelInstances.forEach(function (item) { if (item.visible) rememberPosition(item); });
    panel.visible = visible;
    panel.state.visible = visible;
    panel.root.hidden = !visible;
    writeState(panel);
    updatePanelLayout();
    if (visible && !panel.pages.length) loadDocument(panel);
    clearTimeout(panelLayoutTimer);
    panelLayoutTimer = setTimeout(refreshVisiblePanels, 260);
  }

  function updatePanelLayout() {
    const visiblePanels = panelInstances.filter(function (panel) { return panel.visible; });
    panelsEl.dataset.visibleCount = String(visiblePanels.length);
    panelsEl.style.setProperty('--visible-count', String(Math.max(1, visiblePanels.length)));
    visiblePanels.forEach(function (panel, index) { panel.root.dataset.visibleIndex = String(index + 1); });
  }
  function makePanel(yearId, doc, index) {
    const key = 'st-study-v1:' + yearId + ':' + doc.id;
    const state = readState(key);
    const panel = {
      yearId: yearId, doc: doc, key: key, state: state,
      visible: state.visible !== false, zoom: typeof state.zoom === 'number' ? state.zoom : 1, color: state.color || 'yellow', mode: 'read',
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
    heading.appendChild(headingMain);
    panel.root.appendChild(heading);

    const toolbar = el('div', 'panel-tools');
    const left = el('div', 'tool-group');
    const highlightButton = el('button', 'tool-button', '▨ マーカー');
    highlightButton.type = 'button';
    highlightButton.title = 'PDF上を横方向にドラッグしてマーカー線を引く';
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
    const zoom = el('div', 'zoom-tools');
    const zoomLabel = el('span', 'zoom-label');
    zoom.title = 'Ctrl + マウスホイールで、カーソル位置を中心に拡大・縮小';
    zoom.appendChild(zoomLabel);
    panel.zoomLabel = zoomLabel;
    updateZoomLabel(panel);

    panel.count = el('span', 'panel-count', 'PDF準備中');
    toolbar.append(left, zoom, panel.count);
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
    panel.scroll.addEventListener('wheel', function (event) { handleZoomWheel(panel, event); }, { passive: false });
    panel.scroll.addEventListener('pointerdown', function (event) { handleMarkerPointerDown(panel, event); });
    panel.scroll.addEventListener('pointermove', function (event) { handleMarkerPointerMove(panel, event); });
    panel.scroll.addEventListener('pointerup', function (event) { handleMarkerPointerUp(panel, event); });
    panel.scroll.addEventListener('pointercancel', function () { cancelMarkerDraft(panel); });
    panel.scroll.addEventListener('click', function (event) { handlePageClick(panel, event); });
    updateSwatches(panel);
    drawAnnotationList(panel);
    return panel;
  }

  function refreshVisiblePanels() {
    panelInstances.forEach(function (panel) {
      if (!panel.visible || !panel.pages.length || panel.loading) return;
      loadDocument(panel, true);
    });
  }
  function updateZoomLabel(panel) {
    if (panel.zoomLabel) panel.zoomLabel.textContent = Math.round(panel.zoom * 100) + '%';
  }

  function handleZoomWheel(panel, event) {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    if (!panel.pages.length || panel.loading) return;

    const nextZoom = Math.max(0.5, Math.min(2, Math.round((panel.zoom + (event.deltaY < 0 ? 0.1 : -0.1)) * 100) / 100));
    if (nextZoom === panel.zoom) return;

    const pageElement = event.target.closest('.pdf-page');
    const page = pageElement && panel.pages.find(function (item) { return item.wrapper === pageElement; });
    if (page) {
      const pageRect = page.wrapper.getBoundingClientRect();
      const scrollRect = panel.scroll.getBoundingClientRect();
      panel.zoomAnchor = {
        page: page.number,
        x: Math.max(0, Math.min(1, (event.clientX - pageRect.left) / pageRect.width)),
        y: Math.max(0, Math.min(1, (event.clientY - pageRect.top) / pageRect.height)),
        screenX: event.clientX - scrollRect.left,
        screenY: event.clientY - scrollRect.top
      };
    }

    panel.zoom = nextZoom;
    panel.state.zoom = nextZoom;
    updateZoomLabel(panel);
    writeState(panel);
    clearTimeout(panel.zoomTimer);
    panel.zoomTimer = setTimeout(function () {
      if (panel.loading || !panel.visible) return;
      loadDocument(panel, true);
    }, 180);
  }

  function restoreZoomAnchor(panel) {
    const anchor = panel.zoomAnchor;
    if (!anchor) return false;
    const page = panel.pages.find(function (item) { return item.number === anchor.page; });
    if (!page) return false;
    const pageRect = page.wrapper.getBoundingClientRect();
    const scrollRect = panel.scroll.getBoundingClientRect();
    const targetX = pageRect.left + pageRect.width * anchor.x;
    const targetY = pageRect.top + pageRect.height * anchor.y;
    panel.scroll.scrollLeft += targetX - (scrollRect.left + anchor.screenX);
    panel.scroll.scrollTop += targetY - (scrollRect.top + anchor.screenY);
    panel.zoomAnchor = null;
    return true;
  }
  function setMode(panel, mode) {
    panel.mode = mode;
    panel.buttons.highlight.classList.toggle('active', mode === 'highlight');
    panel.buttons.bookmark.classList.toggle('bookmark-active', mode === 'bookmark');
    panel.selectionHint.hidden = mode === 'read';
    panel.selectionHint.textContent = mode === 'highlight'
      ? 'PDF上を横方向にドラッグしてマーカー線を引きます'
      : mode === 'bookmark' ? 'ページのしおりを置きたい高さをクリックしてください' : '';
    panel.scroll.classList.toggle('marking', mode === 'highlight');
  }

  function updateSwatches(panel) {
    panel.buttons.swatches.forEach(function (button, index) {
      button.classList.toggle('selected', COLORS[index].id === panel.color);
    });
  }

  async function loadDocument(panel, keepCurrentPages) {
    const keepCurrent = keepCurrentPages === true && panel.pages.length > 0;
    if (panel.loading || (!keepCurrent && panel.pages.length)) return;

    const previousPages = panel.pages;
    const previousZoom = typeof panel.renderedZoom === 'number' ? panel.renderedZoom : panel.zoom;
    const renderStack = keepCurrent ? el('div', 'page-stack pdf-render-stage') : panel.stack;
    if (keepCurrent) {
      renderStack.style.width = panel.scroll.clientWidth + 'px';
      panel.scroll.appendChild(renderStack);
    }

    panel.loading = true;
    if (!keepCurrent) {
      panel.stack.replaceChildren();
      panel.count.textContent = 'PDFを読み込み中…';
      const message = el('div', 'pdf-empty');
      message.innerHTML = '<strong>公式PDFを準備しています</strong>初回は取得後にこのブラウザへ保存します。次回からは保存済み資料を優先します。';
      panel.stack.appendChild(message);
    }
    try {
      const bytes = await getPdfBytes(panel.doc.url);
      const pdf = await window.pdfjsLib.getDocument({ data: bytes }).promise;
      if (!keepCurrent) panel.stack.replaceChildren();
      panel.pages = [];
      panel.pdf = pdf;
      panel.count.textContent = pdf.numPages + 'ページ';
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const baseViewport = page.getViewport({ scale: 1 });
        const availableWidth = Math.max(220, panel.scroll.clientWidth - 12);
        const scale = Math.min(3, Math.max(0.4, availableWidth / baseViewport.width * panel.zoom));
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
        renderStack.appendChild(wrapper);
        const context = canvas.getContext('2d', { alpha: false });
        await page.render({ canvasContext: context, viewport: viewport, transform: ratio === 1 ? null : [ratio, 0, 0, ratio, 0, 0] }).promise;
        const textContent = await page.getTextContent();
        await window.pdfjsLib.renderTextLayer({ textContent: textContent, container: textLayer, viewport: viewport, textDivs: [] }).promise;
        panel.pages.push({ number: pageNumber, wrapper: wrapper, overlay: annotationLayer, viewport: viewport });
        drawAnnotations(panel);
      }

      if (keepCurrent) {
        panel.stack.replaceChildren.apply(panel.stack, Array.from(renderStack.childNodes));
        renderStack.remove();
      } else {
        panel.stack.querySelectorAll('.pdf-empty').forEach(function (node) { node.remove(); });
      }
      panel.renderedZoom = panel.zoom;
      panel.loading = false;
      if (restoreZoomAnchor(panel)) rememberPosition(panel);
      else restorePosition(panel);
      updateCacheStatus();
    } catch (error) {
      panel.loading = false;
      if (keepCurrent) {
        renderStack.remove();
        panel.pages = previousPages;
        panel.zoom = previousZoom;
        panel.state.zoom = previousZoom;
        panel.zoomAnchor = null;
        updateZoomLabel(panel);
        writeState(panel);
        toast('PDFの倍率を変更できませんでした');
        console.error('PDF zoom render failed:', error);
        return;
      }
      panel.count.textContent = '読み込みできません';
      panel.stack.replaceChildren();
      const notice = el('div', 'pdf-empty');
      notice.innerHTML = '<strong>PDFを表示できませんでした</strong>通信または公式サイト側の設定をご確認ください。下のリンクから公式PDFを開けます。';
      const link = el('a', '', 'IPA公式PDFを開く ↗');
      link.href = panel.doc.sourceUrl || panel.doc.url;
      link.target = '_blank';
      link.rel = 'noreferrer';
      notice.appendChild(link);
      panel.stack.appendChild(notice);
      console.error('PDF load failed:', error);
      toast('PDFを読み込めませんでした。公式PDFリンクをお試しください');
    }
  }

  function handleMarkerPointerDown(panel, event) {
    if (panel.mode !== 'highlight' || event.button !== 0) return;
    if (event.target.closest('.highlight-mark, .bookmark-mark')) return;
    const pageElement = event.target.closest('.pdf-page');
    if (!pageElement) return;
    const page = panel.pages.find(function (item) { return item.wrapper === pageElement; });
    if (!page) return;
    const rect = pageElement.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
    const preview = el('div', 'highlight-mark marker-preview');
    panel.markerDraft = { page: page, startX: x, endX: x, y: y, preview: preview, pointerId: event.pointerId };
    page.overlay.appendChild(preview);
    updateMarkerPreview(panel);
    event.preventDefault();
    try { panel.scroll.setPointerCapture(event.pointerId); } catch (_) {}
  }

  function handleMarkerPointerMove(panel, event) {
    if (!panel.markerDraft || panel.markerDraft.pointerId !== event.pointerId) return;
    const rect = panel.markerDraft.page.wrapper.getBoundingClientRect();
    panel.markerDraft.endX = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    updateMarkerPreview(panel);
  }

  function handleMarkerPointerUp(panel, event) {
    const draft = panel.markerDraft;
    if (!draft || draft.pointerId !== event.pointerId) return;
    handleMarkerPointerMove(panel, event);
    const x = Math.min(draft.startX, draft.endX);
    const width = Math.abs(draft.endX - draft.startX);
    panel.markerDraft = null;
    if (width < 0.008) {
      draft.preview.remove();
      return;
    }
    panel.state.highlights = panel.state.highlights || [];
    panel.state.highlights.push({
      id: makeId(), page: draft.page.number, color: panel.color,
      x: x, y: draft.y, w: width
    });
    writeState(panel);
    drawAnnotations(panel);
    drawAnnotationList(panel);
    toast('マーカー線を保存しました');
  }

  function updateMarkerPreview(panel) {
    const draft = panel.markerDraft;
    if (!draft) return;
    const color = COLORS.find(function (item) { return item.id === panel.color; }) || COLORS[0];
    draft.preview.style.left = (Math.min(draft.startX, draft.endX) * 100) + '%';
    draft.preview.style.top = (draft.y * 100) + '%';
    draft.preview.style.width = (Math.max(0.008, Math.abs(draft.endX - draft.startX)) * 100) + '%';
    draft.preview.style.backgroundColor = color.value;
  }

  function cancelMarkerDraft(panel) {
    if (!panel.markerDraft) return;
    panel.markerDraft.preview.remove();
    panel.markerDraft = null;
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
        if (Array.isArray(mark.rects)) {
          mark.rects.forEach(function (rect) {
            const node = el('div', 'highlight-mark legacy-highlight-mark');
            node.style.left = (rect.x * 100) + '%';
            node.style.top = (rect.y * 100) + '%';
            node.style.width = (rect.w * 100) + '%';
            node.style.height = (rect.h * 100) + '%';
            node.style.backgroundColor = color.value;
            node.title = mark.text || 'クリックして削除';
            node.addEventListener('click', function (event) { event.stopPropagation(); removeAnnotation(panel, 'highlights', mark.id); });
            page.overlay.appendChild(node);
          });
        } else {
          const node = el('div', 'highlight-mark');
          node.style.left = (mark.x * 100) + '%';
          node.style.top = (mark.y * 100) + '%';
          node.style.width = (mark.w * 100) + '%';
          node.style.backgroundColor = color.value;
          node.title = 'クリックして削除';
          node.addEventListener('click', function (event) { event.stopPropagation(); removeAnnotation(panel, 'highlights', mark.id); });
          page.overlay.appendChild(node);
        }
      });
      (panel.state.bookmarks || []).filter(function (mark) { return mark.page === page.number; }).forEach(function (mark) {
        const color = COLORS.find(function (item) { return item.id === mark.color; }) || COLORS[0];
        const line = el('div', 'bookmark-mark');
        line.style.top = (mark.y * 100) + '%';
        line.style.color = color.value;
        const label = el('span', '', mark.name);
        line.appendChild(label);
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
    if (!bookmarks.length && !highlights.length) { panel.strip.hidden = true; return; }
    panel.strip.hidden = false;
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
  function rememberPosition(panel) {
    if (!panel.pages.length) return;
    const scrollRect = panel.scroll.getBoundingClientRect();
    const visible = panel.pages.map(function (page) {
      return { page: page, distance: Math.abs(page.wrapper.getBoundingClientRect().top - scrollRect.top - 20) };
    }).sort(function (a, b) { return a.distance - b.distance; })[0];
    if (!visible) return;
    const pageRect = visible.page.wrapper.getBoundingClientRect();
    panel.state.position = { page: visible.page.number, y: Math.max(0, Math.min(1, (scrollRect.top + 20 - pageRect.top) / pageRect.height)) };
    writeState(panel);
  }

  function schedulePositionSave(panel) {
    clearTimeout(saveTimers.get(panel));
    saveTimers.set(panel, setTimeout(function () { rememberPosition(panel); }, 220));
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
