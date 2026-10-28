import * as THREE from 'three';
import { devopsPosition } from './model';

export type StageMachine = { group: THREE.Group; ring: THREE.Mesh<THREE.TorusGeometry, THREE.MeshBasicMaterial>; signal: THREE.MeshStandardMaterial; moving: THREE.Object3D; motion: 'spin' | 'lift' | 'scan' | 'pulse' };

/** Small, code-built machines illustrate each stage of the thesis flow. */
export function createStageMachine(index: number): StageMachine {
  const [x, , z] = devopsPosition(index);
  const group = new THREE.Group(); group.position.set(x, .58, z);
  const dark = new THREE.MeshStandardMaterial({ color: 0x102036, metalness: .55, roughness: .35 });
  const signal = new THREE.MeshStandardMaterial({ color: 0xffc857, emissive: 0xffab24, emissiveIntensity: .18 });
  const blue = new THREE.MeshStandardMaterial({ color: 0x3d9fc9, emissive: 0x146a9a, emissiveIntensity: .25 });
  const box = (w: number, h: number, d: number, px: number, py: number, pz: number, material: THREE.Material = dark) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material); mesh.position.set(px, py, pz); group.add(mesh); return mesh;
  };
  const cylinder = (r: number, h: number, px: number, py: number, pz: number, material: THREE.Material = dark) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 12), material); mesh.position.set(px, py, pz); group.add(mesh); return mesh;
  };
  const halo = (r: number, py: number) => {
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(r, .03, 8, 24), new THREE.MeshBasicMaterial({ color: 0x7b6741 }));
    mesh.rotation.x = Math.PI / 2; mesh.position.y = py; group.add(mesh); return mesh;
  };
  cylinder(.44, .3, 0, .05, 0);
  const ring = halo(.44, .23);
  let moving: THREE.Object3D = ring;
  let motion: StageMachine['motion'] = 'spin';
  if (index === 0) { // Code editor and keyboard
    box(.76, .08, .52, 0, .36, .13, blue); box(.72, .49, .08, 0, .67, -.16);
    for (let i = 0; i < 3; i++) box(.4 - i * .06, .035, .02, -.09, .8 - i * .12, -.1, signal);
  } else if (index === 1) { // Upload antenna
    cylinder(.07, .8, 0, .68, 0, blue);
    const arrow = new THREE.Mesh(new THREE.ConeGeometry(.23, .35, 4), signal);
    arrow.position.y = 1.15; group.add(arrow); moving = arrow; motion = 'lift'; halo(.24, 1.03);
  } else if (index === 2) { // Branch guard shield
    const shape = new THREE.Shape(); shape.moveTo(0, .36); shape.lineTo(.38, .18); shape.lineTo(.3, -.3); shape.lineTo(0, -.48); shape.lineTo(-.3, -.3); shape.lineTo(-.38, .18); shape.closePath();
    const shield = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .08, bevelEnabled: true, bevelSize: .02, bevelThickness: .02 }), blue);
    shield.position.y = .84; group.add(shield); box(.35, .055, .035, 0, .75, .17, signal).rotation.z = -.45;
  } else if (index === 3) { // Test tubes and moving scanner
    for (let i = -1; i <= 1; i++) { cylinder(.09, .5, i * .23, .65, 0, blue); cylinder(.11, .06, i * .23, .92, 0, signal); }
    moving = box(.75, .045, .07, 0, 1.02, .16, signal); motion = 'scan';
  } else if (index === 4) { // Docker image blocks on a conveyor
    box(.9, .13, .53, 0, .36, 0, blue);
    box(.38, .3, .34, -.24, .59, 0); box(.38, .3, .34, .24, .59, 0); box(.38, .3, .34, 0, .9, 0, signal);
  } else if (index === 5 || index === 8) { // Staging server / production cluster
    const count = index === 5 ? 2 : 3;
    for (let i = 0; i < count; i++) {
      const bx = (i - (count - 1) / 2) * .33;
      box(.28, .76, .4, bx, .74, 0);
      for (let j = 0; j < 3; j++) box(.19, .035, .025, bx, .5 + j * .2, .22, j === 2 ? signal : blue);
    }
  } else if (index === 6 || index === 9) { // Health monitor and ECG trace
    box(.89, .61, .1, 0, .77, 0);
    const points = [[-.38,.77],[-.23,.77],[-.14,.94],[-.02,.55],[.1,.84],[.21,.77],[.38,.77]];
    const geometry = new THREE.BufferGeometry().setFromPoints(points.map(([px,py]) => new THREE.Vector3(px,py,.07)));
    group.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: index === 9 ? 0x69efb9 : 0x72d7ec })));
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(.1, 12, 8), signal);
    pulse.position.set(0,1.18,0); group.add(pulse); moving = pulse; motion = 'pulse';
  } else { // Production approval key
    const head = new THREE.Mesh(new THREE.TorusGeometry(.2,.07,8,18),signal);
    head.position.set(-.2,.91,0); group.add(head); box(.48,.1,.1,.17,.91,0,signal); box(.1,.19,.1,.36,.83,0,signal);
    moving = head; motion = 'pulse';
  }
  return { group, ring, signal, moving, motion };
}
