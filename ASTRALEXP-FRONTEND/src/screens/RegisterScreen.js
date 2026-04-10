import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Radius } from '../theme';
import { useAuth } from '../context/AuthContext';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password,  setPwd]     = useState('');
  const [password2, setPwd2]    = useState('');
  const [showPwd,   setShowPwd] = useState(false);
  const [loading,   setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim() || !username.trim() || !password) {
      Alert.alert('Missing fields', 'Email, username and password are required.'); return;
    }
    if (password !== password2) { Alert.alert('Password mismatch', 'Passwords do not match.'); return; }
    setLoading(true);
    try {
      await register({ email: email.trim(), username: username.trim(), full_name: fullName.trim(), password, password2 });
      navigation.replace('MainTabs');
    } catch (err) {
      const data = err.response?.data;
      const msg  = data 
        ? Object.values(data).flat().join('\n') 
        : (err.message === 'Network Error' ? 'Network Error: Phone cannot reach the backend. Check Windows Firewall.' : err.message);
      Alert.alert('Registration Failed', msg);
    } finally { setLoading(false); }
  };

  const Field = ({ label, icon, value, onChange, placeholder, secureText, keyboardType, autoCapitalize, extra }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={Colors.outline}
          secureTextEntry={secureText}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          autoCorrect={false}
        />
        {extra}
      </View>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.glob1} />
      <View style={styles.glob2} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.iconWrap}>
            <Ionicons name="wallet" size={26} color="#fff" />
          </View>
          <Text style={styles.appTitle}>Create Account</Text>
          <Text style={styles.appSubtitle}>Enter the Digital Private Vault</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.accentBar} />

          <Field label="EMAIL ADDRESS" icon="mail-outline" value={email} onChange={setEmail}
            placeholder="name@example.com" keyboardType="email-address" />
          <Field label="USERNAME" icon="person-outline" value={username} onChange={setUsername}
            placeholder="yourhandle" />
          <Field label="FULL NAME" icon="id-card-outline" value={fullName} onChange={setFullName}
            placeholder="Your full name" autoCapitalize="words" />
          <Field label="PASSWORD" icon="lock-closed-outline" value={password} onChange={setPwd}
            placeholder="••••••••" secureText={!showPwd}
            extra={
              <TouchableOpacity onPress={() => setShowPwd(!showPwd)} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
                <Ionicons name={showPwd ? 'eye-off-outline' : 'eye-outline'} size={18} color={Colors.onSurfaceVariant} />
              </TouchableOpacity>
            }
          />
          <Field label="CONFIRM PASSWORD" icon="shield-checkmark-outline" value={password2} onChange={setPwd2}
            placeholder="••••••••" secureText />

          <TouchableOpacity style={styles.btn} onPress={handleRegister} disabled={loading} activeOpacity={0.85}>
            {loading
              ? <ActivityIndicator color="#fff" />
              : <><Text style={styles.btnText}>Create Account</Text><Ionicons name="arrow-forward" size={18} color="#fff" /></>
            }
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.footerLink}> Log in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },
  glob1:  { position:'absolute', top:'-5%', left:'-10%', width:280, height:280, borderRadius:140, backgroundColor:Colors.primaryContainer, opacity:0.09 },
  glob2:  { position:'absolute', bottom:'-5%', right:'-10%', width:280, height:280, borderRadius:140, backgroundColor:Colors.tertiaryContainer, opacity:0.04 },
  scroll: { flexGrow:1, alignItems:'center', justifyContent:'center', paddingHorizontal:Spacing.lg, paddingVertical:Spacing.xl },
  brand:  { alignItems:'center', marginBottom:Spacing.lg, gap:8 },
  iconWrap: { width:60, height:60, borderRadius:16, backgroundColor:Colors.primaryContainer, alignItems:'center', justifyContent:'center', marginBottom:4, shadowColor:Colors.primaryContainer, shadowOffset:{width:0,height:6}, shadowOpacity:0.3, shadowRadius:14, elevation:8 },
  appTitle:   { fontSize:30, fontWeight:'800', color:Colors.onSurface, letterSpacing:-0.5 },
  appSubtitle:{ fontSize:11, color:Colors.onSurfaceVariant, letterSpacing:1, fontWeight:'500' },
  card:   { width:'100%', backgroundColor:Colors.surfaceContainerLow, borderRadius:Radius.lg, padding:Spacing.lg, gap:Spacing.md, overflow:'hidden' },
  accentBar: { position:'absolute', top:0, left:0, right:0, height:2, backgroundColor:Colors.primaryContainer, opacity:0.5 },
  fieldGroup: { gap:5 },
  label:  { fontSize:9, color:Colors.onSurfaceVariant, letterSpacing:2, fontWeight:'700', marginLeft:4 },
  inputWrap: { flexDirection:'row', alignItems:'center', backgroundColor:Colors.surfaceContainerLowest, borderRadius:Radius.md, paddingHorizontal:14, height:50 },
  inputIcon: { marginRight:10 },
  input:  { flex:1, fontSize:15, color:Colors.onSurface, paddingVertical:0 },
  btn:    { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, height:52, borderRadius:Radius.full, backgroundColor:Colors.primaryContainer, marginTop:4, shadowColor:Colors.primaryContainer, shadowOffset:{width:0,height:6}, shadowOpacity:0.3, shadowRadius:16, elevation:8 },
  btnText:{ fontSize:16, fontWeight:'700', color:'#fff' },
  footer: { flexDirection:'row', alignItems:'center', marginTop:Spacing.lg },
  footerText: { color:Colors.onSurfaceVariant, fontSize:14 },
  footerLink: { color:Colors.primary, fontWeight:'700', fontSize:14 },
});
