import React, { useEffect, useState, useRef } from 'react';
import { View, Text, Image, ActivityIndicator, FlatList, StyleSheet, TouchableOpacity, Dimensions, Platform, Modal, Alert, RefreshControl, TextInput, ScrollView, StatusBar } from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, useAnimatedGestureHandler, withTiming } from 'react-native-reanimated';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import * as RNFS from 'react-native-fs';
import Share from 'react-native-share';
import Toast from 'react-native-toast-message';
import { AppInfo } from '../models/AppInfo';
import { DetectedPackage } from '../models/DetectedPackage';
import { getAppPackages } from '../native/DetectorModule';
import { StackScreenProps } from '@react-navigation/stack';
import { RootStackParamList } from './AppNavigator';
import Haptic from 'react-native-haptic-feedback';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;

type Props = StackScreenProps<RootStackParamList, 'AppDetail'>;

export const AppDetailView: React.FC<Props> = ({ route, navigation }) => {
  const { app } = route.params;
  const [packages, setPackages] = useState<DetectedPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showImageModal, setShowImageModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedPackage, setCopiedPackage] = useState<string | null>(null);
  const [copiedPackageName, setCopiedPackageName] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Skeleton loader count
  const SKELETON_COUNT = 12;

  // Animated values for zoom and pan
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  useEffect(() => {
    fetchPackages();
  }, [app.packageName]);

  const fetchPackages = () => {
    setLoading(true);
    getAppPackages(app.packageName)
      .then(pkgs => {
        setPackages(pkgs.slice().sort((a, b) => a.name.localeCompare(b.name)));
      })
      .finally(() => setLoading(false));
  };

  const onRefresh = () => {
    setRefreshing(true);
    Haptic.trigger('impactMedium');
    getAppPackages(app.packageName)
      .then(pkgs => {
        setPackages(pkgs.slice().sort((a, b) => a.name.localeCompare(b.name)));
      })
      .finally(() => setRefreshing(false));
  };

  // Filtered packages by search
  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(search.toLowerCase())
  );

  const saveImageToGallery = async () => {
    if (!app.icon) return;
    
    try {
      setSaving(true);
      
      // Extract base64 data from the URI
      const base64Data = app.icon.replace('data:image/png;base64,', '');
      
      // Create a unique filename
      const fileName = `${app.appName.replace(/[^a-zA-Z0-9]/g, '_')}_icon.png`;
      const filePath = `${RNFS.DocumentDirectoryPath}/${fileName}`;
      
      // Write base64 to file
      await RNFS.writeFile(filePath, base64Data, 'base64');
      
      // Share the file
      await Share.open({
        url: `file://${filePath}`,
        title: `${app.appName} Icon`,
        message: `App icon for ${app.appName}`,
        type: 'image/png',
      });
      
      // Clean up the temporary file
      await RNFS.unlink(filePath);
      
      Alert.alert('Success', 'App icon shared successfully!');
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('Error', 'Failed to save image. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const resetImageTransform = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  };

  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_: any, context: any) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event: any, context: any) => {
      translateX.value = context.startX + event.translationX;
      translateY.value = context.startY + event.translationY;
    },
    onEnd: () => {
      // Add bounds checking if needed
    },
  });

  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: (_: any, context: any) => {
      context.startScale = scale.value;
    },
    onActive: (event: any, context: any) => {
      scale.value = context.startScale * event.scale;
      // Limit scale between 0.5 and 3
      scale.value = Math.max(0.5, Math.min(3, scale.value));
    },
    onEnd: () => {
      // Snap back to 1 if scale is too small
      if (scale.value < 0.8) {
        scale.value = withSpring(1);
      }
    },
  });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const copyPackageName = async () => {
    try {
      await Clipboard.setString(app.packageName);
      setCopiedPackage(app.packageName);
      Haptic.trigger('notificationSuccess');
      Toast.show({
        type: 'success',
        text1: 'Copied!',
        text2: 'Package name copied to clipboard',
        position: 'bottom',
        visibilityTime: 2000,
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedPackage(null);
      }, 2000);
    } catch (error) {
      Haptic.trigger('notificationError');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to copy package name',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  const copyDetectedPackage = async (packageName: string) => {
    try {
      await Clipboard.setString(packageName);
      setCopiedPackageName(packageName);
      Haptic.trigger('notificationSuccess');
      Toast.show({
        type: 'success',
        text1: 'Copied!',
        text2: `Package "${packageName}" copied to clipboard`,
        position: 'bottom',
        visibilityTime: 2000,
      });
      
      // Reset copied state after 2 seconds
      setTimeout(() => {
        setCopiedPackageName(null);
      }, 2000);
    } catch (error) {
      Haptic.trigger('notificationError');
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to copy package name',
        position: 'bottom',
        visibilityTime: 3000,
      });
    }
  };

  const renderHeader = () => (
    <LinearGradient
      colors={["#6a11cb", "#2575fc"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradientHeaderCompact, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonRow}>
          <Ionicons name="chevron-back" size={28} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
      </View>
      {/* Responsive width for the app card */}
      <View style={[styles.appCardCompact, { width: SCREEN_WIDTH * 0.9 }]}> 
        <TouchableOpacity onPress={() => setShowImageModal(true)} style={styles.iconContainerCompact}>
          <Animated.Image
            source={app.icon ? { uri: app.icon } : require('../../assets/placeholder.png')}
            style={styles.iconCompact}
          />
          {/* Removed zoom button overlay, but tap-to-zoom remains */}
        </TouchableOpacity>
        {/* Stack vertically: app name and framework */}
        <View style={styles.appInfoColumn}> 
          <Text style={[styles.appNameCompact, {maxWidth: undefined}]}>{app.appName}</Text>
          <View style={styles.frameworkRowCompact}>
            {app.framework.toLowerCase() === 'flutter' && (
              <Image source={require('../../assets/flutter_logo.png')} style={styles.frameworkLogoInlineCompact} />
            )}
            {app.framework.toLowerCase().includes('react native') && (
              <Image source={require('../../assets/react_native_logo.png')} style={styles.frameworkLogoInlineRNCompact} />
            )}
            <Text style={styles.frameworkCompact}>{app.framework}</Text>
          </View>
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center' }}
        style={{ maxWidth: SCREEN_WIDTH * 0.85, alignSelf: 'center' }}
      >
        <TouchableOpacity onPress={copyPackageName} style={styles.packageNameContainerCompact}>
          <Text style={[styles.packageNameCompact, copiedPackage === app.packageName && styles.packageNameCopiedCompact]} numberOfLines={1} ellipsizeMode="tail">
            {app.packageName}
          </Text>
          <Ionicons 
            name={copiedPackage === app.packageName ? "checkmark-circle" : "copy-outline"} 
            size={14} 
            color={copiedPackage === app.packageName ? "#4CAF50" : "#aaa"} 
            style={styles.copyIconCompact}
          />
        </TouchableOpacity>
      </ScrollView>
      <Text style={styles.sectionTitleCompact}>Packages <Text style={styles.packageCountCompact}>({packages.length})</Text></Text>
    </LinearGradient>
  );

  const renderItem = ({ item, index }: { item: DetectedPackage, index: number }) => (
    <TouchableOpacity 
      onPress={() => copyDetectedPackage(item.name)}
      style={styles.packagePill}
      activeOpacity={0.7}
    >
      <Ionicons name="pricetag-outline" size={20} color="#2575fc" style={{ marginRight: 8 }} />
      <Text style={styles.packageNameText}>{item.name}</Text>
      {item.version && (
        <View style={styles.versionBadge}>
          <Text style={styles.packageVersion}>{item.version}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  // Image zoom modal
  const renderImageModal = () => (
    <Modal
      visible={showImageModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {
        setShowImageModal(false);
        resetImageTransform();
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalHeader}>
          <TouchableOpacity
            onPress={() => {
              setShowImageModal(false);
              resetImageTransform();
            }}
            style={styles.closeButton}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={saveImageToGallery}
            style={styles.saveButton}
            disabled={saving}
          >
            <Ionicons name="download" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.modalContent}>
          <PinchGestureHandler onGestureEvent={pinchGestureHandler}>
            <Animated.View>
              <PanGestureHandler onGestureEvent={panGestureHandler}>
                <Animated.View>
                  <Animated.Image
                    source={app.icon ? { uri: app.icon } : require('../../assets/placeholder.png')}
                    style={[styles.zoomImage, animatedImageStyle]}
                    resizeMode="contain"
                  />
                </Animated.View>
              </PanGestureHandler>
            </Animated.View>
          </PinchGestureHandler>
        </View>
      </View>
    </Modal>
  );

  const renderSkeleton = () => (
    <View style={{ paddingHorizontal: 24, marginTop: 8 }}>
      {[...Array(SKELETON_COUNT)].map((_, idx) => (
        <Animated.View
          key={idx}
          style={{
            height: 44,
            backgroundColor: '#e0e4ea',
            borderRadius: 16,
            marginBottom: 12,
            opacity: 0.7,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
          }}
        >
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: '#d0d4da', marginRight: 12 }} />
          <View style={{ width: 120, height: 16, borderRadius: 8, backgroundColor: '#d0d4da' }} />
        </Animated.View>
      ))}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar backgroundColor="#6a11cb" barStyle="light-content" />
      <FlatList
        data={loading ? [] : filteredPackages}
        keyExtractor={item => item.name + (item.version || '')}
        renderItem={renderItem}
        ListHeaderComponent={
          <>
            {renderHeader()}
            <View style={{ paddingHorizontal: 24, marginBottom: 8 }}>
              <View style={styles.searchContainer}>
                <Ionicons 
                  name="search" 
                  size={20} 
                  color="#aaa" 
                  style={styles.searchIcon}
                />
                <TextInput
                  placeholder="Search packages..."
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                  placeholderTextColor="#aaa"
                  returnKeyType="search"
                />
                {search.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setSearch('')}
                    style={styles.clearButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color="#aaa" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
            {loading && renderSkeleton()}
          </>
        }
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 0 }}
        showsVerticalScrollIndicator={false}
        style={styles.flatList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#2575fc"]}
            tintColor="#2575fc"
          />
        }
        ListEmptyComponent={
          !loading
            ? (
                <View style={styles.emptyStateContainer}>
                  <Ionicons name="cube-outline" size={48} color="#aaa" style={{ marginBottom: 8 }} />
                  <Text style={styles.noPackages}>No packages found or not a Flutter/React Native app.</Text>
                </View>
              )
            : null
        }
      />
      {renderImageModal()}
      <Toast />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f6f8fa',
  },
  flatList: {
    flex: 1,
  },
  gradientHeader: {
    paddingTop: Platform.OS === 'android' ? 36 : 56,
    paddingBottom: 32,
    paddingHorizontal: 0,
    alignItems: 'center',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 8,
    marginBottom: 4,
    marginTop: Platform.OS === 'android' ? 0 : 8,
    minHeight: 40,
  },
  backButtonRow: {
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.15)',
    marginLeft: 8,
    marginTop: 0,
    zIndex: 10,
  },
  appCard: {
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginTop: 12,
    marginBottom: 12,
    width: 280,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    marginBottom: 10,
    backgroundColor: '#e0e0e0',
    borderWidth: 2,
    borderColor: '#f6f8fa',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
  },
  appName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 2,
    color: '#222',
    textAlign: 'center',
  },
  framework: {
    fontSize: 15,
    color: '#2575fc',
    marginBottom: 2,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  packageName: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 0,
    textAlign: 'center',
  },
  packageNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginTop: 4,
  },
  packageNameCopied: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  copyIcon: {
    marginLeft: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 18,
    marginBottom: 8,
    color: '#fff',
    alignSelf: 'flex-start',
    marginLeft: 24,
  },
  packageCount: {
    color: '#fff',
    fontWeight: 'normal',
    fontSize: 15,
  },
  emptyStateContainer: {
    alignItems: 'center',
    marginTop: 24,
  },
  noPackages: {
    color: '#666',
    fontStyle: 'italic',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  packagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 24,
    marginVertical: 6,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 18,
    elevation: 2,
    shadowColor: '#2575fc',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  packageNameText: {
    fontSize: 16,
    color: '#222',
    fontWeight: '600',
    flex: 1,
  },
  versionBadge: {
    backgroundColor: '#eaf1ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  packageVersion: {
    fontSize: 13,
    color: '#2575fc',
    fontWeight: 'bold',
  },
  frameworkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  frameworkLogoInline: {
    width: 16,
    height: 16,
    marginRight: 5,
    resizeMode: 'contain',
  },
  frameworkLogoInlineRN: {
    width: 20,
    height: 20,
    marginRight: 5,
    resizeMode: 'contain',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  iconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalHeader: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  saveButton: {
    backgroundColor: '#2575fc',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  modalContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  zoomImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').width,
    maxWidth: 400,
    maxHeight: 400,
  },
  gradientHeaderCompact: {
    paddingTop: Platform.OS === 'android' ? 18 : 32,
    paddingBottom: 12,
    paddingHorizontal: 0,
    alignItems: 'center',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.10,
    shadowRadius: 4,
  },
  appCardCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 10,
    marginTop: 6,
    marginBottom: 6,
    width: 240,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  iconContainerCompact: {
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCompact: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#f6f8fa',
  },
  iconOverlayCompact: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderRadius: 8,
    padding: 2,
  },
  appInfoRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  appNameCompact: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#222',
    marginRight: 8,
    // maxWidth: 90, // Remove this line to allow full name display
  },
  frameworkLogoInlineCompact: {
    width: 18,
    height: 18,
    marginRight: 4,
    resizeMode: 'contain',
  },
  frameworkLogoInlineRNCompact: {
    width: 18,
    height: 18,
    marginRight: 4,
    resizeMode: 'contain',
  },
  frameworkCompact: {
    fontSize: 12,
    color: '#2575fc',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginRight: 2,
  },
  packageNameContainerCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginBottom: 2,
    backgroundColor: '#f0f2f6',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'center',
    maxWidth: 220,
  },
  packageNameCompact: {
    fontSize: 13,
    color: '#444',
    marginRight: 6,
    maxWidth: 170,
  },
  packageNameCopiedCompact: {
    color: '#2575fc',
    fontWeight: 'bold',
  },
  copyIconCompact: {
    marginLeft: 0,
    marginTop: 1,
  },
  sectionTitleCompact: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
    marginTop: 6,
    marginBottom: 2,
    textAlign: 'center',
  },
  packageCountCompact: {
    fontSize: 14,
    color: '#e0e4ea',
    fontWeight: '400',
  },
  appInfoColumn: {
    flex: 1,
    flexDirection: 'column',
    minWidth: 0,
  },
  frameworkRowCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    minWidth: 0,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 4,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    padding: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 2,
  },
}); 