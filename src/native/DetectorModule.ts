import { NativeModules, Platform } from 'react-native';
import { AppInfo } from '../models/AppInfo';
import { DetectedPackage } from '../models/DetectedPackage';

const LINKING_ERROR =
  `The package 'DetectorModule' doesn't seem to be linked. Make sure:\n` +
  Platform.select({
    ios: "- You have run 'pod install'\n",
    android: "- You have rebuilt the app after installing the package\n",
  }) +
  '- You are not using Expo managed workflow\n';

const DetectorModule = NativeModules.DetectorModule
  ? NativeModules.DetectorModule
  : new Proxy(
      {},
      {
        get() {
          throw new Error(LINKING_ERROR);
        },
      }
    );

export function getInstalledApps(): Promise<AppInfo[]> {
  return DetectorModule.getInstalledApps();
}

export function getAppPackages(packageName: string): Promise<DetectedPackage[]> {
  return DetectorModule.getAppPackages(packageName);
} 