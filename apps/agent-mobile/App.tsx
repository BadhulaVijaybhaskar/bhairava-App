import { useEffect, useState } from 'react';
import { Button, FlatList, SafeAreaView, Text, TextInput, View, ScrollView } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { api, tokens } from './src/api';

const Tab = createBottomTabNavigator();

function useLiveList(loader: () => Promise<string[]>) {
  const [rows, setRows] = useState<string[]>(['Loading...']);
  const [err, setErr] = useState('');
  const reload = () => {
    loader()
      .then((xs) => setRows(xs.length ? xs : ['No rows']))
      .catch((e) => { setErr(String(e?.message || e)); setRows([]); });
  };
  useEffect(() => { reload(); }, []);
  return { rows, err, reload };
}

function ListScreen({ title, loader }: { title: string; loader: () => Promise<string[]> }) {
  const { rows, err } = useLiveList(loader);
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>{title}</Text>
      {err ? <Text style={{ color: '#b91c1c' }}>{err}</Text> : null}
      <FlatList data={rows} keyExtractor={(_, i) => String(i)} renderItem={({ item }) => <Text style={{ paddingVertical: 8 }}>{item}</Text>} />
    </SafeAreaView>
  );
}

function ComposeScreen() {
  const [leadName, setLeadName] = useState('');
  const [leadPhone, setLeadPhone] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [plotId, setPlotId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>Create / reserve</Text>
        {msg ? <Text style={{ color: '#15803d' }}>{msg}</Text> : null}
        {err ? <Text style={{ color: '#b91c1c' }}>{err}</Text> : null}
        <Text style={{ fontWeight: '600', marginTop: 8 }}>New lead</Text>
        <TextInput placeholder="Name" value={leadName} onChangeText={setLeadName} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginVertical: 4 }} />
        <TextInput placeholder="Phone" value={leadPhone} onChangeText={setLeadPhone} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginVertical: 4 }} />
        <Button title="Create lead" onPress={async () => { setErr(''); try { await api.leads.create({ name: leadName, phone: leadPhone } as any); setMsg('Lead created'); setLeadName(''); setLeadPhone(''); } catch (e: any) { setErr(e.message || String(e)); } }} />
        <Text style={{ fontWeight: '600', marginTop: 16 }}>New customer</Text>
        <TextInput placeholder="Name" value={custName} onChangeText={setCustName} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginVertical: 4 }} />
        <TextInput placeholder="Phone" value={custPhone} onChangeText={setCustPhone} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginVertical: 4 }} />
        <Button title="Create customer" onPress={async () => { setErr(''); try { const c: any = await api.customers.create({ name: custName, phone: custPhone } as any); setMsg('Customer ' + c.id); setCustomerId(c.id); setCustName(''); setCustPhone(''); } catch (e: any) { setErr(e.message || String(e)); } }} />
        <Text style={{ fontWeight: '600', marginTop: 16 }}>Reserve / book</Text>
        <TextInput placeholder="Customer id" value={customerId} onChangeText={setCustomerId} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginVertical: 4 }} />
        <TextInput placeholder="Plot id" value={plotId} onChangeText={setPlotId} style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginVertical: 4 }} />
        <View style={{ height: 8 }} />
        <Button title="Reserve plot" onPress={async () => { setErr(''); try { await api.reservations.create({ plotId, customerId }); setMsg('Reserved'); } catch (e: any) { setErr(e.message || String(e)); } }} />
        <View style={{ height: 8 }} />
        <Button title="Book plot" onPress={async () => { setErr(''); try { await api.bookings.create({ plotId, customerId, agreementValuePaise: '200000000', advancePaise: '1000000' } as any); setMsg('Booked'); } catch (e: any) { setErr(e.message || String(e)); } }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MoreScreen() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700' }}>More</Text>
      <Text style={{ marginTop: 8, color: '#64748b' }}>SecureStore auth · live API. Store signing BLOCKED BY EXTERNAL CREDENTIAL.</Text>
      <View style={{ height: 12 }} />
      <Button title="Sign out" onPress={async () => { try { await api.auth.logout(); } catch {} await tokens.clear(); }} />
    </SafeAreaView>
  );
}

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  return (
    <SafeAreaView style={{ flex: 1, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12 }}>Bhairava Agent</Text>
      <TextInput autoCapitalize="none" value={email} onChangeText={setEmail} placeholder="Email" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }} />
      <TextInput secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={{ borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, marginBottom: 8 }} />
      {err ? <Text style={{ color: '#b91c1c' }}>{err}</Text> : null}
      <Button title="Sign in" onPress={async () => { try { const s = await api.auth.login(email, password); await tokens.setTokens(s.accessToken, s.refreshToken ?? null); onDone(); } catch (e: any) { setErr(e.message || 'Login failed'); } }} />
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
      <Tab.Navigator>
        <Tab.Screen name="Home" children={() => <ListScreen title="Home" loader={async () => { const [l, v, b] = await Promise.all([api.leads.list(), api.visits.list(), (api as any).bookings.list()]); return ['Leads ' + l.length, 'Visits ' + v.length, 'Bookings ' + b.length]; }} />} />
        <Tab.Screen name="Projects" children={() => <ListScreen title="Projects" loader={async () => (await api.projects.list()).map((p: any) => p.name + ' · ' + (p.lifecycleStatus || ''))} />} />
        <Tab.Screen name="Compose" children={() => <ComposeScreen />} />
        <Tab.Screen name="CRM" children={() => <ListScreen title="Customers / visits" loader={async () => { const [c, v] = await Promise.all([api.customers.list(), api.visits.list()]); return [...c.map((x: any) => 'Customer ' + x.name), ...v.map((x: any) => 'Visit ' + x.status)]; }} />} />
        <Tab.Screen name="Sales" children={() => <ListScreen title="Sales ops" loader={async () => { const [r, b, c, d, n] = await Promise.all([(api as any).reservations.list(), (api as any).bookings.list(), (api as any).commissions.list(), api.documents.list(), (api as any).notifications.list()]); return ['Reservations ' + r.length, 'Bookings ' + b.length, 'Commissions ' + c.length, 'Documents ' + d.length, 'Notifications ' + n.length]; }} />} />
        <Tab.Screen name="More" children={() => <MoreScreen />} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
