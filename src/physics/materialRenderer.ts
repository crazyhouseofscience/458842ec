import { ElectroObject } from '../types/electrostatics';

/**
 * Draws realistic, high-fidelity procedural textures and 3D-shaded substances
 * on the 2D Canvas for each material in MATERIALS_DATABASE.
 */
export function drawRealisticMaterialBody(
  ctx: CanvasRenderingContext2D,
  obj: ElectroObject,
  isSelected: boolean,
  clock: number
) {
  const w = obj.width;
  const h = obj.height;
  const hw = w / 2;
  const hh = h / 2;

  // Ambient bench drop shadow beneath every physical specimen
  ctx.save();
  ctx.shadowColor = 'rgba(2, 6, 23, 0.72)';
  ctx.shadowBlur = isSelected ? 18 : 12;
  ctx.shadowOffsetX = 3;
  ctx.shadowOffsetY = 6;

  if (obj.shape === 'point_charge') {
    drawPointChargeOrb(ctx, hw, hh, obj.charge, isSelected, clock);
  } else {
    switch (obj.materialId) {
    case 'glass':
      drawBorosilicateGlassRod(ctx, hw, hh, w, h, isSelected);
      break;
    case 'ebonite':
      drawEboniteRubberRod(ctx, hw, hh, w, h, isSelected);
      break;
    case 'pvc':
      drawPvcPolymerRod(ctx, hw, hh, w, h, isSelected);
      break;
    case 'plastic_ruler':
      drawPlasticRuler(ctx, hw, hh, w, h, isSelected);
      break;
    case 'amber':
      drawAmberResinBody(ctx, hw, hh, w, h, isSelected);
      break;
    case 'fur':
      drawRabbitFurPelt(ctx, hw, hh, w, h, isSelected);
      break;
    case 'wool':
      drawWoolKnitCloth(ctx, hw, hh, w, h, isSelected);
      break;
    case 'silk':
      drawDrapedSilkCloth(ctx, hw, hh, w, h, isSelected, clock);
      break;
    case 'teflon':
      drawTeflonBalloon(ctx, hw, hh, w, h, isSelected, clock);
      break;
    case 'paper':
      drawCellulosePaperStrips(ctx, hw, hh, w, h, isSelected, obj.charge, clock);
      break;
    case 'styrofoam':
      drawStyrofoamBlock(ctx, hw, hh, w, h, isSelected);
      break;
    case 'scotch_tape':
      drawScotchTapePieces(ctx, hw, hh, w, h, isSelected, obj.charge, clock);
      break;
    case 'aluminum_can':
      drawAluminumCan(ctx, hw, hh, w, h, isSelected);
      break;
    case 'copper':
      drawBrushedCopperSphere(ctx, hw, hh, w, h, isSelected);
      break;
    case 'ground':
      drawEarthGroundBusbar(ctx, hw, hh, w, h, isSelected);
      break;
    case 'electroscope':
      drawGoldLeafElectroscope(ctx, obj, hw, hh, w, h, isSelected, clock);
      break;
    default:
      drawDefaultSpecimen(ctx, hw, hh, w, h, isSelected);
      break;
    }
  }

  ctx.restore();

  // Selection focus ring (circular for point charges, rounded rect for macroscopic bodies)
  if (isSelected) {
    ctx.save();
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.92)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    if (obj.shape === 'point_charge') {
      ctx.arc(0, 0, Math.min(hw, hh) + 7, 0, Math.PI * 2);
    } else {
      ctx.roundRect(-hw - 7, -hh - 7, w + 14, h + 14, 14);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawBorosilicateGlassRod(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const r = hh;
  // Translucent silica body gradient
  const grad = ctx.createLinearGradient(0, -hh, 0, hh);
  grad.addColorStop(0, 'rgba(224, 242, 254, 0.85)');
  grad.addColorStop(0.22, 'rgba(125, 211, 252, 0.36)');
  grad.addColorStop(0.55, 'rgba(56, 189, 248, 0.18)');
  grad.addColorStop(0.85, 'rgba(14, 165, 233, 0.42)');
  grad.addColorStop(1, 'rgba(186, 230, 253, 0.72)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.fill();

  // Reset shadow for crisp internal caustics & speculars
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Inner caustic core band
  const caustic = ctx.createLinearGradient(-hw, 0, hw, 0);
  caustic.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  caustic.addColorStop(0.5, 'rgba(224, 242, 254, 0.25)');
  caustic.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
  ctx.fillStyle = caustic;
  ctx.beginPath();
  ctx.roundRect(-hw + 8, -hh * 0.25, w - 16, h * 0.35, 4);
  ctx.fill();

  // Top sharp specular glass reflection streak
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(-hw + r, -hh + 4.5);
  ctx.lineTo(hw - r, -hh + 4.5);
  ctx.stroke();

  // Secondary lower rim refraction highlight
  ctx.strokeStyle = 'rgba(186, 230, 253, 0.55)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-hw + r, hh - 4);
  ctx.lineTo(hw - r, hh - 4);
  ctx.stroke();

  // Beveled elliptical glass end-cap polish
  ctx.fillStyle = 'rgba(186, 230, 253, 0.32)';
  ctx.strokeStyle = 'rgba(224, 242, 254, 0.7)';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(hw - r * 0.55, 0, r * 0.42, hh * 0.88, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Outer silhouette edge
  ctx.strokeStyle = isSelected ? '#fb923c' : 'rgba(125, 211, 252, 0.85)';
  ctx.lineWidth = isSelected ? 2 : 1.4;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.stroke();
}

function drawEboniteRubberRod(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const r = hh;
  const grad = ctx.createLinearGradient(0, -hh, 0, hh);
  grad.addColorStop(0, '#475569');
  grad.addColorStop(0.24, '#334155');
  grad.addColorStop(0.65, '#1e293b');
  grad.addColorStop(1, '#0f172a');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Satin matte highlight strip
  ctx.fillStyle = 'rgba(148, 163, 184, 0.22)';
  ctx.beginPath();
  ctx.roundRect(-hw + r, -hh + 4, w - 2 * r, h * 0.22, 3);
  ctx.fill();

  // Lathe grip rings on left & right ends
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.8)';
  ctx.lineWidth = 1.5;
  for (const xOff of [-hw + 22, -hw + 28, hw - 28, hw - 22]) {
    ctx.beginPath();
    ctx.moveTo(xOff, -hh + 2);
    ctx.lineTo(xOff, hh - 2);
    ctx.stroke();
  }

  ctx.strokeStyle = isSelected ? '#fb923c' : '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.stroke();
}

function drawPvcPolymerRod(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const r = hh;
  const grad = ctx.createLinearGradient(0, -hh, 0, hh);
  grad.addColorStop(0, '#d8b4fe');
  grad.addColorStop(0.18, '#a855f7');
  grad.addColorStop(0.6, '#7e22ce');
  grad.addColorStop(1, '#4c1d95');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Glossy extruded plastic specular line
  ctx.strokeStyle = 'rgba(250, 245, 255, 0.65)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-hw + r, -hh + 5);
  ctx.lineTo(hw - r, -hh + 5);
  ctx.stroke();

  // Hollow pipe bore at right end
  ctx.fillStyle = '#2e1065';
  ctx.strokeStyle = '#c084fc';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.ellipse(hw - r * 0.55, 0, r * 0.38, hh * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = isSelected ? '#fb923c' : '#9333ea';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.stroke();
}

function drawPlasticRuler(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  // Translucent sky-blue acrylic classroom ruler body
  const grad = ctx.createLinearGradient(0, -hh, 0, hh);
  grad.addColorStop(0, 'rgba(191, 219, 254, 0.78)');
  grad.addColorStop(0.22, 'rgba(96, 165, 250, 0.56)');
  grad.addColorStop(0.68, 'rgba(59, 130, 246, 0.44)');
  grad.addColorStop(1, 'rgba(37, 99, 235, 0.65)');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, 4);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Inner beveled specular reflection along acrylic edge
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.68)';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-hw + 6, -hh + 3);
  ctx.lineTo(hw - 6, -hh + 3);
  ctx.stroke();

  // Metric graduation ticks along top scale (0..15 cm)
  const scaleStart = -hw + 22;
  const scaleEnd = hw - 12;
  const numTicks = 30;
  ctx.strokeStyle = 'rgba(248, 250, 252, 0.85)';
  ctx.fillStyle = 'rgba(248, 250, 252, 0.9)';
  ctx.font = 'bold 7.5px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  for (let i = 0; i <= numTicks; i++) {
    const tx = scaleStart + (i / numTicks) * (scaleEnd - scaleStart);
    const isMajor = i % 10 === 0;
    const isHalf = i % 5 === 0 && !isMajor;
    const tickLen = isMajor ? 10 : isHalf ? 7 : 4.5;
    ctx.lineWidth = isMajor ? 1.3 : 0.9;
    ctx.beginPath();
    ctx.moveTo(tx, -hh);
    ctx.lineTo(tx, -hh + tickLen);
    ctx.stroke();

    if (isMajor) {
      ctx.fillText(`${i / 2}`, tx, -hh + 11.5);
    }
  }

  // Pegboard hanging hole on left end
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.strokeStyle = 'rgba(191, 219, 254, 0.75)';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.arc(-hw + 11, 2, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Subtle "cm" unit stamp
  ctx.fillStyle = 'rgba(224, 242, 254, 0.72)';
  ctx.font = 'bold 7px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText('cm', hw - 7, hh - 3);

  ctx.strokeStyle = isSelected ? '#fb923c' : '#60a5fa';
  ctx.lineWidth = isSelected ? 2 : 1.4;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, 4);
  ctx.stroke();
}

function drawAmberResinBody(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const r = Math.min(hh, 16);
  const grad = ctx.createRadialGradient(-hw * 0.25, -hh * 0.25, 4, 0, 0, Math.max(w, h) * 0.65);
  grad.addColorStop(0, '#fef08a');
  grad.addColorStop(0.3, '#f59e0b');
  grad.addColorStop(0.75, '#b45309');
  grad.addColorStop(1, '#78350f');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Organic fossilized resin flecks
  ctx.fillStyle = 'rgba(69, 26, 3, 0.45)';
  const flecks = [
    [-0.25, -0.1, 2.2],
    [0.12, 0.15, 1.8],
    [0.28, -0.18, 1.5],
    [-0.08, 0.2, 2.0],
  ];
  for (const [fx, fy, fr] of flecks) {
    ctx.beginPath();
    ctx.arc(fx * w, fy * h, fr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Polished resin sheen
  ctx.strokeStyle = 'rgba(254, 249, 195, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-hw + r, -hh + 4.5);
  ctx.lineTo(hw - r, -hh + 4.5);
  ctx.stroke();

  ctx.strokeStyle = isSelected ? '#fb923c' : '#d97706';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.stroke();
}

function drawRabbitFurPelt(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  // Organic pelt contour using sinusoidal lobes
  ctx.beginPath();
  const steps = 48;
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const lobe = 1 + 0.08 * Math.sin(a * 7) + 0.04 * Math.cos(a * 11);
    const px = Math.cos(a) * hw * lobe;
    const py = Math.sin(a) * hh * lobe;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();

  const furGrad = ctx.createRadialGradient(-hw * 0.2, -hh * 0.2, 8, 0, 0, Math.max(hw, hh) * 1.15);
  furGrad.addColorStop(0, '#fcd34d');
  furGrad.addColorStop(0.45, '#d97706');
  furGrad.addColorStop(0.85, '#92400e');
  furGrad.addColorStop(1, '#78350f');

  ctx.fillStyle = furGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Individual keratin fur bristles across interior & perimeter
  const rings = [0.35, 0.62, 0.88];
  for (const rFrac of rings) {
    const count = Math.floor(18 * rFrac + 6);
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rFrac;
      const sx = Math.cos(a) * hw * rFrac;
      const sy = Math.sin(a) * hh * rFrac;
      const len = 7 + (i % 3) * 3;
      const dir = a + 0.25 * Math.sin(i * 2.1);

      ctx.strokeStyle = i % 2 === 0 ? 'rgba(254, 243, 199, 0.55)' : 'rgba(120, 53, 15, 0.65)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(sx + Math.cos(dir) * len, sy + Math.sin(dir) * len);
      ctx.stroke();
    }
  }

  ctx.strokeStyle = isSelected ? '#fb923c' : '#b45309';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const lobe = 1 + 0.08 * Math.sin(a * 7) + 0.04 * Math.cos(a * 11);
    const px = Math.cos(a) * hw * lobe;
    const py = Math.sin(a) * hh * lobe;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}

function drawWoolKnitCloth(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  grad.addColorStop(0, '#f1f5f9');
  grad.addColorStop(0.5, '#cbd5e1');
  grad.addColorStop(1, '#94a3b8');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, 14);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Clip & draw woven wool cross-hatch yarn pattern
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, 14);
  ctx.clip();

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
  ctx.lineWidth = 1.5;
  const step = 10;
  for (let x = -hw - h; x < hw + h; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, -hh);
    ctx.lineTo(x + h * 0.5, hh);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + h * 0.5, -hh);
    ctx.lineTo(x, hh);
    ctx.stroke();
  }
  ctx.restore();

  // Stitched border seam
  ctx.strokeStyle = isSelected ? '#fb923c' : '#64748b';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, 14);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(248, 250, 252, 0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.roundRect(-hw + 4, -hh + 4, w - 8, h - 8, 10);
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawDrapedSilkCloth(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean,
  clock: number
) {
  const wave = Math.sin(clock * 1.4) * 2.5;
  ctx.beginPath();
  ctx.moveTo(-hw, -hh + 6);
  ctx.bezierCurveTo(-hw * 0.35, -hh - 6, hw * 0.35, -hh + 10, hw, -hh + 2);
  ctx.bezierCurveTo(hw + 5, -hh * 0.2, hw - 4 + wave, hh * 0.4, hw - 2, hh - 4);
  ctx.bezierCurveTo(hw * 0.3, hh + 6, -hw * 0.35, hh - 8, -hw + 2, hh - 2);
  ctx.bezierCurveTo(-hw - 4, hh * 0.3, -hw + 5 - wave, -hh * 0.3, -hw, -hh + 6);
  ctx.closePath();

  // Anisotropic iridescent silk sheen gradient
  const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  grad.addColorStop(0, '#fbcfe8');
  grad.addColorStop(0.28, '#f472b6');
  grad.addColorStop(0.52, '#fdf2f8');
  grad.addColorStop(0.75, '#db2777');
  grad.addColorStop(1, '#9d174d');

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Flowing drape fold lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.6;
  for (const offset of [-0.22, 0.14]) {
    ctx.beginPath();
    ctx.moveTo(-hw * 0.7, offset * h - 10);
    ctx.bezierCurveTo(-hw * 0.1, offset * h + 12, hw * 0.2, offset * h - 12, hw * 0.72, offset * h + 8);
    ctx.stroke();
  }

  ctx.strokeStyle = isSelected ? '#fb923c' : '#be185d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-hw, -hh + 6);
  ctx.bezierCurveTo(-hw * 0.35, -hh - 6, hw * 0.35, -hh + 10, hw, -hh + 2);
  ctx.bezierCurveTo(hw + 5, -hh * 0.2, hw - 4 + wave, hh * 0.4, hw - 2, hh - 4);
  ctx.bezierCurveTo(hw * 0.3, hh + 6, -hw * 0.35, hh - 8, -hw + 2, hh - 2);
  ctx.bezierCurveTo(-hw - 4, hh * 0.3, -hw + 5 - wave, -hh * 0.3, -hw, -hh + 6);
  ctx.closePath();
  ctx.stroke();
}

function drawTeflonBalloon(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean,
  clock: number
) {
  // Sculpted teardrop balloon body (shifted slightly above knot)
  const topY = -hh;
  const botY = hh - 14;
  const midY = -hh * 0.18;

  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.bezierCurveTo(hw * 1.08, topY, hw * 1.05, midY, 0, botY);
  ctx.bezierCurveTo(-hw * 1.05, midY, -hw * 1.08, topY, 0, topY);
  ctx.closePath();

  const grad = ctx.createRadialGradient(-hw * 0.32, -hh * 0.42, 6, 0, -hh * 0.1, Math.max(hw, hh) * 1.25);
  grad.addColorStop(0, '#fbcfe8');
  grad.addColorStop(0.25, '#f472b6');
  grad.addColorStop(0.68, '#db2777');
  grad.addColorStop(1, '#831843');

  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Glossy specular oval highlight
  ctx.save();
  ctx.translate(-hw * 0.34, -hh * 0.38);
  ctx.rotate(-0.45);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.48)';
  ctx.beginPath();
  ctx.ellipse(0, 0, hw * 0.14, hh * 0.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Outline stroke
  ctx.strokeStyle = isSelected ? '#fb923c' : '#be185d';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(0, topY);
  ctx.bezierCurveTo(hw * 1.08, topY, hw * 1.05, midY, 0, botY);
  ctx.bezierCurveTo(-hw * 1.05, midY, -hw * 1.08, topY, 0, topY);
  ctx.closePath();
  ctx.stroke();

  // Tied latex neck collar
  ctx.fillStyle = '#9d174d';
  ctx.beginPath();
  ctx.moveTo(0, botY - 1);
  ctx.lineTo(-7, botY + 9);
  ctx.lineTo(7, botY + 9);
  ctx.closePath();
  ctx.fill();

  // Gently swaying cotton string
  const sway = Math.sin(clock * 2.2) * 8;
  ctx.strokeStyle = 'rgba(226, 232, 240, 0.65)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, botY + 9);
  ctx.bezierCurveTo(8 + sway, botY + 26, -8 - sway * 0.6, botY + 46, sway * 0.5, botY + 64);
  ctx.stroke();
}

function drawCellulosePaperStrips(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean,
  charge: number,
  clock: number
) {
  const flutter = Math.abs(charge) > 0.5 ? Math.sin(clock * 4) * 0.04 : 0;
  const strips = [
    { angle: -0.18 - flutter, dx: -10, dy: 2, shade: '#cbd5e1' },
    { angle: 0.16 + flutter, dx: 12, dy: 4, shade: '#e2e8f0' },
    { angle: 0.02, dx: 0, dy: -2, shade: '#f8fafc' },
  ];

  for (const s of strips) {
    ctx.save();
    ctx.translate(s.dx, s.dy);
    ctx.rotate(s.angle);

    const sw = w * 0.72;
    const sh = h * 0.54;
    const grad = ctx.createLinearGradient(-sw / 2, -sh / 2, sw / 2, sh / 2);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.6, s.shade);
    grad.addColorStop(1, '#94a3b8');

    ctx.fillStyle = grad;
    ctx.strokeStyle = isSelected ? '#fb923c' : '#64748b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-sw / 2, -sh / 2, sw, sh, 2);
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Subtle cellulose fiber lines
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = 0.8;
    for (let ly = -sh * 0.25; ly <= sh * 0.28; ly += sh * 0.25) {
      ctx.beginPath();
      ctx.moveTo(-sw * 0.36, ly);
      ctx.lineTo(sw * 0.36, ly);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawStyrofoamBlock(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const r = 8;
  const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.55, '#f1f5f9');
  grad.addColorStop(1, '#cbd5e1');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Clip interior and pack expanded polystyrene (EPS) cellular foam beads
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.clip();

  const cols = 9;
  const rows = 6;
  const cellW = w / cols;
  const cellH = h / rows;

  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= cols; col++) {
      const idx = row * 17 + col * 31;
      const jitterX = (hash01(idx + 1.1) - 0.5) * cellW * 0.55;
      const jitterY = (hash01(idx + 4.7) - 0.5) * cellH * 0.55;
      const bx = -hw + (col + 0.5) * cellW + jitterX;
      const by = -hh + (row + 0.5) * cellH + jitterY;
      const beadR = 4.2 + hash01(idx + 9.3) * 3.1;

      const beadGrad = ctx.createRadialGradient(bx - beadR * 0.3, by - beadR * 0.3, 0.6, bx, by, beadR);
      beadGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
      beadGrad.addColorStop(0.72, 'rgba(226, 232, 240, 0.72)');
      beadGrad.addColorStop(1, 'rgba(148, 163, 184, 0.42)');

      ctx.fillStyle = beadGrad;
      ctx.beginPath();
      ctx.arc(bx, by, beadR, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
      ctx.lineWidth = 0.7;
      ctx.stroke();
    }
  }
  ctx.restore();

  // Crisp top highlight bevel & perimeter edge
  ctx.strokeStyle = isSelected ? '#fb923c' : '#94a3b8';
  ctx.lineWidth = isSelected ? 2 : 1.5;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, r);
  ctx.stroke();
}

