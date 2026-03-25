import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Alert, SafeAreaView, ActivityIndicator, Platform, StatusBar, TextInput, Image, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Radius } from '../theme';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const { user, logout, refreshUser, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(user?.preferred_currency || 'INR');
  
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(user?.full_name || user?.username || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);

  useEffect(() => {
    refreshUser();
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => {
        logout();
        navigation.replace('Login');
      }},
    ]);
  };

  const updateCurrency = async (sym) => {
    setCurrency(sym);
    try {
      const res = await authAPI.updateProfile({ preferred_currency: sym });
      setUser({ ...user, preferred_currency: sym });
    } catch { Alert.alert('Error', 'Failed to update currency.'); }
  };

  const CurrencyBtn = ({ sym, label }) => {
    const isActive = currency === sym;
    return (
      <TouchableOpacity
        style={[styles.currBtn, isActive && styles.currBtnAct]}
        onPress={() => updateCurrency(sym)}
        activeOpacity={0.8}
      >
        <Text style={[styles.currLabel, isActive && styles.currLabelAct]}>{label}</Text>
        <Text style={[styles.currSym, isActive && styles.currSymAct]}>{sym}</Text>
      </TouchableOpacity>
    );
  };

  const handleClearChat = () => {
    Alert.alert('Clear Chat History', 'Are you sure you want to permanently delete all chat messages with the AI?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const { DeviceEventEmitter } = require('react-native');
        await AsyncStorage.removeItem(`chat_history_${user?.id}`);
        DeviceEventEmitter.emit('CLEAR_CHAT_HISTORY');
        Alert.alert('Success', 'Chat history has been cleared.');
      }},
    ]);
  };

  const handleUpgrade = async () => {
    try {
      setLoading(true);
      const { data } = await authAPI.createSubIntent();
      const link = data.payment_link || data.payment_link_fallback;
      
      // Open the Razorpay link
      await Linking.openURL(link);
      
      // Simulate successful return and verify
      Alert.alert(
        'Testing Mode',
        'In Test Mode, pretend you completed the Razorpay checkout in your browser. Upgrade your account?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Confirm Payment', onPress: async () => {
            const verifyRes = await authAPI.verifySub();
            setUser(verifyRes.data.user);
            Alert.alert('Success', 'Welcome to AstralExp Pro!');
          }}
        ]
      );
    } catch (e) {
      Alert.alert('Payment Failed', e.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.5,
    });
    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('full_name', name.trim());
      
      if (avatar && avatar !== user.avatar) {
        const match = /\.(\w+)$/.exec(avatar);
        const type = match ? `image/${match[1]}` : `image/jpeg`;
        formData.append('avatar', { uri: avatar, name: `avatar.${match?.[1]||'jpg'}`, type });
      }

      const res = await authAPI.updateProfile(formData);
      setUser(res.data.user);
      setEditMode(false);
    } catch {
      Alert.alert('Error', 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const fullAvatarUrl = avatar && !avatar.startsWith('file:') && !avatar.startsWith('data:') && !avatar.startsWith('http')
    ? `http://10.91.217.224:8000${avatar}`
    : avatar;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Financial Fluidity</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* User Card */}
        <View style={[styles.card, styles.profileCard]}>
          <TouchableOpacity onPress={editMode ? pickAvatar : null} activeOpacity={editMode ? 0.7 : 1} style={styles.avatarWrap}>
            {fullAvatarUrl ? (
              <Image source={{ uri: fullAvatarUrl }} style={{ width: '100%', height: '100%', borderRadius: 32 }} />
            ) : (
              <Ionicons name="person" size={32} color={Colors.primaryContainer} />
            )}
            {editMode && (
              <View style={styles.avatarPencil}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
          <View style={{ flex: 1, paddingRight: 8 }}>
            {editMode ? (
              <TextInput 
                style={styles.nameInput} 
                value={name} 
                onChangeText={setName} 
                placeholder="Full Name" 
                placeholderTextColor={Colors.outline}
                autoFocus
              />
            ) : (
              <Text style={styles.userName} numberOfLines={1}>{user?.full_name || user?.username || 'Astral User'}</Text>
            )}
            <Text style={styles.userEmail}>{user?.email}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 }}>
              {user?.subscription_tier === 'pro' ? (
                <View style={[styles.badge, { marginTop: 0 }]}><Text style={styles.badgeText}>PRO MEMBER</Text></View>
              ) : (
                <>
                  <View style={[styles.badge, { backgroundColor: Colors.surfaceContainerHigh, marginTop: 0 }]}><Text style={[styles.badgeText, { color: Colors.onSurface }]}>FREE PLAN</Text></View>
                  <TouchableOpacity onPress={handleUpgrade} style={styles.upgradeBtn}>
                    <Text style={styles.upgradeText}>UPGRADE ✨</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
          <TouchableOpacity onPress={() => {
            if (editMode) handleUpdateProfile();
            else setEditMode(true);
          }} style={styles.editBtn}>
            {loading ? <ActivityIndicator size="small" color={Colors.primary} /> : <Ionicons name={editMode ? "checkmark" : "pencil"} size={22} color={Colors.primary} />}
          </TouchableOpacity>
        </View>

        {/* Currency Setting */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BASE CURRENCY</Text>
          <View style={styles.row}>
            <CurrencyBtn sym="INR" label="Rupee" />
            <CurrencyBtn sym="USD" label="Dollar" />
          </View>
          <View style={[styles.row, { marginTop: 12 }]}>
            <CurrencyBtn sym="EUR" label="Euro" />
            <CurrencyBtn sym="GBP" label="Pound" />
          </View>
        </View>

        {/* Security / Links */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT & SECURITY</Text>
          <View style={styles.linksCard}>
            <TouchableOpacity style={styles.linkRow} onPress={handleClearChat} activeOpacity={0.7}>
              <View style={styles.linkLeft}>
                <Ionicons name="chatbubbles-outline" size={20} color={Colors.onSurfaceVariant} />
                <Text style={styles.linkText}>Clear Chat History</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
            </TouchableOpacity>
            
            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
              <View style={styles.linkLeft}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.onSurfaceVariant} />
                <Text style={styles.linkText}>Change Security Key</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
            </TouchableOpacity>
            
            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
              <View style={styles.linkLeft}>
                <Ionicons name="shield-checkmark-outline" size={20} color={Colors.onSurfaceVariant} />
                <Text style={styles.linkText}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity style={styles.linkRow} activeOpacity={0.7}>
              <View style={styles.linkLeft}>
                <Ionicons name="help-buoy-outline" size={20} color={Colors.onSurfaceVariant} />
                <Text style={styles.linkText}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.outlineVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Actions */}
        <View style={[styles.section, { gap: 12, marginTop: Spacing.xl }]}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.logoutText}>Sign Out of Vault</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1, backgroundColor: Colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12 },
  headerTitle: { fontSize: 13, fontWeight: '700', color: Colors.primaryContainer, letterSpacing: 3, textTransform: 'uppercase' },
  scroll:      { padding: Spacing.lg, paddingBottom: 100 },
  section:     { marginBottom: Spacing.xl },
  sectionTitle:{ fontSize: 10, color: Colors.onSurfaceVariant, letterSpacing: 3, fontWeight: '700', marginBottom: Spacing.sm },
  
  card:        { backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg, padding: Spacing.lg },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  avatarWrap:  { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.surfaceContainerHighest, alignItems: 'center', justifyContent: 'center' },
  avatarPencil: { position: 'absolute', bottom: -2, right: -2, backgroundColor: Colors.primary, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.surfaceContainerLow },
  userName:    { fontSize: 20, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5 },
  nameInput:   { fontSize: 20, fontWeight: '800', color: Colors.onSurface, letterSpacing: -0.5, borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingVertical: 2, marginBottom: 2 },
  editBtn:     { padding: 8, marginRight: -8, alignSelf: 'flex-start' },
  userEmail:   { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 2 },
  badge:       { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, backgroundColor: 'rgba(120,220,119,0.1)', borderRadius: Radius.sm, marginTop: 6 },
  badgeText:   { fontSize: 9, fontWeight: '700', color: Colors.tertiary, letterSpacing: 1 },
  upgradeBtn:  { backgroundColor: '#635BFF', paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.sm },
  upgradeText: { fontSize: 9, fontWeight: '700', color: '#fff', letterSpacing: 1 },
  
  row:         { flexDirection: 'row', gap: 12 },
  currBtn:     { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surfaceContainerLow, paddingHorizontal: 16, height: 56, borderRadius: Radius.md },
  currBtnAct:  { backgroundColor: Colors.primaryContainer },
  currLabel:   { fontSize: 14, color: Colors.onSurfaceVariant, fontWeight: '600' },
  currLabelAct:{ color: Colors.onPrimaryContainer },
  currSym:     { fontSize: 18, color: Colors.outlineVariant, fontWeight: '500' },
  currSymAct:  { color: Colors.secondary },

  linksCard:   { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.md, overflow: 'hidden' },
  linkRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, height: 56 },
  linkLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  linkText:    { fontSize: 15, color: Colors.onSurface, fontWeight: '500' },
  divider:     { height: 1, backgroundColor: Colors.surfaceContainerHigh, marginHorizontal: Spacing.md },

  logoutBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 56, backgroundColor: Colors.errorContainer + '44', borderRadius: Radius.full },
  logoutText:  { fontSize: 15, fontWeight: '700', color: Colors.error },
});
