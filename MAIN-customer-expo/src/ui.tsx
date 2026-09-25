import React, { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "./theme";

export function Screen({ title, children, onBack }: { title: string; children: ReactNode; onBack?: () => void }) {
  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        {onBack ? (
          <Pressable onPress={onBack} hitSlop={12} style={styles.backBtn}>
            <Text style={styles.backText}>← Back</Text>
          </Pressable>
        ) : <View style={{ width: 64 }} />}
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 64 }} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
    </View>
  );
}

export function Card({ children }: { children: ReactNode }) {
  return <View style={styles.card}>{children}</View>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Chip({ label, tone = "ok" }: { label: string; tone?: "ok" | "warn" | "danger" }) {
  return (
    <View style={[styles.chip, tone === "warn" && styles.chipWarn, tone === "danger" && styles.chipDanger]}>
      <Text style={[styles.chipText, tone === "warn" && { color: colors.warn }, tone === "danger" && { color: colors.danger }]}>{label}</Text>
    </View>
  );
}

export function Btn({ label, onPress, ghost }: { label: string; onPress: () => void; ghost?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.btn, ghost && styles.btnGhost]}>
      <Text style={[styles.btnText, ghost && { color: colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChangeText, secure }: { label: string; value: string; onChangeText: (v: string) => void; secure?: boolean }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={styles.muted}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secure}
        autoCapitalize="none"
        style={styles.input}
      />
    </View>
  );
}

export function Row({ title, meta, onPress, right }: { title: string; meta?: string; onPress?: () => void; right?: ReactNode }) {
  return (
    <Pressable onPress={onPress} style={styles.row} disabled={!onPress}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {meta ? <Text style={styles.muted}>{meta}</Text> : null}
      </View>
      {right}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: colors.line, backgroundColor: colors.card },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink },
  backBtn: { minHeight: 44, justifyContent: "center" },
  backText: { color: colors.primary, fontWeight: "600" },
  body: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.card, borderColor: colors.line, borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 12 },
  muted: { color: colors.muted, fontSize: 13 },
  chip: { alignSelf: "flex-start", backgroundColor: "#ecfdf5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  chipWarn: { backgroundColor: "#fff7ed" },
  chipDanger: { backgroundColor: "#fef2f2" },
  chipText: { color: colors.primary, fontSize: 12, fontWeight: "700" },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, alignItems: "center", minHeight: 48 },
  btnGhost: { backgroundColor: colors.line },
  btnText: { color: "#fff", fontWeight: "700" },
  input: { marginTop: 6, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#fff", fontSize: 16, minHeight: 48 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
});
