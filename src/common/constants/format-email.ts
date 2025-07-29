const formatEmailOTPRegisterUser = (dataObjt: {
  recipientName: string;
  otpCode: string;
}): string => {
  const { recipientName, otpCode } = dataObjt;
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Generated</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            font-size: 24px;
            color: #333333;
          }
          .content {
            font-size: 16px;
            color: #555555;
            line-height: 1.6;
            margin-top: 20px;
          }
          .otp {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            padding: 10px;
            background-color: #f1f1f1;
            border-radius: 5px;
            display: inline-block;
            margin: 20px 0;
          }
          .footer {
            font-size: 12px;
            color: #888888;
            text-align: center;
            margin-top: 30px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            OTP Code Generated
          </div>
          <div class="content">
            <p>Hi ${recipientName},</p>
            <p>We have received a request to generate an OTP code for your registration. Here is your OTP:</p>
            <div class="otp">${otpCode}</div>
            <p>Please note that this OTP is valid for the next 5 minutes.</p>
            <p>If you did not request this OTP, please ignore this email.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Wild Book. All Rights Reserved.</p>
          </div>
        </div>
      </body>
    </html>
    `;
};

const formatEmailRegistrationSuccess = (dataObjt: {
  recipientName: string;
  userEmail: string;
  registrationDate: string;
}): string => {
  const { recipientName, userEmail, registrationDate } = dataObjt;
  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Successful</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            font-size: 24px;
            color: #333333;
          }
          .content {
            font-size: 16px;
            color: #555555;
            line-height: 1.6;
            margin-top: 20px;
          }
          .footer {
            font-size: 12px;
            color: #888888;
            text-align: center;
            margin-top: 30px;
          }
          .highlight {
            font-weight: bold;
            color: #4CAF50;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            Registration Successful
          </div>
          <div class="content">
            <p>Dear ${recipientName},</p>
            <p>Congratulations! You have successfully registered with Wild Book. We are excited to have you on board.</p>
            <p>Here are your registration details:</p>
            <ul>
              <li><span class="highlight">Email:</span> ${userEmail}</li>
              <li><span class="highlight">Registration Date:</span> ${registrationDate}</li>
            </ul>
            <p>You can now explore our platform and enjoy all the features we offer. Feel free to get started by logging in to your account.</p>
            <p>If you need assistance or have any questions, feel free to reach out to our support team at support@wildbook.com.</p>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Wild Book. All Rights Reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
};

const forgotPassword = (dataObj: {
  recipientName: string;
  token: string;
  baseUrl: string;
}) => {
  const { recipientName, token, baseUrl } = dataObj;
  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f7fc;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 16px;
          color: #555;
        }
        a {
          display: inline-block;
          background-color: #00b4ab;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 4px;
          text-align: center;
          margin-top: 20px;
        }
        .footer {
          font-size: 12px;
          color: #aaa;
          text-align: center;
          margin-top: 30px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hello, ${recipientName}!</h1>
        <p>We received a request to reset your password. You can change your password by clicking the button below:</p>
        
        <a href="${baseUrl}/callback/reset-password/${token}" target="_blank">Change My Password</a>
        
        <p>If you did not request a password reset, please ignore this email. This link will expire in 5 minutes for security purposes.</p>
        
        <div class="footer">
          <p>Thank you for using our service!</p>
          <p>If you have any questions, feel free to contact us.</p>
        </div>
      </div>
    </body>
    </html>`;
};

const pendingPayment = (dataObj: {
  recipientName: string;
  paymentAmount: string;
  paymentMethod: string;
  orderId: string;
  expirationTime: string;
  baseUrl: string;
}) => {
  const {
    recipientName,
    paymentAmount,
    paymentMethod,
    orderId,
    expirationTime,
    baseUrl,
  } = dataObj;

  return `
  <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Pending - Action Required</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f7fc;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 16px;
          color: #555;
        }
        .payment-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #f0f8ff;
          border: 1px solid #00b4ab;
          border-radius: 5px;
        }
        .payment-details p {
          margin: 5px 0;
        }
        .footer {
          font-size: 12px;
          color: #aaa;
          text-align: center;
          margin-top: 30px;
        }
        .cta-button {
          display: inline-block;
          background-color: #00b4ab;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 4px;
          text-align: center;
          margin-top: 20px;
        }
        .warning {
          color: #ff6f61;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hello, ${recipientName}!</h1>
        <p>We received your payment request, Please complete the payment within the next <span class="warning">30 minutes</span> to ensure it is successfully processed.</p>
        
        <div class="payment-details">
          <p><strong>Payment Amount:</strong> ${paymentAmount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Expires In:</strong> ${expirationTime}</p>
        </div>
        
        <p>If you don't complete the payment within the next 30 minutes, your transaction will be expired. Please visit the link below to finalize the payment:</p>
        
        <a href="${baseUrl}/complete-payment/${orderId}" class="cta-button">Complete My Payment</a>
        
        <p>If you have any questions or encounter any issues, please feel free to <a href="${baseUrl}/support">contact our support team</a>.</p>
        
        <div class="footer">
          <p>Thank you for choosing our service!</p>
           <p>&copy; ${new Date().getFullYear()} Wild Book. All Rights Reserved.</p>
        </div>
      </div>
    </body>
    </html>
    `;
};

