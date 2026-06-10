import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { DiscrepancyAlertRepository } from '../../infrastructure/persistence/repositories/discrepancy-alert.repository';

export type ReviewAlertAction = 'ACKNOWLEDGE' | 'RESOLVE' | 'REJECT';

export type ReviewAlertCommand = {
  alertId: string;
  action: ReviewAlertAction;
  actorId: string;
  note?: string;
};

const NEXT_STATUS: Record<ReviewAlertAction, string> = {
  ACKNOWLEDGE: 'ACKNOWLEDGED',
  RESOLVE: 'RESOLVED',
  REJECT: 'REJECTED',
};

@Injectable()
export class ReviewAlertUseCase {
  constructor(private readonly alerts: DiscrepancyAlertRepository) {}

  async execute(command: ReviewAlertCommand) {
    const alert = await this.alerts.findById(command.alertId);

    if (!alert) {
      throw new NotFoundException(`Alert ${command.alertId} was not found.`);
    }

    const nextStatus = NEXT_STATUS[command.action];
    this.assertTransition(alert.status, nextStatus);

    return this.alerts.reviewWithAudit({
      alertId: command.alertId,
      actorId: command.actorId,
      action: command.action,
      previousStatus: alert.status,
      nextStatus,
      note: command.note,
    });
  }

  private assertTransition(currentStatus: string, nextStatus: string): void {
    const allowed =
      (currentStatus === 'OPEN' && ['ACKNOWLEDGED', 'RESOLVED', 'REJECTED'].includes(nextStatus)) ||
      (currentStatus === 'ACKNOWLEDGED' && ['RESOLVED', 'REJECTED'].includes(nextStatus));

    if (!allowed) {
      throw new BadRequestException(`Invalid alert lifecycle transition ${currentStatus} -> ${nextStatus}.`);
    }
  }
}
