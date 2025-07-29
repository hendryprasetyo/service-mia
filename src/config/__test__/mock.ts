import { Request, Response } from 'express';
import { HeadersDto } from 'src/common/dtos/dto';
import * as mysql from 'mysql2/promise';

export const mockHeaders: HeadersDto = {
  transactionid: 'test-transaction-id',
  channelid: 'web',
  language: 'id',
  deviceid: 'D3C52F96-C874-488D-9642-312BC6708E26',
  platform: 'WEB',
};
export const mockLoggerService = {
  error: jest.fn(),
  log: jest.fn(),
};

export const mockReply: Partial<Response> = {
  cookie: jest.fn(),
  clearCookie: jest.fn(),
  status: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
};

export const mockRequest: Partial<Request> = {
  cookies: jest.fn(),
};

export const mockPrismaService = {
  users: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  blacklist_user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  user_identity: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (callback) => {
    // Simulasi callback transaksi dengan prisma yang sudah dimock
    const prisma = mockPrismaService;
    await callback(prisma); // Eksekusi callback transaksi dengan prisma
  }),
};

export const mockDbService = {
  executeRawQuery: jest.fn(),
  executeInTransaction: jest.fn(),
};

export const mockRedisService = {
  setDataWithTTL: jest.fn(),
  getData: jest.fn(),
  deleteData: jest.fn(),
  setSadd: jest.fn(),
  getSrandmember: jest.fn(),
  getTTL: jest.fn(),
};

export const mockEmailService = {
  sendEmail: jest.fn(),
};

export const mockMidtransService = {
  charge: jest.fn(),
  getStatusPayment: jest.fn(),
  cancelPayment: jest.fn(),
};

export const mockRabbitMQService = {
  sendToQueue: jest.fn(),
};

export const mockOAuthService = {
  authorizationUrl: jest.fn(),
  userInfo: jest.fn(),
};

export const mockGeneralService = {
  callAPI: jest.fn(),
  isBlacklist: jest.fn(),
  validateSqlInjection: jest.fn(),
};

export const mockCloudinaryService = {
  uploadToCloudinary: jest.fn(),
  cloudinaryDeleteImg: jest.fn(),
};

export const mockConnectionDB = {
  beginTransaction: jest.fn(),
  commit: jest.fn(),
  rollback: jest.fn(),
  execute: jest.fn(),
  release: jest.fn(),
} as unknown as mysql.PoolConnection;

