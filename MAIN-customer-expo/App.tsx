import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Text, View, Pressable, StyleSheet } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { CUSTOMER_DEMOS, PLATFORM_SEED, findCustomerDemo } from "./src/lib/seed";
import {
  bookingsForCustomer,
  customerDocuments,
  customerNotifications,
  paymentsForCustomer,
  projectPlotForCustomer,
  propertiesForCustomer,
} from "./src/lib/projections";
import { Btn, Card, Chip, Field, Muted, Row, Screen } from "./src/ui";
import { colors } from "./src/theme";

const SESSION_KEY = "bhairava.customer.mobile.session.v1";
type Session = { email: string; name: string; customerId: string };
const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function LoginScreen({ onLogin }: { onLogin: (s: Session) => void }) {
  const [email, setEmail] = useState<string>(CUSTOMER_DEMOS[0].email);
  const [password, setPassword] = useState<string>(CUSTOMER_DEMOS[0].password);
  const [err, setErr] = useState("");
  return (
    <Screen title="Customer login">
      <Card>
        <Muted>Demo: customer1@bhairava.com / customer1@2026</Muted>
        <View style={{ height: 8 }} />
        {CUSTOMER_DEMOS.map((c) => (
          <Pressable key={c.id} onPress={() => { setEmail(c.email); setPassword(c.password); }} style={{ paddingVertical: 10 }}>
            <Text style={{ color: colors.primary, fontWeight: "600" }}>{c.name} Â· {c.email}</Text>
          </Pressable>
        ))}
        <Field label="Email" value={email} onChangeText={setEmail} />
        <Field label="Password" value={password} onChangeText={setPassword} secure />
        {err ? <Chip label={err} tone="danger" /> : null}
        <View style={{ height: 8 }} />
        <Btn
          label="Sign in"
          onPress={async () => {
            const match = findCustomerDemo(email, password);
            if (!match) { setErr("Invalid credentials"); return; }
            const session = { email: match.email, name: match.name, customerId: match.id };
            await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
            onLogin(session);
          }}
        />
      </Card>
    </Screen>
  );
}

function HomeScreen({ session }: { session: Session }) {
  const bookings = bookingsForCustomer(PLATFORM_SEED, session.customerId);
  const due = paymentsForCustomer(PLATFORM_SEED, session.customerId).filter((p) => p.status === "Due");
  return (
    <Screen title="Home">
      <Muted>Welcome, {session.name}</Muted>
      <Card><Text style={styles.stat}>{bookings.length}</Text><Muted>My bookings</Muted></Card>
      <Card><Text style={styles.stat}>{due.length}</Text><Muted>Payments due</Muted></Card>
      <Card><Muted>Explore public inventory or manage your property, payments and documents.</Muted></Card>
    </Screen>
  );
}

function ExploreStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Projects">
        {({ navigation }) => (
          <Screen title="Explore">
            {PLATFORM_SEED.projects.filter((p) => p.customerListed).map((p) => (
              <Card key={p.id}>
                <Row title={p.name} meta={p.city} onPress={() => navigation.navigate("ProjectDetail", { projectId: p.id })} />
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
                <Muted>{project.city} Â· public listing</Muted>
                <View style={{ height: 10 }} />
                <Btn label="View plots" onPress={() => navigation.navigate("Plots")} />
              </Card>
            </Screen>
          );
        }}
      </Stack.Screen>
      <Stack.Screen name="Plots">
        {({ navigation }) => (
          <Screen title="Plot availability" onBack={() => navigation.goBack()}>
            <Muted>No other-buyer PII. Detail only for AVAILABLE / RESALE_AVAILABLE.</Muted>
            {PLATFORM_SEED.plots.map((p) => {
              const row = projectPlotForCustomer(p);
              return (
                <Card key={row.id}>
                  <Row
                    title={row.number}
                    meta={row.detailVisible ? `${row.area} sq yd Â· â‚¹${(row.price ?? 0).toLocaleString("en-IN")}` : "Status only"}
                    onPress={() => navigation.navigate("PlotDetail", { plotId: row.id })}
                    right={<Chip label={row.status} />}
                  />
                </Card>
              );
            })}
          </Screen>
        )}
      </Stack.Screen>
      <Stack.Screen name="PlotDetail">
        {({ route, navigation }: any) => {
          const plot = PLATFORM_SEED.plots.find((p) => p.id === route.params.plotId)!;
          const row = projectPlotForCustomer(plot);
          return (
            <Screen title={`Plot ${row.number}`} onBack={() => navigation.goBack()}>
              <Card>
                <Chip label={row.status} />
                <View style={{ height: 8 }} />
                {row.detailVisible ? (
                  <Text>{row.area} sq yd Â· {row.facing} Â· â‚¹{(row.price ?? 0).toLocaleString("en-IN")}</Text>
                ) : (
                  <Muted>Public status only â€” buyer identity and pricing details are hidden.</Muted>
                )}
                <Muted>No other-buyer PII is shown on this screen.</Muted>
              </Card>
            </Screen>
          );
        }}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

function MyPropertyScreen({ session }: { session: Session }) {
  const props = propertiesForCustomer(PLATFORM_SEED, session.customerId);
  const bookings = bookingsForCustomer(PLATFORM_SEED, session.customerId);
  return (
    <Screen title="My Property">
      <Text style={styles.section}>Properties</Text>
      {props.length === 0 ? <Card><Muted>None yet</Muted></Card> : props.map((p) => (
        <Card key={p.id}><Row title={p.number} right={<Chip label={p.status} />} /></Card>
      ))}
      <Text style={styles.section}>Bookings</Text>
      {bookings.map((b) => (
        <Card key={b.id}><Row title={b.id} meta={`â‚¹${b.amount.toLocaleString("en-IN")} Â· ${b.status}`} /></Card>
      ))}
      <Text style={styles.section}>My documents</Text>
      <Card>
        {customerDocuments(PLATFORM_SEED, session.customerId).map((d) => (
          <Row key={d.id} title={d.title} />
        ))}
        <Muted>Entitled documents only â€” project vault excluded.</Muted>
      </Card>
    </Screen>
  );
}

function PaymentsScreen({ session }: { session: Session }) {
  const payments = paymentsForCustomer(PLATFORM_SEED, session.customerId);
  return (
    <Screen title="Payments">
      <Muted>Own finances only</Muted>
      {payments.map((p) => (
        <Card key={p.id}><Row title={p.id} meta={`Due ${p.dueDate}`} right={<Chip label={`â‚¹${p.amount.toLocaleString("en-IN")} Â· ${p.status}`} tone={p.status === "Due" ? "warn" : "ok"} />} /></Card>
      ))}
      <Text style={styles.section}>Payment schedule</Text>
      <Card>
        {payments.map((p) => (
          <Row key={p.id} title={p.dueDate} meta={`â‚¹${p.amount.toLocaleString("en-IN")} Â· ${p.status}`} />
        ))}
      </Card>
      <Text style={styles.section}>Receipts</Text>
      <Card>
        {payments.filter((p) => p.status === "Paid").map((p) => (
          <Row key={p.id} title={`Receipt ${p.id}`} meta={`${p.paidAt} Â· â‚¹${p.amount.toLocaleString("en-IN")}`} />
        ))}
        {payments.filter((p) => p.status === "Paid").length === 0 ? <Muted>No receipts</Muted> : null}
      </Card>
    </Screen>
  );
}

function ProfileScreen({ session, onLogout }: { session: Session; onLogout: () => void }) {
  return (
    <Screen title="Profile">
      <Card>
        <Text style={{ fontWeight: "700" }}>{session.name}</Text>
        <Muted>{session.email}</Muted>
        <Muted>Customer id: {session.customerId}</Muted>
      </Card>
      <Text style={styles.section}>Notifications</Text>
      {customerNotifications(PLATFORM_SEED, session.customerId).map((n) => (
        <Card key={n.id}><Row title={n.title} meta={n.body} /></Card>
      ))}
      <Text style={styles.section}>Support</Text>
      <Card>
        <Muted>Raise a ticket (client-test stub).</Muted>
        <View style={{ height: 8 }} />
        <Btn label="Contact support" onPress={() => {}} />
      </Card>
      <View style={{ height: 12 }} />
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
      <Tab.Screen name="Home">{() => <HomeScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Explore">{() => <ExploreStack />}</Tab.Screen>
      <Tab.Screen name="My Property">{() => <MyPropertyScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Payments">{() => <PaymentsScreen session={session} />}</Tab.Screen>
      <Tab.Screen name="Profile">{() => <ProfileScreen session={session} onLogout={onLogout} />}</Tab.Screen>
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

