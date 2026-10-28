"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { devopsPosition, devopsSteps, devopsStep, packetPosition as demoPosition, packetStatus, zones as demoZones, type Packet } from "./model";
import { stepIcons } from "./step-icons";
import { createStageMachine, type StageMachine } from "./stage-machines";
import s from "./ThesisMap.module.css";

import { liveZones, livePosition } from "./live-model";

type Props = { live?: boolean; liveStatus?: string; zoomRequest: { id: number; direction: number }; packets: Packet[]; view: number; resetKey: number; track: boolean; paused: boolean; reduced: boolean; onSelect: (index: number) => void; onOrbit: () => void };

export default function Scene(props: Props) {
  const zones = props.live ? liveZones : demoZones;
  const packetPosition = props.live ? livePosition : demoPosition;
  const host = useRef<HTMLDivElement>(null);
  const labels = useRef<(HTMLButtonElement | null)[]>([]);
  const stepLabels = useRef<(HTMLButtonElement | null)[]>([]);
  const packetLabels = useRef(new Map<number, HTMLSpanElement>());
  const latest = useRef(props);
  latest.current = props;
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const zones = props.live ? liveZones : demoZones;
    const packetPosition = props.live ? livePosition : demoPosition;
    const element = host.current!;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch { setUnavailable(true); return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.setClearColor(0x060c16, 1);
    element.prepend(renderer.domElement);
    renderer.domElement.setAttribute("aria-label", "Interactive 3D thesis map. Drag to orbit, scroll to zoom. Zone buttons and camera controls provide keyboard navigation.");
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x060c16, 90, 180);
    scene.add(new THREE.HemisphereLight(0xaedcff, 0x111929, 2.2));
    const light = new THREE.DirectionalLight(0xb8d5ff, 3);
    light.position.set(6, 18, 10); scene.add(light);
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 200);
    camera.position.set(9.5, 17, 23);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(1, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.09;
    controls.minDistance = 7; controls.maxDistance = 130;
    controls.minPolarAngle = .2; controls.maxPolarAngle = Math.PI / 2.2;
    controls.addEventListener("start", () => { transitioning = false; latest.current.onOrbit(); });
    const grid = new THREE.GridHelper(33, 44, 0x1e6380, 0x142c40);
    grid.position.set(1.5, -.35, 0); grid.scale.z = 19 / 33; scene.add(grid);
    const ground = new THREE.Mesh(new THREE.BoxGeometry(33, .25, 19), new THREE.MeshStandardMaterial({ color: 0x0b1525, metalness: .5, roughness: .55 }));
    ground.position.set(1.5, -.55, 0); scene.add(ground);
    const edge = new THREE.LineSegments(new THREE.EdgesGeometry(ground.geometry), new THREE.LineBasicMaterial({ color: 0x275e7b }));
    edge.position.copy(ground.position); scene.add(edge);
    const animated: THREE.Object3D[] = [];
    function box(group: THREE.Group, size: [number, number, number], position: [number, number, number], color: THREE.ColorRepresentation, glow = false) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshStandardMaterial({ color, metalness: .55, roughness: .35, emissive: glow ? color : 0x000000, emissiveIntensity: glow ? .6 : 0 }));
      mesh.position.set(...position); group.add(mesh); return mesh;
    }
    zones.forEach((zone, index) => {
      const island = new THREE.Group(); island.position.fromArray(zone.position); island.scale.setScalar(1.15); scene.add(island);
      const dark = new THREE.Color(zone.color).multiplyScalar(.24);
      const material = new THREE.MeshStandardMaterial({ color: dark, metalness: .4, roughness: .55 });
      for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) {
        if (Math.abs(q + r) > 2) continue;
        const height = .24 + ((q * q + r * r + index) % 4) * .12;
        const tile = new THREE.Mesh(new THREE.CylinderGeometry(.5, .5, height, 6), material);
        tile.position.set(.91 * (q + r / 2), height / 2, .79 * r); island.add(tile);
      }
      const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(.95, 1.12, .35, 6), new THREE.MeshStandardMaterial({ color: dark, metalness: .6, roughness: .2 }));
      pedestal.position.y = .58; island.add(pedestal);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, .025, 8, 6), new THREE.MeshBasicMaterial({ color: zone.color }));
      ring.rotation.x = Math.PI / 2; ring.position.y = .78; island.add(ring);
      const accent = new THREE.PointLight(zone.color, 8, 6, 2); accent.position.y = 1.8; island.add(accent);
      if (index < 2) {
        box(island, [1.5, .12, 1], [0, .95, .2], 0x182b41);
        box(island, [.13, .5, .13], [0, 1.2, -.2], zone.color);
        const screen = box(island, [1.25, .85, .12], [0, 1.7, -.25], 0x101e32); screen.rotation.x = -.12;
        for (let i = 0; i < 4; i++) box(island, [.75 - i * .09, .035, .03], [-.12, 1.95 - i * .15, -.16], zone.color, true);
        for (let i = 0; i < 3; i++) box(island, [.8, .025, .045], [0, 1.02, .12 + i * .15], 0x487286);
      } else if (index === 2) {
        box(island, [1.35, .85, 1.05], [0, 1.25, 0], 0x29323d);
        box(island, [.27, .9, .27], [.5, 1.95, -.25], zone.color);
        const gear = new THREE.Group(); gear.position.set(0, 1.7, .6);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(.42, .12, 8, 12), new THREE.MeshStandardMaterial({ color: zone.color, metalness: .75, roughness: .3 })); gear.add(rim);
        for (let i = 0; i < 8; i++) { const tooth = box(gear, [.16, .2, .2], [Math.sin(i * Math.PI / 4) * .48, Math.cos(i * Math.PI / 4) * .48, 0], zone.color); tooth.rotation.z = -i * Math.PI / 4; }
        island.add(gear); animated.push(gear);
      } else if (index === 3) {
        box(island, [.18, 1.8, .2], [-.65, 1.65, 0], 0x295359);
        box(island, [.18, 1.8, .2], [.65, 1.65, 0], 0x295359);
        box(island, [1.5, .18, .2], [0, 2.5, 0], zone.color);
        const scan = box(island, [1.1, .03, .65], [0, 1.3, 0], zone.color, true); scan.name = "scan"; animated.push(scan);
        const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(.25), new THREE.MeshStandardMaterial({ color: zone.color, emissive: zone.color, emissiveIntensity: .5 }));
        orb.position.set(0, 2.85, 0); island.add(orb);
      } else {
        box(island, [.9, 1.9, .8], [0, 1.65, 0], 0x102b2d);
        for (let i = 0; i < 5; i++) box(island, [.7, .045, .03], [0, 1 + i * .3, .42], zone.color, true);
        for (let i = 0; i < 3; i++) box(island, [.18, .4 + i * .23, .18], [.75 + i * .24, 1 + i * .115, 0], zone.color, true);
      }
    });
    for (const method of (props.live ? ["B"] as const : ["A", "B"] as const)) {
      const points = Array.from({ length: 121 }, (_, i) => new THREE.Vector3(...packetPosition(i / 120, method)));
      const curve = new THREE.CatmullRomCurve3(points);
      scene.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, .035, 5, false), new THREE.MeshBasicMaterial({ color: method === "A" ? 0x6c5494 : 0x917846, transparent: true, opacity: .65 })));
    }
    const machines: { machine: StageMachine; baseY: number }[] = [];
    if (!props.live) for (let i = 0; i < 10; i++) {
      const machine = createStageMachine(i);
      scene.add(machine.group);
      machines.push({ machine, baseY: machine.moving.position.y });
    }
    const packets = new Map<number, THREE.Mesh>();
    const packetGeometry = new THREE.OctahedronGeometry(.18);
    const materials = { A: new THREE.MeshBasicMaterial({ color: 0xcbb8ff }), B: new THREE.MeshBasicMaterial({ color: 0xffdf85 }) };
    let visible = true;
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }); observer.observe(element);
    let frame = 0, last = 0, lastView = -99, lastReset = -1, lastZoom = 0;
    const resize = () => { const w = element.clientWidth, h = element.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); lastView = -99; };
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element); resize();
    const desiredTarget = new THREE.Vector3(), desiredCamera = new THREE.Vector3();
    let transitioning = false;
    const project = new THREE.Vector3();
    const animate = (now: number) => {
      frame = requestAnimationFrame(animate);
      if (!visible || document.hidden || now - last < 32) return;
      last = now;
      const current = latest.current;
      if (current.view !== lastView || current.resetKey !== lastReset) {
        lastView = current.view; lastReset = current.resetKey;
        desiredTarget.fromArray(current.view >= 0 ? zones[current.view].position : [1.5, 0, 0]);
        const offset = current.view >= 0 ? new THREE.Vector3(6, 7, 9) : new THREE.Vector3(10, 20, 27);
        offset.multiplyScalar(Math.max(1, (current.view >= 0 ? .7 : 1.3) / camera.aspect));
        desiredCamera.copy(desiredTarget).add(offset);
        transitioning = true;
      }
      const newest = current.packets[current.packets.length - 1];
      if (current.track && newest) {
        desiredTarget.set(...packetPosition(newest.progress, newest.method));
        desiredCamera.copy(desiredTarget).add(new THREE.Vector3(7, 9, 11)); transitioning = true;
      }
      if (transitioning) {
        const amount = current.reduced ? 1 : .07;
        camera.position.lerp(desiredCamera, amount); controls.target.lerp(desiredTarget, amount);
        if (camera.position.distanceTo(desiredCamera) < .08) transitioning = false;
      }
      if (!current.paused && !current.reduced) animated.forEach(object => { if (object.name === "scan") object.position.y = 1.6 + Math.sin(now / 700) * .55; else object.rotation.z = now / 1200; });
      const activeStages = current.packets.filter(packet => packet.method === "B").map(packet => devopsStep(packet.progress));
      machines.forEach(({ machine, baseY }, i) => {
        const active = activeStages.includes(i);
        machine.ring.material.color.set(active ? 0xffe59a : 0x7b6741);
        machine.signal.emissiveIntensity = active ? 1.4 : .18;
        if (active && !current.paused && !current.reduced) {
          if (machine.motion === 'spin') machine.moving.rotation.z = now / 550;
          else if (machine.motion === 'scan') machine.moving.position.z = Math.sin(now / 350) * .25 + .16;
          else if (machine.motion === 'lift') machine.moving.position.y = baseY + Math.sin(now / 400) * .17;
          else machine.moving.scale.setScalar(1 + Math.sin(now / 300) * .22);
        } else {
          machine.moving.position.y = baseY;
          if (machine.motion === 'scan') machine.moving.position.z = .16;
          machine.moving.scale.setScalar(1);
        }
      });
      const ids = new Set(current.packets.map(p => p.id));
      packets.forEach((mesh, id) => { if (!ids.has(id)) { scene.remove(mesh); packets.delete(id); } });
      current.packets.forEach(packet => {
        let mesh = packets.get(packet.id);
        if (!mesh) { mesh = new THREE.Mesh(packetGeometry, materials[packet.method]); packets.set(packet.id, mesh); scene.add(mesh); }
        mesh.position.set(...packetPosition(packet.progress, packet.method));
        if (!current.paused && !current.reduced) mesh.rotation.y = now / 600;
      });
      if (current.zoomRequest.id !== lastZoom) {
        lastZoom = current.zoomRequest.id;
        transitioning = false;
        const offset = camera.position.clone().sub(controls.target).multiplyScalar(current.zoomRequest.direction > 0 ? .8 : 1.25).clampLength(controls.minDistance, controls.maxDistance);
        camera.position.copy(controls.target).add(offset);
      }
      controls.update();
      const placed: { x: number; y: number; w: number; h: number }[] = [];
      zones.forEach((zone, i) => {
        const label = labels.current[i]; if (!label) return;
        project.set(zone.position[0], 3.3, zone.position[2]).project(camera);
        const x = (project.x * .5 + .5) * element.clientWidth, y = (-project.y * .5 + .5) * element.clientHeight;
        label.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
        const rect = { x: x - label.offsetWidth / 2, y: y - label.offsetHeight, w: label.offsetWidth, h: label.offsetHeight };
        const overlaps = placed.some(other => rect.x < other.x + other.w + 4 && rect.x + rect.w + 4 > other.x && rect.y < other.y + other.h + 4 && rect.y + rect.h + 4 > other.y);
        label.style.visibility = overlaps || project.z > 1 || project.z < -1 || x < 30 || x > element.clientWidth - 30 || y < 25 || y > element.clientHeight ? "hidden" : "visible";
        if (label.style.visibility === "visible") placed.push({ x: x - label.offsetWidth / 2, y: y - label.offsetHeight, w: label.offsetWidth, h: label.offsetHeight });
      });
      if (!current.live) {
        devopsSteps.forEach((step, i) => {
          const label = stepLabels.current[i]; if (!label) return;
          const [x3, , z3] = devopsPosition(i);
          project.set(x3, 1.35, z3).project(camera);
          const x = (project.x * .5 + .5) * element.clientWidth;
          const y = (-project.y * .5 + .5) * element.clientHeight;
          const w = label.offsetWidth, h = label.offsetHeight;
          const positions = [y - h - 9, y + 8, y - h - 58, y + 56];
          const left = Math.max(4, Math.min(element.clientWidth - w - 4, x - w / 2));
          const top = positions.find(candidate => candidate > 8 && candidate + h < element.clientHeight - 8 && !placed.some(rect => left < rect.x + rect.w + 4 && left + w + 4 > rect.x && candidate < rect.y + rect.h + 4 && candidate + h + 4 > rect.y));
          const shown = top !== undefined && Math.abs(project.z) < 1 && Math.abs(project.x) < 1.2 && Math.abs(project.y) < 1.2;
          label.style.visibility = shown ? "visible" : "hidden";
          label.dataset.active = activeStages.includes(i) ? "true" : "false";
          if (shown) { label.style.transform = `translate(${left}px, ${top}px)`; placed.push({ x: left, y: top, w, h }); }
        });
      }
      [...current.packets].reverse().forEach(packet => {
        const label = packetLabels.current.get(packet.id);
        if (!label) return;
        project.set(...packetPosition(packet.progress, packet.method)); project.y += .5; project.project(camera);
        const w = label.offsetWidth, h = label.offsetHeight;
        const x = Math.max(4, Math.min(element.clientWidth - w - 4, (project.x * .5 + .5) * element.clientWidth - w / 2));
        const baseY = (-project.y * .5 + .5) * element.clientHeight;
        const offsets = packet.method === "A" ? [-h - 12, 20, -h - 100, 110] : [20, -h - 12, 110, -h - 100];
        const y = offsets.map(offset => baseY + offset).find(candidate => candidate > 35 && candidate + h < element.clientHeight - 30 && !placed.some(r => x < r.x + r.w + 6 && x + w + 6 > r.x && candidate < r.y + r.h + 6 && candidate + h + 6 > r.y));
        const shown = y !== undefined && Math.abs(project.z) < 1 && Math.abs(project.x) < 1.15 && Math.abs(project.y) < 1.15;
        label.style.visibility = shown ? "visible" : "hidden";
        if (shown) { label.style.transform = `translate(${x}px, ${y}px)`; placed.push({ x, y, w, h }); }
      });
      renderer.render(scene, camera);
    };
    frame = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); resizeObserver.disconnect(); controls.dispose();
      const geometries = new Set<THREE.BufferGeometry>(), mats = new Set<THREE.Material>();
      scene.traverse(object => { const mesh = object as THREE.Mesh; if (mesh.geometry) geometries.add(mesh.geometry); if (mesh.material) (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).forEach(m => mats.add(m)); });
      geometries.add(packetGeometry); mats.add(materials.A); mats.add(materials.B);
      geometries.forEach(g => g.dispose()); mats.forEach(m => m.dispose()); renderer.dispose(); renderer.domElement.remove();
    };
  }, [props.live]);
  return <div className={s.scene} ref={host} data-webgl={unavailable ? "unavailable" : "ready"}>
    {unavailable ? <div className={s.fallback}><strong>3D preview is unavailable in this browser.</strong><p>Explore the same flow using the zone buttons and radar.</p></div> : zones.map((zone, i) => <button key={zone.title} aria-label={zone.title} className={s.zoneLabel} style={{ "--zone": zone.color } as CSSProperties} ref={el => { labels.current[i] = el; }} onClick={() => props.onSelect(i)}><span className={s.zoneNumber}>{i + 1}</span><small>{zone.subtitle}</small><strong>{zone.title}</strong></button>)}
    {!props.live && !unavailable && devopsSteps.map((step, i) => <button type="button" key={step.title} className={s.mapStepLabel} ref={el => { stepLabels.current[i] = el; }} onClick={() => props.onSelect(2)} title={`03.${i + 1} · ${step.title}: ${step.detail}`} aria-label={`Method B stage ${i + 1}: ${step.title}`}><FontAwesomeIcon icon={stepIcons[i]} aria-hidden="true" /><span>{step.title}</span></button>)}
    {props.packets.map(packet => <span key={packet.id} className={s.packetLabel} data-packet-id={packet.id} style={{ "--packet-color": packet.method === "A" ? "#bba9ff" : "#ffdc81" } as CSSProperties} ref={element => { if (element) packetLabels.current.set(packet.id, element); else packetLabels.current.delete(packet.id); }}>
      <strong>#{packet.id} · {packet.artifact}</strong><span>{packet.commitMessage}</span><small>{props.live ? props.liveStatus : `${packet.method} · ${packetStatus(packet)}`}</small>
    </span>)}
  </div>;
}
