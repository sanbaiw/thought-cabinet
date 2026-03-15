/** Base directory for canonical agent asset storage */
export const AGENTS_DIR = '.agents'

/** In-repo directory for canonical asset storage (project scope) */
export const CANONICAL_DIR = '.thought-cabinet'

/** Subdirectory names for each asset category */
export const CATEGORY_SUBDIRS = {
  skills: 'skills',
  commands: 'commands',
  agents: 'agents',
} as const

export type AssetCategory = keyof typeof CATEGORY_SUBDIRS
