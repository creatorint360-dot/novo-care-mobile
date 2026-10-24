// Small building blocks shared by every screen.
import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export const C = {
  cream: '#fff8f1', coral: '#ff7a59', violet: '#7c5cfc', ink: '#2a2342', muted: '#6f6989',
  line: '#eee6f7', card: '#ffffff', danger: '#d6455d',
  okText: '#14664a', okBg: '#e3f7ee', badText: '#8d1f33', badBg: '#ffe9ed', infoText: '#4a35b8', infoBg: '#efeaff',
  warnText: '#6b5200', warnBg: '#fff3cd',
};
// The same coral-to-violet blend the website uses on its buttons and its sign-in panel.
export const BRAND = [C.coral, C.violet];

// The rounded "N" square: coloured on white screens, white on the coloured panel.
export function BrandMark({ size = 38, onColor }) {
  const inner = <Text style={{ color: onColor ? C.violet : '#fff', fontWeight: '800', fontSize: size * 0.47 }}>N</Text>;
  const box = { width: size, height: size, borderRadius: size * 0.3, alignItems: 'center', justifyContent: 'center' };
  if (onColor) return <View style={[box, { backgroundColor: '#fff' }]}>{inner}</View>;
  return <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={box}>{inner}</LinearGradient>;
}

// The coloured welcome panel at the top of the sign-in screens (like the website's left side).
export function Hero() {
  const pills = ['Passwords protected with salt + pepper', 'Two-factor sign-in with an authenticator app', 'Records encrypted with AES-256-GCM'];
  return (
    <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 22, padding: 20, marginBottom: 22 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
        <BrandMark onColor />
        <Text style={{ marginLeft: 10, fontSize: 19, fontWeight: '800', color: '#fff' }}>Novo Staff</Text>
      </View>
      <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', lineHeight: 30 }}>Records you can trust, access you control.</Text>
      <Text style={{ color: 'rgba(255,255,255,0.92)', marginTop: 8, marginBottom: 14, lineHeight: 20 }}>A secure staff records portal with two-factor sign-in and role-based access.</Text>
      {pills.map((t) => (
        <View key={t} style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 8 }}>
          <Text style={{ color: '#fff', fontSize: 13 }}>{t}</Text>
        </View>
      ))}
    </LinearGradient>
  );
}

export function Card({ title, children, danger }) {
  return (
    <View style={{ backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: danger ? '#f3c3cb' : C.line, padding: 16, marginBottom: 14,
      shadowColor: C.violet, shadowOpacity: 0.07, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 1 }}>
      {title ? <Text style={{ fontSize: 17, fontWeight: '700', color: C.ink, marginBottom: 8 }}>{title}</Text> : null}
      {children}
    </View>
  );
}

export function Body({ children, style }) {
  return <Text style={[{ color: C.ink, fontSize: 14, lineHeight: 20 }, style]}>{children}</Text>;
}

export function Muted({ children, style, ...rest }) {
  return <Text {...rest} style={[{ color: C.muted, fontSize: 13, lineHeight: 18 }, style]}>{children}</Text>;
}

export function Msg({ kind, text }) {
  if (!text) return null;
  const look = kind === 'ok' ? [C.okBg, C.okText] : kind === 'error' ? [C.badBg, C.badText] : kind === 'warn' ? [C.warnBg, C.warnText] : [C.infoBg, C.infoText];
  return (
    <View style={{ backgroundColor: look[0], borderRadius: 12, padding: 12, marginBottom: 12 }}>
      <Text style={{ color: look[1], fontSize: 14 }}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, kind = 'primary', disabled, busy, small, testID }) {
  const fg = kind === 'ghost' ? C.ink : '#ffffff';
  const content = busy ? <ActivityIndicator color={fg} /> : <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 13 : 15 }}>{title}</Text>;
  const inner = { paddingVertical: small ? 8 : 13, paddingHorizontal: small ? 12 : 18, alignItems: 'center', justifyContent: 'center', borderRadius: 12 };
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => ({
        opacity: disabled || busy ? 0.6 : pressed ? 0.85 : 1,
        borderRadius: 12, overflow: 'hidden',
        marginTop: small ? 0 : 10, marginRight: small ? 8 : 0, marginBottom: small ? 6 : 0,
      })}
    >
      {kind === 'primary' ? (
        <LinearGradient colors={BRAND} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={inner}>{content}</LinearGradient>
      ) : (
        <View style={[inner, { backgroundColor: kind === 'danger' ? C.danger : '#ffffff', borderWidth: kind === 'ghost' ? 1.5 : 0, borderColor: C.line }]}>{content}</View>
      )}
    </Pressable>
  );
}

export function Field({ label, style, ...props }) {
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontWeight: '600', fontSize: 13, color: C.ink, marginBottom: 6 }}>{label}</Text>
      <TextInput
        placeholderTextColor="#a9a3c0"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="off"
        importantForAutofill="no"
        {...props}
        style={[{ borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, color: C.ink, backgroundColor: '#fff' }, props.multiline ? { minHeight: 100, textAlignVertical: 'top' } : null, style]}
      />
    </View>
  );
}

// A password box with a Show / Hide button.
export function PasswordField({ label, ...props }) {
  const [shown, setShown] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      <Text style={{ fontWeight: '600', fontSize: 13, color: C.ink, marginBottom: 6 }}>{label}</Text>
      <View style={{ justifyContent: 'center' }}>
        <TextInput
          placeholderTextColor="#a9a3c0"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="off"
          importantForAutofill="no"
          {...props}
          secureTextEntry={!shown}
          style={{ borderWidth: 1.5, borderColor: C.line, borderRadius: 12, paddingLeft: 14, paddingRight: 70, paddingVertical: 11, fontSize: 15, color: C.ink, backgroundColor: '#fff' }}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={shown ? 'Hide password' : 'Show password'}
          onPress={() => setShown(!shown)}
          style={{ position: 'absolute', right: 8, paddingVertical: 6, paddingHorizontal: 10 }}
        >
          <Text style={{ color: C.violet, fontWeight: '700', fontSize: 13 }}>{shown ? 'Hide' : 'Show'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Chip({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1.5, borderColor: active ? C.violet : C.line, backgroundColor: active ? C.infoBg : '#fff', marginRight: 8, marginBottom: 8 }}>
      <Text style={{ color: active ? C.infoText : C.muted, fontWeight: '700', textTransform: 'capitalize' }}>{label}</Text>
    </Pressable>
  );
}

export function RoleTag({ role }) {
  return (
    <View style={{ alignSelf: 'flex-start', backgroundColor: C.infoBg, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 10 }}>
      <Text style={{ color: C.infoText, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' }}>{role}</Text>
    </View>
  );
}

// Ask "are you sure?" before a risky action (works on the phone and in a browser test).
export function confirmAction(title, message, onYes, yesText = 'Yes') {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(title + '\n\n' + message)) onYes();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yesText, style: 'destructive', onPress: onYes },
  ]);
}

export const fmt = (d) => new Date(d).toLocaleString();
