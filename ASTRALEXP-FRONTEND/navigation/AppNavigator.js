import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme';
import { useLayout } from '../src/hooks/useLayout';
import WebSidebar from '../src/components/WebSidebar';

// Screens
import SplashScreen      from '../src/screens/SplashScreen';
import LoginScreen       from '../src/screens/LoginScreen';
import RegisterScreen    from '../src/screens/RegisterScreen';
import ChatScreen        from '../src/screens/ChatScreen';
import ExpensesScreen    from '../src/screens/ExpensesScreen';
import AnalyticsScreen   from '../src/screens/AnalyticsScreen';
import AddExpenseScreen  from '../src/screens/AddExpenseScreen';
import PaymentsScreen    from '../src/screens/PaymentsScreen';
import ProfileScreen     from '../src/screens/ProfileScreen';
import FriendsScreen     from '../src/screens/FriendsScreen';
import SearchFriendsScreen from '../src/screens/SearchFriendsScreen';
import CreditsScreen     from '../src/screens/CreditsScreen';

const Stack = createStackNavigator();
const Tab   = createBottomTabNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card:       Colors.surfaceContainerLowest,
    text:       Colors.onSurface,
  },
};

// ─── Desktop / Tablet: sidebar positioned absolutely, scene pushed right ─────
//
// KEY FIX: We use the `tabBar` prop to render ONLY the sidebar navigation.
// React Navigation handles rendering the active screen in the scene area.
// `sceneContainerStyle` adds left margin equal to sidebar width so the
// scene sits to the right of the sidebar — NO double rendering.
//
function DesktopSidebar(props) {
  // props contains { state, navigation, descriptors } from Tab.Navigator
  const { isTablet, isDesktop } = useLayout();
  const sidebarWidth = isDesktop ? 240 : 72; // collapsed on tablet

  const routeNames  = props.state.routeNames;
  const activeRoute = routeNames[props.state.index];

  const handleNavigate = (routeName) => {
    props.navigation.navigate(routeName);
  };

  return (
    <WebSidebar
      activeRoute={activeRoute}
      onNavigate={handleNavigate}
      sidebarWidth={sidebarWidth}
    />
  );
}

// ─── MainTabs: swaps bottom tabs ↔ sidebar based on screen width ─────────────
function MainTabs() {
  const { isLargeScreen, isTablet, isDesktop } = useLayout();
  const sidebarWidth = isDesktop ? 240 : isTablet ? 72 : 0;

  if (isLargeScreen) {
    return (
      <Tab.Navigator
        initialRouteName="ChatTab"
        // Key fix: use paddingLeft instead of marginLeft, because React Navigation
        // sets left:0 and right:0 on scenes, overriding margins!
        sceneContainerStyle={{ paddingLeft: sidebarWidth, backgroundColor: Colors.background }}
        screenOptions={{ headerShown: false }}
        // tabBar renders ONLY the sidebar — screens are rendered by React Navigation
        tabBar={(props) => <DesktopSidebar {...props} />}
      >
        <Tab.Screen name="ChatTab"      component={ChatScreen}      options={{ title: 'Chat' }} />
        <Tab.Screen name="AnalyticsTab" component={AnalyticsScreen} options={{ title: 'Insights' }} />
        <Tab.Screen name="ExpensesTab"  component={ExpensesScreen}  options={{ title: 'Expenses' }} />
        <Tab.Screen name="PaymentsTab" component={PaymentsScreen} options={{ title: 'Vaults' }} />
        <Tab.Screen name="ProfileTab"  component={ProfileScreen}  options={{ title: 'Profile' }} />
      </Tab.Navigator>
    );
  }

  // ── Mobile: original bottom tab bar (unchanged) ──────────────────────────
  return (
    <Tab.Navigator
      initialRouteName="ChatTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surfaceContainerLowest,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000',
          shadowOffset: { height: -4, width: 0 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor:   Colors.primary,
        tabBarInactiveTintColor: Colors.outlineVariant,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
        tabBarIcon: ({ focused, color }) => {
          let iconName;
          if      (route.name === 'ChatTab')      iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          else if (route.name === 'AnalyticsTab') iconName = focused ? 'stats-chart': 'stats-chart-outline';
          else if (route.name === 'ExpensesTab')  iconName = focused ? 'receipt'    : 'receipt-outline';
          else if (route.name === 'PaymentsTab')  iconName = focused ? 'wallet'     : 'wallet-outline';
          else if (route.name === 'ProfileTab')   iconName = focused ? 'person'     : 'person-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ChatTab"      component={ChatScreen}      options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="AnalyticsTab" component={AnalyticsScreen} options={{ tabBarLabel: 'Insights' }} />
      <Tab.Screen name="ExpensesTab"  component={ExpensesScreen}  options={{ tabBarLabel: 'Expenses' }} />
      <Tab.Screen name="PaymentsTab" component={PaymentsScreen} options={{ tabBarLabel: 'Vaults' }} />
      <Tab.Screen name="ProfileTab"  component={ProfileScreen}  options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

// ─── Root navigator ───────────────────────────────────────────────────────────
export default function AppNavigator() {
  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="Splash"   component={SplashScreen} />
        <Stack.Screen name="Login"    component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />

        {/* Friends & Credits */}
        <Stack.Screen name="Friends"        component={FriendsScreen} />
        <Stack.Screen name="SearchFriends"  component={SearchFriendsScreen} />
        <Stack.Screen name="Credits"        component={CreditsScreen} />

        {/* Modals */}
        <Stack.Screen
          name="AddExpense"
          component={AddExpenseScreen}
          options={{ presentation: 'modal' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
