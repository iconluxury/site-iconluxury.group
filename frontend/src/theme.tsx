import { type ThemeConfig, extendTheme } from "@chakra-ui/react"

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
}

const theme = extendTheme({
  config,
  styles: {
    global: {
      "html, body": {
        fontFamily: '"Arial", "Helvetica", sans-serif',
        lineHeight: "1.6",
        bg: "gray.50",
        color: "gray.900",
        padding: "24px",
      },
      ".sidebar": {
        bg: "gray.100",
        minHeight: "100vh",
        p: 6,
        borderRight: "1px solid",
        borderColor: "gray.200",
      },
    },
  },
  colors: {
    ui: {
      main: "#1a6dcd", // Professional blue
      secondary: "#e8ecef", // Light gray
      success: "#2e7d32", // Muted green
      danger: "#d32f2f", // Standard red
      warning: "#d97706", // Professional amber
      info: "#1e40af", // Darker blue for info
      light: "#ffffff", // White
      dim: "#6b7280", // Subtle gray
    },
  },
  shadows: {
    card: "0 4px 12px rgba(0, 0, 0, 0.1)", // Softer, professional shadow
    subtle: "0 2px 4px rgba(0, 0, 0, 0.05)",
  },
  components: {
    Container: {
      baseStyle: {
        bg: "white",
        borderRadius: "8px",
        boxShadow: "subtle",
        p: 6,
      },
    },
    Heading: {
      baseStyle: {
        color: "gray.900",
        fontFamily: '"Arial", "Helvetica", sans-serif',
        fontWeight: "600",
      },
    },
    Text: {
      baseStyle: {
        color: "gray.700",
        fontSize: "md",
        fontWeight: "normal",
        fontFamily: '"Arial", "Helvetica", sans-serif',
      },
    },
    Code: {
      baseStyle: {
        bg: "gray.100",
        color: "gray.800",
        fontSize: "sm",
        p: 2,
        borderRadius: "4px",
        fontFamily: '"Arial", "Helvetica", sans-serif',
      },
    },
    Button: {
      baseStyle: {
        fontWeight: "600",
        borderRadius: "6px",
        fontFamily: '"Arial", "Helvetica", sans-serif',
        px: 4,
        py: 2,
      },
      variants: {
        primary: {
          bg: "ui.main",
          color: "white",
          _hover: {
            bg: "#155a9e",
          },
          _disabled: {
            bg: "ui.main",
            opacity: 0.5,
          },
        },
        secondary: {
          bg: "ui.secondary",
          color: "gray.800",
          border: "1px solid",
          borderColor: "gray.300",
          _hover: {
            bg: "#d3d9df",
          },
          _disabled: {
            bg: "ui.secondary",
            opacity: 0.5,
          },
        },
        danger: {
          bg: "ui.danger",
          color: "white",
          _hover: {
            bg: "#b71c1c",
          },
        },
        outline: {
          border: "1px solid",
          borderColor: "ui.main",
          color: "ui.main",
          bg: "transparent",
          _hover: {
            bg: "ui.secondary",
          },
        },
      },
      defaultProps: {
        variant: "primary",
      },
    },
    Input: {
      baseStyle: {
        field: {
          fontFamily: '"Arial", "Helvetica", sans-serif',
          fontSize: "md",
          color: "gray.800",
          bg: "white",
          border: "1px solid",
          borderColor: "gray.300",
          borderRadius: "6px",
          _hover: {
            borderColor: "gray.400",
          },
          _focus: {
            borderColor: "ui.main",
            boxShadow: "0 0 0 1px #1a6dcd",
          },
        },
      },
    },
    Select: {
      baseStyle: {
        field: {
          fontFamily: '"Arial", "Helvetica", sans-serif',
          fontSize: "md",
          color: "gray.800",
          bg: "white",
          border: "1px solid",
          borderColor: "gray.300",
          borderRadius: "6px",
          _hover: {
            borderColor: "gray.400",
          },
          _focus: {
            borderColor: "ui.main",
            boxShadow: "0 0 0 1px #1a6dcd",
          },
        },
      },
    },
    Table: {
      baseStyle: {
        th: {
          bg: "gray.100",
          color: "gray.800",
          fontFamily: '"Arial", "Helvetica", sans-serif',
          fontWeight: "600",
          fontSize: "sm",
          textTransform: "none",
          letterSpacing: "normal",
          p: 3,
        },
        td: {
          fontFamily: '"Arial", "Helvetica", sans-serif',
          fontSize: "sm",
          color: "gray.700",
          p: 3,
          borderColor: "gray.200",
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          bg: "white",
          borderRadius: "8px",
          boxShadow: "subtle",
          border: "1px solid",
          borderColor: "gray.200",
        },
        header: {
          p: 4,
          borderBottom: "1px solid",
          borderColor: "gray.200",
        },
        body: {
          p: 4,
        },
      },
    },
    Checkbox: {
      baseStyle: {
        control: {
          borderColor: "gray.300",
          _checked: {
            bg: "ui.main",
            borderColor: "ui.main",
            _hover: {
              bg: "#155a9e",
              borderColor: "#155a9e",
            },
          },
        },
        label: {
          fontFamily: '"Arial", "Helvetica", sans-serif',
          fontSize: "md",
          color: "gray.700",
        },
      },
    },
    Badge: {
      baseStyle: {
        fontFamily: '"Arial", "Helvetica", sans-serif',
        fontSize: "sm",
        fontWeight: "500",
        borderRadius: "4px",
        px: 2,
        py: 1,
      },
      variants: {
        teal: {
          bg: "ui.main",
          color: "white",
        },
      },
    },
    Tooltip: {
      baseStyle: {
        bg: "gray.700",
        color: "white",
        fontFamily: '"Arial", "Helvetica", sans-serif',
        fontSize: "sm",
        borderRadius: "4px",
        px: 3,
        py: 2,
      },
    },
    Tabs: {
      variants: {
        enclosed: {
          tab: {
            color: "ui.dim",
            fontFamily: '"Arial", "Helvetica", sans-serif',
            fontSize: "md",
            fontWeight: "500",
            _selected: {
              color: "ui.main",
              fontWeight: "600",
              borderBottomColor: "ui.main",
              borderBottomWidth: "2px",
            },
            _hover: {
              color: "ui.main",
            },
          },
        },
      },
    },
    Toast: {
      baseStyle: {
        container: {
          bg: "white",
          color: "gray.700",
          borderRadius: "6px",
          padding: "12px",
          position: "fixed",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          minWidth: "300px",
          maxWidth: "90%",
          fontFamily: '"Arial", "Helvetica", sans-serif',
          boxShadow: "card",
          border: "1px solid",
          borderColor: "gray.200",
        },
      },
      variants: {
        error: {
          container: {
            bg: "red.50",
            color: "red.800",
            borderColor: "red.200",
          },
        },
        success: {
          container: {
            bg: "green.50",
            color: "green.800",
            borderColor: "green.200",
          },
        },
        info: {
          container: {
            bg: "blue.50",
            color: "blue.800",
            borderColor: "blue.200",
          },
        },
        warning: {
          container: {
            bg: "yellow.50",
            color: "yellow.800",
            borderColor: "yellow.200",
          },
        },
      },
    },
  },
})

export default theme
