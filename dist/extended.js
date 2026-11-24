function register(id,name,box,cut,fold,faces){
 catalog[id]={id,name,box,cut,fold,faces,reference:'ref/'+id+'.jpg',traced:true,summary:'按参考图绘制 · 比例样机'};
}
// Geometry is traced in the pixel coordinate system of each supplied sheet.
function tracedModels(windowInset=0) {
  const arc = (cx, cy, rx, ry, a, b, steps=16) => Array.from({length:steps+1}, (_, i) => {
    const t = a + (b-a)*i/steps;
    return [cx+rx*Math.cos(t), cy+ry*Math.sin(t)];
  });
  const PI = Math.PI;
  const houseCuts = [], houseScores = [], houseFaces = [];
  const S=103;
  const edges=[[-S/2,S/2,S/2,S/2],[S/2,S/2,S/2,-S/2],[S/2,-S/2,-S/2,-S/2],[-S/2,-S/2,-S/2,S/2]];
  for (let i=0;i<4;i++) {
    const x=185+i*S;
    houseCuts.push(`M${x} 571l42 -51 -4 -4 21 -26 15 12q7 5 3 15l-26 73 52 -19`);
    houseScores.push(`M${x} 571l51 19 M${x} 732l51 -142 52 142 M${x} 842h103`);
    if(i>0) {
      houseCuts.push(`M${x} 632l3 4v35l-3 3`);
      houseScores.push(`M${x} 571v61m0 42v168`);
    }
    const e=edges[i], nx=(e[1]-e[3])/S, nz=(e[2]-e[0])/S;
    const plane = (u, y, inset=0) => [(e[0]+(e[2]-e[0])*u/S-nx*inset)/S, (y-126)/S,(e[1]+(e[3]-e[1])*u/S-nz*inset)/S];
    const fromFlat = ([u,v])=>plane(u,842-v);
    const body=[[0,842],[S,842],[S,732],[51,590],[0,732]].map(fromFlat);
    const holes=[];
    const c=x+51;
    if (i%2===0) {
      houseCuts.push(`M${c-17} 705v-9q0 -14 14 -18v27z M${c+4} 678q14 4 14 18v9h-14z M${c-17} 712h14v21h-14z M${c+4} 712h14v21h-14z`);
      holes.push([[34,705],...arc(51,696,17,18,PI,1.5*PI-.18),[48,705]],[[55,678],...arc(51,696,18,18,-PI/2+.22,0),[69,705],[55,705]],[[34,712],[48,712],[48,733],[34,733]],[[55,712],[69,712],[69,733],[55,733]]);
    } else {
      houseCuts.push(`M${c-17} 697a17.5 19 0 0 1 35 0 M${c} 678v55 M${c-17} 733h35`);
      houseScores.push(`M${c-17} 697v36m35 -36v36`);
    }
    houseFaces.push({p:body,h:holes.map(h=>h.map(fromFlat))});
    if(i%2===1) {
      // Paired arched shutters sit on their vertical score lines.
      for(const sign of [-1,1]) {
        const outline=sign===-1 ? [[34,733],[51,733],[51,678],...arc(51,697,17,19,-PI/2,-PI),[34,733]] : [[51,733],[69,733],[69,697],...arc(51,697,18,19,0,-PI/2),[51,733]];
        houseFaces.push(outline.map(([u,v])=>plane(u,842-v,-0.18)));
      }
    }
    // The four tongues interlock around the roof; each eave folds inwards.
    const L=plane(0,110), R=plane(103,110), tip=plane(51,252);
    const foldCorner=plane(0,265,49), nextCorner=plane(103,265,49);
    houseFaces.push([L,tip,foldCorner],[R,nextCorner,tip]);
    houseFaces.push([foldCorner, tip, plane(65,266,62), plane(60,279,66),plane(49,281,65),plane(30,268,55)]);
    const foot=i%2===0 ? [[0,0],[103,0],[95,9],[83,53],[51,53]] : [[0,0],[103,0],[97,71],[65,71],[51,58],[33,71],[2,71],[2,15],[7,9]];
    houseFaces.push(foot.map(([u,v])=>plane(u,i*.18,v)));
  }
  houseCuts.push('M185 571v61l4 5v34l-4 6v45l4 2 -4 10v108l51 53h32l12 -44 8 -9 7 8 -5 6v57h32l17 -18 2 5 12 13h32l6 -71 51 53h31l13 -45 8 -8 7 8 -5 6v57h32l17 -18 2 5 12 13h32l6 -71 18 -17v-85l-19 -7 -3 -10 22 -3V578l-18 -7');
  houseScores.push('M597 571v152m0 11v108 M597 723l18 -37 M288 842l51 53 M494 842l51 53');
  // Narrow manufacturer's joint on the fourth side.
  houseFaces.push([[-.50,-1.22,.495],[-.32,-1.22,.495],[-.32,-.19,.495],[-.50,-.12,.495]]);
  register(3,'小屋开窗盒','175 480 450 444',houseCuts.join(' '),houseScores.join(' '),houseFaces);
  const displayCut='M100 16H343V55L316 63 312 66 333 72H400V140H333L312 147 316 151 343 157V197H360V199Q374 199 374 210V268Q374 278 360 278V280H312L310 294H103L100 280H14V197H100L67 188V148H49Q35 148 35 136V78Q35 65 49 65H67V26Z M49 65H100 M49 148H100 M312 197h31 M121 106H273L290 65V148L273 106 M338 106a18 18 0 1 0 36 0a18 18 0 1 0 -36 0z M43 238a14.7 14.7 0 1 0 29.4 0a14.7 14.7 0 1 0 -29.4 0z M358 209l2 -2m-2 61 2 2';
  const displayFold='M100 16v264 M312 16v264 M100 65h212 M100 148h212 M100 197h212 M100 280h212 M121 65v83 M49 65v83 M333 72v68 M380 72v68 M34 197v83 M81 197v83 M360 197v83';
  const displayFaces=[];
  const D=(x,y,z)=>[x/83,(y-106)/83,z/83];
  const panel=(...v)=>displayFaces.push(v.map(q=>D(...q)));
  const w=41.5,d=25,H=212;
  panel([-w,0,-d],[w,0,-d],[w,H,-d],[-w,H,-d]);
  for(const side of [-1,1])panel([side*w,0,-d],[side*w,0,d],[side*w,H,d],[side*w,H,-d]);
  panel([-w,0,d],[w,0,d],[w,22+windowInset,d],[-w,22+windowInset,d]);
  panel([-w,191-windowInset,d],[w,191-windowInset,d],[w,H,d],[-w,H,d]);
  panel([-w,0,-d],[-w,0,d],[w,0,d],[w,0,-d]);
  panel([-w,H,d],[-w,H,-d],[w,H,-d],[w,H,d]);
  for(const side of [-1,1]) {
    // Front sections fold back along the long side scores.
    panel([side*(w-.25),22+windowInset,d],[side*(w-.25),191-windowInset,d],[side*(w-.25),191-windowInset,d-41],[side*(w-.25),39,d-41]);
  }
  for(const lower of [true,false]) {
    const y=lower?21+windowInset:191-windowInset, half=lower?34:41;
    const ring=arc(0,0,lower?18:14.7,lower?18:14.7,0,2*PI).slice(0,-1);
    const planar=([x,z])=>D(x,y,z);
    displayFaces.push({p:[[-half,-24],[half,-24],[half,24],[-half,24]].map(planar),h:[ring.map(planar)]});
    panel([-half,y,-24],[half,y,-24],[half,lower?1:211,-24],[-half,lower?1:211,-24]);
    for(const side of [-1,1])panel([side*w,lower?1:211,-24],[side*w,lower?1:211,24],[side*(w-30),lower?1:211,23],[side*(w-30),lower?1:211,-20]);
  }
  panel([-w+.3,0,-d+.3],[-w+13,0,-d+.3],[-w+13,H,-d+.3],[-w+.3,H,-d+.3]);
  register(5,'开窗展示盒','6 8 402 295',displayCut.replace('M121 106H273L290 65V148L273 106','M'+(121+windowInset)+' 106H'+(273-windowInset)+'L'+(290-windowInset)+' 65V148L'+(273-windowInset)+' 106'),displayFold.replace('M121 65','M'+(121+windowInset)+' 65'),displayFaces);
}

