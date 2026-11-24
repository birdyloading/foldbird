'use strict';
const $ = id => document.getElementById(id);
const palette = ['#f2eee3','#e0bb96','#ae845d','#b4cbc9','#bcb0ca','#48534e'];
const colorNames = ['象牙白','杏仁色','牛皮纸','雾蓝','淡紫','石墨灰'];
const scenes = [
  {bg:'#e5ebe3',light:[-.5,.78,.48],ambient:.76},
  {bg:'#f0e1d1',light:[-.91,.35,.18],ambient:.68},
  {bg:'#293d48',light:[.82,.48,-.3],ambient:.62}
];
let id = 6, mode = 'both', yaw = -.58, pitch = .67, zoom = 1;
let color = palette[0], art = null, generation = 0, statusTimer;
const dot=(a,b)=>a.reduce((n,v,i)=>n+v*b[i],0);
const sub=(a,b)=>a.map((v,i)=>v-b[i]);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const unit=a=>a.map(v=>v/(Math.hypot(...a)||1));
function prepare(m){
 const points=m.faces.flatMap(f=>f.p||f),bounds=[0,1,2].map(k=>[Math.min(...points.map(p=>p[k])),Math.max(...points.map(p=>p[k]))]);
 m.center=bounds.map(([a,b])=>(a+b)/2);
 m.radius=Math.max(...points.map(p=>Math.hypot(...sub(p,m.center))))||1;
 m.surface=m.faces.map(f=>{
  const p=f.p||f;let v=[0,0,0];
  p.forEach((a,i)=>{const b=p[(i+1)%p.length];const e=cross(sub(a,p[0]),sub(b,p[0]));v=v.map((x,j)=>x+e[j])});
  const n=unit(v),up=Math.abs(n[1])>.86?[0,0,-1]:[0,1,0],u=unit(cross(up,n)),w=unit(cross(n,u));
  const us=p.map(a=>dot(a,u)),vs=p.map(a=>dot(a,w));
  return {p,print:f.print!==false,h:f.h||[],uv:f.uv,n,u,w,range:[Math.min(...us),Math.max(...us),Math.min(...vs),Math.max(...vs)],seam:f.seam??(f.uv?false:undefined),panelIndex:f.panelIndex,internal:f.internal};
 });
}
function render(canvas,m,thumbnail=false){
 const r=canvas.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,2),W=r.width,H=r.height;if(!W||!H)return;
 if(canvas.width!==Math.round(W*ratio)||canvas.height!==Math.round(H*ratio)){canvas.width=Math.round(W*ratio);canvas.height=Math.round(H*ratio)}
 const c=canvas.getContext('2d');c.setTransform(ratio,0,0,ratio,0,0);c.clearRect(0,0,W,H);
 const ay=thumbnail?-.52:yaw,ax=thumbnail?.32:pitch,S=Math.min(W,H)*(thumbnail?.43:.40)*(thumbnail?1:zoom)/m.radius;
 const xAxis=[Math.cos(ay),0,Math.sin(ay)],zAxis=[-Math.sin(ay)*Math.cos(ax),Math.sin(ax),Math.cos(ay)*Math.cos(ax)],yAxis=cross(zAxis,xAxis);
 const proj=p=>{const d=sub(p,m.center);return [W/2+dot(d,xAxis)*S,H*.50-dot(d,yAxis)*S,dot(d,zAxis)]};
 const scene=scenes[thumbnail?0:+$('scene').value],hex=thumbnail?'#b5a78d':color,rgb=[1,3,5].map(k=>parseInt(hex.slice(k,k+2),16));
 const surfaces=m.surface.filter(f=>!f.internal||(m.progress??1)<.975).map(f=>{const q=f.p.map(proj);return {f,q,depth:q.reduce((a,v)=>a+v[2],0)/q.length}}).sort((a,b)=>a.depth-b.depth);
 const path=q=>{c.moveTo(q[0][0],q[0][1]);q.slice(1).forEach(p=>c.lineTo(p[0],p[1]));c.closePath()};
 if(!thumbnail){c.save();c.translate(W/2,H*.76);c.scale(1,.12);const s=Math.min(W,H)*.31;const g=c.createRadialGradient(0,0,0,0,0,s);g.addColorStop(0,'#34443138');g.addColorStop(1,'#34443100');c.fillStyle=g;c.fillRect(-s,-s,s*2,s*2);c.restore()}
 for(const {f,q} of surfaces){
 const n=dot(f.n,zAxis)<0?f.n.map(v=>-v):f.n;
 const light=scene.ambient+.28*dot(n,scene.light);
 c.beginPath();path(q);f.h.forEach(h=>path(h.map(proj)));
 c.fillStyle='rgb('+rgb.map(x=>Math.min(255,Math.max(0,Math.round(x*light)))).join(',')+')';c.fill('evenodd');
 if(art&&!thumbnail&&f.print){c.save();c.clip('evenodd');const [u0,u1,v0,v1]=f.range;
 const du=u1-u0,dv=v1-v0; if(du>1e-7&&dv>1e-7){
 const scale=($('fit').value==='cover'?Math.max:Math.min)(du/art.width,dv/art.height);
 let base=f.p[0].map((v,i)=>v+f.u[i]*((u0+u1-art.width*scale)/2-dot(f.p[0],f.u))+f.w[i]*((v0+v1+art.height*scale)/2-dot(f.p[0],f.w)));
 const o=proj(base),dx=proj(base.map((v,i)=>v+scale*f.u[i])),dy=proj(base.map((v,i)=>v-scale*f.w[i]));
 c.globalAlpha=+$('opacity').value/100;
 if(f.uv&&f.uv.length===q.length){drawUV(c,q,f.uv,m.panels||m.bottle?atlas:art,m.panels||m.bottle?'atlas':$('fit').value)}else{c.transform(dx[0]-o[0],dx[1]-o[1],dy[0]-o[0],dy[1]-o[1],o[0],o[1]);c.drawImage(art,0,0)}
 }c.restore();c.save();c.beginPath();path(q);f.h.forEach(h=>path(h.map(proj)));c.fillStyle='rgba(0,0,0,'+(Math.max(0,1-light)*Number($('opacity').value)/100)+')';c.fill('evenodd');c.restore()}
 if(!thumbnail&&m.panels&&(f.panelIndex??m.surface.indexOf(f))===selectedPanel){c.fillStyle='#ffbc3799';c.fill('evenodd')}
 if(f.seam!==false){c.strokeStyle=thumbnail?'#31482b28':'#2a362b38';c.lineWidth=thumbnail?.45:.65;c.stroke()}
 }
}
function drawUV(c,q,uv,img,fit){
 const aspect=fit==='atlas'?1:img.width/img.height,uw=fit==='cover'?Math.min(1,1/aspect):Math.max(1,1/aspect),vh=fit==='cover'?Math.min(1,aspect):Math.max(1,aspect);
 const s=uv.map(([x,y])=>[(.5+(x-.5)*uw)*img.width,(.5+(y-.5)*vh)*img.height]);
 for(let i=1;i<q.length-1;i++){const a=s[0],b=sub(s[i],a),d=sub(s[i+1],a),o=q[0],e=sub(q[i],o),g=sub(q[i+1],o),det=b[0]*d[1]-b[1]*d[0];if(Math.abs(det)<1e-9)continue;
 const xx=(e[0]*d[1]-g[0]*b[1])/det,xy=(g[0]*b[0]-e[0]*d[0])/det,yx=(e[1]*d[1]-g[1]*b[1])/det,yy=(g[1]*b[0]-e[1]*d[0])/det;
 c.save();c.beginPath();c.moveTo(...o.slice(0,2));c.lineTo(...q[i].slice(0,2));c.lineTo(...q[i+1].slice(0,2));c.closePath();c.clip();c.transform(xx,yx,xy,yy,o[0]-xx*a[0]-xy*a[1],o[1]-yx*a[0]-yy*a[1]);c.drawImage(img,0,0);c.restore()}
}

