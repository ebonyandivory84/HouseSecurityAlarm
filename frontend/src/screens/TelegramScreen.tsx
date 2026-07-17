import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { GlassCard } from "@/components/ui/GlassCard";
import { useTelegramTemplates } from "@/hooks/useTelegramTemplates";
import { palette, radius, spacing } from "@/theme/palette";
import { createDefaultTelegramTemplate, type TelegramTemplate } from "@/types/telegram";

export function TelegramScreen(): React.JSX.Element {
  const { templates, isLoading, error, save, testSend } = useTelegramTemplates();
  const [draft, setDraft] = useState<TelegramTemplate[]>(templates);
  const [newId, setNewId] = useState("");
  const [saving, setSaving] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  useEffect(() => {
    setDraft(templates);
  }, [templates]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={palette.accent} />
      </View>
    );
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(templates);

  function updateRow(index: number, patch: Partial<TelegramTemplate>): void {
    setDraft((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function removeRow(index: number): void {
    setDraft((prev) => prev.filter((_, i) => i !== index));
  }

  function addRow(): void {
    const id = newId.trim();
    if (!id) return;
    setDraft((prev) => [...prev, createDefaultTelegramTemplate(id)]);
    setNewId("");
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    try {
      await save(draft);
    } finally {
      setSaving(false);
    }
  }

  async function handleTestSend(templateId: string): Promise<void> {
    setSendingId(templateId);
    try {
      await testSend(templateId);
    } finally {
      setSendingId(null);
    }
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {draft.length === 0 ? (
          <GlassCard style={styles.card}>
            <Text style={styles.hint}>Keine Telegram-Vorlagen konfiguriert. Unten eine hinzufügen.</Text>
          </GlassCard>
        ) : null}

        {draft.map((template, index) => (
          <GlassCard key={`${template.id}-${index}`} style={styles.card}>
            <View style={styles.rowHeader}>
              <Text style={styles.idText}>{template.id}</Text>
              <Pressable onPress={() => removeRow(index)} style={styles.deleteButton}>
                <Text style={styles.deleteLabel}>Entfernen</Text>
              </Pressable>
            </View>

            <Text style={styles.fieldLabel}>Trigger-Datenpunkt</Text>
            <TextInput
              value={template.triggerId}
              onChangeText={(text) => updateRow(index, { triggerId: text })}
              placeholder="Datenpunkt-ID, die diese Vorlage auslöst"
              placeholderTextColor={palette.textSecondary}
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>Nachrichtentext</Text>
            <TextInput
              value={template.messageText}
              onChangeText={(text) => updateRow(index, { messageText: text })}
              placeholder="Text mit Platzhaltern wie {reason}"
              placeholderTextColor={palette.textSecondary}
              style={[styles.input, styles.multiline]}
              multiline
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Snapshot anhängen</Text>
              <Switch
                value={template.includeSnapshot}
                onValueChange={(value) => updateRow(index, { includeSnapshot: value })}
                trackColor={{ true: palette.accent, false: palette.zoneOff }}
              />
            </View>

            {template.includeSnapshot ? (
              <>
                <Text style={styles.fieldLabel}>Kamera-Datenpunkt für Snapshot</Text>
                <TextInput
                  value={template.snapshotCameraId ?? ""}
                  onChangeText={(text) => updateRow(index, { snapshotCameraId: text || undefined })}
                  placeholder="Kamera-ID"
                  placeholderTextColor={palette.textSecondary}
                  style={styles.input}
                />
                <Text style={styles.fieldLabel}>Bildunterschrift (optional)</Text>
                <TextInput
                  value={template.caption ?? ""}
                  onChangeText={(text) => updateRow(index, { caption: text || undefined })}
                  placeholder="Bildunterschrift"
                  placeholderTextColor={palette.textSecondary}
                  style={styles.input}
                />
              </>
            ) : null}

            <Pressable
              onPress={() => void handleTestSend(template.id)}
              disabled={sendingId === template.id}
              style={({ pressed }) => [
                styles.testButton,
                { opacity: sendingId === template.id ? 0.4 : pressed ? 0.7 : 1 },
              ]}
            >
              <Text style={styles.testLabel}>
                {sendingId === template.id ? "Sendet…" : "Test senden"}
              </Text>
            </Pressable>
          </GlassCard>
        ))}

        <GlassCard style={styles.card}>
          <Text style={styles.fieldLabel}>Neue Vorlage hinzufügen</Text>
          <TextInput
            value={newId}
            onChangeText={setNewId}
            placeholder="Vorlagen-ID (z.B. tuer-offen)"
            placeholderTextColor={palette.textSecondary}
            style={styles.input}
          />
          <Pressable onPress={addRow} style={styles.addButton}>
            <Text style={styles.addLabel}>Hinzufügen</Text>
          </Pressable>
        </GlassCard>

        <Pressable
          onPress={() => void handleSave()}
          disabled={!dirty || saving}
          style={({ pressed }) => [styles.saveButton, { opacity: !dirty || saving ? 0.4 : pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.saveLabel}>{saving ? "Speichert…" : "Änderungen speichern"}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: palette.background },
  loading: { flex: 1, backgroundColor: palette.background, alignItems: "center", justifyContent: "center" },
  error: { color: palette.danger, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.md },
  card: { gap: spacing.sm },
  hint: { color: palette.textSecondary, fontSize: 14 },
  rowHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  idText: { color: palette.textPrimary, fontSize: 14, fontWeight: "700" },
  deleteButton: { paddingVertical: 2 },
  deleteLabel: { color: palette.danger, fontSize: 12, fontWeight: "600" },
  fieldLabel: { color: palette.textSecondary, fontSize: 12, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: palette.glassBorder,
    borderRadius: radius.chip,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    color: palette.textPrimary,
    fontSize: 14,
  },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  switchLabel: { color: palette.textSecondary, fontSize: 13 },
  testButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: palette.accent,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  testLabel: { color: palette.accent, fontSize: 13, fontWeight: "700" },
  addButton: {
    paddingVertical: spacing.sm,
    borderRadius: radius.chip,
    borderWidth: 2,
    borderColor: palette.accent,
    alignItems: "center",
  },
  addLabel: { color: palette.accent, fontSize: 14, fontWeight: "700" },
  saveButton: {
    paddingVertical: spacing.md,
    borderRadius: radius.chip,
    backgroundColor: palette.accent,
    alignItems: "center",
  },
  saveLabel: { color: palette.background, fontSize: 15, fontWeight: "700" },
});
