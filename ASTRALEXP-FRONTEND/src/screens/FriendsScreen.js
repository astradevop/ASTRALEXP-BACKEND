import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, StatusBar, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';
import { friendsAPI } from '../services/api';
import { useLayout } from '../hooks/useLayout';

export default function FriendsScreen({ navigation }) {
  const layout = useLayout();
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('list'); // 'list' or 'pending'

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [fRes, pRes] = await Promise.all([
        friendsAPI.list(),
        friendsAPI.pending()
      ]);
      setFriends(fRes.data);
      setPending(pRes.data);
    } catch {
      Alert.alert('Error', 'Failed to load friends.');
    } finally {
      setLoading(false);
    }
  };

  const handleResponse = async (id, status) => {
    try {
      await friendsAPI.respond(id, status);
      loadAll();
    } catch {
      Alert.alert('Error', 'Failed to respond to request.');
    }
  };

  const renderFriend = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{(item.full_name || item.username)[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.full_name || item.username}</Text>
        <Text style={styles.sub}>{item.email}</Text>
      </View>
      <TouchableOpacity onPress={() => navigation.navigate('Chat', { friend: item })}>
        <Ionicons name="chatbubble-outline" size={20} color={Colors.primary} />
      </TouchableOpacity>
    </View>
  );

  const renderPending = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{(item.from_user_detail.full_name || item.from_user_detail.username)[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.from_user_detail.full_name || item.from_user_detail.username}</Text>
        <Text style={styles.sub}>wants to be your friend</Text>
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.miniBtn, { backgroundColor: Colors.primaryContainer }]} onPress={() => handleResponse(item.id, 'accepted')}>
          <Ionicons name="checkmark" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.miniBtn, { backgroundColor: Colors.surfaceContainerHighest }]} onPress={() => handleResponse(item.id, 'rejected')}>
          <Ionicons name="close" size={16} color={Colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const maxW = layout.isLargeScreen ? 800 : null;
  const padH  = layout.isDesktop ? 40 : Spacing.lg;

  return (
    <SafeAreaView style={styles.root}>
      <View style={[styles.centeredWrap, maxW && { maxWidth: maxW, alignSelf: 'center', width: '100%' }]}>
      <View style={[styles.header, { paddingHorizontal: padH }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Friends Circle</Text>
        <TouchableOpacity onPress={() => navigation.navigate('SearchFriends')} style={styles.backBtn}>
          <Ionicons name="person-add-outline" size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'list' && styles.tabActive]} onPress={() => setTab('list')}>
          <Text style={[styles.tabText, tab === 'list' && styles.tabTextActive]}>MY FRIENDS ({friends.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'pending' && styles.tabActive]} onPress={() => setTab('pending')}>
          <Text style={[styles.tabText, tab === 'pending' && styles.tabTextActive]}>REQUESTS ({pending.length})</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={tab === 'list' ? friends : pending}
          keyExtractor={item => item.id.toString()}
          renderItem={tab === 'list' ? renderFriend : renderPending}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="people-outline" size={48} color={Colors.outlineVariant} />
              <Text style={styles.emptyTxt}>No {tab === 'list' ? 'friends' : 'pending requests'} yet.</Text>
            </View>
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex:1, backgroundColor:Colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  centeredWrap:{ flex:1 },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.lg, paddingVertical:12 },
  backBtn:     { width:40, height:40, borderRadius:20, backgroundColor:Colors.surfaceContainerHigh, alignItems:'center', justifyContent:'center' },
  title:       { fontSize:16, fontWeight:'700', color:Colors.onSurface, letterSpacing:1, textTransform:'uppercase' },
  tabs:        { flexDirection:'row', borderBottomWidth:1, borderBottomColor:Colors.surfaceContainerHigh },
  tab:         { flex:1, py:16, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  tabActive:   { borderBottomColor:Colors.primary },
  tabText:     { fontSize:11, fontWeight:'700', color:Colors.outline, letterSpacing:1 },
  tabTextActive:{ color:Colors.primary },
  list:        { padding:Spacing.lg, gap:12 },
  card:        { flexDirection:'row', alignItems:'center', backgroundColor:Colors.surfaceContainerLow, borderRadius:Radius.md, padding:Spacing.md, gap:12 },
  avatar:      { width:44, height:44, borderRadius:22, backgroundColor:Colors.primaryContainer, alignItems:'center', justifyContent:'center' },
  avatarTxt:   { color:'#fff', fontWeight:'700', fontSize:16 },
  name:        { fontSize:15, fontWeight:'600', color:Colors.onSurface },
  sub:         { fontSize:12, color:Colors.outline },
  actions:     { flexDirection:'row', gap:8 },
  miniBtn:     { width:32, height:32, borderRadius:16, alignItems:'center', justifyContent:'center' },
  empty:       { alignItems:'center', marginTop:100, gap:12 },
  emptyTxt:    { color:Colors.outline, fontSize:14 },
});
