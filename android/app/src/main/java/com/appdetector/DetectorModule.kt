package com.appdetector

import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.drawable.BitmapDrawable
import android.util.Base64
import com.facebook.react.bridge.*
import java.io.ByteArrayOutputStream
import java.util.zip.ZipFile
import android.util.Log
import android.content.pm.ApplicationInfo
import org.yaml.snakeyaml.Yaml
import org.json.JSONObject

class DetectorModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "DetectorModule"

    @ReactMethod
    fun getInstalledApps(promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val packages = pm.getInstalledApplications(PackageManager.GET_META_DATA)
            val apps = Arguments.createArray()
            for (app in packages) {
                val appMap = Arguments.createMap()
                appMap.putString("packageName", app.packageName)
                appMap.putString("appName", pm.getApplicationLabel(app).toString())
                val icon = pm.getApplicationIcon(app)
                appMap.putString("icon", drawableToBase64(icon))
                val framework = detectFramework(app)
                Log.d("DetectorModule", "Detected framework for ${app.sourceDir}: $framework")
                appMap.putString("framework", framework)
                appMap.putArray("packages", Arguments.createArray()) // Placeholder
                apps.pushMap(appMap)
            }
            promise.resolve(apps)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    @ReactMethod
    fun getAppPackages(packageName: String, promise: Promise) {
        try {
            val pm = reactApplicationContext.packageManager
            val app = pm.getApplicationInfo(packageName, PackageManager.GET_META_DATA)
            val framework = detectFramework(app)
            val packages = Arguments.createArray()
            when (framework) {
                "Flutter" -> {
                    val pkgs = extractFlutterPackages(app)
                    pkgs.forEach { pkg ->
                        val pkgMap = Arguments.createMap()
                        pkgMap.putString("name", pkg.first)
                        pkgMap.putString("version", pkg.second)
                        packages.pushMap(pkgMap)
                    }
                }
                "React Native" -> {
                    val pkgs = extractReactNativePackages(app)
                    pkgs.forEach { name ->
                        val pkgMap = Arguments.createMap()
                        pkgMap.putString("name", name)
                        packages.pushMap(pkgMap)
                    }
                }
            }
            promise.resolve(packages)
        } catch (e: Exception) {
            promise.reject("ERROR", e)
        }
    }

    private fun drawableToBase64(drawable: android.graphics.drawable.Drawable): String {
        try {
            val bitmap = when (drawable) {
                is android.graphics.drawable.BitmapDrawable -> drawable.bitmap
                is android.graphics.drawable.AdaptiveIconDrawable -> {
                    val size = 108 // reasonable icon size
                    val bitmap = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
                    val canvas = android.graphics.Canvas(bitmap)
                    drawable.setBounds(0, 0, canvas.width, canvas.height)
                    drawable.draw(canvas)
                    bitmap
                }
                else -> return ""
            }
            val stream = ByteArrayOutputStream()
            bitmap.compress(Bitmap.CompressFormat.PNG, 100, stream)
            val bytes = stream.toByteArray()
            return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.DEFAULT)
        } catch (e: Exception) {
            return ""
        }
    }

    private fun detectFramework(app: ApplicationInfo): String {
        val apkPaths = mutableListOf<String>()
        apkPaths.add(app.sourceDir)
        app.splitSourceDirs?.let { apkPaths.addAll(it) }

        for (apkPath in apkPaths) {
            try {
                ZipFile(apkPath).use { zip ->
                    val entries = zip.entries().asSequence().map { it.name }.toList()
                    if (entries.any { it.endsWith("libflutter.so") }) {
                        return "Flutter"
                    }
                    if (entries.any { it.endsWith("libreactnativejni.so") || it.endsWith("index.android.bundle") }) {
                        return "React Native"
                    }
                }
            } catch (e: Exception) {
                Log.e("DetectorModule", "Error reading APK: $apkPath", e)
            }
        }
        return "Unknown"
    }

    private fun extractFlutterPackages(app: ApplicationInfo): List<Pair<String, String?>> {
        val apkPaths = mutableListOf<String>()
        apkPaths.add(app.sourceDir)
        app.splitSourceDirs?.let { apkPaths.addAll(it) }
        val result = mutableMapOf<String, String?>()
        val assetPackages = mutableSetOf<String>()
        val flutterAssetsPackages = mutableSetOf<String>()
        val libPackages = mutableSetOf<String>()
        val metaInfPackages = mutableSetOf<String>()
        val snapshotPackages = mutableSetOf<String>()
        val assetContentPackages = mutableSetOf<String>()
        val snapshotFileNames = setOf(
            "libapp.so", "app.dill", "kernel_blob.bin"
        )
        val packagePattern = Regex("""package:([a-zA-Z0-9_\-]+)/""")
        for (apkPath in apkPaths) {
            try {
                ZipFile(apkPath).use { zip ->
                    // 1. pubspec.lock
                    val entry = zip.getEntry("assets/pubspec.lock")
                    if (entry != null) {
                        val input = zip.getInputStream(entry).bufferedReader().use { it.readText() }
                        val yaml = org.yaml.snakeyaml.Yaml().load<Map<String, Any>>(input)
                        val pkgs = (yaml["packages"] as? Map<String, Map<String, Any>>)
                        if (pkgs != null) {
                            for ((name, info) in pkgs) {
                                val version = info["version"]?.toString()
                                result[name] = version
                            }
                        }
                    }
                    // 2. Scan asset paths for assets/packages/<package_name>/
                    val entries = zip.entries().asSequence().map { it.name }.toList()
                    for (assetPath in entries) {
                        val assetRegex = Regex("""assets/packages/([^/]+)/""")
                        val assetMatch = assetRegex.find(assetPath)
                        if (assetMatch != null) {
                            val pkgName = assetMatch.groupValues[1]
                            assetPackages.add(pkgName)
                        }
                        // 3. Scan for flutter_assets/packages/<package_name>/
                        val flutterAssetsRegex = Regex("""flutter_assets/packages/([^/]+)/""")
                        val flutterAssetsMatch = flutterAssetsRegex.find(assetPath)
                        if (flutterAssetsMatch != null) {
                            val pkgName = flutterAssetsMatch.groupValues[1]
                            flutterAssetsPackages.add(pkgName)
                        }
                        // 4. Scan lib/*.so for lib<package_name>.so
                        val libRegex = Regex("""lib/[^/]+/lib([a-zA-Z0-9_\-]+)\.so""")
                        val libMatch = libRegex.find(assetPath)
                        if (libMatch != null) {
                            val pkgName = libMatch.groupValues[1]
                            libPackages.add(pkgName)
                        }
                        // 5. Scan META-INF/<package_name>.SF
                        val metaInfRegex = Regex("""META-INF/([a-zA-Z0-9_\-]+)\.SF""")
                        val metaInfMatch = metaInfRegex.find(assetPath)
                        if (metaInfMatch != null) {
                            val pkgName = metaInfMatch.groupValues[1]
                            metaInfPackages.add(pkgName)
                        }
                        // 6. Scan Dart snapshot files for package:<name>/
                        val fileName = assetPath.substringAfterLast('/')
                        if (fileName in snapshotFileNames) {
                            try {
                                val snapshotEntry = zip.getEntry(assetPath)
                                if (snapshotEntry != null) {
                                    val content = zip.getInputStream(snapshotEntry).bufferedReader().use { it.readText() }
                                    val matches = packagePattern.findAll(content)
                                    for (match in matches) {
                                        val pkgName = match.groupValues[1]
                                        snapshotPackages.add(pkgName)
                                    }
                                }
                            } catch (_: Exception) { }
                        }
                        // 7. Scan all asset file contents for package:<name>/
                        if (assetPath.startsWith("assets/") || assetPath.startsWith("flutter_assets/")) {
                            try {
                                val assetEntry = zip.getEntry(assetPath)
                                if (assetEntry != null) {
                                    val content = zip.getInputStream(assetEntry).bufferedReader().use { it.readText() }
                                    val matches = packagePattern.findAll(content)
                                    for (match in matches) {
                                        val pkgName = match.groupValues[1]
                                        assetContentPackages.add(pkgName)
                                    }
                                }
                            } catch (_: Exception) { }
                        }
                    }
                }
            } catch (_: Exception) { }
        }
        // Add all found packages not already in result
        val allPackages = assetPackages + flutterAssetsPackages + libPackages + metaInfPackages + snapshotPackages + assetContentPackages
        for (pkg in allPackages) {
            if (!result.containsKey(pkg)) {
                result[pkg] = null
            }
        }
        return result.map { it.key to it.value }
    }

    private fun extractReactNativePackages(app: ApplicationInfo): List<String> {
        val apkPaths = mutableListOf<String>()
        apkPaths.add(app.sourceDir)
        app.splitSourceDirs?.let { apkPaths.addAll(it) }
        val result = mutableSetOf<String>()
        val requireRegex = Regex("""require\(['"]([^'"]+)['"]\)""")
        val importRegex = Regex("""from ['"]([^'"]+)['"]""")
        val metroDefineRegex = Regex("""__d\(['"]([^'"]+)['"]""")
        val atScopedRegex = Regex("""@([a-zA-Z0-9_\-]+)/([a-zA-Z0-9_\-]+)""")
        for (apkPath in apkPaths) {
            try {
                ZipFile(apkPath).use { zip ->
                    val entries = zip.entries().asSequence().map { it.name }.toList()
                    val entry = zip.getEntry("assets/index.android.bundle")
                    if (entry != null) {
                        val input = zip.getInputStream(entry).bufferedReader().use { it.readText() }
                        // require('package')
                        val requireMatches = requireRegex.findAll(input)
                        for (match in requireMatches) {
                            val name = match.groupValues[1]
                            if (!name.startsWith("./") && !name.startsWith("../") && !name.startsWith("/") && !name.startsWith("react-native")) {
                                result.add(name)
                            }
                        }
                        // import ... from 'package'
                        val importMatches = importRegex.findAll(input)
                        for (match in importMatches) {
                            val name = match.groupValues[1]
                            if (!name.startsWith("./") && !name.startsWith("../") && !name.startsWith("/") && !name.startsWith("react-native")) {
                                result.add(name)
                            }
                        }
                        // __d('package-name'...)
                        val metroMatches = metroDefineRegex.findAll(input)
                        for (match in metroMatches) {
                            val name = match.groupValues[1]
                            if (!name.startsWith("./") && !name.startsWith("../") && !name.startsWith("/") && !name.startsWith("react-native")) {
                                result.add(name)
                            }
                        }
                        // @scoped packages
                        val atMatches = atScopedRegex.findAll(input)
                        for (match in atMatches) {
                            val name = "@" + match.groupValues[1] + "/" + match.groupValues[2]
                            result.add(name)
                        }
                    }
                    // Also scan lib/*.so for native modules
                    for (assetPath in entries) {
                        val libRegex = Regex("""lib/[^/]+/lib([a-zA-Z0-9_\-]+)\.so""")
                        val libMatch = libRegex.find(assetPath)
                        if (libMatch != null) {
                            val pkgName = libMatch.groupValues[1]
                            result.add(pkgName)
                        }
                        // Scan META-INF/<package_name>.SF
                        val metaInfRegex = Regex("""META-INF/([a-zA-Z0-9_\-]+)\.SF""")
                        val metaInfMatch = metaInfRegex.find(assetPath)
                        if (metaInfMatch != null) {
                            val pkgName = metaInfMatch.groupValues[1]
                            result.add(pkgName)
                        }
                    }
                }
            } catch (_: Exception) { }
        }
        return result.toList()
    }
} 