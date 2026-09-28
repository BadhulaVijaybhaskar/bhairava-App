import { useEffect, useState } from 'react';
import { Button, FlatList, SafeAreaView, Text, TextInput, View, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { userFacingError } from '@bhairava/api-client';
import { brand, palette } from '@bhairava/ui-mobile';
import { api, tokens } from './src/api';

const Tab = createBottomTabNavigator();
const titleStyle = { fontSize: 22, fontWeight: '700' as const, marginBottom: 12, color: brand.foreground };
const mutedStyle = { marginTop: 8, color: palette.mutedForeground };
const dangerStyle = { color: '#b91c1c' };
const inputStyle = { borderWidth: 1, borderColor: palette.outlineVariant, borderRadius: 8, padding: 10, marginVertical: 4 };

function useLiveList(loader: () => Promise<string[]>) {
  const [rows, setRows] = useState<string[]>(['Loading...']);
  const [err, setErr] = useState('');
  useEffect(() => {
    loader()
      .then((xs) => setRows(xs.length ? xs : ['No rows']))
      .catch((e) => {
        setErr(userFacingError(e));
        setRows([]);
      });
  }, []);
  return { rows, err };
}

function ListScreen({ title, loader }: { title: string; loader: () => Promise<string[]> }) {
  const { rows, err } = useLiveList(loader);
  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: brand.surface }}>
      <Text style={titleStyle}>{title}</Text>
      {err ? <Text style={dangerStyle}>{err}</Text> : null}
      <FlatList data={rows} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => <Text style={{ paddingVertical: 8, color: brand.foreground }}>{item}</Text>} />
    </SafeAreaView>
  );
}

function DetailScreen() {
  const [projectId, setProjectId] = useState('');
  const [plots, setPlots] = useState<string[]>([]);
  const [err, setErr] = useState('');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: brand.surface }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: brand.foreground }}>Explore plots</Text>
        <TextInput placeholder="Project id" value={projectId} onChangeText={setProjectId} style={{ ...inputStyle, marginVertical: 8 }} />
        <Button
          title="Load plots"
          color={brand.primary}
          onPress={async () => {
            setErr('');
            try {
              const rows = await api.plots.listByProject(projectId);
              setPlots(rows.map((p: any) => (p.number || p.id) + ' · ' + p.status));
            } catch (e: unknown) {
              setErr(userFacingError(e));
            }
          }}
        />
        {err ? <Text style={dangerStyle}>{err}</Text> : null}
        {plots.map((p, i) => <Text key={i} style={{ paddingVertical: 6, color: brand.foreground }}>{p}</Text>)}
      </ScrollView>
    </SafeAreaView>
  );
}

function MoreScreen() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: brand.surface }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: brand.foreground }}>Support / Profile</Text>
      <Text style={mutedStyle}>SecureStore auth. Store signing BLOCKED BY EXTERNAL CREDENTIAL.</Text>
      <View style={{ height: 12 }} />
      <Button title="Sign out" color={brand.primary} onPress={async () => { try { await api.auth.logout(); } catch {} await tokens.clear(); }} />
    </SafeAreaView>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center', backgroundColor: brand.surface }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12, color: brand.foreground }}>My Bhairava</Text>
      <TextInput autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="Email" style={{ ...inputStyle, marginBottom: 8 }} />
      <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={{ ...inputStyle, marginBottom: 8 }} />
      {err ? <Text style={dangerStyle}>{err}</Text> : null}
      <Button
        title="Sign in"
        color={brand.primary}
        onPress={async () => {
          try {
            const s = await api.auth.login(email, password);
            await tokens.setTokens(s.accessToken, s.refreshToken ?? null);
            onDone();
          } catch (e: unknown) {
            setErr(userFacingError(e, { context: 'auth', fallback: 'Login failed' }));
          }
        }}
      />
    </SafeAreaView>
  );
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  useEffect(() => { void Promise.resolve(tokens.getAccessToken()).then((t: string | null) => setAuthed(!!t)); }, []);
  if (authed === null) return null;
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return (
    <NavigationContainer>
      <StatusBar style="dark" />
      <Tab.Navigator screenOptions={{ headerStyle: { backgroundColor: brand.surface }, headerTintColor: brand.foreground, tabBarActiveTintColor: brand.primary, tabBarInactiveTintColor: palette.mutedForeground }}>
        <Tab.Screen name="Home" children={() => <ListScreen title="Home" loader={async () => { const [b, p, n] = await Promise.all([(api as any).bookings.list(), api.payments.list(), (api as any).notifications.list()]); return ['Bookings ' + b.length, 'Payments ' + p.length, 'Notifications ' + n.length]; }} />} />
        <Tab.Screen name="Explore" children={() => <ListScreen title="Explore projects" loader={async () => (await api.projects.list()).map((p: any) => p.id.slice(0, 8) + ' · ' + p.name + ' · ' + (p.city || ''))} />} />
        <Tab.Screen name="Plots" children={() => <DetailScreen />} />
        <Tab.Screen name="Finance" children={() => <ListScreen title="Payments / schedule / receipts" loader={async () => { const [p, s, r] = await Promise.all([api.payments.list(), (api as any).paymentSchedules.list(), (api as any).receipts.list()]); return ['Payments ' + p.length, 'Schedule ' + s.length, ...r.map((x: any) => 'Receipt ' + x.receiptNumber)]; }} />} />
        <Tab.Screen name="Docs" children={() => <ListScreen title="Documents / notifications" loader={async () => { const [d, n] = await Promise.all([api.documents.list(), (api as any).notifications.list()]); return [...d.map((x: any) => 'Doc ' + x.title + ' · ' + (x.docType || '')), ...n.map((x: any) => 'Notif ' + x.title)]; }} />} />
        <Tab.Screen name="More" children={() => <MoreScreen />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
