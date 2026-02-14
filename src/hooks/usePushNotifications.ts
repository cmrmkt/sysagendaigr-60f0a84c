import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Augment ServiceWorkerRegistration to include pushManager
declare global {
  interface ServiceWorkerRegistration {
    readonly pushManager: PushManager;
  }
}

// VAPID public key - must match the one in Supabase secrets
const VAPID_PUBLIC_KEY = 'BIy9tuCmnoWxgBeabhvF4mJ-sfclx1BxZsjl5MMhvjtxPTXEwEIqI2bwY8wKUwj-U8VzZ2Z7z8FnFeUgbxw6_rM';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permission: PermissionState;
  isSubscribed: boolean;
  isLoading: boolean;
  isSupported: boolean;
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestPermission: () => Promise<PermissionState>;
}

// Convert base64 string to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convert ArrayBuffer to base64url string
function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const [permission, setPermission] = useState<PermissionState>('default');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    'Notification' in window && 
    'serviceWorker' in navigator && 
    'PushManager' in window;

  // Check current permission state
  const checkPermission = useCallback((): PermissionState => {
    if (!isSupported) return 'unsupported';
    return Notification.permission as PermissionState;
  }, [isSupported]);

  // Check if user already has a subscription
  const checkSubscription = useCallback(async () => {
    if (!user || !registration) return false;

    try {
      const subscription = await registration.pushManager.getSubscription();
      if (!subscription) return false;

      // Verify subscription exists in database
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint)
        .single();

      return !error && !!data;
    } catch (error) {
      console.error('Error checking subscription:', error);
      return false;
    }
  }, [user, registration]);

  // Register service worker
  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        console.log('Service Worker registered:', reg);
        setRegistration(reg);
        setPermission(checkPermission());
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        setIsLoading(false);
      }
    };

    registerSW();
  }, [isSupported, checkPermission]);

  // Check subscription status when registration is ready
  useEffect(() => {
    if (!registration || !user) {
      setIsLoading(false);
      return;
    }

    const check = async () => {
      const subscribed = await checkSubscription();
      setIsSubscribed(subscribed);
      setIsLoading(false);
    };

    check();
  }, [registration, user, checkSubscription]);

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<PermissionState> => {
    if (!isSupported) return 'unsupported';

    try {
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      return result as PermissionState;
    } catch (error) {
      console.error('Error requesting permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!isSupported || !registration || !user) {
      console.error('Push notifications not available');
      return false;
    }

    setIsLoading(true);

    try {
      // Request permission if not granted
      let currentPermission = Notification.permission;
      if (currentPermission === 'default') {
        currentPermission = await Notification.requestPermission();
        setPermission(currentPermission as PermissionState);
      }

      if (currentPermission !== 'granted') {
        console.log('Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // Check for existing subscription
      let subscription = await registration.pushManager.getSubscription();

      // If no subscription, create one
      if (!subscription) {
        const applicationServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
        });
      }

      // Extract keys
      const p256dh = subscription.getKey('p256dh');
      const auth = subscription.getKey('auth');

      if (!p256dh || !auth) {
        throw new Error('Failed to get subscription keys');
      }

      // Save to database
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: subscription.endpoint,
          keys_p256dh: arrayBufferToBase64Url(p256dh),
          keys_auth: arrayBufferToBase64Url(auth),
          user_agent: navigator.userAgent,
        },
        {
          onConflict: 'user_id,endpoint',
        }
      );

      if (error) {
        console.error('Error saving subscription:', error);
        throw error;
      }

      setIsSubscribed(true);
      toast.success('Notificações ativadas com sucesso!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      toast.error('Erro ao ativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, registration, user]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!registration || !user) return false;

    setIsLoading(true);

    try {
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from database first
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', user.id)
          .eq('endpoint', subscription.endpoint);

        // Then unsubscribe from push manager
        await subscription.unsubscribe();
      }

      setIsSubscribed(false);
      toast.success('Notificações desativadas');
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push:', error);
      toast.error('Erro ao desativar notificações');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [registration, user]);

  return {
    permission,
    isSubscribed,
    isLoading,
    isSupported,
    subscribe,
    unsubscribe,
    requestPermission,
  };
}
