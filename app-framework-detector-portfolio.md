---
title: "App Framework Detector"
summary: "Advanced Android app intelligence tool that detects mobile application frameworks and libraries through deep APK scanning, signature matching, and metadata analysis"
tech: ["React Native", "TypeScript", "Kotlin", "Android", "APK Analysis", "Cross-Platform Mobile"]
github: "https://github.com/FahadIqball/AppFrameworkDetector"
live: "https://appetize.io/app/b_zht6uqrwhetakondaz3ebcj33e"
role: "Full Stack Mobile Developer & Security Researcher"
period: "2024-2025"
layout: "split"
images:
  - "/images/projects/app-framework-detector/hero.png"
---

## Overview

**App Framework Detector** is a sophisticated Android mobile application that enables developers, security researchers, and analysts to identify the underlying mobile development frameworks and third-party libraries integrated within any Android app. Built with React Native for the frontend and Kotlin for native Android capabilities, this tool performs deep analysis of APK packages to extract valuable intelligence about app composition and dependencies.

## The Challenge

Android applications built with obfuscation techniques (ProGuard, R8) remove standard symbol tables and package naming conventions, making direct identification impossible. Detecting specific framework integrations and SDK usage requires:

- **Deep APK scanning** through multiple abstraction layers
- **Pattern matching** across various package structures and asset layouts
- **Metadata extraction** from compiled Dart snapshots, React Native bundles, and native libraries
- **Version identification** from disparate source files and configuration structures

## My Role & Contributions

### 🎯 Full-Stack Architecture Design
- Architected the complete cross-platform solution bridging React Native (TypeScript) frontend with native Kotlin backend
- Designed bridge-based communication protocol between JavaScript and native Android modules using React Native Bridge
- Implemented comprehensive error handling and fallback mechanisms for graceful degradation

### 📊 Core Detection Engine
**Signature-Matching & Analysis System** (`DetectorModule.kt`):
- **Framework Detection Pipeline**: Scans APK archives for framework-specific artifacts
  - Flutter detection via `libflutter.so` and asset structures
  - React Native detection via `libreactnativejni.so` and `index.android.bundle` files
  - Native/Unknown app classification for unidentified frameworks
- **Multi-layered Package Extraction**: Implemented 7-point scanning strategy

**Flutter Package Detection** (149 lines of sophisticated logic):
1. `pubspec.lock` YAML parsing with SnakeYAML library for dependency resolution
2. Asset folder hierarchy scanning (`assets/packages/*`, `flutter_assets/packages/*`)
3. Binary library detection (`.so` files with package name pattern matching)
4. META-INF signature file parsing
5. Dart snapshot binary analysis (`libapp.so`, `app.dill`, `kernel_blob.bin`)
6. Package reference extraction from snapshot content via regex patterns
7. Asset file content scanning for embedded package references

**React Native Package Detection**:
- JavaScript bundle parsing from `index.android.bundle`
- Multiple regex patterns to capture package imports:
  - CommonJS `require()` statements
  - ES6 `import...from` declarations
  - Metro bundler function markers `__d('package'...)`
  - Scoped packages (`@scope/package` format)
- Native module detection via compiled `.so` library scanning
- META-INF signature file analysis

### 🎨 Frontend Implementation
**React Native TypeScript Architecture**:
- **AppNavigator.tsx**: Stack-based navigation with type-safe route parameters
- **AppsListView.tsx** (27KB, 400+ lines): 
  - Infinite scrolling list of installed applications
  - Real-time search/filtering with keyboard awareness
  - Pull-to-refresh gesture handling
  - Haptic feedback integration
  - Performance optimization with skeleton loaders
  - Memory-efficient rendering of 100+ apps
- **AppDetailView.tsx** (23KB, 425+ lines):
  - Advanced image zoom modal with pinch-to-zoom and pan gestures using React Native Reanimated
  - Animated gesture handlers for smooth 60fps interactions
  - Copyable package displays with visual feedback
  - Export/share functionality with file system integration (RNFS)
  - Searchable package list with categorization
  - Responsive design for various Android screen sizes

### 🔧 Technical Implementations

**Type Safety & Data Modeling**:
- TypeScript interfaces for app metadata, detected packages, and framework types
- Strongly-typed ViewModels using React hooks (`useAppsViewModel`)
- Type-safe native module bridge definitions

**UI/UX Features**:
- **Linear Gradient Headers** with animated transitions
- **Icon Extraction & Display**: Base64 encoding of app icons with fallback placeholders
- **Gesture Recognition**: Pinch-to-zoom, pan, and tap interactions
- **Toast Notifications**: User feedback for copy, save, and error operations
- **Search Capabilities**: Real-time filtering across 100+ installed apps
- **Responsive Layout**: Adaptive UI for different screen densities and orientations

**Performance Optimization**:
- Skeleton loading screens for better perceived performance
- Lazy loading of app metadata and package lists
- Efficient list rendering with FlatList optimization
- Platform-specific handling (iOS vs Android)

**Native Integration**:
- React Native Bridge module for Java/Kotlin interoperability
- APK file access via PackageManager and ZipFile APIs
- Drawable-to-Base64 conversion for icon serialization
- Error recovery and defensive programming patterns

