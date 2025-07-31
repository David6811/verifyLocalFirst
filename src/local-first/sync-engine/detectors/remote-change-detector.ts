/**
 * Remote Change Detector (Simplified)
 * 
 * Handles real-time change detection using direct imports from local-first-impl.
 * 
 * Key Features:
 * - Real-time subscription management
 * - User-specific change filtering
 * - Automatic reconnection handling
 * - Proper cleanup and resource management
 * - Callback-based event handling
 */

import { supabase } from '../../../local-first-impl/supabase';
import { getCurrentUserLegacy } from '../../../local-first-impl/auth/auth';

/**
 * Remote change payload from Supabase subscriptions
 */
export interface RemoteChangePayload {
  /** Type of database operation */
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  /** Database table name */
  table: string;
  /** Database schema */
  schema?: string;
  /** New data (for INSERT/UPDATE operations) */
  new?: Record<string, any>;
  /** Old data (for UPDATE/DELETE operations) */
  old?: Record<string, any>;
  /** Any errors that occurred */
  errors?: string[];
}

/**
 * Callback function signature for remote change events
 */
export type RemoteChangeCallback = (payload: RemoteChangePayload) => void;

/**
 * Supabase subscription status enum
 */
export enum SubscriptionStatus {
  SUBSCRIBED = 'SUBSCRIBED',
  CHANNEL_ERROR = 'CHANNEL_ERROR',
  CLOSED = 'CLOSED',
  CONNECTING = 'CONNECTING',
  TIMED_OUT = 'TIMED_OUT'
}

/**
 * Remote change detector configuration (simplified)
 */
export interface RemoteChangeDetectorConfig {
  /** Database table/collection to monitor */
  tableName: string;
  /** Callback for remote change events */
  onRemoteChange: RemoteChangeCallback;
  /** Optional: Maximum reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
  /** Optional: Base reconnection delay in ms (default: 1000) */
  baseReconnectDelay?: number;
}

/**
 * Remote Change Detector Class (Simplified)
 * 
 * Monitors real-time database changes using direct Supabase integration.
 * Provides clean callback-based interface for change notifications.
 */
export class RemoteChangeDetector {
  private tableName: string;
  private onRemoteChange: RemoteChangeCallback;
  private maxReconnectAttempts: number;
  private baseReconnectDelay: number;
  
  private realtimeSubscription: any = null;
  private currentUserId: string | null = null;
  private subscriptionStatus: SubscriptionStatus = SubscriptionStatus.CLOSED;
  
