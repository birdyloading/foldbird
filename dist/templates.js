'use strict';

const references = [
  [0, '糖果折盒'], [1, '提手抽屉盒'], [2, '对开礼盒'], [3, '小屋窗盒'],
  [4, '手提折盒'], [5, '开窗展示盒'], [6, '六瓣旋扣盒'], [7, '四层收纳盒'],
  [8, '枕形盒'], [9, '手提屋顶盒'], [10, '开窗手提屋顶盒'], [14, '斜边翻盖盒']
];

for (const [id, name] of references) {
  catalog[id] = { id, name, reference: 'ref/' + id + '.jpg', referenceOnly: true };
}
catalog[6] = { ...hexSample(), reference: 'ref/6.jpg', foldable: true, summary: '6 个侧面 · 1 个底面 · 6 枚扣舌 · 6 处糊口' };

function sampleCurve(points, t) {
  let layer = points;
  while (layer.length > 1) {
    layer = layer.slice(1).map((p, i) => p.map((n, j) => layer[i][j] * (1 - t) + n * t));
  }
  return layer[0];
}

function cubicOutline(start, ...segments) {
  return [start, ...segments.flatMap((segment, index) => {
    const previous = index ? segments[index - 1].at(-1) : start;
    return Array.from({ length: 8 }, (_, i) => sampleCurve([previous, ...segment], (i + 1) / 8));
  })];
}

// These are the individual panels and hinge lines traced from reference 14.
const flapBox = (() => {
  const x = [407.5, 450.4, 493.3, 536.5, 579.7], top = 213.2, bottom = 299.1;
  const end = 171, lip = 181, cap = 83.3;
  const hinge = (parent, a, b, angle, start = 0, end = 1) => ({ parent, edge: [a, b], angle, start, end });
  const walls = x.slice(0, -1).map((left, index) => ({
    id: 'wall' + index, name: '侧面 ' + (index + 1), role: 'body',
    points: [[left, top], [x[index + 1], top], [x[index + 1], bottom], [left, bottom]],
    hinge: index ? hinge('wall' + (index - 1), [left, top], [left, bottom], 90, 0, .54) : null
  }));
  const feet = [
    [[x[1],336.3],[444,333.9],[438,327],[436,320.5],[420.9,320.5],[417.6,329.2],[413.3,333.8],[x[0],336.2]],
    [[490,321.7],[479,320.9],[473,313.6],[461,305.2]],
    [[527.8,311.7],[524.1,319.8],[522.4,327.6],[518,331.3],[512,331.3],[507.6,327.1],[505.5,319.1],[501,312.7]],
    [[558,312],[554,319],[548,323.8],[542,326.1],[x[3],326.7]]
  ].map((tail, i) => ({
    id: 'foot' + i, name: '底舌 ' + (i + 1), role: 'flap',
    points: [[x[i], bottom], [x[i + 1], bottom], ...tail],
    hinge: hinge('wall' + i, [x[i + 1], bottom], [x[i], bottom], 89.8 - i * .18, .45 + i * .04, .8 + i * .04)
  }));
  const lidX = x[2], lidEnd = x[3];
  const panels = [...walls, ...feet,
    { id:'glue', name:'糊口', role:'glue', points:[[x[4],top],[590,217.5],[590,294.3],[x[4],bottom]],
      hinge:hinge('wall3',[x[4],top],[x[4],bottom],89.8,.38,.69) },
    { id:'roof', name:'翻盖顶面', role:'lid', points:[[lidX,end],[lidEnd,end],[lidEnd,top],[lidX,top]],
      hinge:hinge('wall2',[lidX,top],[lidEnd,top],90,.54,.92) },
    { id:'cover', name:'翻盖正面', role:'lid', points:[
      [lidX,end],[lidEnd,end],[lidEnd,cap],[528.4,cap],[501.4,cap],[lidX,cap]
    ], hinge:hinge('roof',[lidX,end],[lidEnd,end],91.15,.58,1) },
    { id:'left-wing', name:'左盖舌', role:'flap',
      points:[[lidX,end],[450,end],[450,166.7],...cubicOutline([479.5,94],[[482.8,85.2],[485.2,84],[lidX,cap]])],
      hinge:hinge('cover',[lidX,cap],[lidX,end],-89.7,.56,.91) },
    { id:'right-wing', name:'右盖舌', role:'flap',
      points:[[lidEnd,cap],...cubicOutline([lidEnd + 2,83.5],[[543.6,84],[545.4,88],[549.5,98]]),[579.7,166.7],[579.7,end],[lidEnd,end]],
      hinge:hinge('cover',[lidEnd,cap],[lidEnd,end],89.7,.56,.91) },
    { id:'left-wing-tip', name:'左侧折舌', role:'flap', points:[[450,end],[lidX,end],[488,lip],[453,lip]],
      hinge:hinge('left-wing',[450,end],[lidX,end],-87,.66,1) },
    { id:'right-wing-tip', name:'右侧折舌', role:'flap', points:[[lidEnd,end],[579.7,end],[576,lip],[542,lip]],
      hinge:hinge('right-wing',[lidEnd,end],[579.7,end],-87,.66,1) },
    { id:'lock', name:'插舌', role:'flap', points:[[501.4,cap],[501.4,78.8],[502.3,76.3],[505,75.3],[525,75.3],[527.5,76.2],[528.4,78.3],[528.4,cap]],
      hinge:hinge('cover',[501.4,cap],[528.4,cap],85,.68,1) }
  ];
  return compileStructure({ name: '斜边翻盖盒', panels, cuts: [
    [[509.4,cap],[511.3,87.2],[514,88.9],[517.4,88.9],[520,86.8],[521.1,cap]],
    [[422.4,307.2],[422.4,292.8],[423.5,290.3],[434.7,290.3],[436.5,292],[436.5,307.2],[422.4,307.2]]
  ] });
})();
catalog[14] = buildPanelModel(flapBox, 14, 1, 1, { reference:'ref/14.jpg', upright:true, summary:'4 个侧面 · 斜边翻盖 · 底舌和糊口' });