function drawScotchTapePieces(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean,
  charge: number,
  clock: number
) {
  const flutter = Math.abs(charge) > 0.5 ? Math.sin(clock * 4.2) * 0.035 : 0;
  const pieces = [
    { dx: -4, dy: -hh * 0.28, angle: -0.09 - flutter, sw: w * 0.88, sh: h * 0.44 },
    { dx: 5, dy: hh * 0.26, angle: 0.08 + flutter, sw: w * 0.86, sh: h * 0.44 },
  ];

  for (const p of pieces) {
    ctx.save();
    ctx.translate(p.dx, p.dy);
    ctx.rotate(p.angle);

    const phw = p.sw / 2;
    const phh = p.sh / 2;
    const teeth = 5;
    const toothDepth = 4.5;

    // Build tape silhouette with serrated zig-zag dispenser-cut ends on left & right
    ctx.beginPath();
    ctx.moveTo(-phw, -phh);
    ctx.lineTo(phw, -phh);

    for (let t = 0; t < teeth; t++) {
      const yMid = -phh + ((t + 0.5) / teeth) * p.sh;
      const yEnd = -phh + ((t + 1) / teeth) * p.sh;
      ctx.lineTo(phw - toothDepth, yMid);
      ctx.lineTo(phw, yEnd);
    }

    ctx.lineTo(-phw, phh);
    for (let t = teeth - 1; t >= 0; t--) {
      const yMid = -phh + ((t + 0.5) / teeth) * p.sh;
      const yTop = -phh + (t / teeth) * p.sh;
      ctx.lineTo(-phw + toothDepth, yMid);
      ctx.lineTo(-phw, yTop);
    }
    ctx.closePath();

    // Translucent glossy polypropylene film gradient
    const filmGrad = ctx.createLinearGradient(-phw, -phh, phw, phh);
    filmGrad.addColorStop(0, 'rgba(224, 242, 254, 0.52)');
    filmGrad.addColorStop(0.35, 'rgba(186, 230, 253, 0.28)');
    filmGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.65)');
    filmGrad.addColorStop(0.8, 'rgba(186, 230, 253, 0.25)');
    filmGrad.addColorStop(1, 'rgba(125, 211, 252, 0.45)');

    ctx.fillStyle = filmGrad;
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Diagonal specular tape sheen streak
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.36)';
    ctx.beginPath();
    ctx.moveTo(-phw * 0.25, -phh);
    ctx.lineTo(phw * 0.05, -phh);
    ctx.lineTo(-phw * 0.15, phh);
    ctx.lineTo(-phw * 0.45, phh);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = isSelected ? '#fb923c' : 'rgba(125, 211, 252, 0.78)';
    ctx.lineWidth = isSelected ? 1.6 : 1.1;
    ctx.stroke();

    ctx.restore();
  }
}

