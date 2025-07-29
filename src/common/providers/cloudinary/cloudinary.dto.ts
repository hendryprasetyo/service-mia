export type TUploadCloudinaryDTO = {
  data: Express.Multer.File | string;
  resourceType: 'image' | 'video' | 'raw' | 'auto';
  transactionid: string;
  publicId: string;
  folderName?: 'merchant' | 'admin' | 'customer';
};

export type TDeleteCloudinaryDTO = {
  publicId: string;
  resourceType: string;
  transactionid: string;
};
