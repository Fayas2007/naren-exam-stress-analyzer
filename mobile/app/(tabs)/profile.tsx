// mobile/app/(tabs)/profile.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../../src/context/AuthContext';
import { profileApi } from '../../src/api/profileApi';
import { UserProfileStats } from '../../src/types';
import Colors from '../../src/constants/Colors';
import Input from '../../src/components/Input';
import LoadingView from '../../src/components/LoadingView';

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, logout, refreshUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<UserProfileStats | null>(null);

  // Edit Profile Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.full_name || '');
  const [editInstitution, setEditInstitution] = useState(user?.institution || '');
  const [editSaving, setEditSaving] = useState(false);

  // Privacy Info Modal
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await profileApi.getProfile();
      setProfileData(res);
      setEditName(res.profile.full_name);
      setEditInstitution(res.profile.institution || '');
    } catch (e) {
      console.warn('Failed to load profile:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim()) {
      Alert.alert('Error', 'Full name is required.');
      return;
    }

    setEditSaving(true);
    try {
      await profileApi.updateProfile({
        full_name: editName.trim(),
        institution: editInstitution.trim() || undefined,
      });
      await refreshUser();
      await loadProfile();
      setEditModalVisible(false);
      Alert.alert('Success', 'Profile updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setEditSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your account and all associated datasets, analyses, and chats? This action CANNOT be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            try {
              await profileApi.deleteAccount();
              await logout();
              router.replace('/(auth)/login');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete account');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return <LoadingView message="Loading account details..." />;
  }

  const memberSince = profileData?.profile.created_at
    ? new Date(profileData.profile.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'Recent';

  const getUserInitial = () => {
    const name = profileData?.profile.full_name || user?.full_name || user?.email || 'M';
    return name.charAt(0).toUpperCase();
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 16) }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>User Account</Text>
          <Text style={styles.headerSub}>Manage profile and research hub preferences</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{getUserInitial()}</Text>
          </View>
          <Text style={styles.nameText}>{profileData?.profile.full_name || user?.full_name}</Text>
          <Text style={styles.emailText}>{profileData?.profile.email || user?.email}</Text>
          
          <View style={styles.institutionPill}>
            <Feather name="briefcase" size={13} color="#FF6B00" />
            <Text style={styles.institutionText}>
              {profileData?.profile.institution || 'Psychometrics Network'}
            </Text>
          </View>

          <Text style={styles.memberText}>Member since {memberSince}</Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditModalVisible(true)}
            activeOpacity={0.8}
          >
            <Feather name="edit-2" size={14} color="#0B132B" />
            <Text style={styles.editBtnText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Activity Statistics 3-Card Row */}
        <Text style={styles.sectionHeading}>Research Metrics</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#F1F5F9' }]}>
              <Feather name="activity" size={18} color="#0B132B" />
            </View>
            <Text style={styles.statVal}>{profileData?.stats.total_analyses ?? 0}</Text>
            <Text style={styles.statLabel}>Analyses</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#FFEDD5' }]}>
              <Feather name="file-text" size={18} color="#FF6B00" />
            </View>
            <Text style={styles.statVal}>{profileData?.stats.total_datasets ?? 0}</Text>
            <Text style={styles.statLabel}>Datasets</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconCircle, { backgroundColor: '#DCFCE7' }]}>
              <Feather name="cpu" size={18} color="#16A34A" />
            </View>
            <Text style={styles.statVal}>{profileData?.stats.total_chat_sessions ?? 0}</Text>
            <Text style={styles.statLabel}>AI Sessions</Text>
          </View>
        </View>

        {/* Preferences Menu */}
        <Text style={styles.sectionHeading}>Preferences & Protocol</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => setPrivacyModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F1F5F9' }]}>
              <Feather name="shield" size={18} color="#0B132B" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Privacy & Methodology</Text>
              <Text style={styles.menuSub}>R statistical calculation governance</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              Alert.alert(
                'Language Selection',
                'Currently, English (en) is standard. Multilingual statistical reporting will be available in future releases.'
              )
            }
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Feather name="globe" size={18} color="#2563EB" />
            </View>
            <View style={styles.menuTextWrapper}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuSub}>English (US)</Text>
            </View>
            <Feather name="chevron-right" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Account Actions */}
        <Text style={styles.sectionHeading}>Account Actions</Text>
        <View style={styles.actionsList}>
          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Feather name="log-out" size={16} color="#0B132B" />
            <Text style={styles.signOutBtnText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteAccountBtn}
            onPress={handleDeleteAccount}
            activeOpacity={0.8}
          >
            <Feather name="trash-2" size={16} color="#EF4444" />
            <Text style={styles.deleteAccountBtnText}>Delete Account & Stored Data</Text>
          </TouchableOpacity>
        </View>

        {/* Edit Profile Modal */}
        <Modal visible={editModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <Input
                label="Full Name"
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
              />

              <Input
                label="Institution / Hub"
                value={editInstitution}
                onChangeText={setEditInstitution}
                placeholder="e.g. Stanford Medical Network"
              />

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleUpdateProfile}
                  disabled={editSaving}
                >
                  <Text style={styles.modalSaveBtnText}>
                    {editSaving ? 'Saving...' : 'Save Changes'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Privacy Notice Modal */}
        <Modal visible={privacyModalVisible} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Privacy & Methodology</Text>
                <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                  <Feather name="x" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <ScrollView style={{ maxHeight: 360 }}>
                <Text style={styles.privacyBody}>
                  <Text style={{ fontWeight: '800', color: '#0B132B' }}>1. Data Confidentiality & Scope:{'\n'}</Text>
                  Uploaded survey datasets and documents are processed directly by the R analytical backend and stored in Neon PostgreSQL under authenticated user ownership.{'\n\n'}
                  <Text style={{ fontWeight: '800', color: '#0B132B' }}>2. Statistical Nature:{'\n'}</Text>
                  All calculations (descriptive distributions, Pearson correlation matrices, and ANOVA group comparisons) are deterministic outputs generated by R libraries.{'\n\n'}
                  <Text style={{ fontWeight: '800', color: '#0B132B' }}>3. Non-Clinical Disclaimer:{'\n'}</Text>
                  Exam Stress Analyzer is a scientific tool for survey analysis. Scores reflect questionnaire metrics and do not constitute clinical or psychiatric diagnoses.
                </Text>
              </ScrollView>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={() => setPrivacyModalVisible(false)}
              >
                <Text style={styles.modalSaveBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F9',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 110, // Safe padding for floating tab bar
  },
  header: {
    marginBottom: 16,
    marginTop: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0B132B',
  },
  headerSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#0B132B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  nameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emailText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  institutionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  institutionText: {
    fontSize: 12,
    color: '#C2410C',
    fontWeight: '700',
  },
  memberText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 8,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginTop: 14,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B132B',
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  statIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  statLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '600',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 14,
  },
  menuIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextWrapper: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  menuSub: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  actionsList: {
    gap: 10,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  signOutBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B132B',
  },
  deleteAccountBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  deleteAccountBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 19, 43, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0B132B',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  modalSaveBtn: {
    flex: 1,
    backgroundColor: '#0B132B',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  privacyBody: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
  },
});

