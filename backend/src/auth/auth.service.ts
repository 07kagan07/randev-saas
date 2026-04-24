import {
  Injectable, BadRequestException, ForbiddenException,
  UnauthorizedException, Inject, ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { User, UserRole } from '../database/entities/user.entity';
import { Business } from '../database/entities/business.entity';
import { NotificationSettings } from '../database/entities/notification-settings.entity';
import { WorkingHours } from '../database/entities/working-hours.entity';
import { REDIS_CLIENT } from '../config/redis.module';
import { slugify } from '../common/utils/slugify';
import { SmsService } from '../notifications/sms/sms.service';
import { RegisterBusinessDto } from './dto/register-business.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
    @InjectRepository(NotificationSettings)
    private readonly notifRepo: Repository<NotificationSettings>,
    @InjectRepository(WorkingHours)
    private readonly workingHoursRepo: Repository<WorkingHours>,
    @Inject(REDIS_CLIENT)
    private readonly redis: Redis,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  // OTP Gönder
  async sendOtp(phone: string, mode: 'login' | 'register' = 'login'): Promise<{ message: string }> {
    const user = await this.userRepo.findOne({ where: { phone } });

    if (mode === 'login') {
      // Giriş: numara kayıtlı olmalı
      if (!user) {
        throw new BadRequestException({
          code: 'USER_NOT_FOUND',
          message: 'Bu telefon numarasına kayıtlı hesap bulunamadı.',
          message_en: 'No account found for this phone number.',
        });
      }
      if (!user.is_active) {
        throw new ForbiddenException({
          code: 'USER_BLOCKED',
          message: 'Hesabınız engellenmiştir. Destek ekibiyle iletişime geçin.',
          message_en: 'Your account has been blocked. Please contact support.',
        });
      }
    } else {
      // Kayıt: numara kayıtlı olmamalı
      if (user) {
        throw new BadRequestException({
          code: 'PHONE_EXISTS',
          message: 'Bu telefon numarasıyla zaten bir hesap mevcut.',
          message_en: 'An account with this phone number already exists.',
        });
      }
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redis.set(`otp:${phone}`, otp, 'EX', 300);
    await this.smsService.sendOtp(phone, otp);

    return { message: 'Doğrulama kodu gönderildi.' };
  }

  // OTP Doğrula & Token Üret
  async verifyOtp(
    phone: string,
    otp: string,
    res: any,
  ): Promise<{ access_token: string; user: Partial<User> & { onboarding_completed: boolean } }> {
    const storedOtp = await this.redis.get(`otp:${phone}`);

    if (!storedOtp) {
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'Doğrulama kodunun süresi dolmuş. Yeni kod isteyin.',
        message_en: 'Verification code has expired. Please request a new one.',
      });
    }

    if (storedOtp !== otp) {
      throw new BadRequestException({
        code: 'OTP_INVALID',
        message: 'Doğrulama kodu hatalı. Lütfen tekrar deneyin.',
        message_en: 'Invalid verification code. Please try again.',
      });
    }

    await this.redis.del(`otp:${phone}`);

    const user = await this.userRepo.findOne({
      where: { phone },
      relations: ['business'],
    });

    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'Bu telefon numarasına kayıtlı hesap bulunamadı.',
        message_en: 'No account found for this phone number.',
      });
    }

    if (!user.is_active) {
      throw new ForbiddenException({
        code: 'USER_BLOCKED',
        message: 'Hesabınız engellenmiştir.',
        message_en: 'Your account has been blocked.',
      });
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      business_id: user.business_id,
    });

    const refreshToken = uuidv4();
    const refreshTtl = 30 * 24 * 60 * 60;
    await this.redis.set(`refresh:${refreshToken}`, user.id, 'EX', refreshTtl);

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: this.configService.get('NODE_ENV') === 'production',
      sameSite: 'strict',
      maxAge: refreshTtl * 1000,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        business_id: user.business_id,
        avatar_url: user.avatar_url,
        onboarding_completed: user.business_id
          ? (user.business?.onboarding_completed ?? false)
          : false,
      },
    };
  }

  // Token Yenile
  async refreshToken(
    refreshToken: string,
  ): Promise<{ access_token: string; user: Partial<User> & { onboarding_completed: boolean } }> {
    if (!refreshToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Oturum bilgisi bulunamadı.',
        message_en: 'Session not found.',
      });
    }

    const isBlacklisted = await this.redis.get(`blacklist:${refreshToken}`);
    if (isBlacklisted) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Geçersiz oturum. Lütfen tekrar giriş yapın.',
        message_en: 'Invalid session. Please log in again.',
      });
    }

    const userId = await this.redis.get(`refresh:${refreshToken}`);
    if (!userId) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Oturum süresi dolmuş. Lütfen tekrar giriş yapın.',
        message_en: 'Session expired. Please log in again.',
      });
    }

    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['business'] });
    if (!user || !user.is_active) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED',
        message: 'Hesap bulunamadı veya engellenmiş.',
        message_en: 'Account not found or blocked.',
      });
    }

    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      business_id: user.business_id,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        business_id: user.business_id,
        avatar_url: user.avatar_url,
        onboarding_completed: user.business_id
          ? (user.business?.onboarding_completed ?? false)
          : false,
      },
    };
  }

  // Kullanıcı Kaydı (kişisel bilgiler, işletme bilgileri onboarding'de alınır)
  async registerBusiness(dto: RegisterBusinessDto): Promise<{ message: string }> {
    // Telefon çakışması kontrolü
    const existing = await this.userRepo.findOne({ where: { phone: dto.phone } });
    if (existing) {
      throw new ConflictException({
        code: 'PHONE_EXISTS',
        message: 'Bu telefon numarasıyla zaten bir hesap mevcut.',
        message_en: 'An account with this phone number already exists.',
      });
    }

    // OTP doğrula
    const storedOtp = await this.redis.get(`otp:${dto.phone}`);
    if (!storedOtp) {
      throw new BadRequestException({
        code: 'OTP_EXPIRED',
        message: 'Doğrulama kodunun süresi dolmuş. Yeni kod isteyin.',
        message_en: 'Verification code has expired. Please request a new one.',
      });
    }
    if (storedOtp !== dto.otp) {
      throw new BadRequestException({
        code: 'OTP_INVALID',
        message: 'Doğrulama kodu hatalı. Lütfen tekrar deneyin.',
        message_en: 'Invalid verification code. Please try again.',
      });
    }
    await this.redis.del(`otp:${dto.phone}`);

    await this.userRepo.save(
      this.userRepo.create({
        phone: dto.phone,
        full_name: dto.full_name,
        role: UserRole.BUSINESS_ADMIN,
        business_id: null,
      }),
    );

    return { message: 'Hesabınız oluşturuldu. Giriş yapabilirsiniz.' };
  }

  // İşletme Kurulumu (onboarding adım 0 — işletme adı girişi)
  async setupBusiness(
    userId: string,
    businessName: string,
  ): Promise<{ access_token: string; user: Partial<User> & { onboarding_completed: boolean } }> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'Kullanıcı bulunamadı.',
        message_en: 'User not found.',
      });
    }

    // Slug oluştur
    const baseSlug = slugify(businessName);

    let slug = baseSlug;
    let suffix = 1;
    while (await this.businessRepo.findOne({ where: { slug } })) {
      slug = `${baseSlug}-${suffix++}`;
    }

    // İşletme oluştur
    const business = await this.businessRepo.save(
      this.businessRepo.create({ name: businessName, slug }),
    );

    // Varsayılan bildirim ayarları
    await this.notifRepo.save(this.notifRepo.create({ business_id: business.id }));

    // Owner için varsayılan çalışma saatleri (hepsi kapalı)
    const defaultHours = Array.from({ length: 7 }, (_, i) => ({
      staff_id: user.id,
      day_of_week: i,
      is_open: false,
      start_time: null,
      end_time: null,
    }));
    await this.workingHoursRepo.save(defaultHours);

    // Kullanıcıya işletmeyi bağla
    user.business_id = business.id;
    await this.userRepo.save(user);

    // business_id dahil yeni access token
    const accessToken = this.jwtService.sign({
      sub: user.id,
      phone: user.phone,
      role: user.role,
      business_id: business.id,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        business_id: business.id,
        avatar_url: user.avatar_url,
        onboarding_completed: false,
      },
    };
  }

  // Logout
  async logout(refreshToken: string, res: any): Promise<{ message: string }> {
    if (refreshToken) {
      await this.redis.set(
        `blacklist:${refreshToken}`,
        '1',
        'EX',
        30 * 24 * 60 * 60,
      );
      await this.redis.del(`refresh:${refreshToken}`);
    }

    res.clearCookie('refresh_token');

    return { message: 'Çıkış yapıldı.' };
  }
}
