// Nest dependencies
import { Injectable, BadRequestException, HttpException, HttpStatus } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'

// Other dependencies
import * as jwt from 'jsonwebtoken'

// Local files
import { UsersEntity } from 'src/shared/Entities/users.entity'
import { UsersRepository } from 'src/shared/Repositories/users.repository'
import { UpdateUserDto } from '../Dto/update-user.dto'
import { serializerService, ISerializeResponse } from 'src/shared/Services/serializer.service'
import { MailService } from 'src/shared/Services/mail.service'
import { MailSenderBody } from 'src/shared/Services/types'
import { ActivateUserDto } from '../Dto/activate-user.dto'
import { configService } from 'src/shared/Services/config.service'
import { EntriesRepository } from 'src/shared/Repositories/entries.repository'
import { AwsService } from 'src/shared/Services/aws.service'

@Injectable()
export class UserService {

    constructor(
        @InjectRepository(UsersRepository)
        private readonly usersRepository: UsersRepository,
        @InjectRepository(EntriesRepository)
        private readonly entriesRepository: EntriesRepository,
        private readonly mailService: MailService,
        private readonly awsService: AwsService,
    ) {}

    async getUser(usernameParam: string): Promise<ISerializeResponse> {
        const profile: UsersEntity = await this.usersRepository.getUserByUsername(usernameParam)

        const properties: string[] = ['password', 'refresh_token', 'is_active']
        await serializerService.deleteProperties(profile, properties)

        return serializerService.serializeResponse('user_profile', profile)
    }

    async searchUserByUsername({ searchValue } : { searchValue: string }): Promise<ISerializeResponse> {
        const result = await this.usersRepository.searchUserByUsername({ searchValue })
        return serializerService.serializeResponse('searched_user_list', result)
    }

    async getProfileImageBuffer(username: string): Promise<unknown> {
        const user = await this.usersRepository.getUserByUsername(username)
        return this.awsService.getImageBuffer(String(user.id), 'users')
    }

    async uploadProfileImage(username, buffer: Buffer): Promise<void> {
        const user = await this.usersRepository.getUserByUsername(username)
        this.awsService.uploadImage(String(user.id), 'users', buffer)
    }

    async deleteProfileImage(username): Promise<void> {
        const user = await this.usersRepository.getUserByUsername(username)
        this.awsService.deleteImage(String(user.id), 'users')
    }

    async getVotes({ username, query }: {
        username: string,
        query: {
            skip: number,
            voteType: 'up' | 'down'
        }
   }): Promise<any> {
       await this.usersRepository.getUserByUsername(username)

       const result = await this.entriesRepository.getVotedEntriesByUsername({
           username,
           query
       })
       return serializerService.serializeResponse(`user_${query.voteType}_vote_list`, result)
   }

    async updateUser(usernameParam: string, dto: UpdateUserDto): Promise<ISerializeResponse> {
        const profile = await this.usersRepository.updateUser(usernameParam, dto)

        if (dto.email) {
            const activateToken: string = jwt.sign({
                email: profile.email,
                username: profile.username,
                newEmail: dto.email,
                verifyUpdateEmailToken: true,
                exp: Math.floor(Date.now() / 1000) + (30 * 60), // Token expires in 30 min
            }, configService.getEnv('SECRET_FOR_ACCESS_TOKEN'))

            const activationUrl = `${configService.getEnv('APP_DOMAIN')}/auth/confirmation/email?token=${activateToken}`
            const mailBody: MailSenderBody = {
                receiverEmail: dto.email,
                recieverFullname: dto.fullName || profile.full_name,
                subject: `Verify Your New Email [${profile.username}]`,
                text: activationUrl,
            }

            await this.mailService.sendEmailUpdate(mailBody).catch(_error => {
                throw new BadRequestException('SMTP transport failed')
            })
        }

        const id = String(profile.id)

        const properties: string[] = ['id', 'password', 'recovery_key', 'refresh_token']
        await serializerService.deleteProperties(profile, properties)

        return serializerService.serializeResponse('updated_profile', profile, id)
    }

    async banOrUnbanUser(operatorRole: number, username: string, banSituation: boolean): Promise<HttpException> {
        await this.usersRepository.banOrUnbanUser(operatorRole, username, banSituation)
        throw new HttpException(`User ban situation updated to ${banSituation}`, HttpStatus.OK)
    }

    async verifyUpdatedEmail(incToken: string): Promise<HttpException> {
        let decodedToken

        try {
            decodedToken = jwt.verify(incToken, configService.getEnv('SECRET_FOR_ACCESS_TOKEN'))
        } catch (error) {
            throw new BadRequestException('Invalid token signature')
        }

        if (decodedToken.email === decodedToken.newEmail) {
            throw new BadRequestException('Current and new email can not be same')
        }

        if (decodedToken.verifyUpdateEmailToken) {
            const remainingTime: number = await decodedToken.exp - Math.floor(Date.now() / 1000)
            if (remainingTime <= 0) {
                throw new BadRequestException('Incoming token is expired.')
            }

            await this.usersRepository.verifyUpdatedEmail(decodedToken)
            throw new HttpException('Email has been updated.', HttpStatus.OK)
        }

        throw new BadRequestException('Incoming token is not valid')
    }

    async disableUser(usernameParam: string): Promise<HttpException> {
        await this.usersRepository.disableUser(usernameParam)
        throw new HttpException('OK', HttpStatus.OK)
    }

    async activateUser(incToken: string): Promise<HttpException> {
        let decodedToken

        try {
            decodedToken = jwt.verify(incToken, configService.getEnv('SECRET_FOR_ACCESS_TOKEN'))
        } catch (error) {
            throw new BadRequestException('Invalid token signature')
        }

        if (decodedToken.activationToken) {
            const remainingTime: number = await decodedToken.exp - Math.floor(Date.now() / 1000)
            if (remainingTime <= 0) {
                throw new BadRequestException('Incoming token is expired.')
            }

            await this.usersRepository.activateUser(decodedToken)
            throw new HttpException('Account has been activated.', HttpStatus.OK)
        }

        throw new BadRequestException('Incoming token is not valid.')
    }

    async sendActivationMail(dto: ActivateUserDto): Promise<HttpException> {
        const user: UsersEntity = await this.usersRepository.getUserByEmail(dto.email)
        if (user.is_banned) throw new BadRequestException('Banned accounts can not do activation mail processes')
        if (user.is_active) throw new BadRequestException('This account is already active')

        const activateToken: string = jwt.sign({
            email: user.email,
            username: user.username,
            activationToken: true,
            exp: Math.floor(Date.now() / 1000) + (30 * 60), // Token expires in 30 min
        }, configService.getEnv('SECRET_FOR_ACCESS_TOKEN'))

        const activationUrl = `${configService.getEnv('APP_DOMAIN')}/auth/activation/user?token=${activateToken}`
        const mailBody: MailSenderBody = {
            receiverEmail: dto.email,
            recieverFullname: user.full_name,
            subject: `Reactivate Your Account [${user.username}]`,
            text: activationUrl,
        }

        await this.mailService.sendAccountActivation(mailBody).catch(_error => {
            throw new BadRequestException('SMTP transport failed')
        })
        throw new HttpException('OK', HttpStatus.OK)
    }

}
