import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import MlkitOcr, { DetectorType } from "rn-mlkit-ocr";
import {
  Camera,
  CameraPermissionStatus,
  useCameraDevice,
} from "react-native-vision-camera";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { Contact, createContact, hasContactDetails } from "../types/contact";
import { DEFAULT_APP_SETTINGS } from "../types/settings";
import { colors, spacing, borderRadius, typography, touchTarget, shadows } from "../theme";
import { showErrorAlert } from "../utils/errorHandler";
import { exportContactAsVCard } from "../utils/exportUtils";
import { parseContactInfo } from "../utils/contactParser";
import storageUtils from "../utils/storage";

const OCR_LANGUAGE_LABELS: Record<string, string> = {
  chi_sim: "Chinese",
  deu: "German",
  eng: "English",
  fra: "French",
  ita: "Italian",
  jap: "Japanese",
  kor: "Korean",
  por: "Portuguese",
  rus: "Russian",
  spa: "Spanish",
};

const resolveDetectorType = (languages: string[]): DetectorType => {
  if (languages.includes("chi_sim")) {
    return "chinese";
  }

  if (languages.includes("jap")) {
    return "japanese";
  }

  if (languages.includes("kor")) {
    return "korean";
  }

  return "latin";
};

const formatLanguageSummary = (languages: string[]): string => {
  if (languages.length === 0) {
    return "English";
  }

  return languages
    .map((language) => OCR_LANGUAGE_LABELS[language] ?? language)
    .join(", ");
};

