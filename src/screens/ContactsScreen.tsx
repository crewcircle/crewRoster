import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  useFocusEffect,
  useNavigation,
  type NavigationProp,
} from "@react-navigation/native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { ContactsStackParamList } from "../navigation/types";
import { Contact } from "../types/contact";
import { colors, spacing, borderRadius, typography, touchTarget, headerColors, shadows } from "../theme";
import { showErrorAlert } from "../utils/errorHandler";
import { exportContactsAsCSV } from "../utils/exportUtils";
import storageUtils from "../utils/storage";

const AVATAR_COLORS = [
  "#2563EB", "#7C3AED", "#DB2777", "#DC2626",
  "#EA580C", "#16A34A", "#0891B2", "#4F46E5",
];

const getAvatarColor = (name: string): string => {
  const charCode = (name || "U").charCodeAt(0);
  return AVATAR_COLORS[charCode % AVATAR_COLORS.length];
};

const getInitials = (name: string): string => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

const ContactAvatar = ({ name }: { name: string }) => (
  <View style={[Styles.avatar, { backgroundColor: getAvatarColor(name) }]}>
    <Text style={Styles.avatarText}>{getInitials(name)}</Text>
  </View>
);

const Separator = () => <View style={Styles.separator} />;

const ContactsScreen = () => {
  const navigation = useNavigation<NavigationProp<ContactsStackParamList>>();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadContacts = useCallback(async () => {
    setLoading(true);
    try {
      const storedContacts = await storageUtils.getContacts();
      setContacts(storedContacts);
    } catch (error) {
      console.warn("Failed to load contacts:", error);
      setContacts([]);
      showErrorAlert(error, "Load contacts");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadContacts();
    }, [loadContacts])
  );

  const handleDeleteContact = useCallback(
    (id: string) => {
      Alert.alert(
        "Delete Contact",
        "Are you sure you want to delete this contact?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Delete",
            style: "destructive",
            onPress: async () => {
              try {
                await storageUtils.deleteContact(id);
                await loadContacts();
              } catch (error) {
                console.warn("Delete error:", error);
                showErrorAlert(error, "Delete contact");
              }
            },
          },
        ]
      );
    },
    [loadContacts]
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadContacts().finally(() => setRefreshing(false));
  }, [loadContacts]);

  const handleExportAllContacts = useCallback(async () => {
    if (contacts.length === 0) {
      Alert.alert("Info", "No contacts to export");
      return;
    }

    try {
      await exportContactsAsCSV(contacts);
      Alert.alert("Success", "All contacts exported as CSV!");
    } catch (error) {
      console.warn("Export error:", error);
      showErrorAlert(error, "Export contacts");
    }
  }, [contacts]);

  const handleManualAdd = useCallback(() => {
    Alert.alert(
      "Manual Add",
      "Manual contact creation is not implemented yet. Use the scanner to add contacts."
    );
  }, []);

  const renderContact = ({ item }: { item: Contact }) => {
    return (
      <TouchableOpacity
        style={Styles.contactCard}
        activeOpacity={0.7}
        onPress={() =>
          navigation.navigate("EditContact", { contactId: item.id })
        }
        testID={`contact-item-${item.id}`}
        accessibilityLabel={`Edit contact ${item.name || 'Unnamed'}`}
        accessibilityRole="button"
      >
        <ContactAvatar name={item.name} />
        <View style={Styles.contactInfo}>
          <Text style={Styles.contactName}>
            {item.name || "Unnamed Contact"}
          </Text>
          {item.company ? (
            <Text style={Styles.contactCompany}>
              {item.company}
            </Text>
          ) : null}
          <View style={Styles.contactDetailsRow}>
            {item.email ? (
              <View style={Styles.contactDetailItem}>
                <MaterialCommunityIcons name="email-outline" size={14} color={colors.textSecondary} />
                <Text style={Styles.contactDetailText} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            ) : null}
            {item.phone ? (
              <View style={Styles.contactDetailItem}>
                <MaterialCommunityIcons name="phone-outline" size={14} color={colors.textSecondary} />
                <Text style={Styles.contactDetailText} numberOfLines={1}>
                  {item.phone}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity
          style={Styles.deleteButton}
          onPress={(event) => {
            event.stopPropagation();
            handleDeleteContact(item.id);
          }}
          testID={`delete-button-${item.id}`}
          accessibilityLabel={`Delete ${item.name || 'contact'}`}
          accessibilityRole="button"
        >
          <MaterialCommunityIcons name="delete-outline" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={Styles.container}>
        <View style={Styles.header}>
          <Text style={Styles.headerTitle}>My Contacts</Text>
          <TouchableOpacity
            style={Styles.headerButton}
            onPress={handleManualAdd}
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
        <View style={Styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={Styles.loadingText}>Loading contacts...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={Styles.container} testID="contacts-screen">
      <View style={Styles.header}>
        <Text style={Styles.headerTitle} testID="header-title">
          My Contacts
        </Text>
        <View style={Styles.headerActions}>
          <TouchableOpacity
            style={Styles.headerButton}
            onPress={handleExportAllContacts}
            testID="export-all-contacts-button"
            accessibilityLabel="Export all contacts"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="file-export" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={Styles.headerButton}
            onPress={handleManualAdd}
            testID="add-contact-button"
            accessibilityLabel="Add contact manually"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item.id}
        renderItem={renderContact}
        ItemSeparatorComponent={Separator}
        contentContainerStyle={Styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            testID="refresh-control"
          />
        }
        testID="contacts-list"
      />

      {contacts.length === 0 ? (
        <View style={Styles.emptyState} testID="empty-state-view">
          <View style={Styles.emptyIconContainer}>
            <MaterialCommunityIcons
              name="account-card-details-outline"
              size={72}
              color={colors.textMuted}
            />
          </View>
          <Text style={Styles.emptyTitle} testID="empty-state-text">
            No contacts yet
          </Text>
          <Text style={Styles.emptySubtitle}>
            Scan a business card to automatically save contact information
          </Text>
          <TouchableOpacity
            style={Styles.emptyCTA}
            onPress={() => navigation.getParent()?.navigate("Scan")}
            testID="empty-state-cta"
            accessibilityLabel="Scan a business card"
          >
            <MaterialCommunityIcons name="scan" size={20} color={colors.onPrimary} />
            <Text style={Styles.emptyCTAText}>Scan a Card</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
};

export default ContactsScreen;

const Styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: headerColors.background,
    ...shadows.sm,
  },
  headerTitle: {
    color: headerColors.text,
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
  },
  headerButton: {
    minWidth: touchTarget.minimum,
    minHeight: touchTarget.minimum,
    alignItems: "center",
    justifyContent: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: spacing.xl,
    flexGrow: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
  },
  contactCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
  },
  contactInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  contactName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  contactCompany: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  contactDetailsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  contactDetailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contactDetailText: {
    fontSize: typography.fontSize.xs,
    color: colors.textSecondary,
    maxWidth: 120,
  },
  deleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xxxl,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: typography.fontSize.md * typography.lineHeight.normal,
    paddingHorizontal: spacing.xl,
  },
  emptyCTA: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    minHeight: touchTarget.minimum,
  },
  emptyCTAText: {
    color: colors.onPrimary,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
});
