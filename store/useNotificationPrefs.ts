import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Grouping = 'none' | 'byType' | 'byPriority';

interface NotificationPrefsState {
  mutedTypes: string[];
  grouping: Grouping;
  loading: boolean;
  load: () => Promise<void>;
  toggleMute: (type: string) => Promise<void>;
  setGrouping: (g: Grouping) => Promise<void>;
}

const STORAGE_KEY = 'notification_prefs_v1';

export const useNotificationPrefs = create<NotificationPrefsState>((set, get) => ({
  mutedTypes: [],
  grouping: 'none',
  loading: false,

  load: async () => {
    set({ loading: true });
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        set({ mutedTypes: data.mutedTypes || [], grouping: data.grouping || 'none' });
      }
    } finally {
      set({ loading: false });
    }
  },

  toggleMute: async (type) => {
    const { mutedTypes, grouping } = get();
    const next = mutedTypes.includes(type) ? mutedTypes.filter(t => t !== type) : [...mutedTypes, type];
    set({ mutedTypes: next });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mutedTypes: next, grouping }));
  },

  setGrouping: async (g) => {
    const { mutedTypes } = get();
    set({ grouping: g });
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ mutedTypes, grouping: g }));
  },
}));


