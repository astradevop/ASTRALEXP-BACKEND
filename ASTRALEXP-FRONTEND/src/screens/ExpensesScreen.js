import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  Alert, SafeAreaView, ActivityIndicator, RefreshControl,
  Platform, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, CATEGORIES, CURRENCY_SYMBOLS } from '../theme';
import { expensesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../hooks/useLayout';

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

export default function ExpensesScreen({ navigation }) {
  const { user }   = useAuth();
  const layout     = useLayout();
  const [expenses,    setExpenses]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
  const [filter,      setFilter]      = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const currSym = CURRENCY_SYMBOLS[user?.preferred_currency || 'INR'] || '₹';
  const maxWidth = layout.isDesktop ? 860 : layout.isTablet ? 700 : null;

  useEffect(() => { loadExpenses(); }, [filter]);

  const loadExpenses = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const params = filter ? { category: filter } : {};
      const res = await expensesAPI.list(params);
      setExpenses(res.data.results || res.data);
    } catch { Alert.alert('Error', 'Could not load expenses.'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = () => { setRefreshing(true); loadExpenses(true); };
  const total     = expenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0);

  const grouped = useCallback(() => {
    const groups = {};
    expenses.forEach(e => {
      const d = new Date(e.expense_time);
      const today = new Date(); const yest = new Date(); yest.setDate(today.getDate() - 1);
      let label;
      if (d.toDateString() === today.toDateString()) label = 'Today';
      else if (d.toDateString() === yest.toDateString()) label = 'Yesterday';
      else label = d.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' });
      if (!groups[label]) groups[label] = [];
      groups[label].push(e);
    });
    return Object.entries(groups).map(([date, items]) => ({ date, items }));
  }, [expenses]);

  const filterChips = [
    { id: '', label: 'All' },
    { id: 'food',          label: '🍽 Food' },
    { id: 'transport',     label: '🚗 Transport' },
    { id: 'shopping',      label: '🛍 Shopping' },
    { id: 'entertainment', label: '🎭 Leisure' },
    { id: 'health',        label: '🏥 Health' },
    { id: 'utilities',     label: '⚡ Utilities' },
    { id: 'groceries',     label: '🛒 Groceries' },
    { id: 'other',         label: '• Other' },
  ];

  const renderExpense = ({ item }) => {
    const cat    = CAT_MAP[item.category] || CAT_MAP['other'];
    const pmName = item.payment_method_detail?.name || item.payment_method_name || '—';
    const timeStr = new Date(item.expense_time).toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12:true });

    return (
      <TouchableOpacity style={styles.expCard} onPress={() => navigation.navigate('AddExpense', { expense: item })} activeOpacity={0.8}>
        <View style={styles.expLeft}>
          <View style={styles.expIcon}>
            <Ionicons name={catToIonicon(cat.id)} size={20} color={Colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.expNote} numberOfLines={1}>{item.note || capitalize(item.category)}</Text>
            <Text style={styles.expMeta}>{capitalize(item.category)}  ·  {timeStr}</Text>
          </View>
        </View>
        <View style={styles.expRight}>
          <Text style={styles.expAmount}>{currSym}{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits:2 })}</Text>
          <Text style={styles.expPm}>{pmName}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderGroup = ({ item: group }) => {
    const groupTotal = group.items.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
    return (
      <View style={styles.group}>
        <View style={styles.groupHeader}>
          <Text style={styles.groupLabel}>{group.date}</Text>
          <Text style={styles.groupTotal}>Total: {currSym}{groupTotal.toLocaleString('en-IN', { minimumFractionDigits:2 })}</Text>
        </View>
        <FlatList data={group.items} keyExtractor={i => String(i.id)} renderItem={renderExpense} scrollEnabled={false} ItemSeparatorComponent={() => <View style={{ height:4 }} />} />
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.root, { paddingLeft: layout.sidebarWidth }]}>
      {/* Header */}
      <View style={[styles.headerOuter, layout.isLargeScreen && styles.headerDesktop]}>
        <View style={[styles.headerInner, maxWidth && { maxWidth, width: '100%', alignSelf: 'center' }]}>
          <Text style={styles.headerTitle}>Financial Fluidity</Text>
          <TouchableOpacity onPress={() => setShowFilters(!showFilters)} hitSlop={{top:8,bottom:8,left:8,right:8}}>
            <Ionicons name={showFilters ? 'filter' : 'filter-outline'} size={22} color={filter ? Colors.primary : Colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.contentOuter, layout.isLargeScreen && styles.contentOuterDesktop]}>
        <View style={[styles.contentInner, maxWidth && { maxWidth, width: '100%', alignSelf: 'center' }]}>
          {/* Monthly overview */}
          <View style={styles.overview}>
            <Text style={styles.overviewLabel}>MONTHLY OVERVIEW</Text>
            <Text style={styles.overviewTotal}>{currSym}{total.toLocaleString('en-IN', { minimumFractionDigits:2 })}</Text>
            <Text style={styles.overviewCount}>{expenses.length} transaction{expenses.length !== 1 ? 's' : ''}</Text>
          </View>

          {/* Filter bar */}
          {showFilters && (
            <FlatList
              horizontal data={filterChips}
              keyExtractor={i => i.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.filterChip, filter === item.id && styles.filterChipActive]}
                  onPress={() => setFilter(item.id)}
                >
                  <Text style={[styles.filterChipText, filter === item.id && styles.filterChipTextActive]}>{item.label}</Text>
                </TouchableOpacity>
              )}
              contentContainerStyle={styles.filterList}
              showsHorizontalScrollIndicator={false}
            />
          )}

          {loading
            ? <View style={styles.center}><ActivityIndicator color={Colors.primary} size="large" /></View>
            : expenses.length === 0
              ? <View style={styles.center}>
                  <Ionicons name="receipt-outline" size={56} color={Colors.outlineVariant} />
                  <Text style={styles.emptyText}>No expenses yet</Text>
                  <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('AddExpense', {})}>
                    <Text style={styles.emptyBtnText}>+ Add Expense</Text>
                  </TouchableOpacity>
                </View>
              : <FlatList
                  data={grouped()}
                  keyExtractor={g => g.date}
                  renderItem={renderGroup}
                  contentContainerStyle={styles.list}
                  refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
                />
          }
        </View>
      </View>

      {/* FAB */}
      <View style={layout.isLargeScreen ? styles.fabContainerDesktop : styles.fabContainerMobile}>
        <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AddExpense', {})} activeOpacity={0.85}>
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function catToIonicon(id) {
  const m = { food:'restaurant-outline', groceries:'cart-outline', transport:'car-outline', shopping:'bag-outline', entertainment:'film-outline', health:'heart-outline', utilities:'flash-outline', education:'school-outline', travel:'airplane-outline', rent:'home-outline', subscription:'refresh-outline', other:'ellipsis-horizontal-outline' };
  return m[id] || 'ellipsis-horizontal-outline';
}
function capitalize(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''; }

