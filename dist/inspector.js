'use strict';

document.querySelectorAll('[data-area]').forEach(button => {
  button.onclick = () => showSettings(button.dataset.area);
});
document.querySelectorAll('[data-fold]').forEach(button => {
  button.onclick = () => {
    stopPlay();
    $('folding').value = button.dataset.fold;
    rebuildGeometry();
  };
});

$('centerArt').onclick = () => {
  offsetX = offsetY = 0;
  $('size').value = 100;
  $('angle').value = 0;
  syncField('size');
  syncField('angle');
  updateArtwork();
};
$('demo').addEventListener('click', () => { syncField('size'); syncField('angle'); });

const numericFields = new Map();
function syncField(id) {
  const field = numericFields.get(id);
  if (field) field.value = $(id).value;
}

for (const [id, output] of [
  ['base','baseOut'], ['glue','glueOut'], ['height','heightOut'], ['dieScale','dieScaleOut'],
  ['opacity','pct'], ['size','sizeOut'], ['angle','angleOut']
]) {
  const range = $(id), label = $(output), field = document.createElement('input');
  field.type = 'number';
  field.min = range.min;
  field.max = range.max;
  field.step = range.step || '1';
  field.value = range.value;
  field.setAttribute('aria-label', range.labels[0].textContent + '数值');
  field.className = 'precise';
  const wrap = document.createElement('span');
  wrap.className = 'unit-input';
  wrap.append(field, id === 'angle' ? '°' : '%');
  label.replaceWith(wrap);
  numericFields.set(id, field);
  const apply = () => {
    if (field.value !== '' && Number.isFinite(field.valueAsNumber) && field.value !== range.value) {
      range.value = field.value;
      range.dispatchEvent(new Event('input', { bubbles:true }));
    }
    syncField(id);
  };
  field.oninput = () => { if (field.checkValidity() && field.value !== '') apply(); };
  field.onblur = apply;
  field.onkeydown = e => { if (e.key === 'Enter') field.blur(); };
  range.addEventListener('input', () => syncField(id));
  range.addEventListener('change', () => syncField(id));
}

for (const key of ['diameter','labelHeight']) {
  $(key).onchange = () => {
    const old = catalog[id], field = $(key);
    if (!old.bottle) return;
    if (!field.checkValidity() || !field.value) {
      field.value = old[key];
      notifyUser('请输入尺寸范围内的数值');
      return;
    }
    const model = makeBottle(id, +$('diameter').value, +$('labelHeight').value);
    prepare(model);
    catalog[id] = model;
    $('labelSize').textContent = '展开宽度 ' + model.width.toFixed(1) + ' mm';
    updateArtwork();
  };
}
