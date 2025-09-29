import { type ThemeConfig, extendTheme } from "@chakra-ui/react"

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
}

const fonts = {
  heading: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  body: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", "SFMono-Regular", Menlo, monospace',
}

const colors = {
  brand: {
    50: "#eef2ff",
    100: "#e0e7ff",
    200: "#c7d2fe",
    300: "#a5b4fc",
    400: "#818cf8",
    500: "#6366f1",
    600: "#4f46e5",
    700: "#4338ca",
    800: "#3730a3",
    900: "#312e81",
  },
  neutral: {
    50: "#f8fafc",
    100: "#f1f5f9",
    200: "#e2e8f0",
    300: "#cbd5f5",
    400: "#94a3b8",
    500: "#64748b",
    600: "#475569",
    700: "#334155",
    800: "#1e293b",
    900: "#0f172a",
  },
  success: {
    50: "#ecfdf5",
    100: "#d1fae5",
    200: "#a7f3d0",
    300: "#6ee7b7",
    400: "#34d399",
    500: "#16a34a",
    600: "#15803d",
    700: "#166534",
    800: "#14532d",
    900: "#0f3920",
  },
  warning: {
    50: "#fffbeb",
    100: "#fef3c7",
    200: "#fde68a",
    300: "#fcd34d",
    400: "#fbbf24",
    500: "#f59e0b",
    600: "#d97706",
    700: "#b45309",
    800: "#92400e",
    900: "#78350f",
  },
  danger: {
    50: "#fef2f2",
    100: "#fee2e2",
    200: "#fecaca",
    300: "#fca5a5",
    400: "#f87171",
    500: "#ef4444",
    600: "#dc2626",
    700: "#b91c1c",
    800: "#991b1b",
    900: "#7f1d1d",
  },
  info: {
    50: "#e0f2fe",
    100: "#bae6fd",
    200: "#7dd3fc",
    300: "#38bdf8",
    400: "#0ea5e9",
    500: "#0284c7",
    600: "#0369a1",
    700: "#075985",
    800: "#0c4a6e",
    900: "#0a3651",
  },
}

const semanticTokens = {
  colors: {
    background: {
      default: "neutral.50",
      _dark: "gray.900",
    },
    surface: {
      default: "white",
      _dark: "gray.800",
    },
    text: {
      default: "neutral.800",
      _dark: "gray.100",
    },
    subtle: {
      default: "neutral.500",
      _dark: "gray.400",
    },
    border: {
      default: "neutral.200",
      _dark: "neutral.700",
    },
    highlight: {
      default: "brand.50",
      _dark: "brand.800",
    },
  },
}