const successPayment = (dataObj: {
  recipientName: string;
  paymentAmount: string;
  paymentMethod: string;
  orderId: string;
  paymentTime: string;
  baseUrl: string;
}) => {
  const {
    recipientName,
    paymentAmount,
    paymentMethod,
    orderId,
    paymentTime,
    baseUrl,
  } = dataObj;

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful - Thank You</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f7fc;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 16px;
          color: #555;
        }
        .payment-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #e0ffe0;
          border: 1px solid #4caf50;
          border-radius: 5px;
        }
        .payment-details p {
          margin: 5px 0;
        }
        .footer {
          font-size: 12px;
          color: #aaa;
          text-align: center;
          margin-top: 30px;
        }
        .cta-button {
          display: inline-block;
          background-color: #00b4ab;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 4px;
          text-align: center;
          margin-top: 20px;
        }
        .confirmation {
          color: #4caf50;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Congratulations, ${recipientName}!</h1>
        <p>Your payment for Order <strong>#${orderId}</strong> has been successfully processed. Thank you for completing the transaction!</p>

        <div class="payment-details">
          <p><strong>Payment Amount:</strong> ${paymentAmount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Payment Time:</strong> ${paymentTime}</p>
        </div>

        <p class="confirmation">Your payment was successfully completed! Your order is now confirmed, and we will proceed with the next steps.</p>
        
        <p>If you have any questions or need further assistance, please feel free to <a href="${baseUrl}/support">contact our support team</a>.</p>
        
        <div class="footer">
          <p>Thank you for choosing Wild Book!</p>
          <p>&copy; ${new Date().getFullYear()} Wild Book. All Rights Reserved.</p>
        </div>
      </div>
    </body>
    </html>`;
};

const successPaymentForSeller = (dataObj: {
  recipientName: string;
  paymentAmount: string;
  paymentMethod: string;
  orderId: string;
  paymentTime: string;
  baseUrl: string;
}) => {
  const {
    recipientName,
    paymentAmount,
    paymentMethod,
    orderId,
    paymentTime,
    baseUrl,
  } = dataObj;

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Successful - Order Confirmation</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f7fc;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 16px;
          color: #555;
        }
        .payment-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #e0ffe0;
          border: 1px solid #4caf50;
          border-radius: 5px;
        }
        .payment-details p {
          margin: 5px 0;
        }
        .footer {
          font-size: 12px;
          color: #aaa;
          text-align: center;
          margin-top: 30px;
        }
        .cta-button {
          display: inline-block;
          background-color: #00b4ab;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 4px;
          text-align: center;
          margin-top: 20px;
        }
        .confirmation {
          color: #4caf50;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Dear ${recipientName}!</h1>
        <p>We are happy to inform you that payment for Order <strong>#${orderId}</strong> has been successfully processed. Thank you for your business!</p>

        <div class="payment-details">
          <p><strong>Payment Amount:</strong> ${paymentAmount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Payment Time:</strong> ${paymentTime}</p>
        </div>
        <p class="confirmation">Your payment has been successfully completed! The order is now confirmed, and we will proceed with the next steps in fulfilling the order.</p>
        <p>If you have any questions or need further assistance, feel free to <a href="${baseUrl}/support">contact our support team</a>.</p>
        
        <div class="footer">
          <p>Thank you for being a valued seller on Wild Book!</p>
          <p>&copy; ${new Date().getFullYear()} Wild Book. All Rights Reserved.</p>
        </div>
      </div>
    </body>
    </html>`;
};

const cancelPayment = (dataObj: {
  recipientName: string;
  paymentAmount: string;
  paymentMethod: string;
  orderId: string;
  orderTime: string;
  baseUrl: string;
}) => {
  const {
    recipientName,
    paymentAmount,
    paymentMethod,
    orderId,
    orderTime,
    baseUrl,
  } = dataObj;

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Cancelled - Action Required</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f7fc;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 16px;
          color: #555;
        }
        .payment-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #ffcccc;
          border: 1px solid #ff6f61;
          border-radius: 5px;
        }
        .payment-details p {
          margin: 5px 0;
        }
        .footer {
          font-size: 12px;
          color: #aaa;
          text-align: center;
          margin-top: 30px;
        }
        .cta-button {
          display: inline-block;
          background-color: #ff6f61;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 4px;
          text-align: center;
          margin-top: 20px;
        }
        .warning {
          color: #ff6f61;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hi ${recipientName},</h1>
        <p>We regret to inform you that your payment for Order <strong>#${orderId}</strong> has been <span class="warning">cancelled</span>.</p>

        <div class="payment-details">
          <p><strong>Payment Amount:</strong> ${paymentAmount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Order Time:</strong> ${orderTime}</p>
        </div>

        <p>If you believe this cancellation is an error, please contact our support team immediately by clicking the button below:</p>

        <a href="${baseUrl}/support" class="cta-button">Contact Support</a>

        <p>If you need assistance with another payment method, feel free to <a href="${baseUrl}/payments">retry your payment</a>.</p>

        <div class="footer">
          <p>Thank you for your understanding.</p>
          <p>&copy; ${new Date().getFullYear()} Wild Book. All Rights Reserved.</p>
        </div>
      </div>
    </body>
    </html>`;
};

const expirePayment = (dataObj: {
  recipientName: string;
  paymentAmount: string;
  paymentMethod: string;
  orderId: string;
  orderTime: string;
  baseUrl: string;
}) => {
  const {
    recipientName,
    paymentAmount,
    paymentMethod,
    orderId,
    orderTime,
    baseUrl,
  } = dataObj;

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Expired - Action Required</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f7fc;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 16px;
          color: #555;
        }
        .payment-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #ffe0e0;
          border: 1px solid #ff6f61;
          border-radius: 5px;
        }
        .payment-details p {
          margin: 5px 0;
        }
        .footer {
          font-size: 12px;
          color: #aaa;
          text-align: center;
          margin-top: 30px;
        }
        .cta-button {
          display: inline-block;
          background-color: #ff6f61;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 4px;
          text-align: center;
          margin-top: 20px;
        }
        .warning {
          color: #ff6f61;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hi ${recipientName},</h1>
        <p>Your payment for Order <strong>#${orderId}</strong> has expired and could not be processed.</p>

        <div class="payment-details">
          <p><strong>Payment Amount:</strong> ${paymentAmount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Order Time:</strong> ${orderTime}</p>
        </div>

        <p>If you would like to complete your purchase, please <a href="${baseUrl}/complete-payment/${orderId}" class="cta-button">retry your payment</a> before it expires again.</p>

        <p>If you have any questions, feel free to <a href="${baseUrl}/support">contact our support team</a>.</p>

        <div class="footer">
          <p>Thank you for choosing Wild Book!</p>
          <p>&copy; ${new Date().getFullYear()} Wild Book. All Rights Reserved.</p>
        </div>
      </div>
    </body>
    </html>`;
};

const failurePayment = (dataObj: {
  recipientName: string;
  paymentAmount: string;
  paymentMethod: string;
  orderId: string;
  orderTime: string;
  baseUrl: string;
}) => {
  const {
    recipientName,
    paymentAmount,
    paymentMethod,
    orderId,
    orderTime,
    baseUrl,
  } = dataObj;

  return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Payment Failed - Action Required</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          color: #333;
          line-height: 1.6;
          margin: 0;
          padding: 0;
          background-color: #f4f7fc;
        }
        .container {
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          background-color: #fff;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }
        h1 {
          color: #333;
        }
        p {
          font-size: 16px;
          color: #555;
        }
        .payment-details {
          margin-top: 20px;
          padding: 15px;
          background-color: #f8d7da;
          border: 1px solid #f5c6cb;
          border-radius: 5px;
        }
        .payment-details p {
          margin: 5px 0;
        }
        .footer {
          font-size: 12px;
          color: #aaa;
          text-align: center;
          margin-top: 30px;
        }
        .cta-button {
          display: inline-block;
          background-color: #ff6f61;
          color: #fff;
          padding: 10px 20px;
          text-decoration: none;
          font-weight: 600;
          border-radius: 4px;
          text-align: center;
          margin-top: 20px;
        }
        .warning {
          color: #ff6f61;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hi ${recipientName},</h1>
        <p>We regret to inform you that your payment for Order <strong>#${orderId}</strong> has failed. Please review the payment details below:</p>

        <div class="payment-details">
          <p><strong>Payment Amount:</strong> ${paymentAmount}</p>
          <p><strong>Payment Method:</strong> ${paymentMethod}</p>
          <p><strong>Order ID:</strong> ${orderId}</p>
          <p><strong>Order Time:</strong> ${orderTime}</p>
        </div>

        <p>This could be due to a technical issue or insufficient funds. To complete your payment, please try again using a different payment method or contact your bank for further assistance.</p>

        <p>If you'd like to retry the payment, you can do so by clicking the button below:</p>

        <a href="${baseUrl}/retry-payment/${orderId}" class="cta-button">Retry Payment</a>

        <p>If you have any questions or need help with the payment process, please don't hesitate to <a href="${baseUrl}/support">contact our support team</a>.</p>

        <div class="footer">
          <p>Thank you for using Wild Book!</p>
          <p>&copy; ${new Date().getFullYear()} Wild Book. All Rights Reserved.</p>
        </div>
      </div>
    </body>
    </html>`;
};

export default {
  formatEmailOTPRegisterUser,
  formatEmailRegistrationSuccess,
  forgotPassword,
  pendingPayment,
  successPayment,
  cancelPayment,
  expirePayment,
  failurePayment,
  successPaymentForSeller,
};