### 📦 Technology Stack

**Frontend**:
- React Native 0.80.1 with TypeScript 5.0.4
- React Navigation 7.x for stack-based routing
- React Native Reanimated 3.18 for 60fps animations
- React Native Gesture Handler 2.27 for advanced touch interactions
- React Native Linear Gradient for gradient UI components
- React Native Vector Icons (Ionicons) for consistent iconography
- React Native Clipboard for copy-to-clipboard functionality
- React Native FS for file system operations
- Toast notifications library for user feedback
- Haptic feedback integration for tactile responses

**Backend (Native)**:
- Kotlin with React Native Bridge integration
- SnakeYAML for YAML/pubspec.lock parsing
- JSON object parsing for metadata extraction
- Android PackageManager API for app enumeration
- Java ZipFile API for APK archive reading
- Bitmap & Drawable conversion for icon processing

**Build & Development**:
- Metro bundler for JavaScript compilation
- Babel 7.25+ for syntax transformation
- Jest 29 for unit testing
- ESLint for code quality
- Prettier for code formatting

## Key Features Implemented

### 🚀 Core Capabilities

1. **Instant Framework Detection**
   - Recognizes Flutter, React Native, React, and Native Java/Kotlin apps in seconds
   - Scans 100+ installed applications on-device
   - Provides real-time framework identification with visual indicators

2. **Deep Dependency Fingerprinting**
   - Extracts 50+ package dependencies per app
   - Identifies version information where available
   - Discovers both direct and transitive dependencies
   - Finds obfuscated library references through multi-layer analysis

3. **Comprehensive Metadata Auditing**
   - Extracts application metadata (names, icons, package names)
   - Discovers native library usage and binary modules
   - Parses configuration files and signature manifests
   - Identifies development framework specifics

4. **Advanced UI/Search Capabilities**
   - Searchable app list with real-time filtering
   - Detailed app information views with interactive gestures
   - Package list filtering by name/type
   - Visual framework badges (Flutter, React Native)
   - Copy-to-clipboard for all text elements

5. **User Interaction Features**
   - Pull-to-refresh gesture support
   - Haptic feedback on interactions
   - Toast notifications for actions
   - Image zoom modal with pinch-to-zoom
   - File sharing and gallery integration
   - Responsive design for all Android devices

## Architecture Highlights

### Data Flow
```
Android PackageManager
        ↓
  App Enumeration
        ↓
  Framework Detection (APK scanning)
        ↓
  Package Extraction (7-layer analysis)
        ↓
  React Native Bridge
        ↓
  TypeScript DataModels
        ↓
  React Components (Views)
        ↓
  User Interface
```

### Component Hierarchy
```
App (Root)
├── AppNavigator (Stack Navigation)
│   ├── AppsListView
│   │   └── App Selection
│   └── AppDetailView
│       ├── App Header with Icon
│       ├── Package Search Bar
│       └── Package List (FlatList)
└── Toast (Global Notifications)
```

### Native Module Bridge
```
JavaScript (TypeScript)
        ↓
  React Native Bridge
        ↓
  DetectorModule.kt
        ↓
  PackageManager API + ZipFile API
        ↓
  APK Analysis Engine
```

## Code Statistics

- **Total Files**: 20+ TypeScript/Kotlin source files
- **Frontend Code**: 2,000+ lines of React Native (TypeScript)
- **Backend Code**: 5,000+ lines of Kotlin
- **Configuration**: Gradle, metro, babel, typescript, eslint
- **Dependencies**: 12+ production packages, 15+ dev dependencies

## Challenges Overcome

1. **APK Format Complexity**: Navigated the complexities of DEX files, asset folders, and binary formats within APK archives
2. **Framework Variations**: Handled multiple packaging strategies across Flutter, React Native, and native apps
3. **Performance**: Optimized scanning algorithm to handle 100+ apps without UI blocking
4. **Cross-Platform UI**: Implemented responsive design working across various Android versions and screen sizes
5. **Error Handling**: Built robust error recovery for inaccessible apps and corrupted APK structures
6. **Type Safety**: Established comprehensive TypeScript types bridging JavaScript and native layers

## Learning Outcomes

- Deep expertise in Android APK internals and package structure analysis
- Advanced React Native performance optimization techniques
- Gesture animation implementation using Reanimated library
- Native module development and React Native Bridge integration
- Security research methodologies for app reverse engineering
- Cross-platform mobile architecture design patterns

## Live Demo & Resources

- **Demo**: [Appetize.io Interactive Demo](https://appetize.io/app/b_zht6uqrwhetakondaz3ebcj33e)
- **GitHub**: [FahadIqball/AppFrameworkDetector](https://github.com/FahadIqball/AppFrameworkDetector)
- **Documentation**: Complete README with setup instructions and prerequisites

---

**Skills Demonstrated**: Mobile Development • React Native • TypeScript • Kotlin • Android Development • Reverse Engineering • System Architecture • UI/UX Implementation • Performance Optimization • Cross-Platform Development
