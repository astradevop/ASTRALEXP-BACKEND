import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../src/theme';

// Screens
import SplashScreen from '../src/screens/SplashScreen';
import LoginScreen from '../src/screens/LoginScreen';
import RegisterScreen from '../src/screens/RegisterScreen';
import ChatScreen from '../src/screens/ChatScreen';
import ExpensesScreen from '../src/screens/ExpensesScreen';
import AddExpenseScreen from '../src/screens/AddExpenseScreen';
import PaymentsScreen from '../src/screens/PaymentsScreen';
import ProfileScreen from '../src/screens/ProfileScreen';
import FriendsScreen from '../src/screens/FriendsScreen';
import SearchFriendsScreen from '../src/screens/SearchFriendsScreen';
import CreditsScreen from '../src/screens/CreditsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: Colors.background,
    card: Colors.surfaceContainerLowest,
    text: Colors.onSurface,
  },
};

function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="ChatTab"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surfaceContainerLowest,
          borderTopWidth: 0,
          elevation: 20,
          shadowColor: '#000', shadowOffset: { height: -4, width: 0 }, shadowOpacity: 0.1, shadowRadius: 10,
          height: 64, paddingBottom: 8, paddingTop: 8,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.outlineVariant,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;
          if (route.name === 'ChatTab') iconName = focused ? 'chatbubble' : 'chatbubble-outline';
          else if (route.name === 'ExpensesTab') iconName = focused ? 'receipt' : 'receipt-outline';
          else if (route.name === 'PaymentsTab') iconName = focused ? 'wallet' : 'wallet-outline';
          else if (route.name === 'ProfileTab') iconName = focused ? 'person' : 'person-outline';
          return <Ionicons name={iconName} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="ChatTab" component={ChatScreen} options={{ tabBarLabel: 'Chat' }} />
      <Tab.Screen name="ExpensesTab" component={ExpensesScreen} options={{ tabBarLabel: 'Expenses' }} />
      <Tab.Screen name="PaymentsTab" component={PaymentsScreen} options={{ tabBarLabel: 'Vaults' }} />
      <Tab.Screen name="ProfileTab" component={ProfileScreen} options={{ tabBarLabel: 'Profile' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: Colors.background } }}>
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="MainTabs" component={MainTabs} />
        
        {/* Friends & Credits */}
        <Stack.Screen name="Friends" component={FriendsScreen} />
        <Stack.Screen name="SearchFriends" component={SearchFriendsScreen} />
        <Stack.Screen name="Credits" component={CreditsScreen} />

        {/* Modals / Overlays */}
        <Stack.Screen 
          name="AddExpense" 
          component={AddExpenseScreen} 
          options={{ presentation: 'modal' }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