function drawAluminumCan(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const neckInset = 5;
  const shoulderY = -hh + 13;
  const heelY = hh - 9;

  // Tapered cylindrical soda-can silhouette
  ctx.beginPath();
  ctx.moveTo(-hw + neckInset, -hh + 3);
  ctx.lineTo(hw - neckInset, -hh + 3);
  ctx.lineTo(hw, shoulderY);
  ctx.lineTo(hw, heelY);
  ctx.lineTo(hw - neckInset + 1, hh);
  ctx.lineTo(-hw + neckInset - 1, hh);
  ctx.lineTo(-hw, heelY);
  ctx.lineTo(-hw, shoulderY);
  ctx.closePath();

  // Brushed metallic aluminum cylindrical shading
  const metalGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
  metalGrad.addColorStop(0, '#64748b');
  metalGrad.addColorStop(0.18, '#cbd5e1');
  metalGrad.addColorStop(0.36, '#f8fafc');
  metalGrad.addColorStop(0.55, '#e2e8f0');
  metalGrad.addColorStop(0.78, '#94a3b8');
  metalGrad.addColorStop(1, '#475569');

  ctx.fillStyle = metalGrad;
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Subtle brushed aluminum lab label stripe around midsection
  ctx.save();
  ctx.clip();
  const stripeGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
  stripeGrad.addColorStop(0, 'rgba(14, 165, 233, 0.36)');
  stripeGrad.addColorStop(0.36, 'rgba(56, 189, 248, 0.62)');
  stripeGrad.addColorStop(0.75, 'rgba(2, 132, 199, 0.42)');
  stripeGrad.addColorStop(1, 'rgba(12, 74, 110, 0.45)');
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(-hw, -hh * 0.34, w, h * 0.38);

  // Crisp metallic label lettering "Al"
  ctx.fillStyle = 'rgba(248, 250, 252, 0.88)';
  ctx.font = 'bold 12px Plus Jakarta Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Al CAN', 0, -hh * 0.14);

  // Subtle horizontal specular rim folds
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-hw, shoulderY);
  ctx.lineTo(hw, shoulderY);
  ctx.moveTo(-hw, heelY);
  ctx.lineTo(hw, heelY);
  ctx.stroke();
  ctx.restore();

  // Rolled aluminum top rim & recessed pull-tab lid
  ctx.fillStyle = '#cbd5e1';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  ctx.ellipse(0, -hh + 3.5, hw - neckInset, 3.8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(2, -hh + 3.5, 6, 1.8, 0, 0, Math.PI * 2);
  ctx.stroke();

  // Outer silhouette border
  ctx.strokeStyle = isSelected ? '#fb923c' : '#94a3b8';
  ctx.lineWidth = isSelected ? 2.1 : 1.5;
  ctx.beginPath();
  ctx.moveTo(-hw + neckInset, -hh + 3);
  ctx.lineTo(hw - neckInset, -hh + 3);
  ctx.lineTo(hw, shoulderY);
  ctx.lineTo(hw, heelY);
  ctx.lineTo(hw - neckInset + 1, hh);
  ctx.lineTo(-hw + neckInset - 1, hh);
  ctx.lineTo(-hw, heelY);
  ctx.lineTo(-hw, shoulderY);
  ctx.closePath();
  ctx.stroke();
}

