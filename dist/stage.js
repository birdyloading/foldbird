// The same traced polygons drive the WebGL meshes, including their interior cut-outs.
function createStage(canvas) {
 const T=THREE, renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
 renderer.setClearColor(0,0);
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(32,1,.01,100);
 const sky=new T.HemisphereLight(0xffffff,0xbac2cb,1.65), key=new T.DirectionalLight(0xffffff,2);
 scene.add(sky,key);
 const group=new T.Group();scene.add(group);
 const ink=new T.LineBasicMaterial({color:0x393842,transparent:true,opacity:.22});
 const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;
 const ctx=shadowCanvas.getContext('2d'),g=ctx.createRadialGradient(64,64,0,64,64,64);
 g.addColorStop(0,'rgba(32,31,45,.28)');g.addColorStop(.5,'rgba(32,31,45,.13)');g.addColorStop(1,'rgba(32,31,45,0)');
 ctx.fillStyle=g;ctx.fillRect(0,0,128,128);
 const shadow=new T.Mesh(new T.PlaneGeometry(2.6,2.6),new T.MeshBasicMaterial({map:new T.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false,side:T.DoubleSide}));
 shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 let current,materials=[],texture,lastImage;
 function meshModel(m){
  for(const item of [...group.children]){item.geometry.dispose();group.remove(item)}
  materials.forEach(x=>x.dispose());materials=[];
  const local=p=>p.map((x,i)=>(x-m.center[i])/m.radius);
  let bottom=Infinity;
  m.surface.forEach((f,index)=>{
   const rings=[f.p,...f.h].map(r=>r.filter((p,i)=>i===0||Math.hypot(...sub(p,r[i-1]))>1e-9)).map(r=>r.length>1&&Math.hypot(...sub(r[0],r.at(-1)))<1e-9?r.slice(0,-1):r);
   if(rings[0].length<3)return;
   const plane=rings.map(r=>r.map(p=>new T.Vector2(dot(p,f.u),dot(p,f.w))));
   const indices=T.ShapeUtils.triangulateShape(plane[0],plane.slice(1)).flat();
   if(!indices.length)return;
   const [u0,u1,v0,v1]=f.range,du=u1-u0||1,dv=v1-v0||1;
   const pts=rings.flat(),positions=pts.map(local),uv=pts.map((p,i)=>{
    if(f.uv){const coord=f.uv[f.p.indexOf(p)];if(coord)return [coord[0],1-coord[1]]}
    return [(dot(p,f.u)-u0)/du,(dot(p,f.w)-v0)/dv]});
   positions.forEach(p=>bottom=Math.min(bottom,p[1]));
   const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions.flat(),3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv.flat(),2));geo.setIndex(indices);geo.computeVertexNormals();
   const mat=new T.MeshStandardMaterial({side:T.DoubleSide,roughness:.88,polygonOffset:true,polygonOffsetFactor:1,polygonOffsetUnits:1});
   const uniforms={design:{value:null},hasDesign:{value:0},fade:{value:1},uvScale:{value:new T.Vector2(1,1)}};
   mat.userData={print:f.print,index:f.panelIndex??index,uniforms,aspect:f.uv?(m.id===8&&f.uv[0][0]!==f.uv[1][0]?2.1:.36):du/dv};
   mat.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader='varying vec2 printUV;\n'+shader.vertexShader.replace('#include <uv_vertex>','#include <uv_vertex>\nprintUV=uv;');
    shader.fragmentShader='uniform sampler2D design; uniform float hasDesign,fade; uniform vec2 uvScale; varying vec2 printUV;\n'+shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nif(hasDesign>.5){vec2 q=(printUV-.5)*uvScale+.5;if(all(greaterThanEqual(q,vec2(0.)))&&all(lessThanEqual(q,vec2(1.)))){vec4 a=texture2D(design,q);diffuseColor.rgb=mix(diffuseColor.rgb,a.rgb,a.a*fade);}}');
   };
   materials.push(mat);group.add(new T.Mesh(geo,mat));
   if(f.seam!==false)rings.forEach(r=>{group.add(new T.LineLoop(new T.BufferGeometry().setFromPoints(r.map(p=>new T.Vector3(...local(p)))),ink))});
  });
  shadow.position.y=bottom-.012;current=m;
 }
 return function draw(m){
  const w=canvas.clientWidth,h=canvas.clientHeight;if(!w||!h)return;
  if(m!==current)meshModel(m);
  const design=(m.panels||m.bottle)&&art?atlas:art; if(design!==lastImage){texture?.dispose();texture=design?new T.Texture(design):null;if(texture){texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true}lastImage=design}
  const cover=$('fit').value==='cover',a=art?art.width/art.height:1;
  for(const mat of materials){const u=mat.userData.uniforms,r=mat.userData.aspect/a;
   u.uvScale.value.set(cover?Math.min(1,r):Math.max(1,r),cover?Math.min(1,1/r):Math.max(1,1/r));
   if(m.panels||m.bottle)u.uvScale.value.set(1,1);mat.emissive.setHex(m.panels&&mat.userData.index===selectedPanel?0x745422:0);u.design.value=texture;u.hasDesign.value=+(!!texture&&mat.userData.print);u.fade.value=+$('opacity').value/100;mat.color.set(color)}
  const settings=[[0xfffaf4,0xc8c9e1,2.0,-3,5,4],[0xffcf9e,0xbbafac,2.4,4,2,1],[0xb7d7ff,0x7f91b4,2.45,-2,2,4]][+$('scene').value];
  key.color.setHex(settings[0]);sky.groundColor.setHex(settings[1]);key.intensity=settings[2];key.position.set(...settings.slice(3));
  if(canvas.width!==Math.floor(w*renderer.getPixelRatio())||canvas.height!==Math.floor(h*renderer.getPixelRatio()))renderer.setSize(w,h,false);camera.aspect=w/h;camera.zoom=zoom;camera.updateProjectionMatrix();
  const dist=4.2*Math.max(1,1/camera.aspect);camera.position.set(-Math.sin(yaw)*Math.cos(pitch)*dist,Math.sin(pitch)*dist,Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(0,0,0);shadow.visible=pitch>0;
  renderer.render(scene,camera);
 }
}
