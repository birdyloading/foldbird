'use strict';

let atlas = null, offsetX = 0, offsetY = 0, selectedPanel = -1;
let animation = 0, drag = null, importCount = 0;

function stopPlay() {
  cancelAnimationFrame(animation);
  animation = 0;
  $('play').textContent = '播放';
  $('play').setAttribute('aria-label','播放折叠');
}

function drawThumbnails() {
  thumbs.forEach(([canvas, n]) => render(canvas, catalog[n], true));
}

function toggleShelf(show) {
  $('shelf').hidden = !show;
  $('pick').setAttribute('aria-expanded', String(show));
  if (show) drawThumbnails();
}

function rebuildGeometry(updateTexture = false) {
  const prior = catalog[id], progress = +$('folding').value / 100, scale = +$('dieScale').value / 100;
  let model;
  if (id === 6) {
    model = { ...hexSample(28.3 * +$('height').value / 100, progress, +$('base').value / 100, +$('glue').value / 100),
      reference:prior.reference, summary:prior.summary, foldable:true };
  } else if (id === 8) {
    model = pillowModel(progress, scale);
  } else if (prior.design) {
    model = buildPanelModel(prior.design, id, progress, scale, { reference:prior.reference, summary:prior.summary, upright:prior.upright });
  } else {
    return;
  }
  model.progress = progress;
  prepare(model);
  catalog[id] = model;
  $('foldOut').textContent = $('folding').value + '%';
  if (updateTexture) updateArtwork();
  else redraw();
}

function drawArtwork(target, width, height) {
  const ctx = target.getContext('2d');
  const fit = $('fit').value === 'cover' ? Math.max : Math.min;
  const s = fit(width / art.width, height / art.height) * +$('size').value / 100;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  ctx.translate(width * (.5 + offsetX), height * (.5 + offsetY));
  ctx.rotate(+$('angle').value * Math.PI / 180);
  ctx.drawImage(art, -art.width * s / 2, -art.height * s / 2, art.width * s, art.height * s);
}

function updateArtwork() {
  const m = catalog[id];
  if (m.referenceOnly) return;
  if (art) {
    const [, , w, h] = m.box.split(/\s+/).map(Number);
    const scale = 1000 / Math.max(w,h);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w * scale));
    c.height = Math.max(1, Math.round(h * scale));
    drawArtwork(c, c.width, c.height);
    atlas = c;
  } else {
    atlas = null;
  }
  refreshFlat();
  redraw();
}

function refreshFlat() {
  const m = catalog[id];
  if (!m.referenceOnly) $('flat').innerHTML = svg(m, { overlay:$('overlay').checked && m.reference, artwork:atlas?.toDataURL() || '', hit:true });
}

function setArt(image, label) {
  art = image;
  $('filename').textContent = label;
  $('remove').hidden = !image;
  updateArtwork();
}

function loadImage(file) {
  if (!file) return;
  if (file.size > 30 * 1024 * 1024) {
    notifyUser('请选择 30 MB 以下的设计稿');
    return;
  }
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    notifyUser('请使用 PNG、JPG 或 WebP 图片');
    return;
  }
  const token = ++generation, url = URL.createObjectURL(file), image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    if (token !== generation) return;
    setArt(image, file.name);
    if (mode === 'ref') selectMode('both');
    notifyUser('已加载设计稿');
  };
  image.onerror = () => {
    URL.revokeObjectURL(url);
    if (token === generation) notifyUser('图片无法读取，请重新选择');
  };
  image.src = url;
}

function demoArtwork() {
  generation++;
  const c = document.createElement('canvas');
  c.width = 870; c.height = 700;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#eee7d4';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = '#357b65';
  ctx.lineWidth = 24;
  for (let i = -620; i < 1150; i += 69) {
    ctx.beginPath();
    ctx.moveTo(i, -50);
    ctx.bezierCurveTo(i + 470, 220, i - 110, 514, i + 380, 760);
    ctx.stroke();
  }
  ctx.fillStyle = '#e98962';
  ctx.beginPath();
  ctx.arc(420, 340, 93, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#162f26';
  ctx.font = 'bold 34px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Foldbird', 420, 350);
  offsetX = offsetY = 0;
  $('size').value = 100;
  $('angle').value = 0;
  setArt(c, '跨面测试图');
}

