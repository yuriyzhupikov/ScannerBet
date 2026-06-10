import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { RegisterProviderSourceUseCase } from '../../../application/catalog/register-provider-source.use-case';
import { ProviderSourceEntity } from '../../../domain/catalog/provider-source.entity';
import { DomainRuleViolation } from '../../../domain/shared/domain-rule-violation.error';
import { AdminGuard } from '../../../infrastructure/access/admin.guard';
import { ProviderSourceRepository } from '../../../infrastructure/persistence/repositories/provider-source.repository';
import { CreateProviderSourceDto } from '../dto/create-provider-source.dto';
import { UpdateProviderStatusDto } from '../dto/update-provider-status.dto';

@ApiTags('sources')
@Controller('sources')
export class SourcesController {
  constructor(
    private readonly registerProviderSource: RegisterProviderSourceUseCase,
    private readonly providerSources: ProviderSourceRepository,
  ) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  create(@Body() dto: CreateProviderSourceDto) {
    return this.registerProviderSource.execute(dto);
  }

  @Get()
  list(@Query('status') status?: string) {
    return this.providerSources.list(status);
  }

  @Patch(':id/status')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateProviderStatusDto) {
    const source = await this.providerSources.findByIdOrThrow(id);
    const authorizationApproved = dto.authorizationApproved ?? source.authorizationApproved;

    try {
      ProviderSourceEntity.assertCanSetStatus(dto.status, authorizationApproved);
    } catch (error) {
      if (error instanceof DomainRuleViolation) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }

    return this.providerSources.updateStatus(id, dto.status, authorizationApproved);
  }
}
