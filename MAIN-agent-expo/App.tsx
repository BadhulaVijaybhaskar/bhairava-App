import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AGENT_DEMOS, PLATFORM_SEED, findAgentDemo } from "./src/lib/seed";
import {
  agentDocuments,
  agentNotifications,
  bookingsForAgent,
  commissionsForAgent,
  customersForAgent,
  leadsForAgent,
  projectPlotForAgent,
  reservationsForAgent,
  visitsForAgent,
} from "./src/lib/projections";
import { Btn, Card, Chip, Field, Muted, Row, Screen } from "./src/ui";
import { colors } from "./src/theme";

const SESSION_KEY = "bhairava.agent.mobile.session.v1";
type Session = { email: string; name: string; agentId: string };
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState<string>(AGENT_DEMOS[0].email);
  const [password, setPassword] = useState<string>(AGENT_DEMOS[0].password);
  const [err, setErr] = useState("");
  return (
    <Screen title="Agent login">
      <Card>
        <Muted>Demo: agent1@bhairava.com / agent1@2026</Muted>
        <View style={{ height: 8 }} />
        {AGENT_DEMOS.map((a) => (
          <Pressable
            key={a.id}
            onPress={() => { setEmail(a.email); setPassword(a.password); }}
            style={{ paddingVertical: 10 }}
          >
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{a.name} Â· {a.email}</Text>
          </Pressable>
        ))}
        <Field label="Email" value={email} onChangeText={setEmail} />
        <Field label="Password" value={password} onChangeText={setPassword} secure />
        {err ? <Chip label={err} tone="danger" /> : null}
        <View style={{ height: 8 }} />
        <Btn
          label="Sign in"
          onPress={async () => {
            const match = findAgentDemo(email, password);
            if (!match) { setErr("Invalid credentials"); return; }
            const session = { email: match.email, name: match.name, agentId: match.id };
            await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
            onLogin(session);
          }}
        />
      </Card>
    </Screen>
  );
}

function HomeScreen({ session, navigation }: { session: Session; navigation: any }) {
  const customers = customersForAgent(PLATFORM_SEED, session.agentId);
  const bookings = bookingsForAgent(PLATFORM_SEED, session.agentId);
  const leads = leadsForAgent(PLATFORM_SEED, session.agentId);
  return (
    <Screen title="Home">
      <Muted>Sell workspace Â· {session.name}</Muted>
      <View style={{ height: 8 }} />
      <Card><Text style={styles.stat}>{customers.length}</Text><Muted>My customers</Muted></Card>
      <Card><Text style={styles.stat}>{bookings.length}</Text><Muted>My bookings</Muted></Card>
      <Card><Text style={styles.stat}>{leads.length}</Text><Muted>My leads</Muted></Card>
      <Btn label="Open projects" onPress={() => navigation.navigate("Explore")} />
    </Screen>
  );
}