const components = {
  Button: {
    baseStyle: {
      fontWeight: "600",
      borderRadius: "md",
      px: 4,
      py: 2,
    },
    variants: {
      primary: {
        bg: "brand.600",
        color: "white",
        _hover: { bg: "brand.700" },
        _active: { bg: "brand.800" },
        _disabled: {
          bg: "brand.200",
          color: "white",
          cursor: "not-allowed",
        },
      },
      secondary: {
        bg: "surface",
        color: "brand.600",
        border: "1px solid",
        borderColor: "border",
        _hover: {
          borderColor: "brand.200",
          bg: "brand.50",
        },
      },
      outline: {
        bg: "transparent",
        border: "1px solid",
        borderColor: "brand.600",
        color: "brand.600",
        _hover: {
          bg: "brand.50",
        },
      },
      ghost: {
        bg: "transparent",
        color: "brand.600",
        _hover: {
          bg: "brand.50",
        },
      },
      link: {
        color: "brand.600",
        fontWeight: "600",
        bg: "transparent",
        _hover: {
          color: "brand.700",
          textDecoration: "underline",
        },
      },
      danger: {
        bg: "danger.500",
        color: "white",
        _hover: { bg: "danger.600" },
        _active: { bg: "danger.700" },
      },
    },
    defaultProps: {
      variant: "primary",
    },
  },
  Input: {
    baseStyle: {
      field: {
        borderRadius: "md",
        borderColor: "border",
        bg: "surface",
        _placeholder: {
          color: "neutral.500",
        },
        _hover: {
          borderColor: "neutral.300",
        },
        _focus: {
          borderColor: "brand.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
        },
      },
    },
  },
  Select: {
    baseStyle: {
      field: {
        borderRadius: "md",
        borderColor: "border",
        bg: "surface",
        _hover: {
          borderColor: "neutral.300",
        },
        _focus: {
          borderColor: "brand.500",
          boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
        },
      },
    },
  },
  Textarea: {
    baseStyle: {
      borderRadius: "md",
      borderColor: "border",
      bg: "surface",
      _hover: {
        borderColor: "neutral.300",
      },
      _focus: {
        borderColor: "brand.500",
        boxShadow: "0 0 0 1px var(--chakra-colors-brand-500)",
      },
    },
  },
  Table: {
    baseStyle: {
      th: {
        bg: "neutral.100",
        color: "text",
        fontWeight: "600",
        fontSize: "sm",
        textTransform: "none",
        letterSpacing: "normal",
        borderBottom: "1px solid",
        borderColor: "border",
        py: 3,
        px: 4,
      },
      td: {
        borderColor: "border",
        color: "subtle",
        fontSize: "sm",
        py: 3,
        px: 4,
      },
    },
  },
  Card: {
    baseStyle: {
      container: {
        bg: "surface",
        borderRadius: "lg",
        border: "1px solid",
        borderColor: "border",
        boxShadow: "none",
      },
      header: {
        borderBottom: "1px solid",
        borderColor: "border",
        py: 4,
        px: 5,
      },
      body: {
        px: 5,
        py: 4,
      },
    },
  },
  Checkbox: {
    baseStyle: {
      control: {
        borderRadius: "md",
        borderColor: "border",
        _checked: {
          bg: "brand.600",
          borderColor: "brand.600",
          _hover: {
            bg: "brand.700",
            borderColor: "brand.700",
          },
        },
      },
      label: {
        color: "subtle",
        fontWeight: "500",
      },
    },
  },
  Badge: {
    baseStyle: {
      borderRadius: "md",
      fontWeight: "600",
      textTransform: "none",
      letterSpacing: "normal",
      px: 2,
      py: 1,
    },
    variants: {
      solid: {
        bg: "brand.50",
        color: "brand.700",
      },
      success: {
        bg: "success.100",
        color: "success.700",
      },
      danger: {
        bg: "danger.100",
        color: "danger.700",
      },
      warning: {
        bg: "warning.100",
        color: "warning.700",
      },
    },
  },
  Tooltip: {
    baseStyle: {
      bg: "neutral.700",
      color: "white",
      borderRadius: "md",
      px: 3,
      py: 2,
      boxShadow: "md",
      fontSize: "sm",
    },
  },
  Tabs: {
    variants: {
      enclosed: {
        tab: {
          color: "subtle",
          fontWeight: "500",
          _selected: {
            color: "brand.700",
            borderBottomWidth: "2px",
            borderBottomColor: "brand.600",
          },
          _hover: {
            color: "brand.700",
          },
        },
        tablist: {
          borderBottom: "1px solid",
          borderColor: "border",
        },
      },
    },
  },
  Alert: {
    baseStyle: {
      container: {
        borderRadius: "lg",
        border: "1px solid",
        borderColor: "border",
        boxShadow: "none",
      },
      title: {
        fontWeight: "600",
      },
    },
  },
  Link: {
    baseStyle: {
      color: "brand.600",
      fontWeight: "500",
      _hover: {
        color: "brand.700",
        textDecoration: "underline",
      },
    },
  },
}

const styles = {
  global: {
    "*, *::before, *::after": {
      boxSizing: "border-box",
    },
    body: {
      fontFamily: "body",
      bg: "background",
      color: "text",
      lineHeight: "1.6",
      minHeight: "100vh",
      margin: 0,
    },
    "a, button": {
      transition: "all 0.15s ease-in-out",
    },
  },
}

const theme = extendTheme({
  config,
  fonts,
  colors,
  semanticTokens,
  components,
  styles,
})

export default theme
