import { createContext, useContext } from 'react';

// Context + hook live here (non-component exports) so ThemeContext.jsx can
// export only its component and keep React Fast Refresh happy.
export const ThemeContext = createContext();

export function useTheme() {
  return useContext(ThemeContext);
}