function drawBrushedCopperSphere(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const radius = Math.min(hw, hh);
  const grad = ctx.createRadialGradient(-radius * 0.35, -radius * 0.35, radius * 0.08, 0, 0, radius);
  grad.addColorStop(0, '#ffedd5');
  grad.addColorStop(0.22, '#fb923c');
  grad.addColorStop(0.58, '#c2410c');
  grad.addColorStop(0.88, '#7c2d12');
  grad.addColorStop(1, '#431407');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Concentric brushed metal grain rings
  ctx.strokeStyle = 'rgba(254, 215, 170, 0.14)';
  ctx.lineWidth = 1;
  for (const rFrac of [0.35, 0.55, 0.76]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius * rFrac, 0.2, Math.PI * 1.4);
    ctx.stroke();
  }

  // Rim bounce reflection
  ctx.strokeStyle = 'rgba(253, 186, 116, 0.38)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius - 2, Math.PI * 0.15, Math.PI * 0.75);
  ctx.stroke();

  ctx.strokeStyle = isSelected ? '#fb923c' : '#ea580c';
  ctx.lineWidth = isSelected ? 2.2 : 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawEarthGroundBusbar(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  // Machined industrial grounding busbar with metallic bevel
  const grad = ctx.createLinearGradient(0, -hh, 0, hh);
  grad.addColorStop(0, '#34d399');
  grad.addColorStop(0.25, '#10b981');
  grad.addColorStop(0.75, '#047857');
  grad.addColorStop(1, '#064e3b');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, 4);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.strokeStyle = isSelected ? '#fb923c' : '#6ee7b7';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-hw, -hh, w, h, 4);
  ctx.stroke();

  // Hex mounting lugs at left & right ends
  for (const bx of [-hw + 18, hw - 18]) {
    ctx.fillStyle = '#cbd5e1';
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(bx, 0, 5.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#475569';
    ctx.beginPath();
    ctx.moveTo(bx - 3, 0);
    ctx.lineTo(bx + 3, 0);
    ctx.stroke();
  }

  // Braided copper lead & IEEE Earth Ground symbol
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(0, hh + 1);
  ctx.lineTo(0, hh + 16);
  ctx.moveTo(-14, hh + 16);
  ctx.lineTo(14, hh + 16);
  ctx.moveTo(-9, hh + 21);
  ctx.lineTo(9, hh + 21);
  ctx.moveTo(-4, hh + 26);
  ctx.lineTo(4, hh + 26);
  ctx.stroke();
}

