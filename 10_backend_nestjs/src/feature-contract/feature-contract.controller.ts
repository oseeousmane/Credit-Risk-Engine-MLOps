import { Controller, Get, Post, Body, UseGuards, Res, HttpStatus } from '@nestjs/common';
import { FeatureContractService } from './feature-contract.service';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';

@ApiTags('feature-contract')
@Controller('feature-contract')
export class FeatureContractController {
  constructor(private readonly contractService: FeatureContractService) {}

  @Get()
  @ApiOperation({ summary: 'Get the active Feature Contract specification' })
  getContract(@Res() res: Response) {
    const contract = this.contractService.getContract();
    const version = this.contractService.getSchemaVersion();

    return res.status(HttpStatus.OK)
      .header('X-Feature-Contract-Version', version)
      .json(contract);
  }

  @Post('validate')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth('JWT')
  @ApiOperation({ summary: 'Validate a feature payload against the contract' })
  validatePayload(@Body() payload: Record<string, any>) {
    return this.contractService.validatePayload(payload);
  }
}
