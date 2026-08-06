import { IsOptional, IsString } from 'class-validator';

export class LogoutDto {
  @IsString()
  refreshToken!: string;

  @IsOptional()
  @IsString()
  accessToken?: string;
}