const ScannerScreen = () => {
  const cameraRef = useRef<Camera>(null);
  const device = useCameraDevice("back");
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState("");
  const [currentContact, setCurrentContact] = useState<Contact | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isCurrentContactSaved, setIsCurrentContactSaved] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<CameraPermissionStatus>("not-determined");
  const [ocrLanguages, setOcrLanguages] = useState(
    DEFAULT_APP_SETTINGS.ocrLanguages
  );
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(
    DEFAULT_APP_SETTINGS.autoSave
  );

  const resetScanState = useCallback(() => {
    setShowResults(false);
    setExtractedText("");
    setCurrentContact(null);
    setCapturedImage(null);
    setIsCurrentContactSaved(false);
  }, []);

  const loadScannerSettings = useCallback(async () => {
    try {
      const [savedLanguages, autoSave] = await Promise.all([
        storageUtils.getOcrLanguages(),
        storageUtils.getAutoSaveEnabled(),
      ]);

      setOcrLanguages(savedLanguages);
      setAutoSaveEnabled(autoSave);
    } catch (error) {
      console.warn("Failed to load scanner settings:", error);
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    try {
      const status = await Camera.requestCameraPermission();
      setPermissionStatus(status);
      return status === "granted";
    } catch (error) {
      console.warn("Camera permission error:", error);
      setPermissionStatus("denied");
      return false;
    }
  }, []);

  const persistContact = useCallback(
    async (contact: Contact, successMessage: string) => {
      await storageUtils.addContact(contact);
      setIsCurrentContactSaved(true);
      Alert.alert("Success", successMessage);
    },
    []
  );

  useEffect(() => {
    requestCameraPermission();
  }, [requestCameraPermission]);

  useFocusEffect(
    useCallback(() => {
      loadScannerSettings();
    }, [loadScannerSettings])
  );

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || !device) {
      return;
    }

    try {
      setIsProcessing(true);

      const photo = await cameraRef.current.takePhoto({
        enableShutterSound: false,
      });
      const imageUri = photo.path.startsWith("file://")
        ? photo.path
        : `file://${photo.path}`;
      const detectorType = resolveDetectorType(ocrLanguages);
      const result = await MlkitOcr.recognizeText(imageUri, detectorType);
      const parsedInfo = parseContactInfo(result.text);
      const nextContact = createContact(parsedInfo);

      setCapturedImage(imageUri);
      setExtractedText(result.text);
      setCurrentContact(nextContact);
      setShowResults(true);
      setIsCurrentContactSaved(false);

      if (autoSaveEnabled && hasContactDetails(nextContact)) {
        await persistContact(nextContact, "Contact auto-saved successfully!");
      }
    } catch (error) {
      console.warn("Capture/OCR Error:", error);
      showErrorAlert(error, "OCR processing");
    } finally {
      setIsProcessing(false);
    }
  }, [autoSaveEnabled, device, ocrLanguages, persistContact]);

  const handleSaveContact = useCallback(async () => {
    if (!currentContact || !hasContactDetails(currentContact)) {
      Alert.alert("Error", "No contact information to save.");
      return;
    }

    if (isCurrentContactSaved) {
      Alert.alert("Info", "This contact is already saved.");
      return;
    }

    try {
      await persistContact(currentContact, "Contact saved successfully!");
    } catch (error) {
      console.warn("Save error:", error);
      showErrorAlert(error, "Save contact");
    }
  }, [currentContact, isCurrentContactSaved, persistContact]);

  const handleExportContact = useCallback(async () => {
    if (!currentContact || !hasContactDetails(currentContact)) {
      Alert.alert("Error", "No contact information to export.");
      return;
    }

    try {
      await exportContactAsVCard(currentContact);
      Alert.alert("Success", "Contact exported as VCard!");
    } catch (error) {
      console.warn("Export error:", error);
      showErrorAlert(error, "Export contact");
    }
  }, [currentContact]);

  if (permissionStatus === "not-determined") {
    return (
      <View style={[Styles.container, Styles.centeredContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={Styles.permissionText}>
          Requesting camera permission...
        </Text>
      </View>
    );
  }

  if (permissionStatus === "denied" || permissionStatus === "restricted") {
    return (
      <View style={Styles.container}>
        <MaterialCommunityIcons name="camera-off" size={64} color={colors.textMuted} />
        <Text style={Styles.permissionText}>
          Camera permission is required to scan business cards.
        </Text>
        <TouchableOpacity
          style={Styles.permissionButton}
          onPress={requestCameraPermission}
          testID="grant-permission-button"
          accessibilityLabel="Grant camera permission"
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="camera" size={20} color={colors.onPrimary} />
          <Text style={Styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={Styles.container}>
        <Text style={Styles.permissionText}>Loading camera...</Text>
      </View>
    );
  }

  return (
    <View style={Styles.container} testID="main-view">
      {!showResults ? (
        <View style={Styles.cameraContainer} testID="camera-view">
          <Camera
            ref={cameraRef}
            style={StyleSheet.absoluteFillObject}
            device={device}
            isActive={true}
            photo={true}
          />
          <View style={Styles.overlay}>
            <View style={Styles.scanFrame}>
              <MaterialCommunityIcons name="scan-helper" size={48} color={colors.onPrimary} />
            </View>
            <Text style={Styles.instructionText}>
              Point camera at business card
            </Text>
            <Text style={Styles.subInstructionText}>
              {formatLanguageSummary(ocrLanguages)} • Auto-save {autoSaveEnabled ? "on" : "off"}
            </Text>
          </View>
          <TouchableOpacity
            style={Styles.captureButton}
            onPress={handleCapture}
            disabled={isProcessing}
            testID="capture-button"
            accessibilityLabel="Capture business card"
            accessibilityRole="button"
          >
            <View style={Styles.captureButtonInner}>
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <MaterialCommunityIcons name="camera" size={28} color={colors.onPrimary} />
              )}
            </View>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={Styles.resultsContainer} testID="results-view">
          {capturedImage ? (
            <Image
              source={{ uri: capturedImage }}
              style={Styles.capturedImage}
            />
          ) : null}

          <View style={Styles.resultsHeader}>
            <Text style={Styles.resultsTitle}>Extracted Information</Text>
            {isCurrentContactSaved ? (
              <View style={Styles.savedBadge}>
                <MaterialCommunityIcons name="check-circle" size={16} color={colors.success} />
                <Text style={Styles.savedBadgeText}>Saved</Text>
              </View>
            ) : null}
          </View>

          <Text style={Styles.resultsText} testID="extracted-text">
            {extractedText}
          </Text>

          <View style={Styles.contactInfoContainer}>
            <View style={Styles.contactInfoRow}>
              <MaterialCommunityIcons name="account" size={18} color={colors.textSecondary} />
              <View style={Styles.contactInfoTextContainer}>
                <Text style={Styles.contactInfoLabel}>Name</Text>
                <Text style={Styles.contactInfoValue}>
                  {currentContact?.name || "Not detected"}
                </Text>
              </View>
            </View>

            <View style={Styles.contactInfoRow}>
              <MaterialCommunityIcons name="email" size={18} color={colors.textSecondary} />
              <View style={Styles.contactInfoTextContainer}>
                <Text style={Styles.contactInfoLabel}>Email</Text>
                <Text style={Styles.contactInfoValue}>
                  {currentContact?.email || "Not detected"}
                </Text>
              </View>
            </View>

            <View style={Styles.contactInfoRow}>
              <MaterialCommunityIcons name="phone" size={18} color={colors.textSecondary} />
              <View style={Styles.contactInfoTextContainer}>
                <Text style={Styles.contactInfoLabel}>Phone</Text>
                <Text style={Styles.contactInfoValue}>
                  {currentContact?.phone || "Not detected"}
                </Text>
              </View>
            </View>

            <View style={Styles.contactInfoRow}>
              <MaterialCommunityIcons name="factory" size={18} color={colors.textSecondary} />
              <View style={Styles.contactInfoTextContainer}>
                <Text style={Styles.contactInfoLabel}>Company</Text>
                <Text style={Styles.contactInfoValue}>
                  {currentContact?.company || "Not detected"}
                </Text>
              </View>
            </View>

            <View style={Styles.contactInfoRow}>
              <MaterialCommunityIcons name="web" size={18} color={colors.textSecondary} />
              <View style={Styles.contactInfoTextContainer}>
                <Text style={Styles.contactInfoLabel}>Website</Text>
                <Text style={Styles.contactInfoValue}>
                  {currentContact?.website || "Not detected"}
                </Text>
              </View>
            </View>
          </View>

          <View style={Styles.buttonContainer}>
            <TouchableOpacity
              style={Styles.resultButton}
              onPress={resetScanState}
              testID="retake-button"
              accessibilityLabel="Retake photo"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="repeat" size={20} color={colors.onPrimary} />
              <Text style={Styles.resultButtonText}>Retake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                Styles.resultButton,
                isCurrentContactSaved ? Styles.resultButtonDisabled : Styles.resultButtonPrimary,
              ]}
              onPress={handleSaveContact}
              disabled={isCurrentContactSaved}
              testID="save-contact-button"
              accessibilityLabel={isCurrentContactSaved ? "Contact already saved" : "Save contact"}
              accessibilityRole="button"
            >
              <MaterialCommunityIcons
                name={isCurrentContactSaved ? "check" : "content-save"}
                size={20}
                color={colors.onPrimary}
              />
              <Text style={Styles.resultButtonText}>
                {isCurrentContactSaved ? "Saved" : "Save"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={Styles.resultButton}
              onPress={handleExportContact}
              testID="export-contact-button"
              accessibilityLabel="Export contact as VCard"
              accessibilityRole="button"
            >
              <MaterialCommunityIcons name="share-variant" size={20} color={colors.onPrimary} />
              <Text style={Styles.resultButtonText}>Export</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  centeredContent: {
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  cameraContainer: {
    flex: 1,
  },
  overlay: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: "center",
    paddingHorizontal: spacing.xxl,
  },
  scanFrame: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  instructionText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  subInstructionText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    textAlign: "center",
  },
  captureButton: {
    position: "absolute",
    bottom: 24,
    alignSelf: "center",
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.onPrimary,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionText: {
    textAlign: "center",
    marginTop: spacing.xxl,
    color: colors.onPrimary,
    fontSize: typography.fontSize.lg,
    paddingHorizontal: spacing.xxxl,
    lineHeight: typography.fontSize.lg * typography.lineHeight.normal,
  },
  permissionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.xxl,
    marginHorizontal: spacing.xxxl,
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.lg,
    backgroundColor: colors.accent,
    borderRadius: borderRadius.xl,
    minHeight: touchTarget.recommended,
  },
  permissionButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  capturedImage: {
    width: "100%",
    height: 200,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  resultsTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  savedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.full,
  },
  savedBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.success,
  },
  resultsText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.muted,
    borderRadius: borderRadius.md,
    lineHeight: typography.fontSize.sm * typography.lineHeight.relaxed,
  },
  contactInfoContainer: {
    marginBottom: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.sm,
  },
  contactInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  contactInfoTextContainer: {
    flex: 1,
  },
  contactInfoLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.textMuted,
    marginBottom: 2,
  },
  contactInfoValue: {
    fontSize: typography.fontSize.md,
    color: colors.textPrimary,
    fontWeight: typography.fontWeight.medium,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  resultButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.secondary,
    minHeight: touchTarget.recommended,
  },
  resultButtonPrimary: {
    backgroundColor: colors.accent,
  },
  resultButtonDisabled: {
    backgroundColor: colors.success,
  },
  resultButtonText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});

export default ScannerScreen;
