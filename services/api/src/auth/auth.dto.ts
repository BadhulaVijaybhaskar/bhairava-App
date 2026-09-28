import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RefreshDto {
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class PasswordResetRequestDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  mobile?: string;
}

export class PasswordResetConfirmDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class GoogleContinueDto {
  @IsString()
  idToken!: string;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}

export class CompleteCustomerProfileDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsString()
  mobile!: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  preferredProjectId?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;

  @IsOptional()
  @IsString()
  referralNote?: string;

  @IsBoolean()
  termsAccepted!: boolean;

  @IsOptional()
  @IsString()
  inviteToken?: string;
}

export class CompleteAgentProfileDto {
  @IsString()
  @MinLength(1)
  name!: string;

  /** Required — agents cannot activate without a normalized Indian mobile. */
  @IsString()
  @MinLength(10)
  phone!: string;

  /** Required city/region for agent profile. */
  @IsString()
  @MinLength(1)
  region!: string;

  @IsBoolean()
  termsAccepted!: boolean;
}

/** Setup / reset body — confirm required. Never logged. */
export class MpinSetupDto {
  @IsString()
  mpin!: string;

  @IsString()
  confirmMpin!: string;
}

export class MpinLoginDto {
  /** Google-linked email or stored mobile — existence never confirmed to client. */
  @IsString()
  @MinLength(1)
  identifier!: string;

  @IsString()
  mpin!: string;

  /** Portal role — Customer cannot use Agent identity and vice versa. */
  @IsString()
  role!: string;
}

export class MpinResetDto {
  /** Fresh Google ID token proving identity before MPIN change. */
  @IsString()
  idToken!: string;

  @IsString()
  mpin!: string;

  @IsString()
  confirmMpin!: string;

  @IsString()
  role!: string;
}
