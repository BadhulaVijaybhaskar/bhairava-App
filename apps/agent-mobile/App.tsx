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
const successStyle = { color: palette.success };
const dangerStyle = { color: '#b91c1c' };
const inputStyle = { borderWidth: 1, borderColor: palette.outlineVariant, borderRadius: 8, padding: 10, marginVertical: 4 };

function useLiveList(loader: () => Promise<string[]>) {
  const [rows, setRows] = useState<string[]>(['Loading...']);
  const [err, setErr] = useState('');
  const reload = () => {
    loader()
      .then((xs) => setRows(xs.length ? xs : ['No rows']))
      .catch((e) => {
        setErr(userFacingError(e));
        setRows([]);
      });
  };
  useEffect(() => {
    reload();
  }, []);
  return { rows, err, reload };
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
    <SafeAreaView style={{ flex: 1, backgroundColor: brand.surface }}>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <Text style={titleStyle}>Create / reserve</Text>
        {msg ? <Text style={successStyle}>{msg}</Text> : null}
        {err ? <Text style={dangerStyle}>{err}</Text> : null}
        <Text style={{ fontWeight: '600', marginTop: 8, color: brand.foreground }}>New lead</Text>
        <TextInput placeholder="Name" value={leadName} onChangeText={setLeadName} style={inputStyle} />
        <TextInput placeholder="Phone" value={leadPhone} onChangeText={setLeadPhone} style={inputStyle} />
        <Button
          title="Create lead"
          color={brand.primary}
          onPress={async () => {
            setErr('');
            try {
              await api.leads.create({ name: leadName, phone: leadPhone } as any);
              setMsg('Lead created');
              setLeadName('');
              setLeadPhone('');
            } catch (e: unknown) {
              setErr(userFacingError(e));
            }
          }}
        />
        <Text style={{ fontWeight: '600', marginTop: 16, color: brand.foreground }}>New customer</Text>
        <TextInput placeholder="Name" value={custName} onChangeText={setCustName} style={inputStyle} />
        <TextInput placeholder="Phone" value={custPhone} onChangeText={setCustPhone} style={inputStyle} />
        <Button
          title="Create customer"
          color={brand.primary}
          onPress={async () => {
            setErr('');
            try {
              const c: any = await api.customers.create({ name: custName, phone: custPhone } as any);
              setMsg('Customer ' + c.id);
              setCustomerId(c.id);
              setCustName('');
              setCustPhone('');
            } catch (e: unknown) {
              setErr(userFacingError(e));
            }
          }}
        />
        <Text style={{ fontWeight: '600', marginTop: 16, color: brand.foreground }}>Reserve / book</Text>
        <TextInput placeholder="Customer id" value={customerId} onChangeText={setCustomerId} style={inputStyle} />
        <TextInput placeholder="Plot id" value={plotId} onChangeText={setPlotId} style={inputStyle} />
        <View style={{ height: 8 }} />
        <Button
          title="Reserve plot"
          color={brand.primary}
          onPress={async () => {
            setErr('');
            try {
              await api.reservations.create({ plotId, customerId });
              setMsg('Reserved');
            } catch (e: unknown) {
              setErr(userFacingError(e));
            }
          }}
        />
        <View style={{ height: 8 }} />
        <Button
          title="Book plot"
          color={brand.primary}
          onPress={async () => {
            setErr('');
            try {
              await api.bookings.create({
                plotId,
                customerId,
                agreementValuePaise: '200000000',
                advancePaise: '1000000',
              } as any);
              setMsg('Booked');
            } catch (e: unknown) {
              setErr(userFacingError(e));
            }
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function MoreScreen() {
  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: brand.surface }}>
      <Text style={{ fontSize: 22, fontWeight: '700', color: brand.foreground }}>More</Text>
      <Text style={mutedStyle}>SecureStore auth · live API. Store signing BLOCKED BY EXTERNAL CREDENTIAL.</Text>
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
      <Text style={{ fontSize: 24, fontWeight: '700', marginBottom: 12, color: brand.foreground }}>Bhairava Agent</Text>
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
