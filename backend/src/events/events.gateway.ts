import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../config/redis.module';
import { Business } from '../database/entities/business.entity';

const LOCK_TTL_SECONDS = 180;
const MAX_LOCKS_PER_SOCKET = 1;
const RATE_LIMIT_PER_MINUTE = 30;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

function isUUID(v: unknown): v is string { return typeof v === 'string' && UUID_RE.test(v); }
function isISOUtc(v: unknown): v is string { return typeof v === 'string' && ISO_UTC_RE.test(v); }

@WebSocketGateway({
  cors: {
    origin: (origin: string, cb: (err: Error | null, allow?: boolean) => void) => {
      const appUrl = process.env.APP_URL ?? 'http://localhost';
      // Origin yoksa (server-side tools) veya izin verilen origin ise geçir
      if (!origin || origin === appUrl || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`WebSocket CORS blocked: ${origin}`), false);
      }
    },
    credentials: false,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  private socketMeta = new Map<string, {
    businessId: string;
    slots: string[];
    eventCount: number;
    windowStart: number;
  }>();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectRepository(Business) private readonly businessRepo: Repository<Business>,
  ) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Connect: ${client.id} origin=${client.handshake.headers.origin ?? 'none'}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.debug(`Disconnect: ${client.id}`);
    const meta = this.socketMeta.get(client.id);
    if (!meta) return;
    for (const key of meta.slots) {
      const locker = await this.redis.get(key);
      if (locker === client.id) {
        await this.redis.del(key);
        const [, businessId, slotUtc, serviceId] = key.split('::');
        this.server.to(`biz:${businessId}`).emit('slot:unlocked', { slotUtc, serviceId });
      }
    }
    this.socketMeta.delete(client.id);
  }

  private checkRateLimit(socketId: string): boolean {
    const meta = this.socketMeta.get(socketId);
    if (!meta) return false;
    const now = Date.now();
    if (now - meta.windowStart > 60_000) {
      meta.eventCount = 1;
      meta.windowStart = now;
      return true;
    }
    meta.eventCount += 1;
    return meta.eventCount <= RATE_LIMIT_PER_MINUTE;
  }

  @SubscribeMessage('joinBusiness')
  async handleJoinBusiness(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    if (!data || typeof data !== 'object' || !isUUID((data as any).businessId)) {
      client.disconnect();
      return { ok: false, reason: 'invalid_input' };
    }
    const { businessId } = data as { businessId: string };

    const existingMeta = this.socketMeta.get(client.id);
    if (existingMeta) {
      if (existingMeta.businessId !== businessId) {
        this.logger.warn(`Room hop attempt: ${client.id}`);
        return { ok: false, reason: 'room_hop_not_allowed' };
      }
      client.join(`biz:${businessId}`);
      return { ok: true };
    }

    const exists = await this.businessRepo.findOne({
      where: { id: businessId, is_active: true },
      select: ['id'],
    });
    if (!exists) {
      client.disconnect();
      return { ok: false, reason: 'business_not_found' };
    }

    client.join(`biz:${businessId}`);
    this.socketMeta.set(client.id, { businessId, slots: [], eventCount: 0, windowStart: Date.now() });
    this.logger.log(`joinBusiness: ${client.id} → biz=${businessId}`);
    return { ok: true };
  }

  @SubscribeMessage('slot:lock')
  async handleSlotLock(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    if (!this.checkRateLimit(client.id)) return { ok: false, reason: 'rate_limited' };

    const d = data as any;
    if (
      !data || typeof data !== 'object' ||
      !isUUID(d?.businessId) || !isISOUtc(d?.slotUtc) ||
      !isUUID(d?.serviceId) ||
      typeof d?.durationMinutes !== 'number' || d.durationMinutes < 1 || d.durationMinutes > 480
    ) {
      return { ok: false, reason: 'invalid_input' };
    }

    const { businessId, slotUtc, serviceId, durationMinutes } = d as {
      businessId: string; slotUtc: string; serviceId: string; durationMinutes: number;
    };

    const meta = this.socketMeta.get(client.id);
    if (!meta || meta.businessId !== businessId) return { ok: false, reason: 'forbidden' };
    if (new Date(slotUtc) < new Date()) return { ok: false, reason: 'slot_in_past' };

    for (const existingKey of [...meta.slots]) {
      const locker = await this.redis.get(existingKey);
      if (locker === client.id) {
        await this.redis.del(existingKey);
        const [, bid, oldSlot, oldSvc] = existingKey.split('::');
        this.server.to(`biz:${bid}`).emit('slot:unlocked', { slotUtc: oldSlot, serviceId: oldSvc });
      }
    }
    meta.slots = [];

    if (meta.slots.length >= MAX_LOCKS_PER_SOCKET) return { ok: false, reason: 'lock_limit_exceeded' };

    const key = `slotlock::${businessId}::${slotUtc}::${serviceId}`;
    const existing = await this.redis.get(key);
    if (existing && existing !== client.id) return { ok: false, reason: 'already_locked' };

    await this.redis.set(key, client.id, 'EX', LOCK_TTL_SECONDS);
    meta.slots.push(key);

    this.server.to(`biz:${businessId}`).emit('slot:locked', { slotUtc, serviceId, durationMinutes, lockedBy: client.id });
    return { ok: true };
  }

  @SubscribeMessage('slot:unlock')
  async handleSlotUnlock(@MessageBody() data: unknown, @ConnectedSocket() client: Socket) {
    if (!this.checkRateLimit(client.id)) return { ok: false, reason: 'rate_limited' };
    if (
      !data || typeof data !== 'object' ||
      !isUUID((data as any).businessId) ||
      !isISOUtc((data as any).slotUtc) ||
      !isUUID((data as any).serviceId)
    ) return { ok: false, reason: 'invalid_input' };

    const { businessId, slotUtc, serviceId } = data as { businessId: string; slotUtc: string; serviceId: string; };
    const meta = this.socketMeta.get(client.id);
    if (!meta || meta.businessId !== businessId) return { ok: false, reason: 'forbidden' };

    const key = `slotlock::${businessId}::${slotUtc}::${serviceId}`;
    const locker = await this.redis.get(key);
    if (locker === client.id) {
      await this.redis.del(key);
      this.server.to(`biz:${businessId}`).emit('slot:unlocked', { slotUtc, serviceId });
    }
    meta.slots = meta.slots.filter(s => s !== key);
    return { ok: true };
  }

  broadcastNewAppointment(businessId: string, appointment: any) {
    this.server.to(`biz:${businessId}`).emit('appointment:new', appointment);
  }

  async isSlotLocked(businessId: string, slotUtc: string, serviceId: string): Promise<boolean> {
    const key = `slotlock::${businessId}::${slotUtc}::${serviceId}`;
    return !!(await this.redis.get(key));
  }
}