// The two pillow faces use the same flat coordinates as the source curves.
// Each smooth surface is tessellated in narrow bands for rendering only.
function pillowModel(progress = 1, scale = 1) {
  const x0 = 50, x1 = 337.6, y0 = 286.8, midY = 429.6, endY = 573.6;
  const cut = 'M50 286.8H337.6Q357 313 360.5 342.5C341.2 344.7 340.6 370.4 360.4 374.4Q356.9 402.7 337.6 429.6Q385.3 501.7 337.6 573.6L307.1 608.9H80L50 573.6Q2 501.5 50 429.6Q31.2 404.8 27.4 374.6C47.3 372 47.4 344.8 27.4 342.5Q30.6 314 50 286.8Z';
  const fold = 'M50 286.8Q99.2 358.3 50 429.6Q98.6 501.7 50 573.6M337.6 286.8Q288.6 358.3 337.6 429.6Q288.6 501.7 337.6 573.6M50 429.6H337.6M50 573.6H337.6';
  const bleed = 'M48 279.4H338.8Q342 279.4 344.2 283Q363.8 310.5 367.7 341.3Q369 347.8 361.8 349.3C350.5 350.5 350.2 365.3 361.9 367.5Q368.9 368.4 367.5 375.9Q364.1 403 346.8 429.7Q392.1 503 344 577.8L312.2 614.4Q310.8 616 308.4 616H79Q76.2 616 74.5 614.1L44.2 578.2Q-3.4 503.6 41 429.6Q24.7 404.5 20.6 375.8Q19.5 368.4 26 367.3C38.4 365.6 38.6 350.6 26.7 349.4Q19.4 348.9 20.6 341Q24.4 309.5 44.1 282Q45.9 279.5 48 279.4Z';
  const outer = [
    [
      cubicOutline([x0, y0], [[30.6,314],[27.4,342.5]], [[47.4,344.8],[47.3,372],[27.4,374.6]], [[31.2,404.8],[x0,midY]]),
      cubicOutline([x1, y0], [[357,313],[360.5,342.5]], [[341.2,344.7],[340.6,370.4],[360.4,374.4]], [[356.9,402.7],[x1,midY]])
    ],
    [
      cubicOutline([x0,midY], [[2,501.5],[x0,endY]]),
      cubicOutline([x1,midY], [[385.3,501.7],[x1,endY]])
    ]
  ];
  const box = [12, 272, 364, 350];
  const blend = (a, b, t) => a * (1 - t) + b * t;
  const faces = [], hit = [];
  function addPanel(name, points) {
    hit.push({name, path:panelPath(points)});
    return hit.length - 1;
  }
  function mesh(flat, points, panelIndex, print = true) {
    const uv = flat.map(([a,b]) => [(a-box[0])/box[2],(b-box[1])/box[3]]);
    faces.push({ p:points.map(p=>p.map(n=>n*scale)), uv, seam:false, print, panelIndex });
  }
  for (const side of [0, 1]) {
    const a = side ? midY : y0, b = side ? endY : midY, sign = side ? -1 : 1;
    const jaw = (end, t) => [blend(x0,x1,end) + (end ? -1 : 1) * 49.1 * 2*t*(1-t), blend(a,b,t)];
    const fromFlat = ([x,y], bow = true) => {
      const t=(y-a)/(b-a), bend=bow ? 4*t*(1-t) : 0;
      return [x, 29*bend*progress, blend(y,midY + sign*(t - .5)*-132, progress)];
    };
    const rim = point => {
      const t=(point[1]-a)/(b-a);
      const x=jaw(point[0] < (x0+x1)/2 ? 0:1,t)[0];
      const model = fromFlat(point);
      model[0]=blend(point[0], x+(point[0]-x)*.26,progress);
      model[1] *= 1-progress*.9;
      return model;
    };
    // Top and bottom wrap about the common transverse score; one face bows down.
    const sidePoint = point => {
      const p = fromFlat(point);
      p[1] *= sign;
      return p;
    };
    const left = Array.from({length:33},(_,i)=>jaw(0,i/32));
    const right = Array.from({length:33},(_,i)=>jaw(1,i/32));
    const body = addPanel(side ? '下弧面' : '上弧面', [...left, ...right.slice().reverse()]);
    for(let i=0;i<32;i++) {
      const strip=[left[i],right[i],right[i+1],left[i+1]];
      mesh(strip,strip.map(sidePoint),body);
    }
    for (const end of [0, 1]) {
      const outside = outer[side][end];
      const along = outside.map(([,y])=>jaw(end,(y-a)/(b-a)));
      const panel = addPanel('弧形盖舌 ' + (side*2 + end + 1), [...outside,...along.slice(1,-1).reverse()]);
      for(let i=0;i<outside.length-1;i++) {
        const strip=[along[i],outside[i],outside[i+1],along[i+1]];
        mesh(strip,[sidePoint(along[i]),rim(outside[i]),rim(outside[i+1]),sidePoint(along[i+1])],panel);
      }
    }
  }
  const flap = [[x0,endY],[x1,endY],[307.1,608.9],[80,608.9]];
  const joint = addPanel('糊口',flap);
  mesh(flap, flap.map(([x,y])=>[x,.25*progress,blend(y,midY+66-(y-endY),progress)]),joint,false);
  return {id:8,name:'枕形盒',reference:'ref/8.jpg',summary:'2 个弧面 · 4 枚弧形盖舌 · 1 处糊口',
    faces,panels:hit,box:box.join(' '),cut,fold,bleed,foldable:true,exportScale:scale};
}
catalog[8] = pillowModel();