function ExploreStack({ session }: { session: Session }) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Projects">
        {({ navigation }) => (
          <Screen title="Projects">
            {PLATFORM_SEED.projects.filter((p) => p.agentVisible).map((p) => (
              <Card key={p.id}>
                <Row title={p.name} meta={`${p.code} Â· ${p.city}`} onPress={() => navigation.navigate("ProjectDetail", { projectId: p.id })} right={<Chip label="Read-only" />} />
              </Card>
            ))}
            <Btn label="Plot availability" onPress={() => navigation.navigate("Plots")} />
          </Screen>
        )}
      </Stack.Screen>
      <Stack.Screen name="ProjectDetail">
        {({ route, navigation }: any) => {
          const project = PLATFORM_SEED.projects.find((p) => p.id === route.params.projectId)!;
          return (
            <Screen title={project.name} onBack={() => navigation.goBack()}>
              <Card>
                <Muted>{project.code} Â· {project.city}</Muted>
                <Text>Master data is read-only for agents.</Text>
                <View style={{ height: 10 }} />
                <Btn label="Plots" onPress={() => navigation.navigate("Plots")} />
              </Card>
            </Screen>
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Plots">
        {({ navigation }) => (
          <Screen title="Plot availability" onBack={() => navigation.goBack()}>
            <Muted>PII only for your assignments</Muted>
            {PLATFORM_SEED.plots.map((p) => {
              const row = projectPlotForAgent(p, PLATFORM_SEED, session.agentId);
              return (
                <Card key={row.id}>
                  <Row
                    title={row.number}
                    meta={`${row.area} sq yd Â· â‚¹${row.price.toLocaleString("en-IN")}`}
                    onPress={() => navigation.navigate("PlotDetail", { plotId: row.id })}
                    right={<Chip label={row.status} />}
                  />
                  <Muted>
                    {row.customer ? row.customer.name : row.redacted ? "PII hidden" : "â€”"}
                  </Muted>
                </Card>
              );
            })}
          </Screen>
        )}
      </Stack.Screen>
      <Stack.Screen name="PlotDetail">
        {({ route, navigation }: any) => {
          const plot = PLATFORM_SEED.plots.find((p) => p.id === route.params.plotId)!;
          const row = projectPlotForAgent(plot, PLATFORM_SEED, session.agentId);
          return (
            <Screen title={`Plot ${row.number}`} onBack={() => navigation.goBack()}>
              <Card>
                <Chip label={row.status} />
                <View style={{ height: 8 }} />
                <Text>{row.area} sq yd Â· {row.facing}</Text>
                <Text>â‚¹{row.price.toLocaleString("en-IN")}</Text>
                <Muted>
                  Customer: {row.customer ? `${row.customer.name} Â· ${row.customer.phone}` : row.redacted ? "PII hidden (other agent)" : "â€”"}
                </Muted>
              </Card>
            </Screen>
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function LeadsScreen({ session }: { session: Session }) {
  const leads = leadsForAgent(PLATFORM_SEED, session.agentId);
  const customers = customersForAgent(PLATFORM_SEED, session.agentId);
  return (
    <Screen title="Leads">
      <Muted>Own leads only</Muted>
      {leads.map((l) => (
        <Card key={l.id}><Row title={l.name} meta={`${l.stage} Â· ${l.phone}`} /></Card>
      ))}
      <Text style={styles.section}>Customers</Text>
      {customers.map((c) => (
        <Card key={c.id}><Row title={c.name} meta={c.phone} /></Card>
      ))}
      <Text style={styles.section}>Onboarding</Text>
      <Card><Muted>Capture KYC for your assigned prospects (client-test stub).</Muted></Card>
    </Screen>
  );
}

function VisitsScreen({ session }: { session: Session }) {
  return (
    <Screen title="Visits">
      {visitsForAgent(PLATFORM_SEED, session.agentId).map((v) => (
        <Card key={v.id}><Row title={v.id} meta={`${v.when} Â· ${v.status}`} right={<Chip label={v.status} />} /></Card>
      ))}
      <Text style={styles.section}>Reservations</Text>
      {reservationsForAgent(PLATFORM_SEED, session.agentId).map((r) => (
        <Card key={r.id}><Row title={r.id} meta={`${r.plotId} Â· ${r.status}`} /></Card>
      ))}
      <Text style={styles.section}>Bookings</Text>
      {bookingsForAgent(PLATFORM_SEED, session.agentId).map((b) => (
        <Card key={b.id}><Row title={b.id} meta={`â‚¹${b.amount.toLocaleString("en-IN")} Â· ${b.status}`} /></Card>
      ))}
    </Screen>
  );
}

function MoreScreen({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return (
    <Screen title="More">
      <Card>
        <Text style={{ fontWeight: "700" }}>{session.name}</Text>
        <Muted>{session.email}</Muted>
        <Muted>Agent id: {session.agentId}</Muted>
      </Card>
      <Text style={styles.section}>Collections</Text>
      <Card><Muted>Own customers/bookings only.</Muted></Card>
      <Text style={styles.section}>Commissions</Text>
      {commissionsForAgent(PLATFORM_SEED, session.agentId).map((c) => (
        <Card key={c.id}><Row title={c.id} meta={`â‚¹${c.amount.toLocaleString("en-IN")} Â· ${c.status}`} /></Card>
      ))}
      <Text style={styles.section}>Documents</Text>
      <Card>
        {agentDocuments(PLATFORM_SEED, session.agentId).map((d) => (
          <Row key={d.id} title={d.title} meta={d.visibility} />
        ))}
        <Muted>INTERNAL vault excluded.</Muted>
      </Card>
      <Text style={styles.section}>Notifications</Text>
      {agentNotifications(PLATFORM_SEED, session.agentId).map((n) => (
        <Card key={n.id}><Row title={n.title} meta={n.body} /></Card>
      ))}
      <Btn label="Sign out" ghost onPress={onLogout} />
    </Screen>
  );
}

function MainTabs({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarStyle: { minHeight: 56, paddingBottom: 6 },
      }}
    >
      <Tab.Screen name="Home">{({ navigation }) => <HomeScreen session={session} navigation={navigation} />}</Tab.Screen>
      <Tab.Screen name="Explore">{() => <ExploreStack session={session} />}</Tab.Screen>
      <Tab.Screen name="Leads">{() => <LeadsScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Visits">{() => <VisitsScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="More">{() => <MoreScreen session={session} onLogout={onLogout} />}</Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(SESSION_KEY).then((raw) => {
      if (raw) setSession(JSON.parse(raw));
      setReady(true);
    });
  }, []);
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        {session ? (
          <MainTabs
            session={session}
            onLogout={async () => {
              await AsyncStorage.removeItem(SESSION_KEY);
              setSession(null);
            }}
          />
        ) : (
          <LoginScreen onLogin={setSession} />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  stat: { fontSize: 28, fontWeight: "800", color: colors.ink },
  section: { marginTop: 12, marginBottom: 6, fontWeight: "700", color: colors.ink },
});



