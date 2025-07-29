export type TExchangeConfig = {
  name: string;
  routeKey: string;
};

interface QueueConfig {
  queue: string;
  exchanges: TExchangeConfig[];
}

export type TQueueConfigWrapper = {
  queue_config: QueueConfig[];
};

type TDataUploadCoud = {
  image: string | Express.Multer.File;
  publicId: string;
  resourceType: 'image' | 'video' | 'raw' | 'auto';
  folderName: 'merchant' | 'admin' | 'customer';
};

export type TRequestMessageRabbit = {
  type: string;
  transactionid: string;
  data: TDataUploadCoud;
};
