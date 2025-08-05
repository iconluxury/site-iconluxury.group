import { extendTheme, ThemeConfig } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  styles: {
    global: {
      "html, body": {
        fontFamily: '"Arial", "Helvetica", sans-serif',
        lineHeight: "1.6",
        bg: "gray.50", // Light gray background for a clean look
        color: "gray.800",
        padding: "20px",
      },
      ".sidebar": {
        bg: "gray.100",
        minHeight: "100vh",
        p: 4,
      },
    },
  },
  colors: {
    ui: {
      main: "#1a6dcd", // Professional blue
      secondary: "#e8ecef", // Light gray for secondary elements
      success: "#2e7d32", // Muted green for success
      danger: "#d32f2f", // Standard red for errors
      light: "#ffffff", // White
      dim: "#6b7280", // Muted gray for subtle elements
    },
  },
  shadows: {
    card: "0 2px 8px rgba(0, 0, 0, 0.1)", // Subtle shadow for cards
  },
  components: {
    Heading: {
      baseStyle: {
        color: "gray.900",
        fontFamily: '"Arial", "Helvetica", sans-serif',
        fontWeight: "600",
      },
    },
    Text: {
      baseStyle: {
        color: "gray.800",
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
      },
    },
    Button: {
      baseStyle: {
        fontWeight: "600",
        borderRadius: "4px",
        fontFamily: '"Arial", "Helvetica", sans-serif',
      },
      variants: {
        primary: {
          backgroundColor: "ui.main",
          color: "white",
          _hover: {
            backgroundColor: "#155a9e", // Darker blue on hover
          },
          _disabled: {
            backgroundColor: "ui.main",
            opacity: 0.6,
          },
        },
        secondary: {
          backgroundColor: "ui.secondary",
          color: "gray.800",
          _hover: {
            backgroundColor: "#d3d9df", // Slightly darker gray on hover
          },
          _disabled: {
            backgroundColor: "ui.secondary",
            opacity: 0.6,
          },
        },
        danger: {
          backgroundColor: "ui.danger",
          color: "white",
          _hover: {
            backgroundColor: "#b71c1c", // Darker red on hover
          },
        },
      },
      defaultProps: {
        variant: "primary",
      },
    },
    Tabs: {
      variants: {
        enclosed: {
          tab: {
            color: "ui.dim",
            _selected: {
              color: "ui.main",
              fontWeight: "600",
              borderBottomColor: "ui.main",
              borderBottomWidth: "2px",
            },
            _hover: {
              color: "ui.secondary",
            },
          },
        },
      },
    },
    Toast: {
      baseStyle: {
        container: {
          bg: "ui.light",
          color: "gray.700",
          borderRadius: "4px",
          padding: "12px",
          position: "fixed",
          top: "20px",
          transform: "translateX(-50%)",
          minWidth: "300px",
          maxWidth: "90%",
          fontFamily: '"Arial", "Helvetica", sans-serif',
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
        },
      },
      variants: {
        error: {
          container: {
            bg: "red.50",
            color: "red.800",
            border: "1px solid",
            borderColor: "red.200",
          },
        },
        success: {
          container: {
            bg: "green.50",
            color: "green.800",
            border: "1px solid",
            borderColor: "green.200",
          },
        },
        info: {
          container: {
            bg: "blue.50",
            color: "blue.800",
            border: "1px solid",
            borderColor: "blue.200",
          },
        },
        warning: {
          container: {
            bg: "yellow.50",
            color: "yellow.800",
            border: "1px solid",
            borderColor: "yellow.200",
          },
        },
      },
    },
  },
});

export default theme;