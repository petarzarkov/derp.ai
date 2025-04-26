import { theme as chakraTheme, extendTheme } from '@chakra-ui/react';

const darkGrayPalette = {
  50: '#f7f7f7',
  100: '#e4e4e4',
  200: '#cdcdcd',
  300: '#b6b6b6',
  400: '#9f9f9f',
  500: '#888888',
  600: '#404244',
  700: '#343638',
  800: '#272829',
  900: '#1a1b1c',
};

const genTheme = (
  primaryColor: Record<string | number, string>,
  additionalColors?: Record<string, Record<string | number, string>>,
) =>
  extendTheme({
    config: {
      initialColorMode: 'dark',
    },
    fonts: {
      ...chakraTheme.fonts,
      body: 'Google Sans, Helvetica Neue, sans-serif;',
      heading: 'Google Sans, Helvetica Neue, sans-serif;',
    },
    colors: {
      ...chakraTheme.colors,
      primary: primaryColor,
      ...additionalColors, // Include additional palettes like the custom dark gray
    },
    shadows: {
      ...chakraTheme.shadows,
      outline: '0 0 0 3px rgba(255, 255, 255, 0.16)',
    },
  });

export type ColorTheme = Exclude<
  keyof typeof chakraTheme.colors | 'darkGray',
  'transparent' | 'black' | 'white' | 'blackAlpha' | 'whiteAlpha' | 'current'
>;

export const defaultThemes = Object.entries(chakraTheme.colors).reduce(
  (prev, curr) => {
    if (curr?.[1] && curr?.[1]?.[50] && !curr?.[0].includes('Alpha')) {
      prev[curr[0] as ColorTheme] = genTheme(curr[1] as Record<number, string>);
    }

    return prev;
  },
  {} as Record<ColorTheme, Record<number, string>>,
);

// Add the custom dark gray theme
const darkGrayTheme = genTheme(darkGrayPalette, { darkGray: darkGrayPalette }); // Make darkGray palette available under 'darkGray' key

export const themes: Record<ColorTheme, Record<number, string>> = {
  ...defaultThemes,
  darkGray: darkGrayTheme,
};
