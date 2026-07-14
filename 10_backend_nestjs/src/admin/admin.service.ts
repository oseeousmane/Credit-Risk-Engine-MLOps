import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Default settings seeded on first use
const DEFAULT_SETTINGS: Array<{ key: string; value: string; label: string; group: string }> = [
  { key: 'xai_visibility', value: 'FULL', label: 'XAI Driver Visibility', group: 'scoring_policy' },
  { key: 'auto_approve_enabled', value: 'false', label: 'Auto-Approve Enabled', group: 'scoring_policy' },
  { key: 'auto_approve_max_pd', value: '0.5', label: 'Auto-Approve Max PD (%)', group: 'scoring_policy' },
  { key: 'auto_reject_min_pd', value: '6.0', label: 'Auto-Reject Min PD (%)', group: 'scoring_policy' },
  { key: 'review_min_exposure', value: '100', label: 'Escalation Threshold ($M)', group: 'scoring_policy' },
  { key: 'alert_threshold', value: 'HIGH', label: 'Alert Severity Threshold', group: 'notifications' },
  { key: 'maintenance_mode', value: 'false', label: 'Maintenance Mode', group: 'system' },
  { key: 'scoring_service_url', value: 'http://localhost:8000', label: 'Scoring Service URL', group: 'integrations' },
];

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get all settings, initializing defaults if DB is empty.
   * Returns as a flat key-value map for backward compatibility.
   */
  async getSettings(): Promise<Record<string, any>> {
    const settings = await this.prisma.adminSetting.findMany({
      orderBy: { group: 'asc' },
    });

    // Auto-initialize defaults if empty
    if (settings.length === 0) {
      this.logger.log('AdminSettings table empty â€” seeding defaults');
      await this.initializeDefaults();
      return this.getSettings();
    }

    // Return as keyâ†’value map (typed where possible)
    return settings.reduce(
      (acc, s) => {
        acc[s.key] = this.parseValue(s.value);
        return acc;
      },
      {} as Record<string, any>,
    );
  }

  /**
   * Get full settings with metadata (label, group) for the admin UI.
   */
  async getSettingsDetailed(): Promise<any[]> {
    const settings = await this.prisma.adminSetting.findMany({
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });

    if (settings.length === 0) {
      await this.initializeDefaults();
      return this.getSettingsDetailed();
    }

    return settings.map(s => ({
      ...s,
      parsedValue: this.parseValue(s.value),
    }));
  }

  /**
   * Update one or more settings by key.
   * Unknown keys are ignored (won't create new arbitrary settings).
   */
  async updateSettings(updates: Record<string, any>): Promise<Record<string, any>> {
    const operations = Object.entries(updates).map(([key, val]) =>
      this.prisma.adminSetting.updateMany({
        where: { key },
        data: { value: String(val) },
      }),
    );

    await Promise.all(operations);
    this.logger.log(`Admin settings updated: ${Object.keys(updates).join(', ')}`);

    return this.getSettings();
  }

  // â”€â”€ Private helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  private parseValue(val: string): any {
    if (val === 'true') return true;
    if (val === 'false') return false;
    const num = Number(val);
    if (!isNaN(num) && val !== '') return num;
    return val;
  }

  private async initializeDefaults() {
    await Promise.all(
      DEFAULT_SETTINGS.map(s =>
        this.prisma.adminSetting.upsert({
          where: { key: s.key },
          create: s,
          update: {},
        }),
      ),
    );
  }
}
