import { createTheme } from "@mui/material/styles";

const parchment = "#f5eddc";
const ink = "#2f241d";
const walnut = "#6f4b32";
const moss = "#4e5a3f";
const clay = "#b9835a";

export const vintageTheme = createTheme({
  palette: {
    mode: "light",
    background: {
      default: parchment,
      paper: "#fbf4e6",
    },
    text: {
      primary: ink,
      secondary: "#5f4d42",
    },
    primary: {
      main: walnut,
      contrastText: "#fff6eb",
    },
    secondary: {
      main: moss,
      contrastText: "#fdf8ee",
    },
    warning: {
      main: clay,
    },
  },
  typography: {
    fontFamily: '"Spectral", "Georgia", serif',
    h1: { fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 700 },
    h2: { fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 700 },
    h3: { fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 700 },
    h4: { fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 700 },
    h5: { fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 700 },
    h6: { fontFamily: '"Cormorant Garamond", "Times New Roman", serif', fontWeight: 700 },
    button: {
      textTransform: "none",
      fontWeight: 600,
      letterSpacing: 0.3,
    },
  },
  shape: {
    borderRadius: 14,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(111,75,50,0.16)",
          boxShadow: "0 10px 24px rgba(86, 60, 41, 0.08)",
          backgroundImage:
            "linear-gradient(180deg, rgba(255,255,255,0.4), rgba(255,255,255,0.15))",
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid rgba(255,245,227,0.2)",
          boxShadow: "0 8px 18px rgba(47,36,29,0.25)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderColor: "rgba(111,75,50,0.28)",
        },
      },
    },
  },
});
