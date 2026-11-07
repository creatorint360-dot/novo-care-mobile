// Novo Care mobile app (Expo / React Native).
// Same accounts, same database and same rules as the website: it talks to the online server.
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Modal, Pressable, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, forgetTokens, hasSavedSession, setSessionEndedHandler } from './src/api';
import { L, loadLabels } from './src/labels';
import { Body, BrandMark, Button, C, Card, Field, Hero, KeyboardScroll, Msg, Muted, PasswordField, RoleTag } from './src/ui';
import { Audit, Backup, ChangePassword, Credentials, Dashboard, Records, Users } from './src/screens';

// ------------------------------------------------------------------ step 1: username + password
function Login({ note, onNext }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(note ? { kind: 'info', text: note } : null);
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setMsg(null);
    const r = await api('/api/login', 'POST', { username: username.trim(), password });
    setBusy(false);
    if (r.ok) { setPassword(''); return onNext(); }
    setMsg({ kind: 'error', text: r.data.error || 'Sign-in failed.' });
  }

  return (
    <View>
      <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink }}>Welcome back</Text>
      <Muted style={{ marginBottom: 14 }}>Step 1 of 2: your username and password.</Muted>
      <Msg kind={msg && msg.kind} text={msg && msg.text} />
      <Field label="Username" value={username} onChangeText={setUsername} maxLength={50} testID="login-user" />
      <PasswordField label="Password" value={password} onChangeText={setPassword} testID="login-pass" />
      <Button title="Continue" onPress={go} busy={busy} disabled={!username.trim() || !password} testID="login-go" />
    </View>
  );
}

// ------------------------------------------------------------------ step 2: the 6-digit code
function TwoFactor({ onDone, onBack }) {
  const [info, setInfo] = useState(null);
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await api('/api/twofactor');
      if (!r.ok) return onBack(r.data.error || 'Please sign in again.');
      setInfo(r.data);
    })();
  }, []);

  async function verify() {
    setBusy(true); setMsg(null);
    const r = await api('/api/twofactor', 'POST', { code: code.replace(/\s/g, '') });
    setBusy(false);
    if (r.ok) return onDone();
    if (r.data.restart) return onBack(r.data.error);
    setMsg({ kind: 'error', text: r.data.error || 'Verification failed.' });
  }

  async function openAuthenticator() {
    try { await Linking.openURL(info.uri); }
    catch (e) { setMsg({ kind: 'error', text: 'No authenticator app could open the link. Type the key into your app instead.' }); }
  }

  if (!info) return <ActivityIndicator color={C.violet} style={{ marginTop: 40 }} />;
  return (
    <View>
      <Text style={{ fontSize: 26, fontWeight: '800', color: C.ink }}>Check your phone</Text>
      <Muted style={{ marginBottom: 14 }}>{'Step 2 of 2: ' + info.username + ', enter the code from your authenticator app.'}</Muted>
      {info.enrolling ? (
        <Card title="First sign-in: link your authenticator app">
          <Body>1. Open Google Authenticator, Microsoft Authenticator or Authy.</Body>
          <Body>2. Choose "Add" and then "Enter a setup key".</Body>
          <Body style={{ marginBottom: 8 }}>3. Type this key (press and hold it to copy):</Body>
          <View style={{ backgroundColor: '#faf7ff', borderRadius: 10, padding: 10 }}>
            <Text selectable testID="setup-key" style={{ fontFamily: 'monospace', fontSize: 15, color: C.ink, textAlign: 'center' }}>{info.secret}</Text>
          </View>
          <Button kind="ghost" title="Open my authenticator app for me" onPress={openAuthenticator} />
        </Card>
      ) : null}
      <Msg kind={msg && msg.kind} text={msg && msg.text} />
      <Field label="6-digit code" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={7} testID="code-input"
        style={{ textAlign: 'center', fontSize: 24, letterSpacing: 6 }} />
      <Button title={info.enrolling ? 'Link device and sign in' : 'Verify and sign in'} onPress={verify} busy={busy} disabled={code.replace(/\s/g, '').length < 6} testID="code-go" />
      <Button kind="ghost" title="Back to sign-in" onPress={() => onBack()} />
    </View>
  );
}

