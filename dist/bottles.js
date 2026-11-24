// Concept containers have a cylindrical label zone. Dimensions are millimetres.
const bottleSpecs=[
 {name:'沐浴露 · 泵瓶',diameter:64,label:95,body:145},
 {name:'防晒霜 · 圆盖瓶',diameter:45,label:60,body:88},
 {name:'精华 · 滴管瓶',diameter:34,label:40,body:60}
];
function makeBottle(id,diameter,labelHeight){
 const spec=bottleSpecs[id-11], r=diameter/2, width=Math.PI*diameter-2;
 const faces=[],segments=48,body=spec.body;
 const ring=(radius,y,a)=>[radius*Math.sin(a),y,radius*Math.cos(a)];
 function band(r1,y1,r2,y2,start=-Math.PI,end=Math.PI,print=false){
  for(let i=0;i<segments;i++){
   const a=start+(end-start)*i/segments,b=start+(end-start)*(i+1)/segments;
   faces.push({p:[ring(r1,y1,a),ring(r1,y1,b),ring(r2,y2,b),ring(r2,y2,a)],seam:false,print,
     uv:print?[[i/segments,1],[(i+1)/segments,1],[(i+1)/segments,0],[i/segments,0]]:undefined});
  }
 }
 function disk(radius,y){faces.push({p:Array.from({length:segments},(_,i)=>ring(radius,y,2*Math.PI*i/segments)),seam:false,print:false})}
 disk(r,0);band(r,0,r,body);
 const neck=r*.48;band(r,body,neck,body+r*.42);let y=body+r*.42;
 const profile=id===11?[[neck,7],[neck*.45,0],[neck*.45,12],[neck,0],[neck,4]]:id===12?[[r*.82,0],[r*.82,18]]:[[neck*1.22,0],[neck*1.22,10],[neck*.72,2],[neck*.6,11],[neck*.24,3]];
 let prev=neck;for(const [rad,h] of profile){band(prev,y,rad,y+h);prev=rad;y+=h}disk(prev,y);
 if(id===11){
  const pts=[[-5,y-3,0],[5,y-3,0],[5,y-6,r],[-5,y-6,r]],top=pts.map(([x,v,z])=>[x,v+4,z]);
  faces.push(...[pts,top,...pts.map((p,i)=>[p,pts[(i+1)%4],top[(i+1)%4],top[i]])].map(p=>({p,seam:false,print:false})));
 }
 const angle=width/diameter;
 band(r+.07,(body-labelHeight)/2,r+.07,(body+labelHeight)/2,-angle,angle,true);
 return {id,name:spec.name,bottle:true,width,labelHeight,diameter,faces,box:'0 0 '+width+' '+labelHeight,cut:'M0 0H'+width+'V'+labelHeight+'H0Z',fold:'',bleed:''};
}
bottleSpecs.forEach((s,i)=>catalog[i+11]=makeBottle(i+11,s.diameter,s.label));
