import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

export type ImageType = 'logo' | 'cover' | 'avatar';

const IMAGE_SPECS: Record<ImageType, { width: number; height: number; maxSizeKb: number }> = {
  logo:   { width: 500,  height: 500,  maxSizeKb: 500 },
  cover:  { width: 1200, height: 400,  maxSizeKb: 1024 },
  avatar: { width: 400,  height: 400,  maxSizeKb: 300 },
};

@Injectable()
export class UploadService {
  private readonly uploadPath: string;
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.uploadPath = config.get<string>('UPLOAD_LOCAL_PATH', './uploads');
    this.baseUrl = config.get<string>('UPLOAD_BASE_URL', 'http://localhost:3000/uploads');
  }

  async uploadImage(
    file: Express.Multer.File,
    type: ImageType,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException({ code: 'NO_FILE', message: 'Dosya yüklenmedi.' });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.mimetype)) {
      throw new BadRequestException({
        code: 'INVALID_FILE_TYPE',
        message: 'Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.',
      });
    }

    const spec = IMAGE_SPECS[type];

    // Sharp ile işle
    const processed = await (sharp as any)(file.buffer)
      .resize(spec.width, spec.height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    if (processed.length > spec.maxSizeKb * 1024) {
      throw new BadRequestException({
        code: 'FILE_TOO_LARGE',
        message: `Görsel boyutu ${spec.maxSizeKb}KB'ı geçemez.`,
      });
    }

    // Kaydet
    const filename = `${uuidv4()}.webp`;
    const dir = path.join(this.uploadPath, type);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, processed);

    return { url: `${this.baseUrl}/${type}/${filename}` };
  }
}
