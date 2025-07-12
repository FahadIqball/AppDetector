import { useState, useEffect } from 'react';
import { AppInfo } from '../models/AppInfo';
import { getInstalledApps } from '../native/DetectorModule';

export function useAppsViewModel() {
  const [apps, setApps] = useState<AppInfo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadApps = () => {
    setLoading(true);
    return getInstalledApps()
      .then((result: AppInfo[]) => setApps(result))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadApps();
  }, []);

  const reload = () => loadApps();

  return { apps, loading, reload };
} 