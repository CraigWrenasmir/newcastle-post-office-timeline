import {Matrix,Vector3} from '@babylonjs/core/Maths/math.vector.js';
import {Ray} from '@babylonjs/core/Culling/ray.js';

// CPU picking normally sees the intact mesh even when a GPU morph has reduced
// it to rubble. Evaluate the current triangles on demand, only for a focus click.
export function pickVisibleSurface(scene,camera,components,x,y){
 const ray=scene.createPickingRay(x,y,Matrix.Identity(),camera);
 const deformed=components.filter(c=>c.mesh.isEnabled()&&((c.damage?.influence||0)>0||(c.ruin?.influence||0)>0));
 const morphMeshes=new Set(deformed.map(c=>c.mesh));
 const visible=mesh=>mesh.isEnabled()&&mesh.isVisible&&mesh.visibility>0&&mesh.getTotalVertices()>0;
 const ordinary=scene.pickWithRay(ray,mesh=>visible(mesh)&&!morphMeshes.has(mesh));
 let closest=ordinary?.hit?{point:ordinary.pickedPoint,mesh:ordinary.pickedMesh,distance:ordinary.distance}:null;
 const a=new Vector3(),b=new Vector3(),c=new Vector3();
 for(const {mesh} of deformed){
  if(!visible(mesh))continue;
  const positions=mesh.getPositionData(false,true),indices=mesh.getIndices();
  if(!positions||!indices)continue;
  const world=mesh.computeWorldMatrix(true),localRay=Ray.Transform(ray,Matrix.Invert(world));
  for(let i=0;i<indices.length;i+=3){
   Vector3.FromArrayToRef(positions,indices[i]*3,a);Vector3.FromArrayToRef(positions,indices[i+1]*3,b);Vector3.FromArrayToRef(positions,indices[i+2]*3,c);
   const hit=localRay.intersectsTriangle(a,b,c);if(!hit)continue;
   const point=Vector3.TransformCoordinates(localRay.origin.add(localRay.direction.scale(hit.distance)),world);
   const distance=Vector3.Distance(ray.origin,point);
   if(!closest||distance<closest.distance)closest={point,mesh,distance};
  }
 }
 return closest;
}
