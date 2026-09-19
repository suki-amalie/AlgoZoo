const { Resend } = require('resend');
const { RESEND_API_KEY, EMAIL_FROM, APP_BASE_URL } = require('../config/env');

const resend = new Resend(RESEND_API_KEY);

const BRAND_RED = '#E5241C';
const TEXT_DARK = '#1A1A1A';
const TEXT_MUTED = '#6B6B6B';
const BORDER_LIGHT = '#EDEDED';

// Escape basic HTML so feedback/title/class text from the DB can't break the email markup
const escapeHtml = (str = '') =>
  String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Sends an email to the student whenever a trainer leaves feedback on their submission
exports.sendSubmissionFeedbackEmail = async ({
  to,
  studentName,
  problemTitle,
  className,
  feedback,
  classId,
  classProblemId,
}) => {
  if (!to) return;
  try {
    const safeName = escapeHtml(studentName);
    const safeTitle = escapeHtml(problemTitle);
    const safeClass = escapeHtml(className);
    const safeFeedback = escapeHtml(feedback).replace(/\n/g, '<br/>');
    // matching the frontend route: /student/classes/:classId/problems/:classProblemId
    const reviewLink =
      APP_BASE_URL && classId && classProblemId
        ? `${APP_BASE_URL}student/classes/${classId}/problems/${classProblemId}`
        : null;

    const html = `
<!DOCTYPE html>
<html>
  <body style="margin:0; padding:0; background-color:#F5F5F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F5F5; padding:40px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

            <!-- Brand mark -->
            <tr>
              <td style="padding:0 8px 20px; text-align:center;">
                <span style="font-size:14px; font-weight:700; letter-spacing:2px; color:${TEXT_DARK};">ALGO&nbsp;ZOO</span>
              </td>
            </tr>

            <!-- Card -->
            <tr>
              <td style="background-color:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 1px 2px rgba(0,0,0,0.04), 0 1px 8px rgba(0,0,0,0.04);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

                  <!-- Accent bar -->
                  <tr>
                    <td style="height:4px; background-color:${BRAND_RED}; font-size:0; line-height:0;">&nbsp;</td>
                  </tr>

                  <!-- Status pill + heading -->
                  <tr>
                    <td style="padding:36px 40px 4px;">
                      <span style="display:inline-block; background-color:#FDECEC; color:${BRAND_RED}; font-size:11px; font-weight:700; letter-spacing:0.5px; text-transform:uppercase; padding:4px 10px; border-radius:4px;">
                        Submission Reviewed
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:14px 40px 0;">
                      <p style="margin:0; font-size:20px; font-weight:700; color:${TEXT_DARK}; line-height:1.3;">
                        Hi ${safeName}, your submission just got feedback
                      </p>
                    </td>
                  </tr>
            

                  <!-- Divider -->
                  <tr>
                    <td style="padding:0 40px;">
                      <div style="border-top:1px solid ${BORDER_LIGHT};"></div>
                    </td>
                  </tr>

                  <!-- Details row -->
                  <tr>
                    <td style="padding:24px 40px 0;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding-bottom:14px; width:50%; vertical-align:top;">
                            <p style="margin:0 0 3px; font-size:11px; font-weight:600; color:${TEXT_MUTED}; text-transform:uppercase; letter-spacing:0.4px;">Problem</p>
                            <p style="margin:0; font-size:14px; font-weight:600; color:${TEXT_DARK};">${safeTitle}</p>
                          </td>
                          <td style="padding-bottom:14px; width:50%; vertical-align:top;">
                            <p style="margin:0 0 3px; font-size:11px; font-weight:600; color:${TEXT_MUTED}; text-transform:uppercase; letter-spacing:0.4px;">Class</p>
                            <p style="margin:0; font-size:14px; font-weight:600; color:${TEXT_DARK};">${safeClass}</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Feedback -->
                  <tr>
                    <td style="padding:8px 40px 32px;">
                      <p style="margin:0 0 8px; font-size:11px; font-weight:600; color:${TEXT_MUTED}; text-transform:uppercase; letter-spacing:0.4px;">Feedback from your trainer</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#FAFAFA; border-radius:8px; border:1px solid ${BORDER_LIGHT};">
                        <tr>
                          <td style="padding:16px 18px; font-size:14px; color:${TEXT_DARK}; line-height:1.65;">
                            ${safeFeedback}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  ${
                    reviewLink
                      ? `
                  <!-- CTA -->
                  <tr>
                    <td style="padding:0 40px 40px;">
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="border-radius:8px; background-color:${BRAND_RED}; text-align:center;">
                            <a href="${reviewLink}" target="_blank" style="display:block; padding:13px 24px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none;">
                              View Submission &rarr;
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  `
                      : `<tr><td style="padding-bottom:16px;"></td></tr>`
                  }

                </table>
              </td>
            </tr>

            <!-- Footer, outside the card like most product emails -->
            <tr>
              <td style="padding:24px 24px 0; text-align:center;">
                <p style="margin:0; font-size:12px; color:#9B9B9B; line-height:1.6;">
                  This is an automated message from ALGO ZOO.<br/>Please do not reply to this email.
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

    const { data, error } = await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: `${className} - ${studentName} - Feedback Notification`,
      html,
    });

    if (error) {
      console.error('Resend API error:', error);
      return;
    }

    console.log('Feedback email sent, id:', data?.id);
  } catch (error) {
    console.error('Send feedback email error:', error);
  }
};