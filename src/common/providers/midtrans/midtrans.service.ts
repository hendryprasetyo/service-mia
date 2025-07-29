import { Injectable } from '@nestjs/common';
import { LoggerServiceImplementation } from 'src/common/helpers/logger/logger.service';
import {
  MidtransChargeResponseDTO,
  MidtransGetStatusDTO,
  MidtransPaymentStatusResponseDTO,
  TPayloadMidtrans,
} from './midtrans.dto';
import { GeneralService } from 'src/common/helpers/general/general.service';

@Injectable()
export class MidtransService {
  constructor(
    private readonly logger: LoggerServiceImplementation,
    private readonly generalService: GeneralService,
  ) {}

  public async charge(
    payload: TPayloadMidtrans,
    transactionid: string,
  ): Promise<MidtransChargeResponseDTO> {
    const timeStart = process.hrtime();
    try {
      this.logger.log(['Midtrans Service', 'Request', 'Info'], {
        payload,
        transactionid,
      });
      const chargeResponse: MidtransChargeResponseDTO =
        await this.generalService.callAPI({
          baseURL: process.env.MIDTRANS_BASE_URL,
          url: '/v2/charge',
          method: 'post',
          transactionid,
          payload,
          provider: 'midtrans',
          serverKey: process.env.MIDTRANS_SERVER_KEY,
        });

      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
      this.logger.log(['Midtrans Service', 'Response', 'Info'], {
        transactionid: transactionid,
        timeTaken,
      });
      return Promise.resolve(chargeResponse);
    } catch (error) {
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
      this.logger.error(['Midtrans Service', 'Charge', 'ERROR'], {
        info: `${error}`,
        timeTaken,
        transactionid,
      });
      return Promise.reject(error);
    }
  }

  public async getStatusPayment(
    payload: MidtransGetStatusDTO,
    transactionid: string,
  ): Promise<MidtransPaymentStatusResponseDTO> {
    const timeStart = process.hrtime();
    try {
      this.logger.log(['Midtrans Service', 'Request', 'Info'], {
        payload,
        transactionid,
      });
      const chargeResponse: MidtransPaymentStatusResponseDTO =
        await this.generalService.callAPI({
          baseURL: process.env.MIDTRANS_BASE_URL,
          url: `/v2/${payload.order_id}/status`,
          method: 'get',
          transactionid,
          provider: 'midtrans',
          serverKey: process.env.MIDTRANS_SERVER_KEY,
        });

      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
      this.logger.log(['Midtrans Service', 'Response', 'Info'], {
        transactionid: transactionid,
        timeTaken,
      });
      return Promise.resolve(chargeResponse);
    } catch (error) {
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
      this.logger.error(
        ['Midtrans Service', 'GET status transaction', 'ERROR'],
        {
          info: `${error}`,
          timeTaken,
          transactionid,
        },
      );
      return Promise.reject(error);
    }
  }

  public async cancelPayment(
    payload: MidtransGetStatusDTO,
    transactionid: string,
  ): Promise<MidtransPaymentStatusResponseDTO> {
    const timeStart = process.hrtime();
    try {
      this.logger.log(['Midtrans Service', 'Request', 'Info'], {
        payload,
        transactionid,
      });
      const chargeResponse: MidtransPaymentStatusResponseDTO =
        await this.generalService.callAPI({
          baseURL: process.env.MIDTRANS_BASE_URL,
          url: `/v2/${payload.order_id}/cancel`,
          method: 'post',
          transactionid,
          provider: 'midtrans',
          serverKey: process.env.MIDTRANS_SERVER_KEY,
        });

      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
      this.logger.log(['Midtrans Service', 'Response', 'Info'], {
        transactionid: transactionid,
        timeTaken,
      });
      return Promise.resolve(chargeResponse);
    } catch (error) {
      const timeDiff = process.hrtime(timeStart);
      const timeTaken = Math.round((timeDiff[0] * 1e9 + timeDiff[1]) / 1e6);
      this.logger.error(['Midtrans Service', 'Cancel Payment', 'ERROR'], {
        info: `${error}`,
        timeTaken,
        transactionid,
      });
      return Promise.reject(error);
    }
  }
}
