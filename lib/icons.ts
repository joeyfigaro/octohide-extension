const ATTRS =
  'viewBox="0 0 16 16" width="14" height="14" fill="none" ' +
  'stroke="currentColor" stroke-width="1.4" stroke-linecap="round" ' +
  'stroke-linejoin="round" aria-hidden="true"';

const EYE_BODY =
  '<path d="M1 8s2.5-4.5 7-4.5S15 8 15 8s-2.5 4.5-7 4.5S1 8 1 8Z"/>' +
  '<circle cx="8" cy="8" r="2"/>';

export const EYE_SVG = `<svg ${ATTRS}>${EYE_BODY}</svg>`;

export const EYE_CLOSED_SVG = `<svg ${ATTRS}>${EYE_BODY}<line x1="2.5" y1="13.5" x2="13.5" y2="2.5"/></svg>`;