const styles = StyleSheet.create({
  root:        { flex:1, backgroundColor:Colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },

  headerOuter: { borderBottomWidth:0 },
  headerDesktop:{ borderBottomWidth:1, borderBottomColor:Colors.outlineVariant+'20', backgroundColor:Colors.surfaceContainerLowest+'80' },
  headerInner: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.lg, paddingVertical:12 },
  headerTitle: { fontSize:17, fontWeight:'700', color:Colors.primary, letterSpacing:-0.3 },

  contentOuter: { flex: 1 },
  contentOuterDesktop: { alignItems: 'center' },
  contentInner: { flex: 1, width: '100%' },

  overview:    { paddingHorizontal:Spacing.lg, paddingBottom:Spacing.md, marginTop:Spacing.md },
  overviewLabel:{ fontSize:10, color:Colors.onSurfaceVariant, letterSpacing:3, fontWeight:'600', marginBottom:4 },
  overviewTotal:{ fontSize:44, fontWeight:'800', color:Colors.onSurface, letterSpacing:-1.5 },
  overviewCount:{ fontSize:13, color:Colors.onSurfaceVariant, marginTop:4 },

  filterList:  { paddingHorizontal:Spacing.lg, paddingBottom:Spacing.sm, gap:8 },
  filterChip:  { paddingHorizontal:14, paddingVertical:7, borderRadius:Radius.full, backgroundColor:Colors.surfaceContainerHigh, marginRight:8 },
  filterChipActive:{ backgroundColor:Colors.primaryContainer },
  filterChipText:  { fontSize:12, color:Colors.onSurfaceVariant, fontWeight:'500' },
  filterChipTextActive:{ color:Colors.onPrimaryContainer },

  list:        { paddingHorizontal:Spacing.lg, paddingBottom:120, paddingTop:Spacing.md },
  
  fabContainerMobile: { position: 'absolute', bottom: 24, right: 20 },
  fabContainerDesktop: { position: 'absolute', bottom: 40, right: 40 },
  fab:         { width:56, height:56, borderRadius:28, backgroundColor:Colors.primaryContainer, alignItems:'center', justifyContent:'center', shadowColor:Colors.primaryContainer, shadowOffset:{width:0,height:8}, shadowOpacity:0.35, shadowRadius:16, elevation:10 },

  group:       { marginBottom:Spacing.xl },
  groupHeader: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:Spacing.sm },
  groupLabel:  { fontSize:10, color:Colors.onSurfaceVariant, letterSpacing:3, fontWeight:'700', textTransform:'uppercase' },
  groupTotal:  { fontSize:11, color:Colors.onSurfaceVariant },
  
  expCard:     { flexDirection:'row', alignItems:'center', justifyContent:'space-between', backgroundColor:Colors.surfaceContainerLow, borderRadius:Radius.md, padding:Spacing.md },
  expLeft:     { flexDirection:'row', alignItems:'center', gap:12, flex:1 },
  expIcon:     { width:44, height:44, borderRadius:22, backgroundColor:Colors.surfaceContainerHigh, alignItems:'center', justifyContent:'center' },
  expNote:     { fontSize:15, fontWeight:'600', color:Colors.onSurface },
  expMeta:     { fontSize:11, color:Colors.onSurfaceVariant, marginTop:2 },
  expRight:    { alignItems:'flex-end' },
  expAmount:   { fontSize:17, fontWeight:'800', color:Colors.tertiary, letterSpacing:-0.5 },
  expPm:       { fontSize:11, color:Colors.onSurfaceVariant, marginTop:2 },
  center:      { flex:1, alignItems:'center', justifyContent:'center', gap:12 },
  emptyText:   { color:Colors.onSurfaceVariant, fontSize:15 },
  emptyBtn:    { paddingHorizontal:20, paddingVertical:10, borderRadius:Radius.full, backgroundColor:Colors.primaryContainer+'33' },
  emptyBtnText:{ color:Colors.primary, fontWeight:'600' },
});
