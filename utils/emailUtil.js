export const createResetPasswordEmail = ({ name = "there", resetLink }) => `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Reset your password</title>
    </head>
    <body style="margin:0; padding:0; background-color:#f2f4f5; font-family: Arial, Helvetica, sans-serif; color:#1a1a1a;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f5; padding:32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px; background-color:#ffffff; border:1px solid #ebebeb; border-radius:28px; overflow:hidden;">
              <tr>
                <td style="padding:32px 32px 16px; text-align:center;">
                  <div style="display:inline-block; background-color:#5433eb; color:#ffffff; font-size:12px; font-weight:700; letter-spacing:1.5px; padding:10px 16px; border-radius:999px;">
                    SECURE ACCESS
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:0 32px 16px; text-align:center;">
                  <h1 style="margin:0; font-size:32px; line-height:1.2; color:#1a1a1a; font-weight:700;">
                    Reset your password
                  </h1>
                </td>
              </tr>

              <tr>
                <td style="padding:0 32px 24px;">
                  <p style="margin:0; font-size:16px; line-height:1.7; color:#6b7280;">
                    Hi <strong style="color:#1a1a1a;">${name}</strong>,
                  </p>
                  <p style="margin:16px 0 0; font-size:16px; line-height:1.7; color:#6b7280;">
                    We received a request to reset your password. Click the button below to create a new one.
                  </p>
                </td>
              </tr>

              <tr>
                <td align="center" style="padding:0 32px 24px;">
                  <a
                    href="${resetLink}"
                    style="display:inline-block; background-color:#5433eb; color:#ffffff; text-decoration:none; font-size:16px; font-weight:700; padding:16px 28px; border-radius:14px; box-shadow:0px 4px 24px 0px rgba(69,36,219,0.34);"
                  >
                    Reset Password
                  </a>
                </td>
              </tr>

              <tr>
                <td style="padding:0 32px 24px;">
                  <p style="margin:0; font-size:14px; line-height:1.7; color:#6b7280;">
                    If the button doesn't work, copy and paste this link into your browser:
                  </p>
                  <p style="margin:12px 0 0; word-break:break-all; font-size:13px; line-height:1.7; color:#5433eb;">
                    ${resetLink}
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:0 32px 28px; border-top:1px solid #ebebeb;">
                  <p style="margin:20px 0 0; font-size:13px; line-height:1.6; color:#6b7280;">
                    This link will expire in 15 minutes. If you did not request this, you can safely ignore this email.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
  </html>
`;

export default createResetPasswordEmail;