function drawerModel(opening=1){
  function tray(x,y,z,w,h,d) {
    const a=[x,y,z], b=[x+w,y,z], c=[x+w,y,z+d], e=[x,y,z+d];
    const top=([X,Y,Z])=>[X,Y+h,Z];
    return [[a,b,c,e],[a,top(a),top(b),b],[b,top(b),top(c),c],
      [c,top(c),top(e),e],[e,top(e),top(a),a]];
  }
  function drawerUnit(){
    const cut='M885 171L840 181C816 187 816 219 839 224L885 235H979V361H990V376A22 22 0 0 0 1034 376V361H1043V235H1137L1184 224C1206 218 1205 186 1184 181L1137 171H1043V45H1034V29A22 22 0 0 0 990 29V45H979V171Z M997 45V29A15 15 0 0 1 1027 29V45Z M997 361V376A15 15 0 0 0 1027 376V361Z M832 203H876 M1146 203H1191 '+
    'M652 183V152Q652 141 664 141H701Q713 141 713 152V183H716V171H742V213H746V203H773V214Q786 214 786 225V263Q786 275 774 275V287H747V276H743V318H716V307H713V397H653V307H650V318H623V276H620V287H592V275Q579 275 579 264V227Q579 215 592 214V203H620V213H623V171H649V183Z '+
    'M622 226Q608 225 608 233V255Q608 263 622 263 M744 226Q756 226 756 234V256Q756 263 744 263 M623 184Q631 181 637 184 M715 184Q720 182 729 184 M623 304Q628 308 637 307 M715 304Q719 308 729 307';
    const fold='M885 171V235 M1137 171V235 M979 171V235 M1043 171V235 M979 171H1043 M979 235H1043 M979 77H1043 M979 329H1043 M990 45H1034 M990 361H1034 M653 153H713 M651 183H714 M623 213H743 M623 275H743 M653 307H713 M653 337H713 M651 183V307 M714 183V307 M622 213V275 M744 213V275 M592 214V275 M774 214V275 M592 214H622 M592 275H622 M744 214H774 M744 275H774';
    const side=1.32, height=1.94, floor=-height/2, roof=height/2,r=side/2;
    const shell=tray(-r,floor,-r,side,height,side);
    shell.splice(3,1); // Open front.
    shell.push([[-r,roof,-r],[r,roof,-r],[r,roof,r],[-r,roof,r]]);
    for(let k=0;k<2;k++) {
      let z=-r+(2-k)*.45*opening, y=floor+.018+k*.63, width=side-.035;
      shell.push(...tray(-width/2,y,z,width,.615,side-.02));
      for(const sign of [-1,1])shell.push([[sign*width/2,y+.615,z+.25],[sign*width/2,y+.615,z+1.06],[sign*(width/2-.14),y+.615,z+.99],[sign*(width/2-.14),y+.615,z+.32]]);
    }
    const tip=r+1.88;
    shell.push([[-r,floor,r],[r,floor,r],[r,floor,tip],[-r,floor,tip]]);
    const loop=(width,ht,z)=>{const pts=[[-width,roof,z],[width,roof,z]];
      for(let i=0;i<=28;i++){let t=i*Math.PI/28;pts.push([width*Math.cos(t),roof+.05+ht*Math.sin(t),z]);}
      return pts;};
    for(const z of [-.025,.025]) shell.push({p:loop(.4,.4,z),h:[loop(.29,.3,z).map(([x,y,z])=>[x,y+.014,z])]});
    register(1,'提手阶梯抽屉盒','570 0 645 405',cut,fold,shell);
  }
 drawerUnit();
}
tracedModels(); drawerModel();
// Artwork panels form a single sheet. The gap between separate labels is excluded.
function conceptPack(id,width){
 const tube=id===15,pump=id===16,wrap=id===17;
 const height=tube?122:pump?146:142, depth=tube?24:pump?44:19;
 const sheet=wrap?2*width+2*depth+10:2*width+4;
 const printHeight=wrap?height:tube?82:93;
 const faces=[],panels=[];
 function face(points,flat,index){
  faces.push({p:points,seam:false,print:!!flat,panelIndex:index??-1,
   uv:flat?.map(([x,y])=>[x/sheet,y/printHeight])});
 }
 function section(y,w,d){return [[-w/2,y,d/2],[w/2,y,d/2],[w/2,y,-d/2],[-w/2,y,-d/2]]}
 function connect(lo,hi){for(let i=0;i<4;i++){const j=(i+1)%4;face([lo[i],lo[j],hi[j],hi[i]])}}
 const lo=section(0,width*(tube?.76:1),depth),hi=section(height,width,tube||wrap?2:depth);
 const mid=section(height*.75,width,depth);
 connect(lo,mid);connect(mid,hi);face(lo);face(hi);
 if(!wrap){
  const top=tube?0:height, direction=tube?-1:1;
  let previous=section(top,width*.65,depth*.8);
  for(const [dy,w,d] of (tube?[[15,.65,.8]]:[[8,.32,.45],[14,.18,.22],[18,.75,.25]])){
   const next=section(top+direction*dy,width*w,depth*d);connect(previous,next);previous=next;
  }
  face(previous);
 }
 let cut='',fold='';
 if(wrap){
  const widths=[5,depth,width,depth,width,5];let x=0;
  for(const [i,w] of widths.entries()){
   const path='M'+x+' 0h'+w+'v'+height+'h-'+w+'Z';panels.push({name:['背封','侧边','正面','侧边','背面','背封'][i],path});
   if(i>0)fold+='M'+x+' 0v'+height;
   const sides=[null,3,0,1,2,null],side=sides[i];
   if(side!==null){const j=(side+1)%4;for(const [low,high,y0,y1] of [[lo,mid,height,height*.25],[mid,hi,height*.25,0]]){
    const points=[low[side],low[j],high[j],high[side]].map(([a,b,c])=>[a*1.002,b,c*1.002]);face(points,[[x,y0],[x+w,y0],[x+w,y1],[x,y1]],i)}}
   x+=w;
  }
  cut='M0 0H'+sheet+'V'+height+'H0Z';fold+='M0 8H'+sheet+'M0 '+(height-8)+'H'+sheet;
 }else for(const [i,sign] of [1,-1].entries()){
  const x=i*(width+4), y=height*.12,w=width*.80;
  const path='M'+(x+(width-w)/2)+' 0h'+w+'v'+printHeight+'h-'+w+'Z';
  cut+=path;panels.push({name:i?'背标':'正标',path});
  const left=x+(width-w)/2,right=left+w;
  face([[-sign*w/2,y,sign*(depth/2+.15)],[sign*w/2,y,sign*(depth/2+.15)],[sign*w/2,y+printHeight,sign*(depth/2+.15)],[-sign*w/2,y+printHeight,sign*(depth/2+.15)]],[[left,printHeight],[right,printHeight],[right,0],[left,0]],i);
 }
 return {id,name:['防晒扁管','方肩沐浴露泵瓶','蛋白棒枕包'][id-15],concept:true,width,faces,panels,cut,fold,box:'0 0 '+sheet+' '+printHeight,dimensions:[sheet,printHeight],summary:wrap?'概念膜展开 · 背封与两端封边':'概念样机 · 正背印刷区域 · 示意尺寸'};
}
[52,68,45].forEach((w,i)=>catalog[15+i]=conceptPack(15+i,w));
const partValues={1:100,3:100,5:0,15:52,16:68,17:45};
function configurePart(m){
 const config={1:['抽屉拉出比例',0,100,'%'],3:['建筑整体比例',65,145,'%'],5:['窗口上下沿内收',0,18,' 图上单位'],15:['管身宽度',38,70,' mm'],16:['瓶身宽度',46,90,' mm'],17:['包装正面宽度',30,72,' mm']}[m.id];
 $('partSettings').hidden=!config;if(!config)return;
 const [label,min,max,unit]=config,field=$('partValue');
 $('partLabel').textContent=label;field.min=min;field.max=max;field.value=partValues[m.id];$('partOut').textContent=field.value+unit;
 field.oninput=()=>{
  const val=Number(field.value);partValues[id]=val;
  if(id===1)drawerModel(val/100);
  else if(id===5||id===3){
   const other=id===5?3:5,keep=catalog[other];tracedModels(partValues[5]);catalog[other]=keep;
   if(id===3){catalog[id].exportScale=val/100;for(const f of catalog[id].faces){for(const ring of [f.p||f,...(f.h||[])])for(const p of ring)for(let i=0;i<3;i++)p[i]*=val/100}}
  }else catalog[id]=conceptPack(id,val);
  prepare(catalog[id]);$('partOut').textContent=val+unit;updateArtwork();
 };
}