  // Performance optimization: Connection resilience
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: RemoteChangeDetectorConfig) {
    this.tableName = config.tableName;
    this.onRemoteChange = config.onRemoteChange;
    this.maxReconnectAttempts = config.maxReconnectAttempts ?? 5;
    this.baseReconnectDelay = config.baseReconnectDelay ?? 1000;
  }

  /**
   * Set up remote change detection using Supabase realtime
   */
  async setupDetection(): Promise<void> {
    try {
      // Get current user ID for filtering
      const user = await getCurrentUserLegacy();
      const newUserId = user?.id || null;
      
      if (!newUserId) {
        console.log('🔍 RemoteChangeDetector: No authenticated user, skipping remote change detection setup');
        return;
      }
      
      // Skip if already subscribed for the same user
      if (this.realtimeSubscription && this.currentUserId === newUserId) {
        console.log('🔍 RemoteChangeDetector: Already subscribed for user:', newUserId);
        return;
      }
      
      this.currentUserId = newUserId;
      console.log('🔍 RemoteChangeDetector: Setting up remote change detection for user:', this.currentUserId);
      
      // Clean up existing subscription
      if (this.realtimeSubscription) {
        await this.cleanupSubscription();
      }
      
      // Subscribe to database table changes using Supabase realtime
      await this.subscribeToChanges();
      
      console.log('✅ RemoteChangeDetector: Remote change detection setup complete');
        
    } catch (error) {
      console.error('❌ RemoteChangeDetector: Failed to set up remote change detection:', error);
      await this.handleConnectionError();
    }
  }
  
  /**
   * Handle connection errors with exponential backoff
   */
  private async handleConnectionError(): Promise<void> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ RemoteChangeDetector: Max reconnection attempts reached, giving up');
      this.subscriptionStatus = SubscriptionStatus.CHANNEL_ERROR;
      return;
    }
    
    const delay = this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;
    
    console.log(`🔄 RemoteChangeDetector: Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.setupDetection();
    }, delay);
  }
  
  /**
   * Reset connection state on successful connection
   */
  private resetConnectionState(): void {
    this.reconnectAttempts = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Subscribe to real-time changes using Supabase
   */
  private async subscribeToChanges(): Promise<void> {
    this.subscriptionStatus = SubscriptionStatus.CONNECTING;
    
    // Enhanced diagnostic logging
    console.log(`[RemoteChangeDetector] Attempting to subscribe for user_id: ${this.currentUserId}`);
    
    if (!this.currentUserId) {
      console.error("[RemoteChangeDetector] CRITICAL: currentUserId is null or undefined. Subscription will fail.");
      return;
    }
    
    const channelName = `entity_changes_${this.currentUserId}`;
    console.log(`[RemoteChangeDetector] Creating channel: ${channelName}`);
    
    // Create subscription using Supabase directly
    this.realtimeSubscription = supabase
      .channel(channelName)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: this.tableName,
          filter: `user_id=eq.${this.currentUserId}`
        }, 
        (payload: any) => {
          // Enhanced payload logging
          const normalizedPayload: RemoteChangePayload = {
            eventType: payload.eventType,
            table: payload.table,
            schema: payload.schema,
            new: payload.new,
            old: payload.old,
            errors: payload.errors
          };
          
          console.log('[RemoteChangeDetector] Received payload:', {
            eventType: normalizedPayload.eventType,
            table: normalizedPayload.table,
            entityId: normalizedPayload.new?.id || normalizedPayload.old?.id,
            timestamp: new Date().toISOString(),
            userId: this.currentUserId,
            fullPayload: normalizedPayload
          });
          
          this.handleRemoteChange(normalizedPayload);
        }
      )
      .subscribe((status: string, err: any) => {
        // Enhanced status change logging with error details
        console.log(`[RemoteChangeDetector] Subscription status changed to: ${status}`, err || '');
        const normalizedStatus = this.mapSupabaseStatusToEnum(status);
        this.handleSubscriptionStatusChange(normalizedStatus, err);
      });
  }
  
  /**
   * Map Supabase status strings to our enum
   */
  private mapSupabaseStatusToEnum(status: string): SubscriptionStatus {
    switch (status) {
      case 'SUBSCRIBED': return SubscriptionStatus.SUBSCRIBED;
      case 'CHANNEL_ERROR': return SubscriptionStatus.CHANNEL_ERROR;
      case 'CLOSED': return SubscriptionStatus.CLOSED;
      case 'CONNECTING': return SubscriptionStatus.CONNECTING;
      case 'TIMED_OUT': return SubscriptionStatus.TIMED_OUT;
      default: return SubscriptionStatus.CLOSED;
    }
  }

  /**
   * Handle subscription status changes
   */
  private handleSubscriptionStatusChange(status: SubscriptionStatus, error?: any): void {
    this.subscriptionStatus = status;
    console.log('🔍 RemoteChangeDetector: Subscription status changed:', status);
    
    if (status === SubscriptionStatus.SUBSCRIBED) {
      console.log('✅ RemoteChangeDetector: Remote change detection subscribed for user:', this.currentUserId);
      console.log(`🔍 RemoteChangeDetector: Listening for changes to ${this.tableName} table with filter: user_id=eq.${this.currentUserId}`);
      this.resetConnectionState(); // Reset reconnection attempts on success
    } else if (status === SubscriptionStatus.CHANNEL_ERROR) {
      console.error('❌ RemoteChangeDetector: Remote change detection subscription failed', error);
      this.handleConnectionError(); // Attempt reconnection on error
    } else if (status === SubscriptionStatus.CLOSED) {
      console.log('🔍 RemoteChangeDetector: Remote change detection subscription closed');
    }
  }

  /**
   * Handle remote database changes
   */
  private handleRemoteChange(payload: RemoteChangePayload): void {
    try {
      console.log('🔍 RemoteChangeDetector: Remote change detected!', {
        eventType: payload.eventType,
        table: payload.table,
        schema: payload.schema,
        entityId: payload.new?.id || payload.old?.id,
        timestamp: new Date().toISOString(),
        userId: this.currentUserId
      });
      
      // Pass change to callback for processing
      this.onRemoteChange(payload);
      
    } catch (error) {
      console.error('❌ RemoteChangeDetector: Error handling remote change:', error);
    }
  }

  /**
   * Clean up subscription
   */
  private async cleanupSubscription(): Promise<void> {
    if (this.realtimeSubscription) {
      console.log('🔍 RemoteChangeDetector: Cleaning up existing subscription');
      await this.realtimeSubscription.unsubscribe();
      this.realtimeSubscription = null;
    }
  }

  /**
   * Clean up remote change detection subscription
   */
  async cleanup(): Promise<void> {
    console.log('🧹 RemoteChangeDetector: Cleaning up remote change detector');
    await this.cleanupSubscription();
    
    // Clean up reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.currentUserId = null;
    this.subscriptionStatus = SubscriptionStatus.CLOSED;
    this.reconnectAttempts = 0;
  }

  /**
   * Refresh remote change detection (called when user signs in/out)
   */
  async refreshDetection(): Promise<void> {
    console.log('🔄 RemoteChangeDetector: Refreshing remote change detection');
    await this.cleanup();
    
    // Always try to set up remote change detection if user is authenticated
    await this.setupDetection();
  }

  /**
   * Check if detector is active
   */
  isActive(): boolean {
    return this.realtimeSubscription !== null && 
           this.subscriptionStatus === SubscriptionStatus.SUBSCRIBED;
  }

  /**
   * Get current subscription status
   */
  getSubscriptionStatus(): SubscriptionStatus {
    return this.subscriptionStatus;
  }

  /**
   * Get current user ID
   */
  getCurrentUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * Check if subscribed for a specific user
   */
  isSubscribedForUser(userId: string): boolean {
    return this.currentUserId === userId && this.isActive();
  }

  /**
   * Force reconnection
   */
  async forceReconnection(): Promise<void> {
    console.log('🔄 RemoteChangeDetector: Forcing reconnection');
    await this.refreshDetection();
  }
}