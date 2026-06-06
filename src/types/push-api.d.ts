// Type declarations for Push API
interface ServiceWorkerRegistration {
  readonly pushManager: PushManager;
}

interface PushManager {
  getSubscription(): Promise<PushSubscription | null>;
  subscribe(options?: PushSubscriptionOptionsInit): Promise<PushSubscription>;
}

interface PushSubscriptionOptionsInit {
  userVisibleOnly?: boolean;
  applicationServerKey?: BufferSource | string | null;
}

interface PushSubscription {
  readonly endpoint: string;
  readonly options: PushSubscriptionOptions;
  getKey(name: PushEncryptionKeyName): ArrayBuffer | null;
  toJSON(): PushSubscriptionJSON;
  unsubscribe(): Promise<boolean>;
}

interface PushSubscriptionOptions {
  readonly applicationServerKey: ArrayBuffer | null;
  readonly userVisibleOnly: boolean;
}

interface PushSubscriptionJSON {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: Record<string, string>;
}

type PushEncryptionKeyName = 'p256dh' | 'auth';