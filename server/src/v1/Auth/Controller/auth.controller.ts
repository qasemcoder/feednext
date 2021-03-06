// Nest dependencies
import {
    Controller,
    Headers,
    Post,
    Body,
    UseGuards,
    Get,
    Patch,
    HttpException,
    Query,
    Request,
    Res,
    HttpStatus,
    BadRequestException,
} from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'

// Local files
import { AuthService } from '../Service/auth.service'
import { CreateAccountDto } from '../Dto/create-account.dto'
import { LoginDto } from '../Dto/login.dto'
import { GenerateRecoveryKeyDto } from '../Dto/generate-recovery-key.dto'
import { RecoverAccountDto } from '../Dto/recover-account.dto'
import { ISerializeResponse } from 'src/shared/Services/serializer.service'
import { configService } from 'src/shared/Services/config.service'
import { RolesGuard } from 'src/shared/Guards/roles.guard'

@ApiTags('v1/auth')
@UseGuards(RolesGuard)
@Controller()
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('signin')
    async signIn(@Body() dto: LoginDto, @Res() res: any): Promise<void> {
        const user = await this.authService.validateUser(dto)
        const authResponse: any = await this.authService.signIn(user, dto)
        const refreshToken = authResponse.attributes.user.refresh_token
        delete authResponse.attributes.user.refresh_token

        if (dto.rememberMe) {
            res.setCookie('rt', refreshToken, {
                domain: `${configService.getEnv('APP_DOMAIN').split('//')[1]}`,
                path: '/api/v1/auth/refresh-token',
                httpOnly: true,
                secure: true
            }).send(authResponse)
            return
        }

        res.send(authResponse)
    }

    @Post('signup')
    signUp(@Body() dto: CreateAccountDto): Promise<HttpException> {
        return this.authService.signUp(dto)
    }

    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('signout')
    async signOut(@Headers('authorization') bearer: string): Promise<HttpException> {
        return await this.authService.signOut(bearer)
    }

    @Patch('generate-recovery-key')
    generateRecoveryKey(@Body() dto: GenerateRecoveryKeyDto): Promise<HttpException> {
        return this.authService.generateRecoveryKey(dto)
    }

    @Patch('recover-account')
    recoverAccount(@Body() dto: RecoverAccountDto): Promise<HttpException> {
        return this.authService.recoverAccount(dto)
    }

    @Get('account-verification')
    verifyAccount(@Query('token') token: string): Promise<HttpException> {
        return this.authService.accountVerification(token)
    }

    @ApiBearerAuth()
    @UseGuards(AuthGuard('jwt'))
    @Get('check-token')
    async checkJwtToken(): Promise<ISerializeResponse> {
        throw new HttpException('Token is valid', HttpStatus.OK)
    }

    @Get('refresh-token')
    async refreshJwtToken(@Request() { cookies }): Promise<ISerializeResponse> {
        if (!cookies.rt) throw new BadRequestException('Server could not give access tokken without refresh token')
        return await this.authService.refreshToken(cookies.rt)
    }
}
