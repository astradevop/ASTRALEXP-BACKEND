import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  TextInput, ActivityIndicator, SafeAreaView, StatusBar, Platform, Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';
import { friendsAPI } from '../services/api';
import { useLayout } from '../hooks/useLayout';

export default function SearchFriendsScreen({ navigation }) {
  const layout  = useLayout();
  const maxW    = layout.isLargeScreen ? 800 : null;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.length < 3) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await friendsAPI.search(val);
      setResults(res.data.results || res.data);
    } catch {
      // Quiet fail
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (user) => {
    try {
      await friendsAPI.request(user.id);
      Alert.alert('Success', `Friend request sent to ${user.full_name || user.username}`);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.response?.data?.detail || 'Failed to send request.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarTxt}>{(item.full_name || item.username)[0].toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.full_name || item.username}</Text>
        <Text style={styles.sub}>{item.email}</Text>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => sendRequest(item)}>
        <Ionicons name="person-add" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={[maxW && { maxWidth: maxW, alignSelf: 'center', width: '100%', flex: 1 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Ionicons name="search" size={18} color={Colors.outline} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.input}
            placeholder="Search by email, phone, or name..."
            placeholderTextColor={Colors.outline}
            value={query}
            onChangeText={handleSearch}
            autoFocus
          />
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            query.length >= 3 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyTxt}>No users found for "{query}"</Text>
              </View>
            ) : null
          }
        />
      )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex:1, backgroundColor:Colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header:      { flexDirection:'row', alignItems:'center', paddingHorizontal:Spacing.lg, paddingVertical:12, gap:12 },
  backBtn:     { width:40, height:40, borderRadius:20, backgroundColor:Colors.surfaceContainerHigh, alignItems:'center', justifyContent:'center' },
  searchWrap:  { flex:1, flexDirection:'row', alignItems:'center', backgroundColor:Colors.surfaceContainerLow, borderRadius:Radius.full, height:44 },
  input:       { flex:1, paddingHorizontal:12, fontSize:14, color:Colors.onSurface },
  list:        { padding:Spacing.lg, gap:12 },
  card:        { flexDirection:'row', alignItems:'center', backgroundColor:Colors.surfaceContainerLow, borderRadius:Radius.md, padding:Spacing.md, gap:12 },
  avatar:      { width:44, height:44, borderRadius:22, backgroundColor:Colors.tertiaryContainer, alignItems:'center', justifyContent:'center' },
  avatarTxt:   { color:Colors.onTertiaryContainer, fontWeight:'700', fontSize:16 },
  name:        { fontSize:15, fontWeight:'600', color:Colors.onSurface },
  sub:         { fontSize:12, color:Colors.outline },
  addBtn:      { width:40, height:40, borderRadius:20, backgroundColor:Colors.primary, alignItems:'center', justifyContent:'center' },
  empty:       { alignItems:'center', marginTop:100 },
  emptyTxt:    { color:Colors.outline, fontSize:14 },
});