function drawDefaultSpecimen(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean
) {
  const radius = Math.min(hw, hh);
  const grad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, 4, 0, 0, radius);
  grad.addColorStop(0, '#e2e8f0');
  grad.addColorStop(0.6, '#64748b');
  grad.addColorStop(1, '#334155');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.strokeStyle = isSelected ? '#fb923c' : '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawGoldLeafElectroscope(
  ctx: CanvasRenderingContext2D,
  obj: ElectroObject,
  hw: number,
  hh: number,
  w: number,
  h: number,
  isSelected: boolean,
  clock: number
) {
  const baseTop = hh - 22;
  const baseH = 22;
  const jarTop = -hh + 44;
  const jarBot = baseTop;
  const jarHalfW = hw - 10;
  const knobY = -hh * 0.82;
  const knobR = 17;
  const stemTopY = knobY + knobR - 2;
  const stopperY = jarTop;
  const hingeY = hh * 0.02;
  const leafLen = Math.min(54, jarBot - hingeY - 12);

  // 1. Dark Bakelite Base Platform
  const bakeliteGrad = ctx.createLinearGradient(-hw, baseTop, -hw, hh);
  bakeliteGrad.addColorStop(0, '#334155');
  bakeliteGrad.addColorStop(0.25, '#1e293b');
  bakeliteGrad.addColorStop(1, '#090d16');
  ctx.fillStyle = bakeliteGrad;
  ctx.beginPath();
  ctx.roundRect(-hw + 4, baseTop, w - 8, baseH, [4, 4, 8, 8]);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  ctx.strokeStyle = isSelected ? '#fb923c' : '#475569';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Brass pedestal collar atop base
  const brassPlinth = ctx.createLinearGradient(-34, 0, 34, 0);
  brassPlinth.addColorStop(0, '#92400e');
  brassPlinth.addColorStop(0.35, '#fbbf24');
  brassPlinth.addColorStop(0.6, '#fef08a');
  brassPlinth.addColorStop(1, '#78350f');
  ctx.fillStyle = brassPlinth;
  ctx.fillRect(-34, baseTop - 6, 68, 7);

  // 2. Glass Bell Jar Interior & Protractor Scale (0° - 60°)
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-jarHalfW, jarBot);
  ctx.lineTo(-jarHalfW, jarTop + 26);
  ctx.quadraticCurveTo(-jarHalfW, jarTop, -22, jarTop);
  ctx.lineTo(22, jarTop);
  ctx.quadraticCurveTo(jarHalfW, jarTop, jarHalfW, jarTop + 26);
  ctx.lineTo(jarHalfW, jarBot);
  ctx.closePath();

  const jarBg = ctx.createLinearGradient(-jarHalfW, 0, jarHalfW, 0);
  jarBg.addColorStop(0, 'rgba(148, 163, 184, 0.16)');
  jarBg.addColorStop(0.22, 'rgba(226, 232, 240, 0.05)');
  jarBg.addColorStop(0.78, 'rgba(186, 230, 253, 0.06)');
  jarBg.addColorStop(1, 'rgba(148, 163, 184, 0.18)');
  ctx.fillStyle = jarBg;
  ctx.fill();
  ctx.clip();

  // Engraved laboratory degree arc inside bell jar
  const scaleR = leafLen + 11;
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.34)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, hingeY, scaleR, Math.PI * 0.12, Math.PI * 0.88);
  ctx.stroke();

  for (const deg of [-60, -45, -30, -15, 0, 15, 30, 45, 60]) {
    const rad = Math.PI / 2 - (deg * Math.PI) / 180;
    const isMajor = deg % 30 === 0;
    const r0 = scaleR - (isMajor ? 6 : 3.5);
    const r1 = scaleR + 2;
    ctx.strokeStyle = isMajor ? 'rgba(226, 232, 240, 0.45)' : 'rgba(148, 163, 184, 0.28)';
    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * r0, hingeY + Math.sin(rad) * r0);
    ctx.lineTo(Math.cos(rad) * r1, hingeY + Math.sin(rad) * r1);
    ctx.stroke();
  }
  ctx.restore();

  // 3. Vertical Brass Stem & Insulating Rubber Stopper
  const stemGrad = ctx.createLinearGradient(-5, 0, 5, 0);
  stemGrad.addColorStop(0, '#92400e');
  stemGrad.addColorStop(0.4, '#fde047');
  stemGrad.addColorStop(0.7, '#eab308');
  stemGrad.addColorStop(1, '#78350f');
  ctx.fillStyle = stemGrad;
  ctx.fillRect(-4, stemTopY, 8, hingeY - stemTopY + 4);

  // Black ebonite/rubber insulating collar sealing neck of glass jar
  ctx.fillStyle = '#0f172a';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(-22, stopperY - 8, 44, 15, 4);
  ctx.fill();
  ctx.stroke();

  // Brass saddle bracket at leaf hinge
  ctx.fillStyle = '#eab308';
  ctx.beginPath();
  ctx.roundRect(-9, hingeY - 5, 18, 9, 3);
  ctx.fill();

  // 4. Dual 24k Gold-Foil Leaves rotated by ±leafAngleDeg
  const leafAngleDeg = Math.max(0, Math.min(72, obj.leafAngleDeg ?? 0));
  const leafAngleRad = (leafAngleDeg * Math.PI) / 180;
  const leafQ = obj.leafChargeNc ?? obj.charge * 0.55;
  const absLeafQ = Math.abs(leafQ);
  const shimmer = absLeafQ > 0.3 ? Math.sin(clock * 7) * 0.012 : 0;

  for (const side of [-1, 1] as const) {
    ctx.save();
    ctx.translate(side * 2.5, hingeY);
    ctx.rotate(side * (-leafAngleRad + shimmer));

    const goldGrad = ctx.createLinearGradient(-4, 0, 4, leafLen);
    goldGrad.addColorStop(0, '#fef08a');
    goldGrad.addColorStop(0.35, '#facc15');
    goldGrad.addColorStop(0.75, '#eab308');
    goldGrad.addColorStop(1, '#ca8a04');

    if (absLeafQ > 0.25) {
      ctx.shadowColor = leafQ > 0 ? 'rgba(56, 189, 248, 0.72)' : 'rgba(236, 72, 153, 0.75)';
      ctx.shadowBlur = Math.min(14, 4 + absLeafQ * 0.7);
    }

    ctx.fillStyle = goldGrad;
    ctx.strokeStyle = '#fef9c3';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-2.5, 0);
    ctx.lineTo(2.5, 0);
    ctx.lineTo(3.8, leafLen);
    ctx.lineTo(-3.8, leafLen);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Charge polarity markers directly on the gold foil leaves
    if (absLeafQ > 0.35) {
      const markerCount = Math.min(3, Math.max(1, Math.round(absLeafQ / 4)));
      const isPos = leafQ > 0;
      for (let m = 0; m < markerCount; m++) {
        const my = leafLen * (0.34 + m * 0.26);
        ctx.fillStyle = isPos ? '#0284c7' : '#be185d';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(0, my, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(isPos ? '+' : '−', 0, my + 0.3);
      }
    }
    ctx.restore();
  }

  // 5. Glass Bell Jar Outer Rim & Specular Highlights (drawn over leaves for authentic enclosure)
  ctx.strokeStyle = isSelected ? '#fb923c' : 'rgba(186, 230, 253, 0.58)';
  ctx.lineWidth = isSelected ? 2 : 1.5;
  ctx.beginPath();
  ctx.moveTo(-jarHalfW, jarBot);
  ctx.lineTo(-jarHalfW, jarTop + 26);
  ctx.quadraticCurveTo(-jarHalfW, jarTop, -22, jarTop);
  ctx.moveTo(22, jarTop);
  ctx.quadraticCurveTo(jarHalfW, jarTop, jarHalfW, jarTop + 26);
  ctx.lineTo(jarHalfW, jarBot);
  ctx.stroke();

  // Curved glass specular highlight streak
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-jarHalfW + 8, jarBot - 10);
  ctx.lineTo(-jarHalfW + 8, jarTop + 30);
  ctx.quadraticCurveTo(-jarHalfW + 8, jarTop + 10, -jarHalfW + 22, jarTop + 7);
  ctx.stroke();

  // 6. Top Spherical Brass Collector Knob + Induced/Net Charge Badges
  const knobQ = obj.knobChargeNc ?? obj.charge * 0.45;
  const absKnobQ = Math.abs(knobQ);

  if (absKnobQ > 0.25) {
    ctx.save();
    ctx.shadowColor = knobQ > 0 ? '#38bdf8' : '#ec4899';
    ctx.shadowBlur = Math.min(18, 6 + absKnobQ * 0.9);
    ctx.beginPath();
    ctx.arc(0, knobY, knobR, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(250, 204, 21, 0.1)';
    ctx.fill();
    ctx.restore();
  }

  const knobGrad = ctx.createRadialGradient(-5, knobY - 5, 2, 0, knobY, knobR);
  knobGrad.addColorStop(0, '#fef9c3');
  knobGrad.addColorStop(0.32, '#facc15');
  knobGrad.addColorStop(0.75, '#ca8a04');
  knobGrad.addColorStop(1, '#713f12');

  ctx.fillStyle = knobGrad;
  ctx.beginPath();
  ctx.arc(0, knobY, knobR, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = isSelected ? '#fb923c' : '#fde047';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // Charge glyphs directly on the brass collector knob
  if (absKnobQ > 0.35) {
    const isPos = knobQ > 0;
    const count = Math.min(5, Math.max(1, Math.round(absKnobQ / 2.8)));
    for (let k = 0; k < count; k++) {
      const a = -Math.PI * 0.85 + (count === 1 ? Math.PI * 0.35 : (k / (count - 1)) * Math.PI * 0.7);
      const kx = Math.cos(a) * (knobR - 4);
      const ky = knobY + Math.sin(a) * (knobR - 4);
      ctx.fillStyle = isPos ? '#0284c7' : '#be185d';
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.arc(kx, ky, 4.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isPos ? '+' : '−', kx, ky + 0.3);
    }
  }

  // 7. Live Grounding Clamp / Finger Touch Indicator on Knob when isGrounded === true
  if (obj.isGrounded) {
    ctx.save();
    ctx.strokeStyle = '#34d399';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(knobR + 2, knobY);
    ctx.lineTo(knobR + 26, knobY);
    ctx.lineTo(knobR + 26, knobY + 18);
    // Earth ground symbol
    ctx.moveTo(knobR + 15, knobY + 18);
    ctx.lineTo(knobR + 37, knobY + 18);
    ctx.moveTo(knobR + 19, knobY + 23);
    ctx.lineTo(knobR + 33, knobY + 23);
    ctx.moveTo(knobR + 23, knobY + 28);
    ctx.lineTo(knobR + 29, knobY + 28);
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.beginPath();
    ctx.arc(knobR + 2, knobY, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = 'bold 9.5px JetBrains Mono, monospace';
    ctx.textAlign = 'left';
    ctx.fillText('0 V', knobR + 16, knobY - 8);
    ctx.restore();
  }

  // Subtle base plate label
  ctx.fillStyle = 'rgba(226, 232, 240, 0.78)';
  ctx.font = 'bold 9.5px JetBrains Mono, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`θ = ${leafAngleDeg.toFixed(0)}°`, 0, baseTop + baseH / 2 + 0.5);
}

function drawPointChargeOrb(
  ctx: CanvasRenderingContext2D,
  hw: number,
  hh: number,
  charge: number,
  isSelected: boolean,
  clock: number
) {
  const baseR = Math.min(hw, hh);
  const pulse = 1 + 0.03 * Math.sin(clock * 4.2);
  const radius = baseR * pulse;
  const isPos = charge > 0.05;
  const isNeg = charge < -0.05;

  const grad = ctx.createRadialGradient(-radius * 0.32, -radius * 0.32, radius * 0.1, 0, 0, radius);
  if (isPos) {
    grad.addColorStop(0, '#e0f2fe');
    grad.addColorStop(0.28, '#38bdf8');
    grad.addColorStop(0.75, '#0284c7');
    grad.addColorStop(1, '#0c4a6e');
  } else if (isNeg) {
    grad.addColorStop(0, '#fdf2f8');
    grad.addColorStop(0.28, '#f472b6');
    grad.addColorStop(0.75, '#db2777');
    grad.addColorStop(1, '#831843');
  } else {
    grad.addColorStop(0, '#f8fafc');
    grad.addColorStop(0.35, '#94a3b8');
    grad.addColorStop(0.85, '#475569');
    grad.addColorStop(1, '#1e293b');
  }

  ctx.shadowColor = isPos ? 'rgba(56, 189, 248, 0.65)' : isNeg ? 'rgba(236, 72, 153, 0.65)' : 'rgba(148, 163, 184, 0.35)';
  ctx.shadowBlur = isSelected ? 18 : 12;

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;

  // Inner concentric dielectric ring
  ctx.strokeStyle = isPos
    ? 'rgba(186, 230, 253, 0.55)'
    : isNeg
    ? 'rgba(251, 207, 232, 0.55)'
    : 'rgba(226, 232, 240, 0.4)';
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
  ctx.stroke();

  // Outer perimeter rim
  ctx.strokeStyle = isSelected
    ? '#fb923c'
    : isPos
    ? '#7dd3fc'
    : isNeg
    ? '#f9a8d4'
    : '#cbd5e1';
  ctx.lineWidth = isSelected ? 2.2 : 1.6;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Crisp polarity glyph (+ / − / 0)
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.round(radius * 1.05)}px JetBrains Mono, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(isPos ? '+' : isNeg ? '−' : '0', 0, 0.5);
}

function hash01(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Renders a localized surface-charge-density particle shimmer effect using small,
 * additive-blended emissive electron/ion micro-points whose count and brightness
 * scale with |Q|, local surface curvature/clustering, and external field induction.
 */
export function drawSurfaceChargeShimmer(
  ctx: CanvasRenderingContext2D,
  obj: ElectroObject,
  isConductor: boolean,
  externalField: { Ex: number; Ey: number; magnitude: number },
  clock: number,
  animate: boolean,
  rubAgitation = 0
) {
  if (obj.shape === 'point_charge' || obj.shape === 'electroscope') return;
  const absCharge = Math.abs(obj.charge);
  const inducedConducting = isConductor && absCharge < 0.15 && externalField.magnitude > 45;
  const inducedDielectric = !isConductor && absCharge < 0.15 && externalField.magnitude > 75;
  const isInducedNeutral = inducedConducting || inducedDielectric;
  if (absCharge < 0.08 && !isInducedNeutral && rubAgitation < 0.05) return;

  const w = obj.width;
  const h = obj.height;
  const hw = w / 2;
  const hh = h / 2;
  const areaScale = 95 / Math.max(52, Math.sqrt(w * h));
  const fieldActivity = Math.min(2.4, externalField.magnitude / 500);
  const shimmerBoost = 1 + rubAgitation * 1.4 + fieldActivity * 1.05;

  // Effective surface charge density normalized to [0..1]
  const chargeIntensity = inducedConducting
    ? Math.min(0.75, externalField.magnitude / 1400)
    : inducedDielectric
    ? Math.min(0.48, externalField.magnitude / 2100)
    : Math.min(1, Math.max(rubAgitation * 0.35, (absCharge / 18) * areaScale));
  const magnitudeBrightness = inducedConducting
    ? Math.min(0.85, 0.24 + externalField.magnitude / 1300)
    : inducedDielectric
    ? Math.min(0.62, 0.16 + externalField.magnitude / 1900)
    : Math.min(1, Math.max(rubAgitation * 0.45, Math.pow(absCharge / 20, 0.78)));

  const pointCount = Math.max(12, Math.round(14 + chargeIntensity * 54));

  // External E-field angle transformed into object-local coordinates for induction bias
  const rotRad = (obj.rotation * Math.PI) / 180;
  const extAngleLocal = Math.atan2(externalField.Ey, externalField.Ex) - rotRad;
  const extBiasX = externalField.magnitude > 35 ? Math.cos(extAngleLocal) : 0;
  const extBiasY = externalField.magnitude > 35 ? Math.sin(extAngleLocal) : 0;
  const inductionWeight = Math.min(0.85, externalField.magnitude / 950);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < pointCount; i++) {
    const u = hash01(i * 1.37 + 3.1);
    const v = hash01(i * 2.91 + 7.4);
    const driftSpeed = animate
      ? (isConductor ? 0.72 : 0.28) * shimmerBoost
      : 0;
    const phase = i * 1.93 + u * 6.283;

    let lx = 0;
    let ly = 0;
    let curvatureWeight = 1.0;

    if (obj.shape === 'sphere') {
      const rOuter = Math.min(hw, hh) * (0.76 + 0.19 * v);
      const theta = u * Math.PI * 2 + clock * driftSpeed * (i % 2 === 0 ? 1 : -0.7);
      lx = Math.cos(theta) * rOuter;
      ly = Math.sin(theta) * rOuter;
      curvatureWeight = 1.05;
    } else if (obj.shape === 'rod') {
      // Rods exhibit higher surface charge density near curved end-caps (tip effect)
      const tipBias = Math.sin((u - 0.5) * Math.PI);
      const tX = tipBias * 0.48;
      const edgeSide = v > 0.35 ? (i % 2 === 0 ? 1 : -1) * (0.36 + 0.12 * v) : (v - 0.175) * 2.0;
      lx = tX * w + (animate ? Math.sin(clock * 4 * shimmerBoost + phase) * (1.2 + rubAgitation * 1.5 + fieldActivity) : 0);
      ly = edgeSide * h + (animate ? Math.cos(clock * 4 * shimmerBoost + phase) * (1.0 + rubAgitation * 1.2 + fieldActivity * 0.8) : 0);
      curvatureWeight = 0.72 + 0.65 * Math.pow(Math.abs(tX) / 0.48, 1.5);
    } else if (obj.shape === 'balloon') {
      const theta = u * Math.PI * 2 + (animate ? clock * 0.2 * shimmerBoost : 0);
      const rim = 0.62 + 0.33 * Math.sqrt(v);
      lx = Math.cos(theta) * hw * 0.88 * rim;
      ly = Math.sin(theta) * hh * 0.82 * rim - hh * 0.08;
      curvatureWeight = 0.8 + 0.35 * rim;
    } else if (obj.shape === 'ground_plate') {
      lx = (u - 0.5) * w * 0.92;
      ly = (v - 0.5) * h * 0.78;
      curvatureWeight = 0.85 + 0.4 * Math.abs(u - 0.5) * 2;
    } else {
      // Cloth pads & paper strips: anchored organically across surface & near existing surfaceCharges
      if (obj.surfaceCharges.length > 0 && i % 3 !== 0) {
        const anchor = obj.surfaceCharges[i % obj.surfaceCharges.length];
        const angle = u * Math.PI * 2 + (animate ? clock * 0.4 * shimmerBoost : 0);
        const spread = 0.06 + v * 0.12;
        lx = (anchor.relX + Math.cos(angle) * spread) * w;
        ly = (anchor.relY + Math.sin(angle) * spread) * h;
      } else {
        lx = (u - 0.5) * w * 0.86 + (animate ? Math.sin(clock * 5 * shimmerBoost + phase) * (rubAgitation * 2 + fieldActivity) : 0);
        ly = (v - 0.5) * h * 0.82 + (animate ? Math.cos(clock * 5 * shimmerBoost + phase) * (rubAgitation * 2 + fieldActivity) : 0);
      }
      // Clamp within pad bounds
      lx = Math.max(-hw * 0.9, Math.min(hw * 0.9, lx));
      ly = Math.max(-hh * 0.9, Math.min(hh * 0.9, ly));
      curvatureWeight = 0.85 + 0.3 * (Math.abs(lx) / Math.max(1, hw));
    }

    // Localized density boost from nearby bound/free surfaceCharges
    let localClusterBoost = 0.85;
    if (obj.surfaceCharges.length > 0) {
      let nearbyCount = 0;
      const nx = lx / Math.max(1, w);
      const ny = ly / Math.max(1, h);
      for (let s = 0; s < obj.surfaceCharges.length; s++) {
        const sc = obj.surfaceCharges[s];
        const d2 = (nx - sc.relX) * (nx - sc.relX) + (ny - sc.relY) * (ny - sc.relY);
        if (d2 < 0.035) nearbyCount++;
      }
      localClusterBoost = Math.min(1.45, 0.78 + nearbyCount * 0.16);
    }

    // Determine polarity at this localized point (supports induced polarization on neutral conductors & dielectrics)
    let isPositive = obj.charge >= 0;
    const alignDot =
      (lx / Math.max(1, hw)) * extBiasX + (ly / Math.max(1, hh)) * extBiasY;
    if (isInducedNeutral) {
      // External E points from (+) toward (-); electrons accumulate upstream (-alignDot), (+) downstream
      isPositive = alignDot >= 0;
    }

    const inductionBoost = isConductor || isInducedNeutral
      ? 1 + inductionWeight * (isPositive ? alignDot : -alignDot) * 0.85
      : 1;

    // Multi-frequency shimmer twinkle
    const twinkleFreq = 1 + rubAgitation * 0.85 + fieldActivity * 0.55;
    const twinkle = animate
      ? 0.42 +
        0.38 * Math.sin(clock * (3.6 + (i % 5) * 0.85) * twinkleFreq + phase) +
        0.2 * Math.cos(clock * 7.3 * twinkleFreq + i * 4.1)
      : 0.85;

    const brightness = Math.min(
      1,
      (0.18 + 0.78 * magnitudeBrightness) *
        curvatureWeight *
        localClusterBoost *
        Math.max(0.4, inductionBoost) *
        Math.max(0.25, twinkle)
    );

    if (brightness < 0.06) continue;

    // Smaller, colored emissive point + soft additive bloom
    const coreRadius = 0.9 + brightness * 1.15;
    const bloomRadius = 2.8 + brightness * 4.4;

    const glowColor = isPositive
      ? `rgba(56, 189, 248, ${(brightness * 0.55).toFixed(3)})`
      : `rgba(236, 72, 153, ${(brightness * 0.58).toFixed(3)})`;
    const coreColor = isPositive
      ? `rgba(224, 242, 254, ${Math.min(1, brightness * 1.05).toFixed(3)})`
      : `rgba(253, 242, 248, ${Math.min(1, brightness * 1.05).toFixed(3)})`;

    // Soft outer emissive bloom
    const grad = ctx.createRadialGradient(lx, ly, 0, lx, ly, bloomRadius);
    grad.addColorStop(0, glowColor);
    grad.addColorStop(0.55, isPositive ? `rgba(14, 165, 233, ${(brightness * 0.22).toFixed(3)})` : `rgba(219, 39, 119, ${(brightness * 0.22).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(lx, ly, bloomRadius, 0, Math.PI * 2);
    ctx.fill();

    // Hot pinpoint emissive core
    ctx.fillStyle = coreColor;
    ctx.beginPath();
    ctx.arc(lx, ly, coreRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

