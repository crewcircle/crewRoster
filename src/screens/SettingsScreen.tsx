import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import {
  AppSettings,
  DataUsagePreference,
  DEFAULT_APP_SETTINGS,
} from "../types/settings";
import { createContact } from "../types/contact";
import { colors, spacing, borderRadius, typography, touchTarget, shadows } from "../theme";
import { showErrorAlert } from "../utils/errorHandler";
import storageUtils from "../utils/storage";
import { shouldDisableCameraForE2ESync } from "../utils/launchArgs";

const AVAILABLE_LANGUAGES = [
  "eng",
  "spa",
  "fra",
  "deu",
  "ita",
  "por",
  "rus",
  "jap",
  "kor",
  "chi_sim",
];

const LANGUAGE_NAMES: Record<string, string> = {
  eng: "English",
  spa: "Spanish",
  fra: "French",
  deu: "German",
  ita: "Italian",
  por: "Portuguese",
  rus: "Russian",
  jap: "Japanese",
  kor: "Korean",
  chi_sim: "Chinese (Simplified)",
};

const QA_SAMPLE_CONTACTS = [
  createContact(
    {
      name: "Jane Doe",
      email: "jane.doe@example.com",
      phone: "+1 415 555 0101",
      company: "Acme Labs",
      address: "100 Market Street, San Francisco, CA",
      website: "https://acme.example.com",
    },
    {
      id: "qa-contact-jane-doe",
      scannedAt: "2026-03-24T10:00:00.000Z",
    }
  ),
  createContact(
    {
      name: "Carlos Ruiz",
      email: "carlos.ruiz@example.com",
      phone: "+34 91 555 0202",
      company: "Northwind Iberia",
      address: "Gran Via 1, Madrid, Spain",
      website: "https://northwind.example.com",
    },
    {
      id: "qa-contact-carlos-ruiz",
      scannedAt: "2026-03-24T11:00:00.000Z",
    }
  ),
];

