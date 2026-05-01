import { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface NotificationItem {
  id: string;
  customerName: string;
  serviceName: string;
  staffName: string;
  startAt: string;
  createdAt: string;
  status: 'pending' | 'approved';
  read: boolean;
}

const MAX = 5;
const storageKey = (bId: string) => `notif_bell:${bId}`;

function load(businessId: string): NotificationItem[] {
  try {
    const raw = localStorage.getItem(storageKey(businessId));
    return raw ? (JSON.parse(raw) as NotificationItem[]) : [];
  } catch {
    return [];
  }
}

function save(businessId: string, items: NotificationItem[]) {
  try {
    localStorage.setItem(storageKey(businessId), JSON.stringify(items));
  } catch {}
}

export function useAppointmentNotifications(
  businessId: string | null | undefined,
  onNewAppointment?: (appt: any) => void,
) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const bIdRef = useRef(businessId);
  bIdRef.current = businessId;
  const onNewApptRef = useRef(onNewAppointment);
  onNewApptRef.current = onNewAppointment;

  useEffect(() => {
    if (!businessId) { setNotifications([]); return; }
    setNotifications(load(businessId));
  }, [businessId]);

  const addNotification = useCallback((appt: any) => {
    const bId = bIdRef.current;
    if (!bId) return;

    const item: NotificationItem = {
      id: appt.id,
      customerName: appt.customer_name ?? '',
      serviceName: appt.service?.name ?? '',
      staffName: appt.staff?.full_name ?? '',
      startAt: appt.start_at,
      createdAt: new Date().toISOString(),
      status: appt.status === 'pending' ? 'pending' : 'approved',
      read: false,
    };

    setNotifications((prev) => {
      const deduped = prev.filter((n) => n.id !== item.id);
      const next = [item, ...deduped].slice(0, MAX);
      save(bId, next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    const bId = bIdRef.current;
    if (!bId) return;
    setNotifications((prev) => {
      const next = prev.map((n) => ({ ...n, read: true }));
      save(bId, next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!businessId) return;

    const socket: Socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      socket.emit('joinBusiness', { businessId });
    });

    socket.on('appointment:new', (appt: any) => {
      addNotification(appt);
      onNewApptRef.current?.(appt);
    });

    return () => {
      socket.disconnect();
    };
  }, [businessId, addNotification]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markAllRead };
}
