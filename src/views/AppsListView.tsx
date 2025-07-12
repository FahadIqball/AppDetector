import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  SectionList,
  Image,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
  RefreshControl,
  StatusBar,
  KeyboardAvoidingView,
  Modal,
  Keyboard,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, Easing, withDelay } from 'react-native-reanimated';
import { useAppsViewModel } from '../viewmodels/AppsViewModel';
import { AppInfo } from '../models/AppInfo';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from './AppNavigator';
import Haptic from 'react-native-haptic-feedback';

const frameworkColors: Record<string, string[]> = {
  Flutter: ['#42a5f5', '#1976d2'],
  'React Native': ['#61dafb', '#3186d8'],
  React: ['#61dafb', '#00c853'],
  Unknown: ['#bdbdbd', '#bdbdbd'],
};

const frameworkIcons: Record<string, string> = {
  Flutter: 'alpha-f-box',
  'React Native': 'react',
  React: 'react',
  Unknown: 'apps',
};

const categories = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'react-native', label: 'React Native', icon: 'react' },
  { key: 'flutter', label: 'Flutter', icon: 'alpha-f-box' },
];

// AnimatedAppCard component for entrance and press animation
const AnimatedAppCard: React.FC<{
  item: AppInfo;
  index: number;
  onPress: () => void;
  onPressIn: () => void;
  onPressOut: () => void;
  isPressed: boolean;
}> = ({ item, index, onPress, onPressIn, onPressOut, isPressed }) => {
  const entrance = useSharedValue(0);
  React.useEffect(() => {
    entrance.value = withDelay(index * 60, withTiming(1, { duration: 400, easing: Easing.out(Easing.exp) }));
  }, []);
  const entranceStyle = useAnimatedStyle(() => ({
    opacity: entrance.value,
    transform: [
      { translateY: 30 * (1 - entrance.value) },
      { scale: isPressed ? 0.97 : 1 },
    ],
    shadowOpacity: isPressed ? 0.18 : 0.10,
  }));
  return (
    <Animated.View style={[styles.card, entranceStyle]}>
      <TouchableOpacity
        onPress={() => {
          Haptic.trigger('impactMedium');
          onPress();
        }}
        activeOpacity={0.85}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={{ flex: 1 }}
      >
        <View style={styles.cardContent}>
          <Image
            source={item.icon ? { uri: item.icon } : require('../../assets/placeholder.png')}
            style={styles.icon}
          />
          <View style={styles.infoContainer}>
            <Text style={styles.appName}>{item.appName}</Text>
            <Text style={styles.packageName}>{item.packageName}</Text>
            <LinearGradient
              colors={frameworkColors[item.framework] || ['#e6f0ff', '#e6f0ff']}
              style={styles.frameworkPill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Icon name={frameworkIcons[item.framework] || 'apps'} size={15} color="#fff" style={{ marginRight: 5 }} />
              <Text style={styles.frameworkText}>{item.framework}</Text>
            </LinearGradient>
          </View>
          {/* Package count chip */}
          {item.packages && item.packages.length > 0 && (
            <View style={styles.packageCountChip}>
              <Text style={styles.packageCountText}>{item.packages.length} pkgs</Text>
            </View>
          )}
          <Icon name="chevron-right" size={28} color="#e0e0e0" style={styles.arrow} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const AppsListView: React.FC = () => {
  const { apps, loading, reload } = useAppsViewModel();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'AppsList'>>();
  const [pressedIndex, setPressedIndex] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [search, setSearch] = useState('');
  const pillAnim = useSharedValue(0);
  const [refreshing, setRefreshing] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const onKeyboardShow = (e: any) => setKeyboardHeight(e.endCoordinates.height);
    const onKeyboardHide = () => setKeyboardHeight(0);
    const showSub = Keyboard.addListener('keyboardDidShow', onKeyboardShow);
    const hideSub = Keyboard.addListener('keyboardDidHide', onKeyboardHide);
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Haptic.trigger('impactLight');
    reload().finally(() => setRefreshing(false));
  }, [reload]);

  // Filter and group apps
  const filteredApps = useMemo(() => {
    let filtered = apps;
    if (selectedCategory !== 'all') {
      filtered = apps.filter(app =>
        selectedCategory === 'react-native'
          ? app.framework === 'React Native'
          : app.framework === 'Flutter'
      );
    }
    if (search.trim()) {
      filtered = filtered.filter(app =>
        app.appName.toLowerCase().includes(search.toLowerCase()) ||
        app.packageName.toLowerCase().includes(search.toLowerCase())
      );
    }
    return filtered;
  }, [apps, selectedCategory, search]);

  // Group by framework for section headers
  const sections = useMemo(() => {
    const groups: Record<string, AppInfo[]> = {};
    filteredApps.forEach(app => {
      const fw = app.framework || 'Unknown';
      if (!groups[fw]) groups[fw] = [];
      groups[fw].push(app);
    });
    return Object.keys(groups).sort().map(fw => ({
      title: fw,
      data: groups[fw].sort((a, b) => a.appName.localeCompare(b.appName)),
    }));
  }, [filteredApps]);

  // Move renderCategory definition above the loading check
  const renderCategory = (cat: typeof categories[0], idx: number) => {
    const isActive = selectedCategory === cat.key;
    // Give more space to 'React Native', less to 'All', medium to 'Flutter'
    let pillFlex = 1;
    if (cat.key === 'all') pillFlex = 1.0 // Increase from 0.5 to 1.2
    else if (cat.key === 'react-native') pillFlex = 1.4;
    else if (cat.key === 'flutter') pillFlex = 1.0
    return (
      <TouchableOpacity
        key={cat.key}
        style={[styles.categoryTabTouchable, { flex: pillFlex, minWidth: 0, marginHorizontal: 6 }]}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedCategory(cat.key);
          Haptic.trigger('impactLight');
        }}
      >
        {isActive ? (
          <LinearGradient
            colors={["#42a5f5", "#3186d8"]}
            style={styles.categoryTabActive}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.categoryTabContent}>
              <Icon name={cat.icon} size={16} color="#fff" style={styles.categoryTabIcon} />
              <Text
                style={styles.categoryTabTextActiveSmall}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cat.label}
              </Text>
            </View>
          </LinearGradient>
        ) : (
          <View style={styles.categoryTab}>
            <View style={styles.categoryTabContent}>
              <Icon name={cat.icon} size={16} color="#3186d8" style={styles.categoryTabIcon} />
              <Text
                style={styles.categoryTabTextSmall}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {cat.label}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Empty state
  if (loading) {
    return (
      <View style={styles.background}>
        {/* Keep the header during loading */}
        <LinearGradient
          colors={["#42a5f5", "#3186d8"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerRow}>
            <Icon name="apps" size={40} color="#fff" style={styles.appLogo} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>AppDetector</Text>
              <Text style={styles.headerSubtitle}>Detecting frameworks with style!</Text>
            </View>
            {/* App count badge */}
            <View style={styles.appCountBadge}>
              <Text style={styles.appCountText}>{apps.length}</Text>
            </View>
          </View>
        </LinearGradient>
        {/* Search bar (always visible) */}
        <View style={styles.searchBarOuter}>
          <View style={styles.searchBarContainer}>
            <Icon name="magnify" size={22} color="#aaa" style={styles.searchIcon} />
            <TextInput
              style={styles.searchBar}
              placeholder="Search apps..."
              placeholderTextColor="#aaa"
              value={search}
              onChangeText={setSearch}
              editable={false}
            />
          </View>
        </View>
        {/* Category pills */}
        <View style={styles.categoryTabsRow}>
          {categories.map(renderCategory)}
        </View>
        {/* Skeleton loader for app cards */}
        <View style={styles.skeletonContainer}>
          {[1, 2, 3, 4, 5].map((index) => (
            <View key={index} style={styles.skeletonCard}>
              <View style={styles.skeletonIcon} />
              <View style={styles.skeletonContent}>
                <View style={styles.skeletonTitle} />
                <View style={styles.skeletonSubtitle} />
                <View style={styles.skeletonPill} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  }
  // Replace the simple empty state with a more engaging illustration
  if (apps.length === 0) {
    return (
      <View style={styles.background}>
        {/* Keep the header during empty state */}
        <LinearGradient
          colors={["#42a5f5", "#3186d8"]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerRow}>
            <Icon name="apps" size={40} color="#fff" style={styles.appLogo} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>AppDetector</Text>
              <Text style={styles.headerSubtitle}>Detecting frameworks with style!</Text>
            </View>
          </View>
        </LinearGradient>
        
        {/* Empty state illustration */}
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIllustration}>
            <Icon name="magnify" size={80} color="#e0e0e0" style={styles.emptyIcon} />
            <View style={styles.emptyCircle}>
              <Icon name="apps" size={40} color="#e0e0e0" />
            </View>
          </View>
          <Text style={styles.emptyTitle}>No Apps Found</Text>
          <Text style={styles.emptySubtitle}>
            We couldn't detect any apps on your device.{'\n'}
            Try refreshing or check your app permissions.
          </Text>
          <TouchableOpacity style={styles.emptyButton} onPress={onRefresh}>
            <Icon name="refresh" size={20} color="#fff" style={styles.emptyButtonIcon} />
            <Text style={styles.emptyButtonText}>Refresh Apps</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Render app card
  const renderItem = ({ item, index }: { item: AppInfo; index: number }) => (
    <AnimatedAppCard
      item={item}
      index={index}
      isPressed={pressedIndex === index}
      onPress={() => navigation.navigate('AppDetail', { app: item })}
      onPressIn={() => setPressedIndex(index)}
      onPressOut={() => setPressedIndex(null)}
    />
  );

  // Render section header
  const renderSectionHeader = ({ section }: { section: any }) => {
    if (selectedCategory !== 'all') return null;
    return (
      <LinearGradient
        colors={["#42a5f5", "#3186d8"]}
        style={styles.sectionHeader}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        <View style={styles.sectionHeaderContent}>
          <View style={styles.sectionHeaderLeft}>
            <Icon
              name={frameworkIcons[section.title] || 'apps'}
              size={15}
              color="#fff"
              style={styles.sectionHeaderIcon}
            />
            <Text style={styles.sectionHeaderText}>{section.title}</Text>
          </View>
          <Text style={styles.sectionHeaderCount}>{section.data.length}</Text>
        </View>
      </LinearGradient>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <View style={styles.background}>
          <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
          {/* Gradient header with compact horizontal layout */}
          <LinearGradient
            colors={["#42a5f5", "#3186d8"]}
            style={[styles.headerGradient, { paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.headerRow}>
              <Icon name="apps" size={40} color="#fff" style={styles.appLogo} />
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>AppDetector</Text>
                <Text style={styles.headerSubtitle}>Detecting frameworks with style!</Text>
              </View>
              {/* App count badge */}
              <View style={styles.appCountBadge}>
                <Text style={styles.appCountText}>{filteredApps.length}</Text>
              </View>
            </View>
          </LinearGradient>
          {/* Wider search bar, aligned with header */}
          <View style={styles.searchBarOuter}>
            <View style={styles.searchBarContainer}>
              <Icon name="magnify" size={22} color="#aaa" style={styles.searchIcon} />
              <TextInput
                style={styles.searchBar}
                placeholder="Search apps..."
                placeholderTextColor="#aaa"
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearch('')}
                  style={styles.clearButton}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Icon name="close-circle" size={20} color="#aaa" />
                </TouchableOpacity>
              )}
            </View>
          </View>
          {/* Categories pill selector: always visible, evenly spaced, not scrollable */}
          <View style={styles.categoriesRowWrapper}>
            <View style={styles.categoriesRowStatic}>
              {categories.map((cat, idx) => renderCategory(cat, idx))}
            </View>
          </View>
          {/* Sectioned app list with sticky section headers (e.g., 'Flutter') */}
          <SectionList
            sections={sections}
            keyExtractor={item => item.packageName}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={<View style={{ height: 32 }} />}
            ListHeaderComponent={<View style={{ height: 0 }} />}
            stickySectionHeadersEnabled
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#42a5f5"]}
                progressBackgroundColor="#e3f0ff"
              />
            }
          />
        </View>
      </KeyboardAvoidingView>
      {/* Absolutely positioned overlay, always centered on full screen */}
      {!loading && filteredApps.length === 0 && search.trim() !== '' && (
        <View
          pointerEvents="none"
          style={[
            styles.emptyOverlay,
            { backgroundColor: 'transparent' },
          ]}
        >
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <Icon name="magnify" size={80} color="#e0e0e0" style={styles.emptyIcon} />
              <View style={styles.emptyCircle}>
                <Icon name="alert-circle-outline" size={40} color="#e0e0e0" />
              </View>
            </View>
            <Text style={styles.emptyTitle}>No Results</Text>
            <Text style={styles.emptySubtitle}>No apps match your search.</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#f7f8fa',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 36 : 24,
    paddingBottom: 12,
    paddingHorizontal: 18,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appLogo: {
    marginRight: 14,
    marginBottom: 0,
  },
  headerTextContainer: {
    flex: 1,
    flexDirection: 'column',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#e3f0ff',
    marginTop: 2,
    marginBottom: 0,
  },
  searchBarOuter: {
    paddingHorizontal: 18,
    marginTop: 0,
    marginBottom: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    position: 'relative',
    // Make it wider and align with header
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    zIndex: 1,
  },
  searchBar: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRadius: 18,
    paddingLeft: 40,
    paddingRight: 18,
    paddingVertical: 10,
    fontSize: 16,
    color: '#222',
  },
  clearButton: {
    position: 'absolute',
    right: 12,
    zIndex: 2,
    padding: 2,
  },
  categoriesRowWrapper: {
    width: '100%',
    marginBottom: 8, // Add spacing below categories
    paddingHorizontal: 16,
  },
  categoriesRowStatic: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    justifyContent: 'center',
  },
  categoryTabTouchable: {
    flex: 1,
    minWidth: 0,
    alignItems: 'stretch',
    marginHorizontal: 0,
    paddingHorizontal: 0,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f0f4fa',
  },
  categoryTabActive: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 0,
    paddingVertical: 7,
    borderRadius: 16,
    width: '100%',
    alignSelf: 'stretch',
    // Add shadow and glow
    shadowColor: '#42a5f5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1.5,
    borderColor: 'rgba(66,165,245,0.25)',
  },
  categoryTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  categoryTabIcon: {
    marginRight: 6,
  },
  categoryTabText: {
    color: '#3186d8',
    fontWeight: '600',
    fontSize: 15,
  },
  categoryTabTextActive: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  categoryTabTextSmall: {
    color: '#3186d8',
    fontWeight: '600',
    fontSize: 14,
  },
  categoryTabTextActiveSmall: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  list: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    paddingTop: 0,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginRight: 18,
    backgroundColor: '#e0e0e0',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222',
    marginBottom: 2,
  },
  packageName: {
    fontSize: 12,
    color: '#aaa',
    marginTop: 2,
  },
  frameworkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 2,
    marginBottom: 2,
    marginTop: 2,
  },
  frameworkText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  packageCountChip: {
    backgroundColor: '#e3f0ff',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
    alignSelf: 'flex-start',
  },
  packageCountText: {
    color: '#3186d8',
    fontWeight: '600',
    fontSize: 12,
  },
  arrow: {
    marginLeft: 8,
    alignSelf: 'center',
  },
  sectionHeader: {
    width: '100%',
    borderRadius: 16,
    marginTop: 0,
    marginBottom: 8,
    shadowColor: '#42a5f5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 8,
    elevation: 3,
    zIndex: 2,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 18,
    justifyContent: 'space-between',
    width: '100%',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderAccentBar: {
    width: 6,
    height: 22,
    borderRadius: 3,
    backgroundColor: '#fff',
    opacity: 0.25,
    marginRight: 14,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.2,
    textAlign: 'center',
    textShadowColor: 'rgba(50, 100, 200, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sectionHeaderMeta: {
    color: '#e3f0ff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  sectionHeaderIcon: {
    marginRight: 8,
  },
  appMeta: {
    color: '#6a8bb7',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f7f8fa',
  },
  loadingText: {
    marginTop: 12,
    color: '#007bff',
    fontSize: 16,
    fontWeight: '500',
  },
  noAppsText: {
    color: '#888',
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  skeletonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  skeletonIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    marginRight: 18,
    backgroundColor: '#e0e0e0',
    opacity: 0.6,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'center',
  },
  skeletonTitle: {
    height: 20,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '70%',
    opacity: 0.6,
  },
  skeletonSubtitle: {
    height: 14,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    marginBottom: 8,
    width: '50%',
    opacity: 0.4,
  },
  skeletonPill: {
    height: 24,
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    width: '30%',
    opacity: 0.5,
  },
  appCountBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appCountText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionHeaderCount: {
    color: '#e3f0ff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  // Add empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    alignSelf: 'stretch',
    marginTop: 100, // Move the overlay slightly down
  },
  emptyIllustration: {
    position: 'relative',
    marginBottom: 24,
  },
  emptyIcon: {
    opacity: 0.3,
  },
  emptyCircle: {
    position: 'absolute',
    top: 20,
    left: 20,
    backgroundColor: '#f5f5f5',
    borderRadius: 30,
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#42a5f5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#42a5f5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyButtonIcon: {
    marginRight: 8,
  },
  emptyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  // Add emptyOverlay style
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    backgroundColor: 'transparent',
  },
}); 