import { FrameworkType } from './FrameworkType';
import { DetectedPackage } from './DetectedPackage';

export interface AppInfo {
  packageName: string;
  appName: string;
  icon: string; // base64 or URI
  framework: FrameworkType;
  packages: DetectedPackage[];
} 