// ------------------------------------------------------------------ the signed-in app
function Main() {
  const insets = useSafeAreaInsets();
  const [phase, setPhase] = useState('loading');   // loading | login | twofa | app
  const [note, setNote] = useState('');
  const [me, setMe] = useState(null);
  const [screen, setScreen] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(false);

  const backToLogin = useCallback(async (text) => {
    await forgetTokens();
    setMe(null); setScreen('dashboard'); setMenuOpen(false);
    setNote(text || ''); setPhase('login');
  }, []);

  const refresh = useCallback(async () => {
    const r = await api('/api/me');
    if (r.ok) setMe(r.data);
  }, []);

  const enterApp = useCallback(async () => {
    const r = await api('/api/me');
    if (!r.ok) return backToLogin('Please sign in again.');
    setMe(r.data); setScreen('dashboard'); setNote(''); setPhase('app');
  }, [backToLogin]);

  useEffect(() => {
    setSessionEndedHandler(() => { setMe(null); setMenuOpen(false); setNote('Your session ended. Please sign in again.'); setPhase('login'); });
    (async () => {
      await loadLabels();
      if (await hasSavedSession()) return enterApp();
      setPhase('login');
    })();
  }, []);

  // Coming back to the app after a while: check the session is still alive.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active' && phase === 'app') refresh(); });
    return () => sub.remove();
  }, [phase, refresh]);

  async function signOut() {
    await api('/api/logout', 'POST', {});
    await backToLogin('You are signed out.');
  }

  const shellStyle = { flex: 1, backgroundColor: C.cream, paddingTop: insets.top };

  if (phase === 'loading') {
    return <View style={[shellStyle, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator size="large" color={C.violet} /></View>;
  }

  if (phase !== 'app') {
    return (
      <View style={shellStyle}>
        <KeyboardScroll padding={22}>
            <Hero />
            {phase === 'login' ? <Login key={note} note={note} onNext={() => setPhase('twofa')} /> : null}
            {phase === 'twofa' ? <TwoFactor onDone={enterApp} onBack={(t) => backToLogin(t)} /> : null}
            <Muted style={{ marginTop: 26, textAlign: 'center' }}>Computer Security - PBIT 309 / PBSE 309</Muted>
        </KeyboardScroll>
        <StatusBar style="dark" />
      </View>
    );
  }

  const a = me.abilities;
  const items = [['dashboard', 'Dashboard'], ['records', L.Records]];
  if (a.creatableRoles.length || a.canDeleteInputters) items.push(['users', 'Users']);
  if (a.canViewAudit) items.push(['audit', 'Audit log']);
  if (a.canBackup) items.push(['backup', 'Backup']);
  if (a.canViewAudit && me.demoMode) items.push(['credentials', 'Salt & pepper']);
  items.push(['password', 'Change password']);
  const titles = Object.fromEntries(items);
  titles.dashboard = 'Hello, ' + me.user.fullName.split(' ')[0];

  const common = { me, refresh };
  const body = {
    dashboard: <Dashboard {...common} />,
    records: <Records {...common} />,
    users: <Users {...common} />,
    audit: <Audit />,
    backup: <Backup {...common} />,
    credentials: <Credentials />,
    password: <ChangePassword onLocked={(t) => backToLogin(t)} />,
  }[screen];

  return (
    <View style={shellStyle}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: '#fff' }}>
        <BrandMark size={34} />
        <View style={{ flex: 1, marginLeft: 10, marginRight: 8 }}>
          <Text style={{ fontSize: 19, fontWeight: '800', color: C.ink }} numberOfLines={1}>{titles[screen]}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Muted numberOfLines={1} style={{ flexShrink: 1, marginRight: 6 }}>{me.user.fullName}</Muted>
            <RoleTag role={me.user.role} />
          </View>
        </View>
        <Button small kind="ghost" title="Menu" onPress={() => setMenuOpen(true)} testID="menu-open" />
      </View>
      <KeyboardScroll padding={16}>
          {me.demoMode ? <Msg kind="warn" text="Demo mode is ON: salt, pepper and their combination are visible in the database for the lecturer. Turn DEMO_MODE off after the demonstration." /> : null}
          <View key={screen}>{body}</View>
      </KeyboardScroll>

      <Modal visible={menuOpen} transparent animationType="fade" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(42,35,66,0.45)' }} onPress={() => setMenuOpen(false)}>
          <View style={{ marginTop: insets.top + 8, marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 18, padding: 10 }}>
            {items.map(([key, label]) => (
              <Pressable key={key} testID={'menu-' + key} onPress={() => { setScreen(key); setMenuOpen(false); }}
                style={{ paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, backgroundColor: key === screen ? C.infoBg : '#fff' }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: key === screen ? C.infoText : C.ink }}>{label}</Text>
              </Pressable>
            ))}
            <Pressable testID="menu-signout" onPress={signOut} style={{ paddingVertical: 14, paddingHorizontal: 14 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: C.danger }}>Sign out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      <StatusBar style="dark" />
    </View>
  );
}

export default function App() {
  return <SafeAreaProvider><Main /></SafeAreaProvider>;
}