export const MockPaymentMethodConfig = [
  {
    id: 1,
    is_primary: true,
    payment_type: 'bank_transfer',
    bank: 'bca',
    label: 'Bank Transfer',
    sub_label: 'Virtual Account BCA',
    category: 'virtual_account',
    category_display: 'Virtual Account',
    text_display: 'Tranfer Bank BCA',
    icon: {
      android:
        'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020515/Icon-payment-BCA_rx6ijk.jpg',
      ios: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020515/Icon-payment-BCA_rx6ijk.jpg',
      web: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020515/Icon-payment-BCA_rx6ijk.jpg',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '4000',
      type: 'IDR',
    },
    expiry_duration: { duration: 30, unit: 'minute' },
    instruction: [
      {
        type: 'atm',
        enable: true,
        text_display: 'ATM BCA',
        step: {
          '1': {
            id: 'Pada menu utama, pilih “Transaksi Lainnya”',
            en: 'On the main menu, choose “Other Transactions”',
          },
          '2': { en: 'Choose “Transfer”', id: 'Pilih “Transfer”' },
          '3': {
            id: 'Pilih “Ke Rekening Virtual BCA”.',
            en: 'Choose “To BCA Virtual Account”',
          },
          '4': {
            id: 'Masukkan nomor BCA Virtual Account.',
            en: 'Enter the BCA Virtual Account number.',
          },
          '5': {
            id: 'Pastikan jumlah yang dibayar sudah benar, atau masukan jumlahnya secara manual, lalu konfirmasi.',
            en: 'Make sure the amount paid is correct, or enter the amount manually, then confirm.',
          },
          '6': {
            id: 'Pembayaran selesai.',
            en: 'Payment Completed.',
          },
        },
      },
      {
        type: 'klik_bca',
        enable: true,
        text_display: 'Klik BCA',
        step: {
          '1': {
            id: 'Pilih menu “Transfer Dana”',
            en: 'Choose menu “Fund Transfer”',
          },
          '2': {
            id: 'Pilih “Transfer ke Rekening Virtual BCA”',
            en: 'Choose “Transfer to BCA Virtual Account',
          },
          '3': {
            id: '“Masukkan Nomor Rekening Virtual BCA” atau “Pilih dari Daftar Transfer” dan klik “Lanjut”',
            en: '“Input BCA Virtual Account Number” or “Choose from Transfer List” and click “Continue”',
          },
          '4': {
            id: 'Pastikan jumlah yang dibayar sudah benar, atau masukan jumlahnya secara manual, lalu konfirmasi.',
            en: 'Make sure the amount paid is correct, or enter the amount manually, then confirm.',
          },
          '5': {
            id: 'Pembayaran selesai.',
            en: 'Payment Completed.',
          },
        },
      },
      {
        type: 'm_bca',
        enable: true,
        text_display: 'M BCA',
        step: {
          '1': {
            id: 'Pilih “m-Transfer”, lalu pilih Rekening Virtual BCA',
            en: 'Choose “m-Transfer”, then choose BCA Virtual Account',
          },
          '2': {
            id: 'Masukkan “Nomor Rekening Virtual” atau pilih akun yang ada dari Daftar Transfer',
            en: 'Input ”Virtual Account Number” or choose an existing account from Daftar Transfer',
          },
          '3': {
            id: 'Masukkan jumlah yang harus dibayarkan',
            en: 'Input the payable amount',
          },
          '4': {
            id: 'Masukkan PIN “m-BCA” Anda',
            en: 'Input your “m-BCA” PIN',
          },
          '5': {
            id: 'Pembayaran selesai.',
            en: 'Payment Completed.',
          },
        },
      },
      {
        type: 'other_bank',
        enable: true,
        text_display: 'Other Bank',
        step: {
          '1': {
            id: 'Pilih bank & cara bayar (ATM/Internet/m-banking) yang anda inginkan.',
            en: 'Select the bank & payment method (ATM/Internet/mobile banking) you prefer.',
          },
          '2': {
            id: 'Pilih ”Transfer ke Bank lainnya”.',
            en: 'Select ”Transfer to Another Bank”.',
          },
          '3': {
            id: 'Masukan nomor Virtual Account BCA.',
            en: 'Enter the BCA Virtual Account number.',
          },
          '4': {
            id: 'Masukan Jumlah yang akan dibayar, lalu konfirmasi.',
            en: 'Enter the amount to be paid, then confirm.',
          },
          '5': {
            id: 'Pembayaran selesai.',
            en: 'Payment completed.',
          },
        },
      },
    ],
  },
  {
    id: 2,
    is_primary: false,
    payment_type: 'bank_transfer',
    bank: 'bri',
    label: 'Bank Transfer',
    sub_label: 'Virtual Account BRI',
    category: 'virtual_account',
    category_display: 'Virtual Account',
    text_display: 'Tranfer Bank BRI',
    icon: {
      android:
        'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020528/jotaecojnrx0xgtcgk9d_enav4p.svg',
      ios: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020528/jotaecojnrx0xgtcgk9d_enav4p.svg',
      web: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020528/jotaecojnrx0xgtcgk9d_enav4p.svg',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '4000',
      type: 'IDR',
    },
    expiry_duration: { duration: 30, unit: 'minute' },
    instruction: [
      {
        type: 'atm',
        enable: true,
        text_display: 'ATM',
        step: {
          '1': {
            id: 'Masukkan kartu ATM dan pilih ”BAHASA”',
            en: 'Insert ATM card and select ”BAHASA” (LANGUAGE)”',
          },
          '2': {
            id: 'Masukkan PIN ATM, lalu pilih ”LANJUT”',
            en: 'Enter PIN ATM, select ”LANJUT”',
          },
          '3': {
            id: 'Pilih “PEMBAYARAN”.',
            en: 'Select “PAYMENT”.',
          },
          '4': {
            id: 'Pilih “MULTI PEMBAYARAN”.',
            en: 'Select “MULTI PEMBAYARAN (MULTI PAYMENT)”.',
          },
          '5': {
            id: 'Masukkan kode perusahaan: “YOUR_MIDTRANS_COMPANY_CODE”, lalu tekan “BENAR”',
            en: 'Enter company code: “YOUR_MIDTRANS_COMPANY_CODE”, then press “Corect”.',
          },
          '6': {
            id: 'Masukkan Nomor Rekening Virtual, lalu tekan “BENAR”.',
            en: 'Enter Virtual Account Number, then press “Corect”.',
          },
          '7': {
            id: 'Masukkan JUMLAH yang akan ditransfer, lalu tekan “BENAR”.',
            en: 'Enter the AMOUNT to be transferred, then press “CORRECT”.',
          },
          '8': {
            id: 'Detail Pelanggan akan muncul. Pilih nomor 1 sesuai dengan jumlah tagihan, lalu tekan “YA”.',
            en: 'Customer details will appear. Select number 1 according to the bill amount, then press “YES”.',
          },
          '9': {
            id: 'Konfirmasi pembayaran akan muncul. Pilih “YA” untuk melanjutkan pembayaran',
            en: 'Payment confirmation will appear. Select “YA” (YES) to proceed with payment',
          },
          '10': {
            id: 'Simpan struk sebagai bukti formal pembayaran dari Bank BRI',
            en: 'Save the receipt as a formal proof of payment from Bank BRI',
          },
          '11': {
            id: 'Transaksi Anda berhasil',
            en: 'Your transaction is successful',
          },
        },
      },
      {
        type: 'm_bri',
        enable: true,
        text_display: 'M BRI',
        step: {
          '1': {
            id: 'Login ke BRI Mobile Banking',
            en: 'Login to BRI Mobile Banking',
          },
          '2': {
            id: 'Klik “Icon Menu” di sudut kiri atas',
            en: 'Click the “Menu Icon” in the top left corner',
          },
          '3': {
            id: 'Pilih “Pembayaran”.',
            en: 'Select “Payment”.',
          },
          '4': {
            id: 'Pilih ”Buat Pembayaran Baru”.',
            en: 'Select ”Create New Payment”.',
          },
          '5': {
            id: 'Pilih ”Multi Pembayaran”.',
            en: 'Select ”Multi Payment”.',
          },
          '6': {
            id: 'Pilih Slaapdoss sebagai penyedia layanan',
            en: 'Select Slaapdoss as the service provider',
          },
          '7': {
            id: 'Pilih ”Nomor Rekening Virtual”.',
            en: 'Select ”Virtual Account Number”.',
          },
          '8': {
            id: 'Masukkan nomor rekening virtual Anda dengan Slaapdoss sebagai Kode Perusahaan, lalu pilih ”Tambah sebagai Nomor Baru”.',
            en: 'Enter your virtual account number with Slaapdoss as the Company Code, then select ”Add as New Number”.',
          },
          '9': {
            id: 'Masukkan ”Jumlah” lalu pilih ”Konfirmasi”.',
            en: 'Enter the ”Amount” then select ”Confirm”.',
          },
          '10': {
            id: 'Pilih ”Lanjut”.',
            en: 'Select ”Continue”.',
          },
          '11': {
            id: 'Halaman Konfirmasi Pembayaran akan muncul',
            en: 'The Payment Confirmation Page will appear',
          },
          '12': {
            id: 'Gulir ke bawah pada halaman konfirmasi pembayaran, lalu pilih ”Konfirmasi”.',
            en: 'Scroll down on the payment confirmation page, then select ”Confirm”.',
          },
          '13': {
            id: 'Masukkan ”PIN” dan transaksi Anda akan selesai',
            en: 'Enter your ”PIN” and the transaction will be completed',
          },
        },
      },
      {
        enable: true,
        type: 'internet_banking',
        text_display: 'Internet Banking',
        step: {
          '1': {
            id: 'Buka situs web Internet Banking BRI: https://ib.bri.co.id/',
            en: 'Open the Internet Banking BRI website: https://ib.bri.co.id/',
          },
          '2': {
            id: 'Login dengan USER ID dan PIN Anda',
            en: 'Log in with your USER ID and PIN',
          },
          '3': {
            id: 'Pilih ”Pembayaran”',
            en: 'Select ”Payment”',
          },
          '4': {
            id: 'Pilih ”Multi Pembayaran”',
            en: 'Select ”Multi Payment”',
          },
          '5': {
            id: 'Pilih ”Nomor Rekening Saya”',
            en: 'Select ”My Account”',
          },
          '6': {
            id: 'Pilih Slaapdoss sebagai penyedia layanan',
            en: 'Select Slaapdoss as the service provider',
          },
          '7': {
            id: 'Pilih ”Nomor Rekening Virtual”',
            en: 'Select ”Virtual Account Number”',
          },
          '8': {
            id: 'Masukkan nomor rekening virtual Anda',
            en: 'Enter your virtual account number',
          },
          '9': {
            id: 'Beralih ke halaman konfirmasi 1',
            en: 'Switch to confirmation page 1',
          },
          '10': {
            id: 'Klik ”TOTAL” jika semua detail sudah benar, lalu klik ”LANJUT”',
            en: 'Click ”TOTAL” if all details are correct, then click ”CONTINUE”',
          },
          '11': {
            id: 'Beralih ke halaman konfirmasi 2',
            en: 'Switch to confirmation page 2',
          },
          '12': {
            id: 'Masukkan Kode Tantangan dari token Internet Banking Anda, lalu klik ”Kirim”',
            en: 'Enter the Challenge Code from your Internet Banking token, then click ”Send”',
          },
          '13': {
            id: 'Anda akan diarahkan ke halaman konfirmasi setelah pembayaran selesai',
            en: 'You will be redirected to the confirmation page after the payment is completed',
          },
        },
      },
      {
        enable: true,
        type: 'other_bank',
        text_display: 'Other Bank',
        step: {
          '1': {
            id: 'Pilih bank & cara bayar (ATM/Internet/m-banking) yang anda inginkan.',
            en: 'Select the bank & payment method (ATM/Internet/mobile banking) you prefer.',
          },
          '2': {
            id: 'Pilih ”Transfer ke Bank lainnya”.',
            en: 'Select ”Transfer to Another Bank”.',
          },
          '3': {
            id: 'Masukan nomor BRIVA.',
            en: 'Enter the BRIVA number.',
          },
          '4': {
            id: 'Masukan Jumlah yang akan dibayar, lalu konfirmasi.',
            en: 'Enter the amount to be paid, then confirm.',
          },
          '5': {
            id: 'Pembayaran selesai.',
            en: 'Payment completed.',
          },
        },
      },
    ],
  },
  {
    id: 3,
    is_primary: false,
    payment_type: 'bank_transfer',
    bank: 'bni',
    label: 'Bank Transfer',
    sub_label: 'Virtual Account BNI',
    category: 'virtual_account',
    category_display: 'Virtual Account',
    text_display: 'Tranfer Bank BNI',
    icon: {
      android:
        'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020521/Icon-payment-BNI_ihtz9b.jpg',
      ios: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020521/Icon-payment-BNI_ihtz9b.jpg',
      web: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1702020521/Icon-payment-BNI_ihtz9b.jpg',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '4000',
      type: 'IDR',
    },
    expiry_duration: { duration: 30, unit: 'minute' },
    instruction: [
      {
        type: 'atm',
        enable: true,
        text_display: 'ATM',
        step: {
          '1': {
            id: 'Masukkan kartu ATM Anda',
            en: 'Insert your card',
          },
          '2': {
            id: 'Pilih bahasa Anda',
            en: 'Select your language',
          },
          '3': {
            id: 'Masukkan PIN ATM Anda',
            en: 'Enter your ATM PIN',
          },
          '4': {
            id: 'Pilih ”Transaksi Lainnya”',
            en: 'Select ”Other Transaction”',
          },
          '5': {
            id: 'Pilih ”Transfer”',
            en: 'Select ”Transfer”',
          },
          '6': {
            id: 'Pilih jenis rekening yang Anda gunakan untuk transfer (contoh: dari rekening tabungan)',
            en: 'Select the type of account you are using to transfer (e.g., from Savings account)',
          },
          '7': {
            id: 'Pilih ”Pembayaran Virtual Account”',
            en: 'Choose ”Virtual Account Billing”',
          },
          '8': {
            id: 'Masukkan Nomor Virtual Account Anda (contoh: 88089999XXXXXX)',
            en: 'Enter your Virtual Account Number (e.g.: 88089999XXXXXX)',
          },
          '9': {
            id: 'Konfirmasi transaksi, jika sudah benar, lanjutkan',
            en: 'Confirm the transaction, if it’s correct, continue',
          },
          '10': {
            id: 'Transaksi Anda selesai',
            en: 'Your transaction is completed',
          },
        },
      },
      {
        type: 'm_bni',
        enable: true,
        text_display: 'M BNI',
        step: {
          '1': {
            id: 'Akses BNI Mobile Banking dari ponsel Anda, dan masukkan user ID dan password',
            en: 'Access BNI Mobile Banking from your phone, and enter your user ID and password',
          },
          '2': {
            id: 'Pilih menu ”Transfer”',
            en: 'Select the ”Transfer” menu',
          },
          '3': {
            id: 'Pilih menu ”Pembayaran Virtual Account”, lalu pilih rekening debit',
            en: 'Select the ”Virtual Account Billing” menu, then choose the debit account',
          },
          '4': {
            id: 'Masukkan Nomor Virtual Account Anda (contoh: 88089999XXXXXX) pada menu ”input baru”',
            en: 'Enter your Virtual Account Number (e.g.: 88089999XXXXXX) in the ”input new” menu',
          },
          '5': {
            id: 'Konfirmasi pembayaran Anda',
            en: 'Confirm your billing',
          },
          '6': {
            id: 'Masukkan password Anda',
            en: 'Enter your password',
          },
          '7': {
            id: 'Transaksi Anda selesai',
            en: 'Your transaction is complete',
          },
        },
      },
      {
        enable: true,
        type: 'internet_banking',
        text_display: 'Internet Banking',
        step: {
          '1': {
            id: 'Masukkan alamat berikut: https://ibank.bni.co.id dan klik ”Enter”',
            en: 'Enter the following address: https://ibank.bni.co.id and click ”Enter”',
          },
          '2': {
            id: 'Masukkan User ID dan Password Anda',
            en: 'Insert your User ID and Password',
          },
          '3': {
            id: 'Pilih menu ”Transfer”',
            en: 'Select the ”Transfer” menu',
          },
          '4': {
            id: 'Pilih ”Pembayaran Virtual Account”',
            en: 'Select ”Virtual Account Billing”',
          },
          '5': {
            id: 'Masukkan Nomor Virtual Account Anda (contoh: 88089999XXXXXX). Pilih jenis rekening yang Anda gunakan untuk transfer, lalu tekan ”Lanjut”',
            en: 'Enter your Virtual Account Number (e.g.: 88089999XXXXXX). Choose the type of account you are using to transfer, and press ”Continue”',
          },
          '6': {
            id: 'Rekonfirmasi transaksi Anda',
            en: 'Reconfirm the transaction',
          },
          '7': {
            id: 'Masukkan kode token otentikasi Anda',
            en: 'Enter the authentication token code',
          },
          '8': {
            id: 'Transaksi Anda selesai',
            en: 'Your transaction is complete',
          },
        },
      },
      {
        enable: true,
        type: 'other_bank',
        text_display: 'Other Bank',
        step: {
          '1': {
            id: 'Pilih bank & cara bayar (ATM/Internet/m-banking) yang anda inginkan.',
            en: 'Select the bank & payment method (ATM/Internet/mobile banking) you prefer.',
          },
          '2': {
            id: 'Pilih ”Transfer ke Bank lainnya”.',
            en: 'Select ”Transfer to Another Bank”.',
          },
          '3': {
            id: 'Masukan nomor nomor Virtual Account BNI.',
            en: 'Enter the BNI Virtual Account number.',
          },
          '4': {
            id: 'Masukan Jumlah yang akan dibayar, lalu konfirmasi.',
            en: 'Enter the amount to be paid, then confirm.',
          },
          '5': {
            id: 'Pembayaran selesai.',
            en: 'Payment completed.',
          },
        },
      },
    ],
  },
  {
    id: 4,
    is_primary: false,
    payment_type: 'echannel',
    label: 'Bank Transfer',
    sub_label: 'Mandiri Bill',
    category: 'virtual_account',
    category_display: 'Virtual Account',
    text_display: 'Tranfer Bank Mandiri',
    icon: {
      android:
        'https://res.cloudinary.com/dlm3iavym/image/upload/v1726891361/logo-mandiri_qvkp9l.png',
      ios: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1726891361/logo-mandiri_qvkp9l.png',
      web: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1726891361/logo-mandiri_qvkp9l.png',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '4000',
      type: 'IDR',
    },
    expiry_duration: { duration: 30, unit: 'minute' },
    instruction: [
      {
        type: 'atm',
        enable: true,
        text_display: 'ATM',
        step: {
          '1': {
            id: 'Catat kode pembayaran yang anda dapat',
            en: 'Note down the payment code you received',
          },
          '2': {
            id: 'Gunakan ATM Mandiri untuk menyelesaikan pembayaran',
            en: 'Use a Mandiri ATM to complete the payment',
          },
          '3': {
            id: 'Masukkan PIN anda',
            en: 'Enter your PIN',
          },
          '4': {
            id: 'Pilih ”Bayar/Beli”',
            en: 'Select ”Pay/Buy”',
          },
          '5': {
            id: 'Cari pilihan MULTI PAYMENT',
            en: 'Search for the ”MULTI PAYMENT” option',
          },
          '6': {
            id: 'Masukkan Kode Perusahaan 88308',
            en: 'Enter the Company Code 88308',
          },
          '7': {
            id: 'Masukkan Kode Pelanggan 8830832133xxx679',
            en: 'Enter your Customer Code 8830832133xxx679',
          },
          '8': {
            id: 'Masukkan Jumlah Pembayaran sesuai dengan Jumlah Tagihan anda kemudian tekan ”Benar”',
            en: 'Enter the Payment Amount as per your Bill and then press ”Correct”',
          },
          '9': {
            id: 'Pilih Tagihan Anda jika sudah sesuai tekan YA',
            en: 'Select your Bill, if it is correct press YES',
          },
          '10': {
            id: 'Konfirmasikan tagihan anda apakah sudah sesuai lalu tekan YA',
            en: 'Confirm your bill details are correct, then press YES',
          },
          '11': {
            id: 'Harap Simpan Struk Transaksi yang anda dapatkan',
            en: 'Please keep the transaction receipt you received',
          },
        },
      },
      {
        type: 'm_mandiri',
        enable: true,
        text_display: 'M Mandiri',
        step: {
          '1': {
            id: 'Login Mandiri Online dengan memasukkan username dan password',
            en: 'Log in to Mandiri Online by entering your username and password',
          },
          '2': {
            id: 'Pilih menu PEMBAYARAN',
            en: 'Select the ”PAYMENT” menu',
          },
          '3': {
            id: 'Pilih menu MULTI PAYMENT',
            en: 'Select the ”MULTI PAYMENT” menu',
          },
          '4': {
            id: 'Cari Penyedia Jasa ”FASPAY”',
            en: 'Search for the service provider ”FASPAY”',
          },
          '5': {
            id: 'Masukkan Nomor Virtual Account 8830832133xxx679 dan nominal yang akan dibayarkan, lalu pilih Lanjut',
            en: 'Enter the Virtual Account Number 8830832133xxx679 and the amount to be paid, then select ”Continue”',
          },
          '6': {
            id: 'Setelah muncul tagihan, pilih Konfirmasi',
            en: 'Once the bill appears, select ”Confirm”',
          },
          '7': {
            id: 'Masukkan PIN/ challenge code token',
            en: 'Enter your PIN or challenge code from the token',
          },
          '8': {
            id: 'Transaksi selesai, simpan bukti bayar anda',
            en: 'Transaction completed, save your payment receipt',
          },
        },
      },
      {
        type: 'internet_banking',
        enable: true,
        text_display: 'Internet Banking',
        step: {
          '1': {
            id: 'Pada Halaman Utama pilih menu BAYAR',
            en: 'On the main page, select the ”PAY” menu',
          },
          '2': {
            id: 'Pilih submenu MULTI PAYMENT',
            en: 'Select the ”MULTI PAYMENT” submenu',
          },
          '3': {
            id: 'Cari Penyedia Jasa ”FASPAY”',
            en: 'Search for the service provider ”FASPAY”',
          },
          '4': {
            id: 'Masukkan Kode Pelanggan 8830832133xxx679',
            en: 'Enter the Customer Code 8830832133xxx679',
          },
          '5': {
            id: 'Masukkan Jumlah Pembayaran sesuai dengan Jumlah Tagihan anda',
            en: 'Enter the Payment Amount as per your Bill',
          },
          '6': {
            id: 'Pilih LANJUTKAN',
            en: 'Select ”CONTINUE”',
          },
          '7': {
            id: 'Pilih Tagihan Anda jika sudah sesuai tekan LANJUTKAN',
            en: 'Select your Bill, if it is correct press ”CONTINUE”',
          },
          '8': {
            id: 'Transaksi selesai, jika perlu CETAK hasil transaksi anda',
            en: 'Transaction completed, if needed, PRINT your transaction receipt',
          },
        },
      },
    ],
  },
  {
    id: 5,
    is_primary: false,
    payment_type: 'permata',
    label: 'Bank Transfer',
    sub_label: 'Virtual Account Permata',
    category: 'virtual_account',
    category_display: 'Virtual Account',
    text_display: 'Tranfer Bank Permata',
    icon: {
      android:
        'https://res.cloudinary.com/dlm3iavym/image/upload/v1726891755/permata-logo_giswdk.png',
      ios: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1726891755/permata-logo_giswdk.png',
      web: 'https://res.cloudinary.com/dlm3iavym/image/upload/v1726891755/permata-logo_giswdk.png',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '4000',
      type: 'IDR',
    },
    expiry_duration: { duration: 30, unit: 'minute' },
    instruction: [
      {
        type: 'rekening',
        enable: true,
        text_display: 'Rekening Permata',
        step: {
          '1': {
            id: 'Pilih ”Transaksi Lainnya” pada menu utama.',
            en: 'Select ”Other Transactions” on the main menu.',
          },
          '2': {
            id: 'Pilih menu ”Pembayaran”.',
            en: 'Select the ”Payment” menu.',
          },
          '3': {
            id: 'Pilih menu ”Pembayaran Lainnnya”.',
            en: 'Select the ”Other Payment” menu.',
          },
          '4': {
            id: 'Pilih menu ”Virtual Account”.',
            en: 'Select the ”Virtual Account” menu.',
          },
          '5': {
            id: 'Masukkan nomor Virtual Account Permata, lalu konfirmasi.',
            en: 'Enter the Permata Virtual Account number, then confirm.',
          },
          '6': {
            id: 'Pembayaran selesai.',
            en: 'Payment Completed.',
          },
        },
      },
      {
        type: 'other_bank',
        enable: true,
        text_display: 'Other Bank',
        step: {
          '1': {
            id: 'Pilih bank & cara bayar (ATM/Internet/m-banking) yang anda inginkan.',
            en: 'Select the bank & payment method (ATM/Internet/mobile banking) you prefer.',
          },
          '2': {
            id: 'Pilih ”Transfer ke Bank lainnya”.',
            en: 'Select ”Transfer to Another Bank”.',
          },
          '3': {
            id: 'Masukan nomor nomor Virtual Account.',
            en: 'Enter the Virtual Account number.',
          },
          '4': {
            id: 'Masukan Jumlah yang akan dibayar, lalu konfirmasi.',
            en: 'Enter the amount to be paid, then confirm.',
          },
          '5': {
            id: 'Pembayaran selesai.',
            en: 'Payment completed.',
          },
        },
      },
    ],
  },
  {
    id: 6,
    is_primary: false,
    payment_type: 'gopay',
    label: 'E-Wallet',
    sub_label: 'Go Pay',
    category: 'e-wallet',
    category_display: 'E Wallet',
    text_display: 'GoPay',
    icon: {
      android:
        'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095620/gopay-seeklogo_qyczs0.png',
      ios: 'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095620/gopay-seeklogo_qyczs0.png',
      web: 'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095620/gopay-seeklogo_qyczs0.png',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '2',
      type: 'percentage',
    },
    expiry_duration: { duration: 30, unit: 'minute' },
    instruction: [
      {
        type: 'qris_gopay',
        enable: true,
        text_display: 'QR Code GoPay',
        step: {
          '1': {
            id: 'Buka Aplikasi Gojek/GoPay dan klik ”Bayar”',
            en: 'Open the Gojek/GoPay app and click ”Pay”',
          },
          '2': {
            id: 'Scan Kode QR Rekan Usaha',
            en: 'Scan the Business Partner”s QR Code',
          },
          '3': {
            id: 'Masukkan nominal transaksi, pastikan nominal transaksi sudah sesuai',
            en: 'Enter the transaction amount, make sure the transaction amount is correct',
          },
          '4': {
            id: 'Klik ”Konfirmasi & Bayar”',
            en: 'Click ”Confirm & Pay”',
          },
          '5': {
            id: 'Masukkan PIN GoPay kamu',
            en: 'Enter your GoPay PIN',
          },
          '6': {
            id: 'Pembayaran berhasil',
            en: 'Payment successful',
          },
        },
      },
      {
        type: 'deep_link',
        enable: true,
        text_display: 'Apps Gojek/GoPay',
        step: {
          '1': {
            id: 'Klik Bayar menggunakan GoPay',
            en: 'Tap Pay using GoPay.',
          },
          '2': {
            id: 'Anda akan diarahkan ke aplikasi Gojek atau aplikasi GoPay.',
            en: 'You will be redirected to Gojek app or GoPay App.',
          },
          '3': {
            id: 'Verifikasi detail pembayaran Anda dan kemudian klik Bayar.',
            en: 'Verify your payment details and then click Pay.',
          },
          '4': {
            id: 'Verifikasi PIN Keamanan Anda dan selesaikan transaksi Anda.',
            en: 'Verify your Security PIN and finish your transaction.',
          },
        },
      },
    ],
  },
  {
    id: 7,
    is_primary: false,
    payment_type: 'shopeepay',
    label: 'E-Wallet',
    sub_label: 'ShopeePay',
    category: 'e-wallet',
    category_display: 'E Wallet',
    text_display: 'ShopeePay',
    icon: {
      android:
        'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095456/ShopeePay-Icon-O_sfm65v.png',
      ios: 'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095456/ShopeePay-Icon-O_sfm65v.png',
      web: 'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095456/ShopeePay-Icon-O_sfm65v.png',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '2',
      type: 'percentage',
    },
    expiry_duration: { duration: 30, unit: 'minute' },
    instruction: [
      {
        type: 'deep_link',
        enable: true,
        text_display: 'Apps Shopee/ShopeePay',
        step: {
          '1': {
            id: 'Klik Bayar menggunakan ShopeePay',
            en: 'Tap Pay using ShopeePay.',
          },
          '2': {
            id: 'Anda akan diarahkan ke aplikasi Shopee atau aplikasi ShopeePay.',
            en: 'You will be redirected to Shopee app or ShopeePay App.',
          },
          '3': {
            id: 'Verifikasi detail pembayaran Anda dan kemudian klik Bayar.',
            en: 'Verify your payment details and then click Pay.',
          },
          '4': {
            id: 'Verifikasi PIN Keamanan Anda dan selesaikan transaksi Anda.',
            en: 'Verify your Security PIN and finish your transaction.',
          },
        },
      },
    ],
  },
  {
    id: 9,
    is_primary: false,
    payment_type: 'qris',
    label: 'QRIS',
    sub_label: 'Qris',
    category: 'qris',
    category_display: 'QRIS',
    text_display: 'QRIS',
    icon: {
      android:
        'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095912/quick-response-code-indonesia-standard-qris-seeklogo_jsrsed.png',
      ios: 'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095912/quick-response-code-indonesia-standard-qris-seeklogo_jsrsed.png',
      web: 'https://res.cloudinary.com/dulhgba4u/image/upload/v1746095912/quick-response-code-indonesia-standard-qris-seeklogo_jsrsed.png',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '0.7',
      type: 'percentage',
    },
    expiry_duration: { duration: 30, unit: 'minute' },
    instruction: [
      {
        type: 'deep_link',
        enable: true,
        text_display: 'Apps Shopee/ShopeePay',
        step: {
          '1': {
            id: 'Klik Bayar menggunakan ShopeePay',
            en: 'Tap Pay using ShopeePay.',
          },
          '2': {
            id: 'Anda akan diarahkan ke aplikasi Shopee atau aplikasi ShopeePay.',
            en: 'You will be redirected to Shopee app or ShopeePay App.',
          },
          '3': {
            id: 'Verifikasi detail pembayaran Anda dan kemudian klik Bayar.',
            en: 'Verify your payment details and then click Pay.',
          },
          '4': {
            id: 'Verifikasi PIN Keamanan Anda dan selesaikan transaksi Anda.',
            en: 'Verify your Security PIN and finish your transaction.',
          },
        },
      },
    ],
  },
  {
    id: 10,
    is_primary: false,
    payment_type: 'ots',
    label: 'On The Spot',
    sub_label: 'OTS',
    category: 'ots',
    category_display: 'OTS',
    text_display: 'Pay On The Spot',
    icon: {
      android:
        'https://res.cloudinary.com/dulhgba4u/image/upload/v1746097170/ots_logo_amoxia.png',
      ios: 'https://res.cloudinary.com/dulhgba4u/image/upload/v1746097170/ots_logo_amoxia.png',
      web: 'https://res.cloudinary.com/dulhgba4u/image/upload/v1746097170/ots_logo_amoxia.png',
    },
    enable: true,
    platform: ['ANDROID', 'IOS', 'WEB'],
    exlude_app_version: [],
    fee: {
      value: '0',
      type: 'IDR',
    },
    expiry_duration: {},
    instruction: [
      {
        type: 'ots',
        enable: true,
        text_display: 'Bayar di Tempat',
        step: {
          '1': {
            id: 'Tunjukkan bukti reservasi Anda kepada petugas.',
            en: 'Show your reservation proof to the officer.',
          },
          '2': {
            id: 'Petugas akan memverifikasi bukti reservasi Anda.',
            en: 'The officer will verify your reservation proof.',
          },
          '3': {
            id: 'Lakukan pembayaran secara tunai atau menggunakan metode pembayaran yang tersedia.',
            en: 'Make your payment either in cash or using the available payment methods.',
          },
          '4': {
            id: 'Pastikan Anda menerima bukti pembayaran atau struk sebagai tanda transaksi selesai.',
            en: 'Ensure you receive a payment receipt or proof of transaction completion.',
          },
        },
      },
    ],
  },
];

