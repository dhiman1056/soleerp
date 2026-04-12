export const UOM_OPTIONS = ['PCS', 'KG', 'MTR', 'SQF', 'LTR', 'PAIR']

export const PRODUCT_TYPES = ['RAW_MATERIAL', 'SEMI_FINISHED', 'FINISHED']
export const PRODUCT_TYPE_LABELS = {
  RAW_MATERIAL:  'Raw Material',
  SEMI_FINISHED: 'Semi-Finished',
  FINISHED:      'Finished',
}

export const BOM_TYPES = ['SF', 'FG', 'FG_DIRECT']
export const BOM_TYPE_LABELS = {
  SF:        'Semi-Finished (RM → SF)',
  FG:        'Finished (SF → FG)',
  FG_DIRECT: 'Finished Direct (RM → FG)',
}

export const WO_TYPES = ['RM_TO_SF', 'SF_TO_FG', 'RM_TO_FG']
export const WO_TYPE_LABELS = {
  RM_TO_SF: 'RM → Semi-Finished',
  SF_TO_FG: 'SF → Finished Goods',
  RM_TO_FG: 'RM → FG (Direct)',
}
export const WO_TYPE_SHORT = {
  RM_TO_SF: 'RM→SF',
  SF_TO_FG: 'SF→FG',
  RM_TO_FG: 'RM→FG',
}

export const WO_STATUSES = ['DRAFT', 'ISSUED', 'WIP', 'PARTIAL', 'RECEIVED']

// Tailwind classes for each status badge
export const STATUS_CLASSES = {
  DRAFT:    'bg-gray-100 text-gray-700',
  ISSUED:   'bg-blue-100 text-blue-700',
  WIP:      'bg-amber-100 text-amber-700',
  PARTIAL:  'bg-pink-100 text-pink-700',
  RECEIVED: 'bg-green-100 text-green-700',
}

// BOM type → compatible WO type
export const BOM_TO_WO_TYPE = {
  SF:        'RM_TO_SF',
  FG:        'SF_TO_FG',
  FG_DIRECT: 'RM_TO_FG',
}

// WO type → compatible BOM type
export const WO_TO_BOM_TYPE = {
  RM_TO_SF: 'SF',
  SF_TO_FG: 'FG',
  RM_TO_FG: 'FG_DIRECT',
}

// Output product type expected for each BOM type
export const BOM_OUTPUT_PRODUCT_TYPE = {
  SF:        'SEMI_FINISHED',
  FG:        'FINISHED',
  FG_DIRECT: 'FINISHED',
}
