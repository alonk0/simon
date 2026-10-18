const SVG_NS = 'http://www.w3.org/2000/svg';

function svg(paths: string[]): SVGSVGElement {
  const root = document.createElementNS(SVG_NS, 'svg');
  root.setAttribute('viewBox', '0 0 24 24');
  root.setAttribute('width', '24');
  root.setAttribute('height', '24');
  root.setAttribute('fill', 'none');
  root.setAttribute('stroke', 'currentColor');
  root.setAttribute('stroke-width', '2');
  root.setAttribute('stroke-linecap', 'round');
  root.setAttribute('stroke-linejoin', 'round');
  root.setAttribute('aria-hidden', 'true');
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    root.append(path);
  }
  return root;
}

const SPEAKER = 'M11 5 6 9H3v6h3l5 4V5z';

export function soundOnIcon(): SVGSVGElement {
  return svg([SPEAKER, 'M15.5 8.5a5 5 0 0 1 0 7', 'M18.5 5.5a9 9 0 0 1 0 13']);
}

export function soundOffIcon(): SVGSVGElement {
  return svg([SPEAKER, 'm16 9 6 6', 'm22 9-6 6']);
}
