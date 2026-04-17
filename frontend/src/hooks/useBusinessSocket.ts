import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Nginx /socket.io/ üzerinden backend'e proxy edilir
const SOCKET_URL = window.location.origin;

export interface SlotLockEvent {
  slotUtc: string;
  serviceId: string;
  durationMinutes: number;
}

interface Callbacks {
  onSlotLocked?: (e: SlotLockEvent) => void;
  onSlotUnlocked?: (e: { slotUtc: string; serviceId: string }) => void;
  onNewAppointment?: (appt: any) => void;
}

export function useBusinessSocket(businessId: string | undefined, callbacks: Callbacks) {
  const socketRef = useRef<Socket | null>(null);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!businessId) return;

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('joinBusiness', { businessId }, (ack: any) => {
        console.log('[WS] joinBusiness ack:', ack);
      });
    });

    // Kendi kilitlediğimiz slotu işleme — sadece diğerlerinden gelenleri uygula
    socket.on('slot:locked', (e: SlotLockEvent & { lockedBy: string }) => {
      if (e.lockedBy === socket.id) return;
      cbRef.current.onSlotLocked?.(e);
    });
    socket.on('slot:unlocked', (e: { slotUtc: string; serviceId: string }) => cbRef.current.onSlotUnlocked?.(e));
    socket.on('appointment:new', (appt: any) => cbRef.current.onNewAppointment?.(appt));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [businessId]);

  const lockSlot = useCallback((slotUtc: string, serviceId: string, durationMinutes: number) => {
    return new Promise<{ ok: boolean; reason?: string }>((resolve) => {
      socketRef.current?.emit('slot:lock', { businessId, slotUtc, serviceId, durationMinutes }, (ack: any) => {
        console.log('[WS] slot:lock ack:', ack);
        resolve(ack);
      });
    });
  }, [businessId]);

  const unlockSlot = useCallback((slotUtc: string, serviceId: string) => {
    socketRef.current?.emit('slot:unlock', { businessId, slotUtc, serviceId });
  }, [businessId]);

  return { lockSlot, unlockSlot };
}
