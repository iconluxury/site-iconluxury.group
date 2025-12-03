import {
  LuDollarSign,
  LuImage,
  LuLayers,
} from "react-icons/lu"
import { SERVER_URL as SERVER_URL_BASE } from "../../utils"
import type { DataWarehouseMode, DataWarehouseModeConfig, ColumnType } from "./types"

export const SERVER_URL = SERVER_URL_BASE

export const MAX_PREVIEW_ROWS = 20
export const MAX_FILE_SIZE_MB = 50

export const DATA_WAREHOUSE_MODE_CONFIG: Record<
  DataWarehouseMode,
  DataWarehouseModeConfig
> = {
  imagesAndMsrp: {
    label: "Images + MSRP",
    description: "Pull images and price data.",
    requiredColumns: ["style", "msrp"],
    optionalColumns: ["brand"],
    requireImageColumn: false,
    allowImageColumnMapping: true,
    icon: LuLayers,
  },
  imagesOnly: {
    label: "Images only",
    description: "Pull images.",
    requiredColumns: ["style"],
    optionalColumns: [],
    requireImageColumn: true,
    allowImageColumnMapping: true,
    icon: LuImage,
  },
  msrpOnly: {
    label: "MSRP only",
    description: "Pull msrp data.",
    requiredColumns: ["style", "msrp"],
    optionalColumns: ["brand"],
    requireImageColumn: false,
    allowImageColumnMapping: false,
    icon: LuDollarSign,
  },
}

export const GOOGLE_IMAGES_REQUIRED_COLUMNS: ColumnType[] = ["style"]
export const GOOGLE_IMAGES_OPTIONAL_COLUMNS: ColumnType[] = [
  "brand",
  "category",
  "colorName",
  "msrp",
]
export const GOOGLE_IMAGES_ALL_COLUMNS: ColumnType[] = [
  ...GOOGLE_IMAGES_REQUIRED_COLUMNS,
  ...GOOGLE_IMAGES_OPTIONAL_COLUMNS,
]

export const MANUAL_BRAND_HEADER = "BRAND (Manual)"
export const IMAGE_HEADER_PATTERN = /(image|photo|picture|img)/i

export const SELECTED_BG_STRONG = "brand.100"
export const SELECTED_BG_SUBTLE = "brand.50"
export const MAPPED_BG = "neutral.100"
export const SELECTED_BORDER_COLOR = "brand.600"