function notifyUser(message) {
  const status = $('status');
  status.textContent = message;
  status.hidden = false;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => status.hidden = true, 3600);
}

function svg(m, { overlay = false, artwork = '', hit = false, exporting = false } = {}) {
  const box = m.box.split(/\s+/).map(Number);
  const [x, y, w, h] = box;
  const scale = exporting ? m.exportScale || 1 : 1;
  const k = Math.min(w, h) / 400;
  const path = (name, d, stroke, dash) => d ? '<path id="' + name + '" d="' + d + '" fill="none" stroke="' + stroke + '" stroke-width="' + k + '"' + (dash ? ' stroke-dasharray="' + (k * 4) + ' ' + (k * 3) + '"' : '') + '/>' : '';
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
  const sizes = {3:[735,936],5:[626,306],6:[626,558],8:[557,626],14:[626,813]};
  const size = sizes[m.id];
  const source = overlay && m.reference && size ? '<image href="' + m.reference + '" x="0" y="0" width="' + size[0] + '" height="' + size[1] + '" opacity=".58"/>' : '';
  const regions = m.panels || (m.bottle ? [{name:'瓶贴',path:m.cut}] : []);
  const clip = regions.length ? '<defs><clipPath id="stock">' + regions.map(p => '<path clip-rule="evenodd" d="' + p.path + '"/>').join('') + '</clipPath></defs>' : '';
  const image = artwork && regions.length ? '<image href="' + artwork + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" preserveAspectRatio="none" opacity="' + Number($('opacity').value) / 100 + '" clip-path="url(#stock)"/>' : '';
  const panelMarkup = hit ? regions.map((p, i) => '<path data-panel="' + i + '" d="' + p.path + '" fill-rule="evenodd" fill="' + (i === selectedPanel ? '#dc932f' : 'transparent') + '" fill-opacity=".24"><title>' + escape(p.name) + '</title></path>').join('') : '';
  const dims = exporting && (m.bottle ? [m.width, m.labelHeight] : m.dimensions);
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + box.map(v => v * scale).join(' ') + '"' +
    (dims ? ' width="' + dims[0] + 'mm" height="' + dims[1] + 'mm"' : '') + '><title>' + escape(m.name) +
    '</title><g' + (scale !== 1 ? ' transform="scale(' + scale + ')"' : '') + '>' +
    source + clip + image + path('bleed', m.bleed, '#d16a72') + path('cut', m.cut, '#283628') +
    path('crease', m.fold, '#3d8788', true) + panelMarkup + '</g></svg>';
}

let drawStage, webglError = false;
try {
  drawStage = createStage($('model'));
} catch (error) {
  webglError = true;
  const old = $('model'), replacement = old.cloneNode();
  old.replaceWith(replacement);
  drawStage = m => render(replacement, m);
}
function redraw() {
  const m = catalog[id];
  if (m && !m.referenceOnly && !$('model').hidden) drawStage(m);
}

function selectMode(view) {
  const m = catalog[id];
  if (m.referenceOnly) view = 'ref';
  else if (view === 'ref' && !m.reference) view = 'both';
  mode = view;
  const split = view === 'both', three = split || view === '3D', flat = split || view === '2D';
  $('stage').className = 'mode-' + view;
  $('views').hidden = $('reset').hidden = !three;
  $('overlayLabel').hidden = !flat || !m.reference || m.id===1;
  $('model').hidden = !three;
  $('flat').hidden = !flat;
  $('ref').hidden = view !== 'ref';
  $('leftLabel').hidden = $('rightLabel').hidden = !split;
  $('photo').disabled = !three;
  $('export').disabled = !!m.referenceOnly;
  $('legend').hidden = !flat;
  document.querySelector('#legend .fold-key').parentElement.hidden = !m.fold;
  document.querySelectorAll('[data-mode]').forEach(button => {
    button.classList.toggle('active', button.dataset.mode === view);
    button.setAttribute('aria-pressed', String(button.dataset.mode === view));
    button.disabled = !!m.referenceOnly && button.dataset.mode !== 'ref';
    button.hidden = button.dataset.mode === 'ref' && !m.reference;
  });
  $('hint').textContent = three ? (webglError ? '兼容预览 · 拖动旋转' : '拖动旋转 · 滚轮或双指缩放') :
    flat ? '拖动刀版上的贴图调整位置' : '原始结构参考';
  if (three) redraw();
}

function reset() {
  yaw = -.58;
  pitch = .67;
  zoom = 1;
  redraw();
}

function showSettings(area) {
  const disabled = !!catalog[id].referenceOnly;
  document.querySelectorAll('[data-group]').forEach(group => group.hidden = disabled || group.dataset.group !== area);
  document.querySelectorAll('[data-area]').forEach(item => {
    item.disabled = disabled;
    item.setAttribute('aria-pressed', String(item.dataset.area === area));
  });
  $('referenceNotice').hidden = !disabled;
}

function activate(n) {
  if (!catalog[n]) return;
  stopPlay();
  id = n;
  const m = catalog[n];
  selectedPanel = -1;
  $('overlay').checked = false;
  $('label').textContent = m.name;
  $('sourceType').textContent = m.referenceOnly ? '参考图' : m.reference ? '参考图描线' : m.bottle || m.concept ? '概念样机' : '导入结构';
  $('structureSummary').textContent = m.summary || (m.referenceOnly ? '原始结构参考' : m.bottle ? '环绕瓶贴 · 可调尺寸' : m.faces.length + ' 个面 · 保留导入的折线和孔位');
  if (m.reference) $('ref').src = m.reference;
  else $('ref').removeAttribute('src');
  $('bottleSettings').hidden = !m.bottle;
  $('foldbar').hidden = !m.foldable;
  $('structure').hidden = n !== 6;
  $('scaleSettings').hidden = n === 6 || !!m.bottle || !!m.referenceOnly || !!m.traced || !!m.concept;
  configurePart(m);
  $('dieScale').value = Math.round((m.exportScale || 1) * 100);
  $('dieScale').dispatchEvent(new Event('change'));
  $('folding').value = Math.round((m.progress ?? 1) * 100);
  $('foldOut').textContent = $('folding').value + '%';
  if (m.bottle) {
    $('diameter').value = m.diameter;
    $('labelHeight').max = bottleSpecs[n - 11].body - 4;
    $('labelHeight').value = m.labelHeight;
    $('labelSize').textContent = '展开宽度 ' + m.width.toFixed(1) + ' mm';
  }
  document.querySelectorAll('#cards button').forEach(b => b.classList.toggle('active', Number(b.value) === n));
  toggleShelf(false);
  showSettings(document.querySelector('[data-area][aria-pressed=true]')?.dataset.area || 'design');
  if (!m.referenceOnly) updateArtwork();
  const next = n === 6 || mode === 'ref' ? 'both' : mode;
  selectMode(next);
  reset();
}

const thumbs = [];
function cardHeading(title) {
  const heading = document.createElement('h3');
  heading.textContent = title;
  $('cards').append(heading);
}
function addCard(n) {
  const m = catalog[n], button = document.createElement('button');
  if (m.referenceOnly) {
    const img = new Image();
    img.src = m.reference; img.alt = ''; img.loading = 'lazy';
    button.append(img);
  } else {
    const preview = document.createElement('canvas');
    button.append(preview);
    thumbs.push([preview, n]);
  }
  button.append(document.createTextNode(m.name));
  const detail=document.createElement('small');
  detail.textContent=m.referenceOnly?'查看原图':m.foldable?'折叠 · 贴图':m.bottle?'瓶径 · 环贴':n===1?'抽屉开合':n===5?'窗口 · 内托':n===3?'门窗 · 屋顶':'尺寸 · 贴图';
  button.append(detail);
  button.value = n;
  button.onclick = () => activate(n);
  $('cards').append(button);
}
function libraryTab(refs=false){
  $('cards').replaceChildren();thumbs.length=0;
  $('modelsTab').setAttribute('aria-pressed',String(!refs));$('refsTab').setAttribute('aria-pressed',String(refs));
  const groups=refs?[['原始参考图',catalog.filter(m=>m.referenceOnly).map(m=>m.id)]]:
   [['折盒与建筑纸模',[6,8,14,5,3,1]],['瓶身与软包装',[15,16,17,11,12,13]],['导入结构',catalog.filter(m=>m.design&&m.id>17).map(m=>m.id)]];
  for(const [name,ids] of groups){if(ids.length){cardHeading(name);ids.forEach(addCard)}}
  $('pick').textContent='模型库 · '+catalog.filter(m=>!m.referenceOnly).length+' 款可用';
  if(!$('shelf').hidden)drawThumbnails();
}
$('modelsTab').onclick=()=>libraryTab(false);$('refsTab').onclick=()=>libraryTab(true);
libraryTab();
catalog.forEach(m => { if (!m.referenceOnly) prepare(m); });

palette.forEach((value, i) => {
  const button = document.createElement('button');
  button.style.backgroundColor = value;
  button.setAttribute('aria-label', colorNames[i]);
  button.classList.toggle('active', i === 0);
  button.setAttribute('aria-pressed', String(i === 0));
  button.onclick = () => {
    color = value;
    for (const item of $('colors').children) {
      item.classList.toggle('active', item === button);
      item.setAttribute('aria-pressed', String(item === button));
    }
    redraw();
  };
  $('colors').append(button);
});

document.querySelectorAll('[data-view]').forEach(button => button.onclick = () => {
  const view = button.dataset.view;
  yaw = view === 'iso' ? -.58 : 0;
  pitch = view === 'iso' ? .67 : view === 'top' ? Math.PI / 2 - .0001 : 0;
  redraw();
});
document.querySelectorAll('[data-mode]').forEach(b => b.onclick = () => selectMode(b.dataset.mode));
$('reset').onclick = reset;
$('scene').onchange = () => {
  $('stage').style.setProperty('--stage', scenes[+$('scene').value].bg);
  redraw();
};

const canvas = $('model'), pointers = new Map();
let pinch = 0;
const adjustZoom = ratio => { zoom = Math.max(.45, Math.min(3, zoom * ratio)); };
const adjustPitch = n => { pitch = Math.max(-Math.PI / 2 + .0001, Math.min(Math.PI / 2 - .0001, n)); };
canvas.onpointerdown = e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, [e.clientX, e.clientY]);
  pinch = 0;
};
canvas.onpointermove = e => {
  const old = pointers.get(e.pointerId);
  if (!old) return;
  pointers.set(e.pointerId,[e.clientX,e.clientY]);
  if (pointers.size === 2) {
    const [a, b] = pointers.values(), d = Math.hypot(...sub(a, b));
    if (pinch > 0) adjustZoom(d / pinch);
    pinch = d;
  } else {
    yaw += (e.clientX - old[0]) * .009;
    adjustPitch(pitch + (e.clientY - old[1]) * .009);
  }
  redraw();
};
canvas.onlostpointercapture = e => { pointers.delete(e.pointerId); pinch = 0; };
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  adjustZoom(Math.exp(-e.deltaY * .0015));
  redraw();
}, { passive:false });
canvas.onkeydown = e => {
  switch (e.key) {
    case 'ArrowLeft': yaw -= .12; break;
    case 'ArrowRight': yaw += .12; break;
    case 'ArrowUp': adjustPitch(pitch + .12); break;
    case 'ArrowDown': adjustPitch(pitch - .12); break;
    case '+': case '=': adjustZoom(1.1); break;
    case '-': adjustZoom(.9); break;
    default: return;
  }
  e.preventDefault();
  redraw();
};

function downloadBlob(blob, name) {
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = name.replace(/[\\/:*?"<>|]/g, '-');
  link.click();
  setTimeout(() => URL.revokeObjectURL(href), 3000);
}

$('export').onclick = () => {
  const m = catalog[id];
  if (!m.referenceOnly) {
    downloadBlob(new Blob([svg(m, { exporting:true })], { type:'image/svg+xml' }), m.name + '-刀版.svg');
    notifyUser('已导出刀版 SVG');
  }
};

new ResizeObserver(() => {
  redraw();
  if (!$('shelf').hidden) drawThumbnails();
}).observe($('stage'));

initEditor();
activate(id);

