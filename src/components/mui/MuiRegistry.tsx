"use client";

import * as React from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";

/** Square corners — all radii zero */
const radius0 = { borderRadius: 0 };

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: "light",
    primary: { main: "#0099D6" },
    secondary: { main: "#64748b" },
    background: { default: "#f8fafc", paper: "#ffffff" },
  },
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: 'var(--font-inter), system-ui, "Segoe UI", sans-serif',
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: radius0,
      },
    },
    MuiButtonGroup: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: radius0,
        rounded: radius0,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiFilledInput: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiChip: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: radius0,
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: radius0,
      },
    },
    MuiPopover: {
      styleOverrides: {
        paper: radius0,
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: radius0,
        list: radius0,
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiSnackbarContent: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: radius0,
        arrow: { borderRadius: 0 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: radius0,
        bar: radius0,
      },
    },
    MuiCircularProgress: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiSkeleton: {
      styleOverrides: {
        root: radius0,
        rounded: radius0,
      },
    },
    MuiFab: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiToggleButtonGroup: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiTabs: {
      styleOverrides: {
        root: radius0,
        indicator: radius0,
      },
    },
    MuiTab: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          ...radius0,
          "&:first-of-type": radius0,
          "&:before": { display: "none" },
        },
      },
    },
    MuiPagination: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiPaginationItem: {
      styleOverrides: {
        root: radius0,
      },
    },
    MuiSlider: {
      styleOverrides: {
        root: radius0,
        rail: radius0,
        track: radius0,
        thumb: { borderRadius: 0 },
      },
    },
    MuiAutocomplete: {
      styleOverrides: {
        paper: radius0,
        listbox: radius0,
        option: radius0,
      },
    },
  },
});

export function MuiRegistry({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
