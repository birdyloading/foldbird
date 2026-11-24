// The measured right-hand arm is the master for all six die-cut arms.
// x and z lie on the flat sheet; y measures the assembled height.
function hexSample(height = 28.3, progress = 1, baseScale = 1, glueScale = 1) {
  const h = Math.max(1, Number.isFinite(height) ? height : 28.3) / baseScale;
  const t = Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 1));
  const r = 41.9, apothem = r * Math.sqrt(3) / 2;
  const center = [440.4, 428.3];
  const pad = Math.max(0, h - 28.3) + Math.max(0, 12.5 * (glueScale / baseScale - 1));
  const bounds = [center[0]+(320-pad-center[0])*baseScale, center[1]+(322-pad-center[1])*baseScale, (241+2*pad)*baseScale, (213+2*pad)*baseScale];
  const cut = [], fold = [], faces = [], panels = [];
  const ease = (low, high) => {
    const u = Math.max(0, Math.min(1, (t-low)/(high-low)));
    return u*u*(3-2*u);
  };
  const wallAngle = Math.PI/2 * ease(0, .64);
  const glueAngle = (Math.PI/3 + .016) * ease(.12,.65);
  const cs = Math.cos(wallAngle), sn = Math.sin(wallAngle);
  const rotate = (i, [x,z]) => {
    const a = i*Math.PI/3;
    return [x*Math.cos(a)-z*Math.sin(a), x*Math.sin(a)+z*Math.cos(a)];
  };
  const sheet = (i,p) => rotate(i,p).map((v,j) => v*baseScale+center[j]);
  const point = ([x,z]) => x.toFixed(3)+' '+z.toFixed(3);
  const linePath = pts => 'M'+pts.map(point).join('L');
  const space = (i,x,y,z) => {
    const rotated = rotate(i,[x,z]);
    return [rotated[0]*baseScale,y*baseScale,rotated[1]*baseScale];
  };
  const add = (name,flat,positions,kind) => {
    const uv = flat.map(([x,y])=>[(x-bounds[0])/bounds[2],(y-bounds[1])/bounds[3]]);
    faces.push({p:positions,uv,seam:kind!=='glue',print:kind!=='glue', internal:kind==='glue'});
    panels.push({name,path:linePath(flat)+'Z',kind});
  };
  const A=[apothem,-r/2], B=[apothem,r/2], D=[apothem+h,-r/2], C=[apothem+h,r/2];
  const G=[apothem+h,-r/2-12.5*glueScale/baseScale];
  const far=[apothem+h+44.8,-7.1], middle=[apothem+h+47.3,4.3], neck=[apothem+h+37.2,-.4];
  const c1=[apothem+h+51.2,-5.2], c2=[apothem+h+51.7,1.1];
  const c3=[apothem+h+42,8], c4=[apothem+h+36.4,5];
  const lobe = [D,far];
  const cubic = (p0,p1,p2,p3) => {
    for(let step=1;step<=16;step++){
      const u=step/16, v=1-u;
      lobe.push([0,1].map(j=>v**3*p0[j]+3*v*v*u*p1[j]+3*v*u*u*p2[j]+u**3*p3[j]));
    }
  };
  cubic(far,c1,c2,middle); cubic(middle,c3,c4,neck); lobe.push(C);
  const vertices = Array.from({length:6},(_,i)=>rotate(i,A));
  add('六角底面',vertices.map(v=>v.map((n,i)=>n*baseScale+center[i])),vertices.map(([x,z])=>[x*baseScale,0,z*baseScale]),'base');
  for(let i=0;i<6;i++){
    const onSheet = q => sheet(i,q);
    const xy = q => point(onSheet(q));
    cut.push('M'+xy(A)+'L'+xy(G)+'L'+xy(D)+'L'+xy(far)+'C'+[c1,c2,middle].map(xy).join(' ')+'C'+[c3,c4,neck].map(xy).join(' ')+'L'+xy(C)+'L'+xy(B));
    for(const edge of [[A,B],[A,D],[D,C]])fold.push(linePath(edge.map(onSheet)));
    const wall = ([x,z]) => space(i,apothem+(x-apothem)*cs,(x-apothem)*sn,z);
    const side = [A,B,C,D];
    add('侧面 '+(i+1),side.map(onSheet),side.map(wall),'wall');
    // The glue tab rotates around A-D in the moving coordinate frame of this wall.
    const gusset = [A,D,G];
    const glue = ([x,z]) => {
      const extension=A[1]-z, intoWall=extension*Math.sin(glueAngle);
      return space(i,apothem+(x-apothem)*cs-intoWall*sn,(x-apothem)*sn+intoWall*cs,A[1]-extension*Math.cos(glueAngle));
    };
    add('糊口 '+(i+1),gusset.map(onSheet),gusset.map(glue),'glue');
    // Small successive closure offsets give the interlocking tongues a readable overlap.
    const lidAngle = wallAngle+(Math.PI/2-.003*(i+1))*ease(.47+.019*i,.90+.019*i);
    const top = ([x,z]) => space(i,apothem+h*cs+(x-D[0])*Math.cos(lidAngle),
      h*sn+(x-D[0])*Math.sin(lidAngle),z);
    add('扣舌 '+(i+1),lobe.map(onSheet),lobe.map(top),'lid');
  }
  return {id:6,name:'六瓣旋扣盒',box:bounds.join(' '),cut:cut.join(' '),fold:fold.join(' '),faces,panels,bleed:''};
}