function initEditor() {
  $('pick').onclick = () => toggleShelf($('shelf').hidden);
  $('closeShelf').onclick = () => { toggleShelf(false); $('pick').focus(); };
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('shelf').hidden) $('closeShelf').click();
  });
  $('overlay').onchange = refreshFlat;
  $('folding').oninput = () => { stopPlay(); rebuildGeometry(); };
  $('restoreDie').onclick = () => {
    for (const key of ['base', 'glue', 'height']) {
      $(key).value = 100;
      syncField(key);
    }
    rebuildGeometry(true);
  };
  for (const key of ['base', 'glue', 'height', 'dieScale']) {
    $(key).oninput = () => { stopPlay(); rebuildGeometry(true); };
  }
  $('play').onclick = () => {
    if (animation) {
      stopPlay();
      return;
    }
    const start = performance.now();
    $('play').textContent = '暂停';
    $('play').setAttribute('aria-label','暂停折叠');
    function frame(t) {
      const v = Math.min(100, Math.round((t - start) / 26));
      if (+$('folding').value !== v) {
        $('folding').value = v;
        rebuildGeometry();
      }
      if (v < 100) animation = requestAnimationFrame(frame);
      else stopPlay();
    }
    animation = requestAnimationFrame(frame);
  };

  $('fit').onchange = updateArtwork;
  $('opacity').oninput = refreshFlatAndStage;
  $('angle').oninput = $('size').oninput = updateArtwork;
  $('demo').onclick = demoArtwork;
  $('file').onchange = e => loadImage(e.target.files[0]);
  $('drop').ondragover = e => { e.preventDefault(); $('drop').classList.add('is-over'); };
  $('drop').ondragleave = () => $('drop').classList.remove('is-over');
  $('drop').ondrop = e => {
    e.preventDefault();
    $('drop').classList.remove('is-over');
    loadImage(e.dataTransfer.files[0]);
  };
  $('remove').onclick = () => {
    generation++;
    $('file').value = '';
    setArt(null, 'PNG、JPG 或 WebP');
  };
  const flat = $('flat');
  flat.onpointerdown = e => {
    const target = e.target.closest('[data-panel]');
    if (!target) return;
    const svgNode = target.ownerSVGElement, box = svgNode.viewBox.baseVal;
    const rect = svgNode.getBoundingClientRect();
    const factor = Math.min(rect.width / box.width, rect.height / box.height);
    selectedPanel = +target.dataset.panel;
    drag = {x:e.clientX, y:e.clientY, ox:offsetX, oy:offsetY, w:factor * box.width, h:factor * box.height};
    flat.setPointerCapture(e.pointerId);
    refreshFlatAndStage();
  };
  flat.onpointermove = e => {
    if (!art || !drag) return;
    offsetX = drag.ox + (e.clientX - drag.x) / drag.w;
    offsetY = drag.oy + (e.clientY - drag.y) / drag.h;
    updateArtwork();
  };
  flat.onlostpointercapture = () => { drag = null; };
  $('photo').onclick = () => {
    redraw();
    const src = $('model'), out = document.createElement('canvas');
    out.width = src.width; out.height = src.height;
    const c = out.getContext('2d');
    c.fillStyle = scenes[+$('scene').value].bg;
    c.fillRect(0, 0, out.width, out.height);
    c.drawImage(src, 0, 0);
    out.toBlob(blob => { if (blob) downloadBlob(blob, catalog[id].name + '-样机.png'); }, 'image/png');
  };
  $('structureFile').onchange = async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      if (file.size > 250000) throw Error('结构 JSON 请控制在 250 KB 以内。');
      if (importCount >= 25) throw Error('本次已载入 25 个结构。刷新页面可继续导入。');
      const design = compileStructure(JSON.parse(await file.text()));
      const modelId = catalog.length, model = buildPanelModel(design, modelId, 1, 1);
      prepare(model);
      catalog.push(model);
      if (!importCount++) cardHeading('本次导入');
      addCard(modelId);
      $('importMessage').textContent = '';
      activate(modelId);
      selectMode('both');
      notifyUser('已导入结构');
    } catch (error) {
      $('importMessage').textContent = error instanceof SyntaxError ? 'JSON 文件格式有误。' : error.message;
    }
  };
}

function refreshFlatAndStage() {
  refreshFlat();
  redraw();
}