const SettingsScreen = () => {
  const [ocrLanguages, setOcrLanguages] = useState<string[]>(
    DEFAULT_APP_SETTINGS.ocrLanguages
  );
  const [autoSave, setAutoSave] = useState(DEFAULT_APP_SETTINGS.autoSave);
  const [notificationEnabled, setNotificationEnabled] = useState(
    DEFAULT_APP_SETTINGS.notificationEnabled
  );
  const [dataUsage, setDataUsage] = useState<DataUsagePreference>(
    DEFAULT_APP_SETTINGS.dataUsage
  );
  const [isLoading, setIsLoading] = useState(true);
  const isE2E = shouldDisableCameraForE2ESync();

  const loadSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const settings = await storageUtils.getAppSettings();

      setOcrLanguages(settings.ocrLanguages);
      setAutoSave(settings.autoSave);
      setNotificationEnabled(settings.notificationEnabled);
      setDataUsage(settings.dataUsage);
    } catch (error) {
      console.warn("Failed to load settings:", error);
      showErrorAlert(error, "Load settings");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const persistSettings = useCallback(
    async (nextSettings: Partial<AppSettings>) => {
      try {
        const updates: Promise<void>[] = [];

        if (nextSettings.ocrLanguages) {
          updates.push(
            storageUtils.saveOcrLanguages(nextSettings.ocrLanguages)
          );
        }

        if (typeof nextSettings.autoSave === "boolean") {
          updates.push(storageUtils.saveAutoSaveEnabled(nextSettings.autoSave));
        }

        if (typeof nextSettings.notificationEnabled === "boolean") {
          updates.push(
            storageUtils.saveNotificationEnabled(
              nextSettings.notificationEnabled
            )
          );
        }

        if (nextSettings.dataUsage) {
          updates.push(
            storageUtils.saveDataUsagePreference(nextSettings.dataUsage)
          );
        }

        await Promise.all(updates);
      } catch (error) {
        console.warn("Failed to persist settings:", error);
        showErrorAlert(error, "Save settings");
        throw error;
      }
    },
    []
  );

  const toggleLanguage = useCallback(
    async (language: string) => {
      const nextLanguages = ocrLanguages.includes(language)
        ? ocrLanguages.filter((currentLanguage) => currentLanguage !== language)
        : [...ocrLanguages, language];

      setOcrLanguages(nextLanguages);

      try {
        await persistSettings({ ocrLanguages: nextLanguages });
      } catch {
        setOcrLanguages(ocrLanguages);
      }
    },
    [ocrLanguages, persistSettings]
  );

  const handleAutoSaveChange = useCallback(
    async (value: boolean) => {
      setAutoSave(value);

      try {
        await persistSettings({ autoSave: value });
      } catch {
        setAutoSave(!value);
      }
    },
    [persistSettings]
  );

  const handleNotificationChange = useCallback(
    async (value: boolean) => {
      setNotificationEnabled(value);

      try {
        await persistSettings({ notificationEnabled: value });
      } catch {
        setNotificationEnabled(!value);
      }
    },
    [persistSettings]
  );

  const handleDataUsageChange = useCallback(
    async (value: DataUsagePreference) => {
      const previousValue = dataUsage;
      setDataUsage(value);

      try {
        await persistSettings({ dataUsage: value });
      } catch {
        setDataUsage(previousValue);
      }
    },
    [dataUsage, persistSettings]
  );

  const handleExportData = useCallback(async () => {
    try {
      const contacts = await storageUtils.getContacts();
      Alert.alert(
        "Export Data",
        `Export currently supports contacts CSV/VCard sharing from the Contacts screen. ${contacts.length} contact(s) available.`
      );
    } catch (error) {
      showErrorAlert(error, "Export data");
    }
  }, []);

  const handleImportData = useCallback(() => {
    Alert.alert(
      "Import Data",
      "Import is not implemented yet. Export support is available from the Contacts screen."
    );
  }, []);

  const handleSeedSampleContacts = useCallback(async () => {
    try {
      await storageUtils.saveContacts(QA_SAMPLE_CONTACTS);
      Alert.alert("Success", "Loaded sample contacts for QA.");
    } catch (error) {
      showErrorAlert(error, "Load QA contacts");
    }
  }, []);

  const handleResetApp = useCallback(() => {
    Alert.alert(
      "Reset App",
      "Are you sure you want to reset all data and settings? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await storageUtils.resetAppData();
              setOcrLanguages(DEFAULT_APP_SETTINGS.ocrLanguages);
              setAutoSave(DEFAULT_APP_SETTINGS.autoSave);
              setNotificationEnabled(DEFAULT_APP_SETTINGS.notificationEnabled);
              setDataUsage(DEFAULT_APP_SETTINGS.dataUsage);
              Alert.alert("Success", "App has been reset to default settings.");
            } catch (error) {
              showErrorAlert(error, "Reset app");
            }
          },
        },
      ]
    );
  }, []);

  if (isLoading) {
    return (
      <View style={Styles.container}>
        <View style={Styles.header} testID="header">
          <Text style={Styles.headerTitle} testID="header-title">
            Settings
          </Text>
        </View>
        <View style={Styles.loadingContainer}>
          <Text style={Styles.loadingText}>Loading settings...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={Styles.container} testID="settings-screen">
      <View style={Styles.header} testID="header">
        <Text style={Styles.headerTitle} testID="header-title">
          Settings
        </Text>
      </View>

      <View style={Styles.section} testID="ocr-settings-section">
        <View style={Styles.sectionHeader}>
          <MaterialCommunityIcons name="text-recognition" size={20} color={colors.accent} />
          <Text style={Styles.sectionTitle} testID="section-title">
            OCR Languages
          </Text>
        </View>
        <Text style={Styles.sectionDescription}>
          Select languages for business card text recognition
        </Text>
        <View style={Styles.languageGrid}>
          {AVAILABLE_LANGUAGES.map((language) => (
            <TouchableOpacity
              key={language}
              style={[
                Styles.languageChip,
                ocrLanguages.includes(language) ? Styles.languageChipSelected : null,
              ]}
              onPress={() => toggleLanguage(language)}
              testID={`language-toggle-${language}`}
              accessibilityLabel={`${ocrLanguages.includes(language) ? "Deselect" : "Select"} ${LANGUAGE_NAMES[language] ?? language}`}
              accessibilityRole="button"
              accessibilityState={{ selected: ocrLanguages.includes(language) }}
            >
              <Text
                style={[
                  Styles.languageChipText,
                  ocrLanguages.includes(language) ? Styles.languageChipTextSelected : null,
                ]}
                testID={`language-text-${language}`}
              >
                {LANGUAGE_NAMES[language] ?? language}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={Styles.section} testID="general-settings-section">
        <View style={Styles.sectionHeader}>
          <MaterialCommunityIcons name="cog" size={20} color={colors.accent} />
          <Text style={Styles.sectionTitle} testID="section-title">
            General
          </Text>
        </View>
        <View style={Styles.settingRow} testID="auto-save-row">
          <View style={Styles.settingTextContainer}>
            <Text style={Styles.settingLabel} testID="setting-label">
              Auto-save Contacts
            </Text>
            <Text style={Styles.settingDescription}>
              Automatically save scanned contacts
            </Text>
          </View>
          <Switch
            value={autoSave}
            onValueChange={handleAutoSaveChange}
            thumbColor={autoSave ? colors.onPrimary : colors.surface}
            trackColor={{ false: colors.border, true: colors.accent }}
            testID="auto-save-switch"
          />
        </View>
        <View style={Styles.settingDivider} />
        <View style={Styles.settingRow} testID="notifications-row">
          <View style={Styles.settingTextContainer}>
            <Text style={Styles.settingLabel} testID="setting-label">
              Notifications
            </Text>
            <Text style={Styles.settingDescription}>
              Receive alerts for contact updates
            </Text>
          </View>
          <Switch
            value={notificationEnabled}
            onValueChange={handleNotificationChange}
            thumbColor={notificationEnabled ? colors.onPrimary : colors.surface}
            trackColor={{ false: colors.border, true: colors.accent }}
            testID="notifications-switch"
          />
        </View>
        <View style={Styles.settingDivider} />
        <View style={Styles.settingRow} testID="data-usage-row">
          <View style={Styles.settingTextContainer}>
            <Text style={Styles.settingLabel} testID="setting-label">
              Data Usage
            </Text>
            <Text style={Styles.settingDescription}>
              Control network usage for OCR
            </Text>
          </View>
          <View style={Styles.dataUsageOptions} testID="data-usage-options">
            <TouchableOpacity
              style={[
                Styles.dataUsageOption,
                dataUsage === "wifi-only" ? Styles.selectedDataUsage : null,
              ]}
              onPress={() => handleDataUsageChange("wifi-only")}
              testID="wifi-only-option"
              accessibilityLabel="Wi-Fi only"
              accessibilityRole="button"
              accessibilityState={{ selected: dataUsage === "wifi-only" }}
            >
              <MaterialCommunityIcons
                name="wifi"
                size={16}
                color={dataUsage === "wifi-only" ? colors.onPrimary : colors.textSecondary}
              />
              <Text
                style={[
                  Styles.dataUsageText,
                  dataUsage === "wifi-only" ? Styles.dataUsageTextSelected : null,
                ]}
                testID="data-usage-text"
              >
                Wi-Fi
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                Styles.dataUsageOption,
                dataUsage === "cellular" ? Styles.selectedDataUsage : null,
              ]}
              onPress={() => handleDataUsageChange("cellular")}
              testID="cellular-option"
              accessibilityLabel="Cellular"
              accessibilityRole="button"
              accessibilityState={{ selected: dataUsage === "cellular" }}
            >
              <MaterialCommunityIcons
                name="signal-cellular-4-bar"
                size={16}
                color={dataUsage === "cellular" ? colors.onPrimary : colors.textSecondary}
              />
              <Text
                style={[
                  Styles.dataUsageText,
                  dataUsage === "cellular" ? Styles.dataUsageTextSelected : null,
                ]}
                testID="data-usage-text"
              >
                All
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={Styles.section} testID="data-management-section">
        <View style={Styles.sectionHeader}>
          <MaterialCommunityIcons name="database" size={20} color={colors.accent} />
          <Text style={Styles.sectionTitle} testID="section-title">
            Data Management
          </Text>
        </View>
        <TouchableOpacity
          style={Styles.managementButton}
          onPress={handleExportData}
          testID="export-data-button"
          accessibilityLabel="Export all data"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="export" size={20} color={colors.accent} />
          <Text style={Styles.managementButtonText} testID="button-text">
            Export Data
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={Styles.settingDivider} />
        <TouchableOpacity
          style={Styles.managementButton}
          onPress={handleImportData}
          testID="import-data-button"
          accessibilityLabel="Import data"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="import" size={20} color={colors.accent} />
          <Text style={Styles.managementButtonText} testID="button-text">
            Import Data
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={Styles.settingDivider} />
        <TouchableOpacity
          style={Styles.managementButton}
          onPress={handleResetApp}
          testID="reset-app-button"
          accessibilityLabel="Reset all app data"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="restart" size={20} color={colors.destructive} />
          <Text style={[Styles.managementButtonText, { color: colors.destructive }]}>
            Reset App
          </Text>
          <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {__DEV__ || isE2E ? (
        <View style={Styles.section} testID="qa-tools-section">
          <View style={Styles.sectionHeader}>
            <MaterialCommunityIcons name="flask" size={20} color={colors.warning} />
            <Text style={Styles.sectionTitle}>QA Tools</Text>
          </View>
          <TouchableOpacity
            style={Styles.managementButton}
            onPress={handleSeedSampleContacts}
            testID="qa-seed-sample-contacts-button"
            accessibilityLabel="Load sample contacts"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="database-plus" size={20} color={colors.warning} />
            <Text style={Styles.managementButtonText}>Load Sample Contacts</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

export default SettingsScreen;

const Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: headerColors.background,
    ...shadows.sm,
  },
  headerTitle: {
    color: headerColors.text,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  section: {
    padding: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  sectionDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  languageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  languageChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    minHeight: touchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  languageChipSelected: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  languageChipText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  languageChipTextSelected: {
    color: colors.onPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    minHeight: touchTarget.recommended,
  },
  settingTextContainer: {
    flex: 1,
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  settingDescription: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  settingDivider: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  dataUsageOptions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dataUsageOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.full,
    minHeight: touchTarget.minimum,
  },
  selectedDataUsage: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dataUsageText: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
  },
  dataUsageTextSelected: {
    color: colors.onPrimary,
  },
  managementButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    minHeight: touchTarget.recommended,
  },
  managementButtonText: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
  },
});
