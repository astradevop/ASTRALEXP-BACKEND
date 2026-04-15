import { useWindowDimensions, Platform } from 'react-native';

/**
 * useLayout — central hook for responsive layout decisions.
 * 
 * Breakpoints:
 *   mobile  : width < 768
 *   tablet  : 768 <= width < 1100
 *   desktop : width >= 1100
 * 
 * On native (iOS/Android) platforms this always returns mobile layout,
 * so the native app is completely unaffected.
 */
export function useLayout() {
  const { width } = useWindowDimensions();

  // Native platforms are always treated as mobile regardless of width
  if (Platform.OS !== 'web') {
    return {
      width,
      isMobile:  true,
      isTablet:  false,
      isDesktop: false,
      isLargeScreen: false,
      sidebarWidth: 0,
      contentMaxWidth: null,
      contentPadding: 16,
    };
  }

  const isMobile  = width < 768;
  const isTablet  = width >= 768 && width < 1100;
  const isDesktop = width >= 1100;
  const isLargeScreen = !isMobile; // tablet OR desktop shows sidebar

  const sidebarWidth = isDesktop ? 240 : isTablet ? 72 : 0;

  // Max content width for readability
  const contentMaxWidth = isDesktop ? 1200 : isTablet ? 900 : null;

  // Horizontal padding scales with screen size
  const contentPadding = isDesktop ? 40 : isTablet ? 28 : 16;

  return {
    width,
    isMobile,
    isTablet,
    isDesktop,
    isLargeScreen,
    sidebarWidth,
    contentMaxWidth,
    contentPadding,
  };
}
