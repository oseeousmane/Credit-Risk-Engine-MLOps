import { Expose } from 'class-transformer';

export class ClientNotificationDto {
  @Expose()
  id: string;

  @Expose()
  title: string;

  @Expose()
  message: string;

  @Expose()
  type: string;

  @Expose()
  isRead: boolean;

  @Expose()
  appReqId: string;

  @Expose()
  createdAt: Date;
}