export const MockPaymentConfig = {
  payment_provider: {
    midtrans: [
      'bank_transfer',
      'echannel',
      'permata',
      'gopay',
      'shopeepay',
      'qris',
    ],
    ots: ['ots'],
  },
  admin_fee: {
    value: '20000',
    type: 'IDR',
    discount: 100,
    discount_type: 'percentage',
  },
  payment_notif_callback: {
    subject_email: {
      pending: {
        id: 'Pembayaran Anda Sedang Menunggu Konfirmasi - Harap Selesaikan Dalam 30 Menit',
        en: 'Your payment is awaiting confirmation - Please complete within 30 minutes.',
      },
      settlement: {
        id: 'Pembayaran Anda Telah Dikonfirmasi - Terima Kasih!',
        en: 'Your payment has been confirmed - Thank you!',
      },
      cancel: {
        id: 'Pembayaran Anda Dibatalkan',
        en: 'Your payment has been canceled.',
      },
      expire: {
        id: 'Pembayaran Anda Expired - Segera Selesaikan!',
        en: 'Your payment has expired - Please complete it as soon as possible!',
      },
      failure: {
        id: 'Pembayaran Anda Gagal - Coba Lagi',
        en: 'Your payment failed - Please try again.',
      },
    },
    mapping_order_status: {
      pending: 'PENDING',
      settlement: 'COMPLETED',
      expire: 'CANCELED',
      cancel: 'CANCELED',
      failure: 'FAILURE',
    },
  },
};
