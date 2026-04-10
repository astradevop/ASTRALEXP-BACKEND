import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, 
  ActivityIndicator, SafeAreaView, StatusBar, Platform, Alert, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius, CURRENCY_SYMBOLS } from '../theme';
import { expensesAPI, paymentsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function CreditsScreen({ navigation }) {
  const { user } = useAuth();
  const currSym = CURRENCY_SYMBOLS[user?.preferred_currency || 'INR'] || '₹';
  
  const [given, setGiven] = useState([]); // Credits I gave (Who owes me)
  const [owed, setOwed]   = useState([]); // Credits I owe (What I owe)
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('given'); // 'given' or 'owed'
  
  const [payModal, setPayModal] = useState(false);
  const [selectedSplit, setSelectedSplit] = useState(null);
  const [payMethods, setPms] = useState([]);

  useEffect(() => {
    loadAll();
    loadPms();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [gRes, oRes] = await Promise.all([
        expensesAPI.creditsGiven(),
        expensesAPI.creditsOwed()
      ]);
      setGiven(gRes.data.results || gRes.data);
      setOwed(oRes.data.results || oRes.data);
    } catch {
      Alert.alert('Error', 'Failed to load credits.');
    } finally {
      setLoading(false);
    }
  };

  const loadPms = async () => {
    try {
      const res = await paymentsAPI.list();
      setPms(res.data.results || res.data);
    } catch {}
  };

  const handlePay = async (pmId) => {
    try {
      await expensesAPI.markPaid(selectedSplit.id, { payment_method: pmId });
      setPayModal(false);
      loadAll();
      Alert.alert('Success', 'Marked as paid and added to your expenses.');
    } catch {
      Alert.alert('Error', 'Failed to mark as paid.');
    }
  };

  const renderSplit = ({ item }) => {
    const isGiven = tab === 'given';
    const otherUser = isGiven ? item.debtor_detail : item.expense_payer_detail; // Note: Need to make sure payer detail is sent from backend or inferred
    // Actually, in CreditsOwedListView, I should include payer info.
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
          <View style={[styles.statusBadge, item.status === 'paid' && styles.statusPaid]}>
            <Text style={[styles.statusTxt, item.status === 'paid' && styles.statusPaidTxt]}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <View style={{ flex: 1 }}>
            <Text style={styles.amount}>{currSym}{item.amount}</Text>
            <Text style={styles.userTitle}>
              {isGiven ? `Owed by ${item.debtor_detail?.full_name || 'Friend'}` : `Owe to ${item.expense_payer_detail?.full_name || 'Friend'}`}
            </Text>
          </View>
          
          {item.status === 'unpaid' && !isGiven && (
            <TouchableOpacity style={styles.payBtn} onPress={() => { setSelectedSplit(item); setPayModal(true); }}>
              <Text style={styles.payBtnTxt}>PAY NOW</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {item.expense_note && (
          <Text style={styles.note} numberOfLines={1}>For: {item.expense_note}</Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Credits & Debts</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, tab === 'given' && styles.tabActive]} onPress={() => setTab('given')}>
          <Text style={[styles.tabText, tab === 'given' && styles.tabTextActive]}>WHO OWES ME</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, tab === 'owed' && styles.tabActive]} onPress={() => setTab('owed')}>
          <Text style={[styles.tabText, tab === 'owed' && styles.tabTextActive]}>WHAT I OWE</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={tab === 'given' ? given : owed}
          keyExtractor={item => item.id.toString()}
          renderItem={renderSplit}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="cash-outline" size={48} color={Colors.outlineVariant} />
              <Text style={styles.emptyTxt}>No records found.</Text>
            </View>
          }
        />
      )}

      {/* Payment Selection Modal */}
      <Modal visible={payModal} transparent animationType="slide">
        <View style={styles.modalRoot}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <Text style={styles.modalSub}>How did you pay this?</Text>
            
            <View style={{ gap: 8, marginVertical: 20 }}>
              {payMethods.map(pm => (
                <TouchableOpacity key={pm.id} style={styles.pmBtn} onPress={() => handlePay(pm.id)}>
                  <Ionicons name="card-outline" size={20} color={Colors.primary} />
                  <Text style={styles.pmName}>{pm.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color={Colors.outline} />
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity style={styles.closeBtn} onPress={() => setPayModal(false)}>
              <Text style={styles.closeBtnTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root:        { flex:1, backgroundColor:Colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:Spacing.lg, paddingVertical:12 },
  backBtn:     { width:40, height:40, borderRadius:20, backgroundColor:Colors.surfaceContainerHigh, alignItems:'center', justifyContent:'center' },
  title:       { fontSize:16, fontWeight:'700', color:Colors.onSurface, letterSpacing:1, textTransform:'uppercase' },
  tabs:        { flexDirection:'row', borderBottomWidth:1, borderBottomColor:Colors.surfaceContainerHigh },
  tab:         { flex:1, py:16, alignItems:'center', borderBottomWidth:2, borderBottomColor:'transparent' },
  tabActive:   { borderBottomColor:Colors.primary },
  tabText:     { fontSize:11, fontWeight:'700', color:Colors.outline, letterSpacing:1 },
  tabTextActive:{ color:Colors.primary },
  list:        { padding:Spacing.lg, gap:12 },
  card:        { backgroundColor:Colors.surfaceContainerLow, borderRadius:Radius.md, padding:Spacing.md, gap:8 },
  cardHeader:  { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  date:         { fontSize:10, color:Colors.outline, fontWeight:'700' },
  statusBadge:  { paddingHorizontal:8, paddingVertical:4, borderRadius:4, backgroundColor:Colors.errorContainer },
  statusPaid:   { backgroundColor:Colors.primaryContainer },
  statusTxt:    { fontSize:9, fontWeight:'800', color:Colors.onErrorContainer },
  statusPaidTxt:{ color:Colors.onPrimaryContainer },
  cardContent: { flexDirection:'row', alignItems:'center' },
  amount:      { fontSize:24, fontWeight:'800', color:Colors.onSurface },
  userTitle:   { fontSize:13, color:Colors.onSurfaceVariant },
  note:        { fontSize:12, color:Colors.outline, fontStyle:'italic' },
  payBtn:      { backgroundColor:Colors.tertiaryContainer, paddingHorizontal:16, height:36, borderRadius:Radius.full, justifyContent:'center' },
  payBtnTxt:   { fontSize:11, fontWeight:'800', color:Colors.onTertiaryContainer },
  empty:       { alignItems:'center', marginTop:100, gap:12 },
  emptyTxt:    { color:Colors.outline, fontSize:14 },
  modalRoot:   { flex:1, backgroundColor:'rgba(0,0,0,0.5)', justifyContent:'flex-end' },
  modalContent:{ backgroundColor:Colors.background, borderTopLeftRadius:24, borderTopRightRadius:24, padding:Spacing.xl },
  modalTitle:  { fontSize:20, fontWeight:'800', color:Colors.onSurface },
  modalSub:    { fontSize:14, color:Colors.outline, marginTop:4 },
  pmBtn:       { flexDirection:'row', alignItems:'center', backgroundColor:Colors.surfaceContainerLow, padding:16, borderRadius:Radius.md, gap:12 },
  pmName:      { flex:1, fontSize:15, fontWeight:'600', color:Colors.onSurface },
  closeBtn:    { alignItems:'center', marginTop:10 },
  closeBtnTxt: { color:Colors.error, fontSize:14, fontWeight:'600' },
});
