/** One consistent 18px stroke icon family (§5.6). No emoji, no mixed libraries. */
export type IconName =
  | 'search'
  | 'moon'
  | 'sun'
  | 'sliders'
  | 'arrow-right'
  | 'panel'
  | 'plus'
  | 'sibling'
  | 'undo'
  | 'redo'
  | 'fit'
  | 'x'
  | 'check'
  | 'external'
  | 'clock'
  | 'chevron'
  | 'chevron-right'
  | 'chevron-left'
  | 'download'
  | 'upload'
  | 'link'
  | 'trash'
  | 'alert'
  | 'info'
  | 'sparkles'
  | 'copy'
  | 'file'
  | 'edit'
  | 'target'
  | 'eye'
  | 'eye-off'
  | 'grip'
  | 'more';

/** Each value is a full SVG path `d` (multiple `M` subpaths allowed). */
export const ICONS: Record<IconName, string> = {
  search: 'M8 3a5 5 0 1 0 0 10a5 5 0 1 0 0-10M11.6 11.6L16 16',
  moon: 'M15.2 11.4A6.5 6.5 0 0 1 6.6 2.8 6.5 6.5 0 1 0 15.2 11.4Z',
  sun: 'M9 5.8a3.2 3.2 0 1 0 0 6.4a3.2 3.2 0 1 0 0-6.4M9 1v1.8M9 15.2V17M1 9h1.8M15.2 9H17M3.3 3.3l1.3 1.3M13.4 13.4l1.3 1.3M14.7 3.3l-1.3 1.3M4.6 13.4l-1.3 1.3',
  sliders: 'M2 5h14M2 9h14M2 13h14M6 3v4M12 7v4M8 11v4',
  'arrow-right': 'M3 9h12M10 4l5 5-5 5',
  panel: 'M2.5 3h13v12h-13zM11 3v12',
  plus: 'M9 3v12M3 9h12',
  sibling: 'M2 4h9M2 9h9M2 14h9M14 9v6M11 12h6',
  undo: 'M7 4L3 8l4 4M3 8h9a3.5 3.5 0 0 1 0 7',
  redo: 'M11 4l4 4-4 4M15 8H6a3.5 3.5 0 0 0 0 7',
  fit: 'M3 7V3h4M15 7V3h-4M3 11v4h4M15 11v4h-4',
  x: 'M4 4l10 10M14 4L4 14',
  check: 'M3 9.5l4 4 8-9',
  external: 'M10 3h5v5M15 3L8 10M13 11v4H3V5h4',
  clock: 'M9 3a6 6 0 1 0 0 12a6 6 0 1 0 0-12M9 5.5V9l2.6 1.6',
  chevron: 'M4 7l5 5 5-5',
  'chevron-right': 'M7 4l5 5-5 5',
  'chevron-left': 'M11 4l-5 5 5 5',
  download: 'M9 3v9M5.5 8.5L9 12l3.5-3.5M3 14.5h12',
  upload: 'M9 12V3M5.5 6.5L9 3l3.5 3.5M3 14.5h12',
  link: 'M7.5 10.5l3-3M6 8L4.5 9.5a2.8 2.8 0 0 0 4 4L10 12M12 10l1.5-1.5a2.8 2.8 0 0 0-4-4L8 6',
  trash: 'M3 5h12M7 5V3h4v2M5 5l.7 10h6.6L13 5M7.5 8v4M10.5 8v4',
  alert: 'M9 2.5 16 15H2L9 2.5zM9 7v4M9 12.5v.5',
  info: 'M9 3a6 6 0 1 0 0 12a6 6 0 1 0 0-12M9 8v4.5M9 5.5v.5',
  sparkles: 'M9 2l1.3 3.7L14 7l-3.7 1.3L9 12l-1.3-3.7L4 7l3.7-1.3L9 2zM14 11l.6 1.4L16 13l-1.4.6L14 15l-.6-1.4L12 13l1.4-.6L14 11z',
  copy: 'M6 6h9v9H6zM3 12V3h9',
  file: 'M4 2h7l3 3v11H4zM11 2v3h3',
  edit: 'M3 12.5 12 3.5l2.5 2.5L5.5 15H3v-2.5z',
  target: 'M9 3a6 6 0 1 0 0 12a6 6 0 1 0 0-12M9 6a3 3 0 1 0 0 6a3 3 0 1 0 0-6M9 8.2a.8.8 0 1 0 0 1.6a.8.8 0 1 0 0-1.6',
  eye: 'M1.5 9S4 4.5 9 4.5 16.5 9 16.5 9 14 13.5 9 13.5 1.5 9 1.5 9zM9 6.8a2.2 2.2 0 1 0 0 4.4a2.2 2.2 0 1 0 0-4.4',
  'eye-off': 'M3 3l12 12M7 5.1A7.6 7.6 0 0 1 9 4.9c5 0 7.5 4.1 7.5 4.1a13 13 0 0 1-2.2 2.6M6 6.1A13 13 0 0 0 1.5 9S4 13.1 9 13.1c.8 0 1.5-.1 2.2-.3M7.5 7.5a2.2 2.2 0 0 0 3 3',
  grip: 'M6 4h.01M6 9h.01M6 14h.01M12 4h.01M12 9h.01M12 14h.01',
  more: 'M4 9h.01M9 9h.01M14 9h.01',
};

export const ICON_NAMES = Object.keys(ICONS) as IconName[];
